import { GoogleGenAI, Type } from "@google/genai";
import type { AiFeedback } from "@/types/database";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

export const isGeminiConfigured = Boolean(apiKey);

const ai = new GoogleGenAI({ apiKey: apiKey ?? "" });

// 무료 등급에서 사용 가능한 멀티모달 모델
const MODEL = "gemini-2.5-flash";

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

  const response = await retryWithDelay(() => ai.models.generateContent({
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

  const response = await retryWithDelay(() => ai.models.generateContent({
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
              "※ 건강 점수(score) 채점 기준 (매우 엄격하고 보수적으로 산정할 것):",
              "- 기본 시작 점수는 60점입니다. 모든 카테고리(운동, 식단, 수분, 수면)가 골고루 성실하게 기록되고 모범적이어야만 80점 이상을 부여할 수 있습니다.",
              "- 유산소/무산소 운동 기록이 둘 다 전혀 없으면 당일 건강 점수는 최고 60점을 넘을 수 없습니다.",
              "- 수분 섭취량이 1000ml 미만이거나 식단 기록이 아예 없는 등 영양 관리가 미흡하면 점수를 대폭 감점(10~20점 감점)하세요.",
              "- 수면 시간이 6시간 미만이거나 기록이 없으면 추가로 감점하십시오.",
              "- 완벽에 가까운 루틴을 수행한 날에만 제한적으로 90점 이상을 부여하세요.",
              "",
              "[하루 기록]",
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
