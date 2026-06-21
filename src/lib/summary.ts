import { differenceInYears } from "date-fns";
import { calcSleepHours, formatDuration } from "@/lib/utils";
import type { DailyBundle, Profile, SupplementSetting } from "@/types/database";

/**
 * 하루치 데이터를 Gemini 프롬프트에 넣을 사람이 읽기 좋은 텍스트로 직렬화한다.
 * 비어있는 영역은 "기록 없음"으로 표기하여 AI가 입력을 권유할 수 있도록 한다.
 */
export function buildDailySummary(
  bundle: DailyBundle,
  profile: Profile | null,
  settings: SupplementSetting[],
): string {
  const lines: string[] = [];

  if (profile) {
    const age = differenceInYears(new Date(), new Date(profile.birth_date));
    lines.push(`- 사용자: ${profile.gender}, 만 ${age}세, 키 ${profile.height}cm`);
  }

  const r = bundle.record;
  lines.push(`- 몸무게: ${r?.weight != null ? `${r.weight}kg` : "기록 없음"}`);

  // 유산소
  if (bundle.cardio.length) {
    const c = bundle.cardio
      .map((x) => `${x.type} ${x.distance}km(${formatDuration(x.duration)})`)
      .join(", ");
    lines.push(`- 유산소: ${c}`);
  } else {
    lines.push("- 유산소: 기록 없음");
  }

  // 무산소
  if (bundle.strength.length) {
    const s = bundle.strength
      .map((x) => `${x.exercise_name}[${x.sets.map((st) => `${st.weight}kg×${st.reps}`).join("/")}]`)
      .join(", ");
    lines.push(`- 무산소: ${s}`);
  } else {
    lines.push("- 무산소: 기록 없음");
  }

  // 스트레칭
  if (bundle.stretching.length) {
    lines.push(
      `- 스트레칭: ${bundle.stretching.map((x) => `${x.name}(${x.duration}분)`).join(", ")}`,
    );
  } else {
    lines.push("- 스트레칭: 기록 없음");
  }

  // 식단
  if (bundle.diet.length) {
    const d = bundle.diet.map((x) => `${x.meal_type}: ${x.keywords.join("/")}`).join(" | ");
    lines.push(`- 식단: ${d}`);
  } else {
    lines.push("- 식단: 기록 없음");
  }

  // 영양제
  const settingName = new Map(settings.map((s) => [s.id, s.name]));
  const taken = bundle.supplements
    .filter((s) => s.taken)
    .map((s) => settingName.get(s.supplement_setting_id) ?? "영양제");
  lines.push(
    `- 영양제: ${taken.length ? `복용 ${taken.join(", ")}` : "기록 없음"} (등록 ${settings.length}종)`,
  );

  // 물
  const water = bundle.water.reduce((sum, w) => sum + w.amount_ml, 0);
  lines.push(`- 수분: ${water ? `${water}ml` : "기록 없음"}`);

  // 수면
  const hours = calcSleepHours(r?.sleep_start ?? null, r?.sleep_end ?? null);
  lines.push(`- 수면: ${hours != null ? `${hours}시간` : "기록 없음"}`);

  return lines.join("\n");
}
