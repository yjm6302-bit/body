import { useEffect, useMemo, useState } from "react";
import { differenceInYears, subDays } from "date-fns";
import { Activity, Stethoscope, HeartPulse, Loader2, Sparkles, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/dashboard/AppHeader";
import { toast } from "@/components/ui/toaster";
import { generateComprehensiveReport } from "@/lib/gemini";
import { fetchAllHealthMetrics, fetchDailyRecordsInRange } from "@/lib/repository";
import { calcSleepHours, cn, toDateKey } from "@/lib/utils";
import type {
  ComprehensiveReport,
  HealthMetric,
  Profile,
  RangeBundle,
} from "@/types/database";

interface Props {
  userId: string;
  profile: Profile | null;
  onBack: () => void;
  onOpenMenu: () => void;
}

const EMPTY: RangeBundle = {
  records: [],
  cardio: [],
  strength: [],
  stretching: [],
  diet: [],
  water: [],
  supplements: [],
};

const METRIC_LABEL: Record<HealthMetric["metric_type"], string> = {
  inbody: "인바디",
  checkup: "건강검진",
};

export function ComprehensiveReportView({ userId, profile, onBack, onOpenMenu }: Props) {
  const [today] = useState(() => new Date());
  const [data, setData] = useState<RangeBundle>(EMPTY);
  const [metrics, setMetrics] = useState<HealthMetric[]>([]);
  const [loading, setLoading] = useState(true);

  const [report, setReport] = useState<ComprehensiveReport | null>(null);
  const [generating, setGenerating] = useState(false);

  // 최근 30일 통합 데이터 + 검진/인바디 패치
  useEffect(() => {
    let alive = true;
    setLoading(true);
    const start = toDateKey(subDays(today, 29));
    const end = toDateKey(today);
    Promise.all([fetchDailyRecordsInRange(userId, start, end), fetchAllHealthMetrics(userId)])
      .then(([bundle, hm]) => {
        if (!alive) return;
        setData(bundle);
        setMetrics(hm);
      })
      .catch(() => toast.error("데이터를 불러오지 못했습니다."))
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [userId, today]);

  // 30일 집계 (요약 카드 + AI 프롬프트 공용)
  const agg = useMemo(() => {
    const weights = data.records.map((r) => r.weight).filter((w): w is number => w != null);
    const avgWeight = weights.length
      ? Math.round((weights.reduce((a, c) => a + Number(c), 0) / weights.length) * 10) / 10
      : null;
    const cardioDist =
      Math.round(data.cardio.reduce((a, c) => a + Number(c.distance), 0) * 10) / 10;
    const strengthVol = Math.round(
      data.strength.reduce(
        (a, s) => a + s.sets.reduce((b, set) => b + Number(set.weight) * set.reps, 0),
        0,
      ),
    );
    const waterTotal = data.water.reduce((a, w) => a + w.amount_ml, 0);
    const waterDays = new Set(data.water.map((w) => w.daily_record_id)).size;
    const sleeps = data.records
      .map((r) => calcSleepHours(r.sleep_start, r.sleep_end))
      .filter((h): h is number => h != null);
    const avgSleep = sleeps.length
      ? Math.round((sleeps.reduce((a, c) => a + c, 0) / sleeps.length) * 10) / 10
      : null;
    const takenSupp = data.supplements.filter((s) => s.taken).length;

    return {
      avgWeight,
      cardioCount: data.cardio.length,
      cardioDist,
      strengthCount: data.strength.length,
      strengthVol,
      dietCount: data.diet.length,
      waterAvg: waterDays ? Math.round(waterTotal / waterDays) : 0,
      avgSleep,
      takenSupp,
    };
  }, [data]);

  const recentMetrics = metrics.slice(0, 3);
  const age = profile ? differenceInYears(today, new Date(profile.birth_date)) : null;

  const buildSummary = (): string => {
    const lines: string[] = [];
    if (profile) {
      lines.push(
        `■ 프로필: 성별 ${profile.gender}, ${age != null ? `만 ${age}세` : "나이 미상"}, 키 ${profile.height}cm`,
      );
    }
    if (agg.avgWeight != null) lines.push(`■ 최근 평균 체중: ${agg.avgWeight}kg`);

    lines.push("■ 최근 검진/인바디 (최신순):");
    if (recentMetrics.length === 0) {
      lines.push("  - 기록 없음");
    } else {
      for (const m of recentMetrics) {
        const entries = Object.entries(m.data)
          .map(([k, v]) => `${k} ${v}`)
          .join(", ");
        lines.push(`  - ${m.date} ${METRIC_LABEL[m.metric_type]}: ${entries}`);
      }
    }

    lines.push("■ 최근 30일 일상 로그 요약:");
    lines.push(`  - 유산소: ${agg.cardioCount}회, 총 ${agg.cardioDist}km`);
    lines.push(`  - 무산소: ${agg.strengthCount}건, 총 볼륨 ${agg.strengthVol}kg`);
    lines.push(`  - 식단 기록: ${agg.dietCount}끼`);
    lines.push(`  - 수분: 일평균 ${agg.waterAvg}ml`);
    lines.push(`  - 수면: 평균 ${agg.avgSleep != null ? `${agg.avgSleep}시간` : "기록 없음"}`);
    lines.push(`  - 영양제: 총 ${agg.takenSupp}회 복용`);

    return lines.join("\n");
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const result = await generateComprehensiveReport(buildSummary());
      setReport(result);
    } catch (error: any) {
      console.error(error);
      const msg = String(error?.message || "").toLowerCase();
      const status = error?.status;
      let errMsg = "보고서 생성에 실패했습니다.";
      if (status === 503 || msg.includes("503") || msg.includes("unavailable") || msg.includes("overloaded")) {
        errMsg = "현재 AI 서비스 트래픽이 많습니다. 잠시 후 다시 시도해 주세요.";
      } else if (status === 429 || msg.includes("429") || msg.includes("quota") || msg.includes("exhausted")) {
        errMsg = "AI 서비스 요청 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.";
      } else if (error instanceof Error) {
        errMsg = error.message;
      }
      toast.error(errMsg);
    } finally {
      setGenerating(false);
    }
  };

  const summaryCards = [
    { label: "평균 체중", value: agg.avgWeight != null ? `${agg.avgWeight}kg` : "—" },
    { label: "유산소", value: `${agg.cardioCount}회 · ${agg.cardioDist}km` },
    { label: "무산소", value: `${agg.strengthCount}건` },
    { label: "식단", value: `${agg.dietCount}끼` },
    { label: "수분(일평균)", value: `${agg.waterAvg.toLocaleString()}ml` },
    { label: "수면(평균)", value: agg.avgSleep != null ? `${agg.avgSleep}시간` : "—" },
  ];

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader onOpenMenu={onOpenMenu} onBack={onBack} />

      <main className="flex flex-1 flex-col gap-4 p-4 pb-24">
        <h1 className="flex items-center gap-2 text-lg font-bold text-primary">
          <Stethoscope className="h-5 w-5" />
          종합 건강 소견
        </h1>

        {loading ? (
          <div className="flex flex-1 items-center justify-center py-20">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* 최근 30일 요약 */}
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground">최근 30일 요약</h2>
              <div className="grid grid-cols-2 gap-2.5">
                {summaryCards.map((c) => (
                  <div key={c.label} className="rounded-xl border border-border bg-surface p-3">
                    <p className="text-xs text-muted-foreground">{c.label}</p>
                    <p className="mt-1 text-base font-bold text-foreground">{c.value}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* 최근 검진/인바디 */}
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground">최근 검진 / 인바디</h2>
              {recentMetrics.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
                  등록된 검진/인바디 데이터가 없습니다.
                </p>
              ) : (
                <ul className="space-y-2">
                  {recentMetrics.map((m) => (
                    <li key={m.id} className="rounded-lg border border-border bg-surface px-3 py-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">
                          {METRIC_LABEL[m.metric_type]}
                        </span>
                        <span className="text-xs text-muted-foreground">{m.date}</span>
                      </div>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {Object.entries(m.data)
                          .slice(0, 6)
                          .map(([k, v]) => `${k} ${v}`)
                          .join(" · ")}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* 발행 버튼 */}
            <Button
              onClick={handleGenerate}
              disabled={generating}
              className="h-12 w-full gap-2 rounded-xl text-base shadow-md"
            >
              {generating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  보고서 작성 중...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  {report ? "보고서 다시 발행하기" : "AI 통합 건강 보고서 발행하기"}
                </>
              )}
            </Button>

            {/* 결과 */}
            {report && (
              <div className="space-y-4 animate-in fade-in duration-300">
                {/* 종합 점수 게이지 */}
                <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-semibold text-muted-foreground">
                      종합 건강 점수
                    </span>
                    <span className="text-3xl font-black text-highlight">
                      {report.overallScore}
                      <span className="ml-1 text-sm font-medium text-muted-foreground">/ 100</span>
                    </span>
                  </div>
                  <div className="mt-3 h-3 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        report.overallScore >= 80
                          ? "bg-exercise"
                          : report.overallScore >= 60
                            ? "bg-highlight"
                            : "bg-danger",
                      )}
                      style={{ width: `${Math.max(0, Math.min(100, report.overallScore))}%` }}
                    />
                  </div>
                </div>

                <ReportSection
                  icon={<HeartPulse className="h-5 w-5 text-trust" />}
                  title="체성분 · 검진 분석"
                  body={report.bodyCompositionAnalysis}
                />
                <ReportSection
                  icon={<Activity className="h-5 w-5 text-exercise" />}
                  title="생활 · 영양 피드백"
                  body={report.lifestyleAnalysis}
                />
                <ReportSection
                  icon={<Target className="h-5 w-5 text-highlight" />}
                  title="4주 실천 가이드"
                  body={report.actionPlan}
                />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function ReportSection({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="space-y-2 rounded-2xl border border-border/50 bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-bold text-card-foreground">{title}</h3>
      </div>
      <p className="whitespace-pre-line text-sm leading-relaxed text-card-foreground">{body}</p>
    </div>
  );
}
