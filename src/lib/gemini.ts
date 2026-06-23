import { Type } from "@google/genai";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { AiFeedback, ComprehensiveReport } from "@/types/database";

// Gemini API 키는 더 이상 클라이언트에 두지 않는다. 키는 Supabase Edge Function
// (gemini)의 Secret 에만 존재하며, 아래 callGemini 가 그 함수를 통해 호출한다.
// 따라서 키가 브라우저 번들로 노출되지 않는다.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "";
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

// 프록시(Edge Function)는 Supabase 가 설정돼 있어야 호출 가능하다.
export const isGeminiConfigured = isSupabaseConfigured;

// 무료 등급에서 사용 가능한 멀티모달 모델
const MODEL = "gemini-2.5-flash";

interface GeminiRequest {
  model: string;
  contents: unknown;
  config?: unknown;
}

/** Edge Function(gemini)을 통해 Gemini 를 호출하고 응답 텍스트를 돌려준다. */
async function callGemini(req: GeminiRequest): Promise<{ text: string }> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token ?? ANON_KEY;

  const res = await fetch(`${SUPABASE_URL}/functions/v1/gemini`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    let message = `Gemini 프록시 오류 (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* ignore */
    }
    // 상태코드를 보존해 retryWithDelay 의 429/503 재시도 판단에 사용한다.
    const err = new Error(message) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  return res.json();
}

/**
 * 트래픽 한도(429)나 서버 일시 장애(503) 등 일시적인 사유로 API 호출이 실패할 때 
 * 지수 백오프 방식으로 최대 3회 재시도하는 헬퍼 함수
 */
async function retryWithDelay<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1500,
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const status = error?.status;
    const msg = String(error?.message || "").toLowerCase();

    const isRetryable =
      status === 429 ||
      status === 503 ||
      msg.includes("503") ||
      msg.includes("429") ||
      msg.includes("unavailable") ||
      msg.includes("resource_exhausted") ||
      msg.includes("overloaded");

    if (retries > 0 && isRetryable) {
      console.warn(`Gemini API call failed (${error?.message}). Retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return retryWithDelay(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

/** data URL 또는 순수 base64 문자열에서 base64 본문만 추출 */
function stripBase64(dataUrl: string): string {
  const comma = dataUrl.indexOf(",");
  return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
}

// ---------------------------------------------------------------------------
// 1) 인바디 / 건강검진 이미지 파싱 → 정형 JSON 수치 추출
// ---------------------------------------------------------------------------
export interface ParsedMetric {
  metric_type: "inbody" | "checkup";
  date: string | null;
  data: Record<string, string | number>;
}

export async function parseHealthImage(
  base64Image: string,
  mimeType: string,
): Promise<ParsedMetric> {
  if (!isGeminiConfigured) {
    throw new Error("Gemini API 키가 설정되지 않았습니다.");
  }

  const response = await retryWithDelay(() => callGemini({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType,
              data: stripBase64(base64Image),
            },
          },
          {
            text: [
              "이 이미지는 인바디(체성분) 또는 건강검진 결과지입니다.",
              "표시된 모든 측정 항목명과 수치를 정확히 읽어 구조화된 JSON으로 추출하세요.",
              "- metric_type: 체성분/근육/체지방 위주면 'inbody', 혈액/혈압/콜레스테롤 등이면 'checkup'",
              "- date: 측정일이 보이면 YYYY-MM-DD, 없으면 null",
              "- data: { 항목명: 수치 } 형태의 평탄한 객체 (단위는 항목명에 괄호로 포함)",
              "이미지에 없는 값은 임의로 만들지 마세요.",
            ].join("\n"),
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          metric_type: { type: Type.STRING, enum: ["inbody", "checkup"] },
          date: { type: Type.STRING, nullable: true },
          data: { type: Type.OBJECT, nullable: false },
        },
        required: ["metric_type", "data"],
      },
    },
  }));

  const text = response.text ?? "{}";
  return JSON.parse(text) as ParsedMetric;
}

// ---------------------------------------------------------------------------
// 2) 데일리 데이터 → 카테고리별 AI 피드백
// ---------------------------------------------------------------------------
export async function generateFeedback(summary: string): Promise<AiFeedback> {
  if (!isGeminiConfigured) {
    throw new Error("Gemini API 키가 설정되지 않았습니다.");
  }

  const response = await retryWithDelay(() => callGemini({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: [
              "당신은 친절하고 전문적인 헬스 트레이너 겸 영양 코치입니다.",
              "아래는 사용자의 하루치 건강 기록입니다. 이를 분석해 한국어로 피드백을 작성하세요.",
              "각 항목은 2~3문장으로 구체적이고 실천 가능한 조언을 담되, 과하게 단정하지 마세요.",
              "기록이 비어있는 영역은 입력을 권유하는 톤으로 안내하세요.",
              "",
              "※ 건강 점수(score) 채점 기준 (너그럽고 격려하는 톤으로, 사용자의 노력을 인정하며 산정할 것):",
              "- 기본 시작 점수는 75점입니다. 어느 정도 기록을 남기고 기본적인 관리가 되어 있으면 80점 이상을 충분히 부여하세요.",
              "- 운동(유산소/무산소/스트레칭) 기록이 하나라도 있으면 가점하고, 둘 다 없더라도 다른 영역 관리가 양호하면 70점 이상은 유지할 수 있습니다.",
              "- 수분이나 식단 기록이 다소 부족하더라도 가볍게(3~7점 정도)만 감점하고, 잘 챙긴 부분은 적극적으로 가점하세요.",
              "- 영양제 복용 성실도도 반영하되 격려 위주로: 빠짐없이 복용했다면 가점하고, 일부 놓쳤더라도 소폭만 감점하세요. (등록된 영양제가 전혀 없으면 이 기준은 점수에 반영하지 않습니다.)",
              "- 수면 시간이 너무 부족하거나 기록이 없으면 소폭 감점하되, 과하게 깎지 마세요.",
              "- 대부분의 영역을 성실히 기록하고 관리한 날에는 90점 이상도 적극적으로 부여하세요.",
              "- 기록이 거의 없는 날만 60점대 이하로 평가하세요.",
              "",
              "[하루 기록]",
              summary,
            ].join("\n"),
          },
        ],
      },
    ],
    config: {
      // 같은 하루 데이터를 다시 분석해도 점수가 흔들리지 않도록 결정적으로 산정한다.
      // (temperature 0 + 고정 seed → 동일 입력 → 동일 점수)
      temperature: 0,
      seed: 42,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.INTEGER, description: "0~100 건강 점수" },
          overall: { type: Type.STRING, description: "종합 피드백 / 총평" },
          exercise: { type: Type.STRING, description: "운동(유산소/무산소/스트레칭) 피드백" },
          nutrition: { type: Type.STRING, description: "영양(식단/영양제/수분) 피드백" },
          sleep: { type: Type.STRING, description: "수면 피드백" },
        },
        required: ["score", "overall", "exercise", "nutrition", "sleep"],
      },
    },
  }));

  const text = response.text ?? "{}";
  return JSON.parse(text) as AiFeedback;
}

// ---------------------------------------------------------------------------
// 3) 항목별 트렌드 분석 → 해당 카테고리에 집중된 짧은 조언
// ---------------------------------------------------------------------------
/**
 * 특정 항목(체중, 유산소 등)의 기간 통계 요약 텍스트를 받아
 * 2~3문장 분량의 집중 분석/조언을 반환한다.
 */
export async function generateTrendFeedback(
  category: string,
  summary: string,
): Promise<{ feedback: string }> {
  if (!isGeminiConfigured) {
    throw new Error("Gemini API 키가 설정되지 않았습니다.");
  }

  const response = await retryWithDelay(() => callGemini({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: [
              "당신은 친절하고 전문적인 헬스 트레이너 겸 데이터 분석가입니다.",
              `아래는 사용자의 '${category}' 항목에 대한 일정 기간 통계 요약입니다.`,
              "이 데이터의 추세(증가/감소/정체/규칙성 등)를 한국어로 분석하고,",
              "실천 가능한 조언을 2~3문장으로만 간결하게 작성하세요.",
              "수치를 근거로 들되 과하게 단정하지 말고, 기록이 부족하면 꾸준한 기록을 권하세요.",
              "",
              `[${category} 통계 요약]`,
              summary,
            ].join("\n"),
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          feedback: { type: Type.STRING, description: "2~3문장 분량의 추세 분석 조언" },
        },
        required: ["feedback"],
      },
    },
  }));

  const text = response.text ?? "{}";
  return JSON.parse(text) as { feedback: string };
}

// ---------------------------------------------------------------------------
// 4) 종합 건강 소견 → 인바디/검진 + 30일 라이프로그 통합 보고서
// ---------------------------------------------------------------------------
/**
 * 인바디/검진 데이터와 최근 30일 일상 로그 요약을 기반으로
 * 종합 건강 보고서(점수 + 체성분/생활/액션플랜)를 생성한다.
 */
export async function generateComprehensiveReport(
  summary: string,
): Promise<ComprehensiveReport> {
  if (!isGeminiConfigured) {
    throw new Error("Gemini API 키가 설정되지 않았습니다.");
  }

  const response = await retryWithDelay(() => callGemini({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: [
              "당신은 임상 데이터 해석 경험이 풍부한 전문 건강 코치입니다.",
              "아래는 사용자의 최근 인바디/건강검진 결과와 최근 30일간의 일상 라이프 로그 요약입니다.",
              "이를 종합 분석해 한국어로 깊이 있는 건강 보고서를 작성하세요.",
              "",
              "다음 세 영역을 반드시 충실히 다루세요:",
              "1) bodyCompositionAnalysis: 체성분(근육량·체지방량 등) 및 검진 수치를 해석하고 대사 건강 위험도를 평가",
              "2) lifestyleAnalysis: 식습관·수분·수면·운동·간헐적 단식(공복) 등 일상 로그와 신체 상태 간의 인과관계를 분석하고 피드백",
              "3) actionPlan: 향후 4주간 실천 가능한 맞춤 운동/식이 프로그램을 구체적으로 제안",
              "",
              "각 영역은 문단 형태로 풍부하게 서술하되, 데이터에 없는 수치를 지어내지 마세요.",
              "",
              "※ overallScore(0~100) 채점 기준 (너그럽고 격려하는 톤으로):",
              "- 기본 기준점은 75점입니다. 체성분/검진 지표가 대체로 정상 범위이고 기본적인 일상 관리가 되어 있으면 80점 이상을 충분히 부여하세요.",
              "- 일부 영역이 부족하거나 경미한 위험 신호가 있더라도 가볍게(3~7점 정도)만 감점하고, 잘 관리된 부분은 적극적으로 가점하세요.",
              "- 데이터가 부족하면 무리하게 깎지 말고 중간 수준으로 산정한 뒤, 꾸준한 기록을 권유하는 톤으로 사유를 분석에 명시하세요.",
              "- 전반적으로 양호하면 90점 이상도 적극적으로 부여하세요.",
              "",
              "[종합 건강 데이터]",
              summary,
            ].join("\n"),
          },
        ],
      },
    ],
    config: {
      // 동일한 데이터로 재생성해도 종합 점수가 흔들리지 않도록 결정적으로 산정한다.
      temperature: 0,
      seed: 42,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          overallScore: { type: Type.INTEGER, description: "0~100 종합 신체 건강 점수" },
          bodyCompositionAnalysis: { type: Type.STRING, description: "체성분/검진 결과 분석" },
          lifestyleAnalysis: { type: Type.STRING, description: "운동/수면/식단 연계 평가" },
          actionPlan: { type: Type.STRING, description: "향후 4주 추천 솔루션 및 액션 플랜" },
        },
        required: ["overallScore", "bodyCompositionAnalysis", "lifestyleAnalysis", "actionPlan"],
      },
    },
  }));

  const text = response.text ?? "{}";
  return JSON.parse(text) as ComprehensiveReport;
}
