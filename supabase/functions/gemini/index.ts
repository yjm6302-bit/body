// Supabase Edge Function: Gemini 호출 프록시
// ---------------------------------------------------------------------------
// 클라이언트(브라우저)는 이 함수만 호출하고, 실제 Gemini API 키는 이 함수의
// Secret(GEMINI_API_KEY)에만 존재한다. 따라서 키가 브라우저로 절대 노출되지 않는다.
//
// 배포:
//   supabase functions deploy gemini
// 키 등록(한 번만):
//   supabase secrets set GEMINI_API_KEY=<새로 발급받은 키>
// ---------------------------------------------------------------------------

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "POST only" }, 405);
  }

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    return json({ error: "GEMINI_API_KEY secret 가 설정되지 않았습니다." }, 500);
  }

  let payload: { model?: string; contents?: unknown; config?: unknown };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "유효한 JSON 본문이 필요합니다." }, 400);
  }

  const { model, contents, config } = payload;
  if (!model || !contents) {
    return json({ error: "model 과 contents 는 필수입니다." }, 400);
  }

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  let gRes: Response;
  try {
    gRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // SDK 의 config(responseMimeType/responseSchema)는 REST 의 generationConfig 와 동일한 형태다.
      body: JSON.stringify({ contents, generationConfig: config }),
    });
  } catch (e) {
    return json({ error: `Gemini 요청 실패: ${String((e as Error)?.message ?? e)}` }, 502);
  }

  const data = await gRes.json().catch(() => null);
  if (!gRes.ok) {
    // Gemini 의 상태코드를 그대로 전달해 클라이언트의 재시도(429/503) 로직이 동작하게 한다.
    const message = (data as any)?.error?.message ?? "Gemini API 오류";
    return json({ error: message }, gRes.status);
  }

  const parts = (data as any)?.candidates?.[0]?.content?.parts ?? [];
  const text = parts.map((p: any) => p?.text ?? "").join("");
  return json({ text }, 200);
});
