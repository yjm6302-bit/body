import { format, startOfMonth, subDays, subMonths } from "date-fns";
import { toDateKey, calcSleepHours } from "@/lib/utils";
import type { HealthMetric, MetricType, RangeBundle } from "@/types/database";

// ============================================================================
// 통계/타임라인 공용 데이터 가공 유틸 + 카테고리별 빌더
// ----------------------------------------------------------------------------
// 각 통계 컨테이너가 동일한 StatsLayout 에 주입할 수 있도록, RangeBundle 을 받아
// 요약카드 / 차트 / 타임라인 / AI 요약텍스트로 가공하는 순수 함수들을 모았다.
// ============================================================================

export type Period = "weekly" | "yearly";

export type StatCategory =
  | "weight"
  | "cardio"
  | "strength"
  | "diet"
  | "water"
  | "sleep"
  | "supplement"
  | "metric";

export interface StatSummaryItem {
  label: string;
  value: string | number;
  subValue?: string;
}

export interface TimelineItem {
  id: string;
  date: string;
  title: string;
  description: string;
}

export interface CategoryStats {
  summaryItems: StatSummaryItem[];
  chartData: Array<Record<string, unknown>>;
  chartConfig: {
    kind: "line" | "bar";
    xKey: string;
    yKeys: { key: string; color: string; name: string }[];
  };
  timelineData: TimelineItem[];
  /** AI 트렌드 분석에 그대로 넘길 통계 요약 텍스트 */
  trendSummary: string;
}

// 테마 포인트 컬러 (tailwind.config.js 와 동일)
const COLOR = {
  exercise: "#10B981",
  trust: "#3B82F6",
  highlight: "#F59E0B",
  danger: "#EF4444",
};

// --- 기간 → 조회 범위 / 버킷 ------------------------------------------------
export function rangeFor(period: Period, today: Date): { start: string; end: string } {
  const start = period === "weekly" ? subDays(today, 6) : startOfMonth(subMonths(today, 11));
  return { start: toDateKey(start), end: toDateKey(today) };
}

interface Bucket {
  key: string; // 레코드 날짜를 매핑할 키
  label: string; // 차트 x축 라벨
}

function bucketsFor(period: Period, today: Date): Bucket[] {
  if (period === "weekly") {
    return Array.from({ length: 7 }, (_, i) => {
      const d = subDays(today, 6 - i);
      return { key: toDateKey(d), label: format(d, "MM/dd") };
    });
  }
  return Array.from({ length: 12 }, (_, i) => {
    const d = startOfMonth(subMonths(today, 11 - i));
    return { key: format(d, "yyyy-MM"), label: format(d, "M월") };
  });
}

/** 레코드 날짜(YYYY-MM-DD)를 해당 기간의 버킷 키로 환산 */
function bucketKeyOf(date: string, period: Period): string {
  return period === "weekly" ? date : date.slice(0, 7);
}

const round1 = (n: number) => Math.round(n * 10) / 10;

// daily_record_id → 날짜 매핑
function dateMap(data: RangeBundle): Map<string, string> {
  return new Map(data.records.map((r) => [r.id, r.date]));
}

const METRIC_LABEL: Record<MetricType, string> = { inbody: "인바디", checkup: "건강검진" };

// ============================================================================
// 카테고리 디스패처
// ============================================================================
export function buildCategoryStats(
  category: StatCategory,
  data: RangeBundle,
  metrics: HealthMetric[],
  period: Period,
  today: Date,
): CategoryStats {
  switch (category) {
    case "weight":
      return buildWeight(data, period, today);
    case "cardio":
      return buildCardio(data, period, today);
    case "strength":
      return buildStrength(data, period, today);
    case "diet":
      return buildDiet(data, period, today);
    case "water":
      return buildWater(data, period, today);
    case "sleep":
      return buildSleep(data, period, today);
    case "supplement":
      return buildSupplement(data, period, today);
    case "metric":
      return buildMetric(metrics);
  }
}

const periodLabel = (p: Period) => (p === "weekly" ? "최근 7일" : "최근 12개월");

// --- 체중 -------------------------------------------------------------------
function buildWeight(data: RangeBundle, period: Period, today: Date): CategoryStats {
  const buckets = bucketsFor(period, today);
  const withW = data.records.filter((r) => r.weight != null);

  // 버킷별 평균 체중
  const sums = new Map<string, { sum: number; n: number }>();
  for (const r of withW) {
    const k = bucketKeyOf(r.date, period);
    const cur = sums.get(k) ?? { sum: 0, n: 0 };
    cur.sum += Number(r.weight);
    cur.n += 1;
    sums.set(k, cur);
  }
  const chartData = buckets.map((b) => {
    const s = sums.get(b.key);
    return { label: b.label, weight: s ? round1(s.sum / s.n) : null };
  });

  const weights = withW.map((r) => Number(r.weight));
  const avg = weights.length ? round1(weights.reduce((a, c) => a + c, 0) / weights.length) : 0;
  const min = weights.length ? round1(Math.min(...weights)) : 0;
  const max = weights.length ? round1(Math.max(...weights)) : 0;
  // 기간 내 처음(과거) → 마지막(최근) 변화. records 는 날짜 내림차순.
  const ordered = [...withW].sort((a, b) => a.date.localeCompare(b.date));
  const diff =
    ordered.length >= 2
      ? round1(Number(ordered[ordered.length - 1].weight) - Number(ordered[0].weight))
      : 0;

  return {
    summaryItems: [
      { label: "평균 체중", value: `${avg}`, subValue: "kg" },
      { label: "변화량", value: `${diff > 0 ? "+" : ""}${diff}`, subValue: "kg" },
      { label: "최저", value: `${min}`, subValue: "kg" },
      { label: "최고", value: `${max}`, subValue: "kg" },
    ],
    chartData,
    chartConfig: {
      kind: "line",
      xKey: "label",
      yKeys: [{ key: "weight", color: COLOR.trust, name: "체중(kg)" }],
    },
    timelineData: withW.map((r) => ({
      id: r.id,
      date: r.date,
      title: "체중 기록",
      description: `${r.weight}kg`,
    })),
    trendSummary: [
      `[체중] 기간: ${periodLabel(period)}`,
      `기록일수: ${withW.length}일, 평균 ${avg}kg, 최저 ${min}kg, 최고 ${max}kg, 기간 변화 ${diff}kg`,
      `추이: ${chartData.map((d) => `${d.label} ${d.weight ?? "-"}`).join(", ")}`,
    ].join("\n"),
  };
}

// --- 유산소 -----------------------------------------------------------------
function buildCardio(data: RangeBundle, period: Period, today: Date): CategoryStats {
  const buckets = bucketsFor(period, today);
  const dates = dateMap(data);

  const dist = new Map<string, number>();
  for (const c of data.cardio) {
    const date = dates.get(c.daily_record_id);
    if (!date) continue;
    const k = bucketKeyOf(date, period);
    dist.set(k, (dist.get(k) ?? 0) + Number(c.distance));
  }
  const chartData = buckets.map((b) => ({ label: b.label, distance: round1(dist.get(b.key) ?? 0) }));

  const totalDist = round1(data.cardio.reduce((a, c) => a + Number(c.distance), 0));
  const totalSec = data.cardio.reduce((a, c) => a + c.duration, 0);
  const count = data.cardio.length;
  const avgDist = count ? round1(totalDist / count) : 0;

  return {
    summaryItems: [
      { label: "총 횟수", value: count, subValue: "회" },
      { label: "총 거리", value: `${totalDist}`, subValue: "km" },
      { label: "총 시간", value: Math.round(totalSec / 60), subValue: "분" },
      { label: "평균 거리", value: `${avgDist}`, subValue: "km" },
    ],
    chartData,
    chartConfig: {
      kind: "bar",
      xKey: "label",
      yKeys: [{ key: "distance", color: COLOR.exercise, name: "거리(km)" }],
    },
    timelineData: data.cardio
      .map((c) => ({
        id: c.id,
        date: dates.get(c.daily_record_id) ?? "",
        title: c.type,
        description: `${c.distance}km · ${Math.round(c.duration / 60)}분`,
      }))
      .sort((a, b) => b.date.localeCompare(a.date)),
    trendSummary: [
      `[유산소] 기간: ${periodLabel(period)}`,
      `총 ${count}회, 총 거리 ${totalDist}km, 총 시간 ${Math.round(totalSec / 60)}분, 평균 ${avgDist}km/회`,
      `추이: ${chartData.map((d) => `${d.label} ${d.distance}km`).join(", ")}`,
    ].join("\n"),
  };
}

// --- 무산소 -----------------------------------------------------------------
function buildStrength(data: RangeBundle, period: Period, today: Date): CategoryStats {
  const buckets = bucketsFor(period, today);
  const dates = dateMap(data);

  const volumeOf = (sets: { weight: number; reps: number }[]) =>
    sets.reduce((a, s) => a + Number(s.weight) * s.reps, 0);

  const vol = new Map<string, number>();
  for (const s of data.strength) {
    const date = dates.get(s.daily_record_id);
    if (!date) continue;
    const k = bucketKeyOf(date, period);
    vol.set(k, (vol.get(k) ?? 0) + volumeOf(s.sets));
  }
  const chartData = buckets.map((b) => ({ label: b.label, volume: Math.round(vol.get(b.key) ?? 0) }));

  const totalVol = Math.round(data.strength.reduce((a, s) => a + volumeOf(s.sets), 0));
  const totalSets = data.strength.reduce((a, s) => a + s.sets.length, 0);
  const sessions = data.strength.length;
  const kinds = new Set(data.strength.map((s) => s.exercise_name)).size;

  return {
    summaryItems: [
      { label: "총 기록", value: sessions, subValue: "건" },
      { label: "총 세트", value: totalSets, subValue: "세트" },
      { label: "총 볼륨", value: totalVol.toLocaleString(), subValue: "kg" },
      { label: "운동 종류", value: kinds, subValue: "종" },
    ],
    chartData,
    chartConfig: {
      kind: "bar",
      xKey: "label",
      yKeys: [{ key: "volume", color: COLOR.exercise, name: "볼륨(kg)" }],
    },
    timelineData: data.strength
      .map((s) => ({
        id: s.id,
        date: dates.get(s.daily_record_id) ?? "",
        title: s.exercise_name,
        description: s.sets.map((set, i) => `${i + 1}세트 ${set.weight}kg×${set.reps}`).join(" / "),
      }))
      .sort((a, b) => b.date.localeCompare(a.date)),
    trendSummary: [
      `[무산소] 기간: ${periodLabel(period)}`,
      `총 ${sessions}건, ${totalSets}세트, 총 볼륨 ${totalVol}kg, 운동 종류 ${kinds}종`,
      `볼륨 추이: ${chartData.map((d) => `${d.label} ${d.volume}kg`).join(", ")}`,
    ].join("\n"),
  };
}

// --- 식단 -------------------------------------------------------------------
function buildDiet(data: RangeBundle, period: Period, today: Date): CategoryStats {
  const buckets = bucketsFor(period, today);
  const dates = dateMap(data);

  const meals = new Map<string, number>();
  for (const d of data.diet) {
    const date = dates.get(d.daily_record_id);
    if (!date) continue;
    const k = bucketKeyOf(date, period);
    meals.set(k, (meals.get(k) ?? 0) + 1);
  }
  const chartData = buckets.map((b) => ({ label: b.label, meals: meals.get(b.key) ?? 0 }));

  const total = data.diet.length;
  const loggedDays = new Set(data.diet.map((d) => dates.get(d.daily_record_id)).filter(Boolean)).size;
  const avgPerDay = loggedDays ? round1(total / loggedDays) : 0;

  return {
    summaryItems: [
      { label: "총 식사 기록", value: total, subValue: "끼" },
      { label: "기록한 날", value: loggedDays, subValue: "일" },
      { label: "일평균 끼니", value: `${avgPerDay}`, subValue: "끼/일" },
    ],
    chartData,
    chartConfig: {
      kind: "bar",
      xKey: "label",
      yKeys: [{ key: "meals", color: COLOR.highlight, name: "끼니 수" }],
    },
    timelineData: data.diet
      .map((d) => ({
        id: d.id,
        date: dates.get(d.daily_record_id) ?? "",
        title: d.meal_type,
        description: d.keywords.join(", ") || "—",
      }))
      .sort((a, b) => b.date.localeCompare(a.date)),
    trendSummary: [
      `[식단] 기간: ${periodLabel(period)}`,
      `총 ${total}끼, 기록일수 ${loggedDays}일, 일평균 ${avgPerDay}끼`,
      `추이: ${chartData.map((d) => `${d.label} ${d.meals}끼`).join(", ")}`,
    ].join("\n"),
  };
}

// --- 수분 -------------------------------------------------------------------
function buildWater(data: RangeBundle, period: Period, today: Date): CategoryStats {
  const buckets = bucketsFor(period, today);
  const dates = dateMap(data);

  const ml = new Map<string, number>();
  const perDay = new Map<string, number>(); // 날짜별 합 (타임라인용)
  for (const w of data.water) {
    const date = dates.get(w.daily_record_id);
    if (!date) continue;
    ml.set(bucketKeyOf(date, period), (ml.get(bucketKeyOf(date, period)) ?? 0) + w.amount_ml);
    perDay.set(date, (perDay.get(date) ?? 0) + w.amount_ml);
  }
  const chartData = buckets.map((b) => ({ label: b.label, ml: ml.get(b.key) ?? 0 }));

  const total = data.water.reduce((a, w) => a + w.amount_ml, 0);
  const loggedDays = perDay.size;
  const avg = loggedDays ? Math.round(total / loggedDays) : 0;

  return {
    summaryItems: [
      { label: "총 섭취량", value: total.toLocaleString(), subValue: "ml" },
      { label: "기록한 날", value: loggedDays, subValue: "일" },
      { label: "일평균", value: avg.toLocaleString(), subValue: "ml" },
    ],
    chartData,
    chartConfig: {
      kind: "bar",
      xKey: "label",
      yKeys: [{ key: "ml", color: COLOR.trust, name: "수분(ml)" }],
    },
    timelineData: [...perDay.entries()]
      .map(([date, amount]) => ({
        id: date,
        date,
        title: "수분 섭취",
        description: `${amount.toLocaleString()}ml`,
      }))
      .sort((a, b) => b.date.localeCompare(a.date)),
    trendSummary: [
      `[수분] 기간: ${periodLabel(period)}`,
      `총 ${total}ml, 기록일수 ${loggedDays}일, 일평균 ${avg}ml`,
      `추이: ${chartData.map((d) => `${d.label} ${d.ml}ml`).join(", ")}`,
    ].join("\n"),
  };
}

// --- 수면 -------------------------------------------------------------------
function buildSleep(data: RangeBundle, period: Period, today: Date): CategoryStats {
  const buckets = bucketsFor(period, today);
  const withSleep = data.records
    .map((r) => ({ r, hours: calcSleepHours(r.sleep_start, r.sleep_end) }))
    .filter((x): x is { r: typeof x.r; hours: number } => x.hours != null);

  const sums = new Map<string, { sum: number; n: number }>();
  for (const { r, hours } of withSleep) {
    const k = bucketKeyOf(r.date, period);
    const cur = sums.get(k) ?? { sum: 0, n: 0 };
    cur.sum += hours;
    cur.n += 1;
    sums.set(k, cur);
  }
  const chartData = buckets.map((b) => {
    const s = sums.get(b.key);
    return { label: b.label, hours: s ? round1(s.sum / s.n) : null };
  });

  const hoursArr = withSleep.map((x) => x.hours);
  const avg = hoursArr.length ? round1(hoursArr.reduce((a, c) => a + c, 0) / hoursArr.length) : 0;
  const min = hoursArr.length ? round1(Math.min(...hoursArr)) : 0;
  const max = hoursArr.length ? round1(Math.max(...hoursArr)) : 0;

  return {
    summaryItems: [
      { label: "평균 수면", value: `${avg}`, subValue: "시간" },
      { label: "기록한 날", value: withSleep.length, subValue: "일" },
      { label: "최소", value: `${min}`, subValue: "시간" },
      { label: "최대", value: `${max}`, subValue: "시간" },
    ],
    chartData,
    chartConfig: {
      kind: "line",
      xKey: "label",
      yKeys: [{ key: "hours", color: COLOR.trust, name: "수면(시간)" }],
    },
    timelineData: withSleep.map(({ r, hours }) => ({
      id: r.id,
      date: r.date,
      title: "수면",
      description: `${hours}시간`,
    })),
    trendSummary: [
      `[수면] 기간: ${periodLabel(period)}`,
      `기록일수 ${withSleep.length}일, 평균 ${avg}시간, 최소 ${min}시간, 최대 ${max}시간`,
      `추이: ${chartData.map((d) => `${d.label} ${d.hours ?? "-"}h`).join(", ")}`,
    ].join("\n"),
  };
}

// --- 영양제 -----------------------------------------------------------------
function buildSupplement(data: RangeBundle, period: Period, today: Date): CategoryStats {
  const buckets = bucketsFor(period, today);
  const dates = dateMap(data);
  const taken = data.supplements.filter((s) => s.taken);

  const cnt = new Map<string, number>();
  const perDay = new Map<string, number>();
  for (const s of taken) {
    const date = dates.get(s.daily_record_id);
    if (!date) continue;
    cnt.set(bucketKeyOf(date, period), (cnt.get(bucketKeyOf(date, period)) ?? 0) + 1);
    perDay.set(date, (perDay.get(date) ?? 0) + 1);
  }
  const chartData = buckets.map((b) => ({ label: b.label, count: cnt.get(b.key) ?? 0 }));

  const totalTaken = taken.length;
  const loggedDays = perDay.size;

  return {
    summaryItems: [
      { label: "총 복용", value: totalTaken, subValue: "회" },
      { label: "복용한 날", value: loggedDays, subValue: "일" },
      {
        label: "일평균 복용",
        value: `${loggedDays ? round1(totalTaken / loggedDays) : 0}`,
        subValue: "개/일",
      },
    ],
    chartData,
    chartConfig: {
      kind: "bar",
      xKey: "label",
      yKeys: [{ key: "count", color: COLOR.highlight, name: "복용 수" }],
    },
    timelineData: [...perDay.entries()]
      .map(([date, c]) => ({
        id: date,
        date,
        title: "영양제 복용",
        description: `${c}개 복용`,
      }))
      .sort((a, b) => b.date.localeCompare(a.date)),
    trendSummary: [
      `[영양제] 기간: ${periodLabel(period)}`,
      `총 복용 ${totalTaken}회, 복용한 날 ${loggedDays}일`,
      `추이: ${chartData.map((d) => `${d.label} ${d.count}개`).join(", ")}`,
    ].join("\n"),
  };
}

// --- 검진 / 인바디 ----------------------------------------------------------
function buildMetric(metrics: HealthMetric[]): CategoryStats {
  const inbody = metrics.filter((m) => m.metric_type === "inbody").length;
  const checkup = metrics.filter((m) => m.metric_type === "checkup").length;
  const latest = metrics[0]; // fetchAllHealthMetrics 는 날짜 내림차순

  // 가장 최근 측정값 중 앞쪽 3개 항목을 요약 카드로
  const latestEntries = latest ? Object.entries(latest.data).slice(0, 3) : [];
  const summaryItems: StatSummaryItem[] = [
    { label: "총 기록", value: metrics.length, subValue: "건" },
    ...latestEntries.map(([k, v]) => ({ label: k, value: String(v) })),
  ];
  while (summaryItems.length < 4 && summaryItems.length > 0) {
    summaryItems.push({ label: "—", value: "—" });
  }

  return {
    summaryItems,
    chartData: [], // 자유 형식 데이터라 표준 차트는 생략 (StatsLayout 이 빈 상태 처리)
    chartConfig: { kind: "line", xKey: "label", yKeys: [] },
    timelineData: metrics.map((m) => ({
      id: m.id,
      date: m.date,
      title: METRIC_LABEL[m.metric_type],
      description:
        Object.entries(m.data)
          .slice(0, 6)
          .map(([k, v]) => `${k} ${v}`)
          .join(" · ") || "측정값 없음",
    })),
    trendSummary: [
      `[검진/인바디] 인바디 ${inbody}건, 검진 ${checkup}건`,
      latest
        ? `최근 측정(${latest.date}, ${METRIC_LABEL[latest.metric_type]}): ${Object.entries(latest.data)
            .map(([k, v]) => `${k} ${v}`)
            .join(", ")}`
        : "측정 기록 없음",
    ].join("\n"),
  };
}
