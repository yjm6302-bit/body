import { GoogleGenAI, Type } from "@google/genai";
import type { AiFeedback } from "@/types/database";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

export const isGeminiConfigured = Boolean(apiKey);

const ai = new GoogleGenAI({ apiKey: apiKey ?? "" });

// 무료 등급에서 사용 가능한 멀티모달 모델
const MODEL = "gemini-2.5-flash";

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

  const response = await ai.models.generateContent({
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
  });

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

  const response = await ai.models.generateContent({
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
  });

  const text = response.text ?? "{}";
  return JSON.parse(text) as AiFeedback;
}
