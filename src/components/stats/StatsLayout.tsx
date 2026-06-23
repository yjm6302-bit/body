import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Sparkles, Upload } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/dashboard/AppHeader";
import { cn } from "@/lib/utils";
import type { CategoryStats, Period, StatSummaryItem, TimelineItem } from "@/lib/stats";

interface StatsLayoutProps {
  title: string;
  icon: React.ReactNode;
  accent: string; // 타이틀/포인트 텍스트 색 (text-exercise 등)
  period: Period;
  onPeriodChange: (p: Period) => void;
  loading: boolean;
  summaryItems: StatSummaryItem[];
  chartData: CategoryStats["chartData"];
  chartConfig: CategoryStats["chartConfig"];
  timelineData: TimelineItem[];
  aiFeedbackText: string | null;
  onGenerateAiFeedback: () => Promise<void>;
  loadingAiFeedback: boolean;
  onBack: () => void;
  onOpenMenu: () => void;
  /** 지정 시 타이틀 옆에 업로드 버튼을 노출한다 (검진/인바디 결과지 업로드 등). */
  onUpload?: () => void;
}

const TOOLTIP_STYLE = {
  backgroundColor: "#161E2E",
  border: "1px solid #1F2937",
  borderRadius: "0.5rem",
  fontSize: "0.75rem",
} as const;

export function StatsLayout({
  title,
  icon,
  accent,
  period,
  onPeriodChange,
  loading,
  summaryItems,
  chartData,
  chartConfig,
  timelineData,
  aiFeedbackText,
  onGenerateAiFeedback,
  loadingAiFeedback,
  onBack,
  onOpenMenu,
  onUpload,
}: StatsLayoutProps) {
  const hasChart = chartConfig.yKeys.length > 0 && chartData.length > 0;

  // 타임라인 페이지네이션 (5개 단위)
  const PAGE_SIZE = 5;
  const [page, setPage] = useState(0);
  // 카테고리/기간 변경 등으로 데이터가 바뀌면 첫 페이지로 복귀
  useEffect(() => {
    setPage(0);
  }, [timelineData]);
  const totalPages = Math.max(1, Math.ceil(timelineData.length / PAGE_SIZE));
  const pageItems = timelineData.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader onOpenMenu={onOpenMenu} onBack={onBack} />

      <main className="flex flex-1 flex-col gap-4 p-4 pb-24">
        {/* 화면 제목 */}
        <div className="flex items-center justify-between gap-2">
          <h1 className={cn("flex items-center gap-2 text-lg font-bold", accent)}>
            {icon}
            {title}
          </h1>
          {onUpload && (
            <Button
              type="button"
              size="sm"
              variant="highlight"
              onClick={onUpload}
              className="h-9 shrink-0 gap-1.5"
            >
              <Upload className="h-4 w-4" />
              결과지 업로드
            </Button>
          )}
        </div>

        {/* 기간 선택 탭 */}
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted/60 p-1">
          {(
            [
              { key: "weekly", label: "주간 (7일)" },
              { key: "yearly", label: "연간 (12개월)" },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => onPeriodChange(t.key)}
              className={cn(
                "min-h-[40px] rounded-lg text-sm font-medium transition-all",
                period === t.key
                  ? "bg-card text-card-foreground shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center py-20">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* 지표 요약 카드 (격자형) */}
            <div className="grid grid-cols-2 gap-2.5">
              {summaryItems.map((s, i) => (
                <div
                  key={`${s.label}-${i}`}
                  className="rounded-xl border border-border bg-surface p-3"
                >
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl font-bold text-foreground">{s.value}</span>
                    {s.subValue && (
                      <span className="text-xs text-muted-foreground">{s.subValue}</span>
                    )}
                  </p>
                </div>
              ))}
            </div>

            {/* 차트 */}
            <div className="rounded-xl border border-border bg-surface p-3">
              {hasChart ? (
                <ResponsiveContainer width="100%" height={200}>
                  {chartConfig.kind === "line" ? (
                    <LineChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                      <defs>
                        {chartConfig.yKeys.map((y) => (
                          <linearGradient
                            key={y.key}
                            id={`grad-${y.key}`}
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop offset="0%" stopColor={y.color} stopOpacity={0.9} />
                            <stop offset="100%" stopColor={y.color} stopOpacity={0.3} />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                      <XAxis
                        dataKey={chartConfig.xKey}
                        tick={{ fill: "#9CA3AF", fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tick={{ fill: "#9CA3AF", fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        width={40}
                      />
                      <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ stroke: "#1F2937" }} />
                      {chartConfig.yKeys.map((y) => (
                        <Line
                          key={y.key}
                          type="monotone"
                          dataKey={y.key}
                          name={y.name}
                          stroke={y.color}
                          strokeWidth={2.5}
                          dot={{ r: 3, fill: y.color }}
                          activeDot={{ r: 5 }}
                          connectNulls
                        />
                      ))}
                    </LineChart>
                  ) : (
                    <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                      <defs>
                        {chartConfig.yKeys.map((y) => (
                          <linearGradient
                            key={y.key}
                            id={`grad-${y.key}`}
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop offset="0%" stopColor={y.color} stopOpacity={1} />
                            <stop offset="100%" stopColor={y.color} stopOpacity={0.4} />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                      <XAxis
                        dataKey={chartConfig.xKey}
                        tick={{ fill: "#9CA3AF", fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tick={{ fill: "#9CA3AF", fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        width={40}
                      />
                      <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "#1F2937", opacity: 0.4 }} />
                      {chartConfig.yKeys.map((y) => (
                        <Bar
                          key={y.key}
                          dataKey={y.key}
                          name={y.name}
                          fill={`url(#grad-${y.key})`}
                          radius={[4, 4, 0, 0]}
                        />
                      ))}
                    </BarChart>
                  )}
                </ResponsiveContainer>
              ) : (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  표시할 차트 데이터가 없습니다.
                </p>
              )}
            </div>

            {/* AI 트렌드 분석 패널 */}
            <div className="space-y-3 rounded-2xl border border-border/50 bg-card p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 animate-pulse text-highlight" />
                <h3 className="text-sm font-bold text-card-foreground">AI 트렌드 분석</h3>
              </div>
              {aiFeedbackText ? (
                <p className="whitespace-pre-line text-sm leading-relaxed text-card-foreground">
                  {aiFeedbackText}
                </p>
              ) : (
                <Button
                  onClick={onGenerateAiFeedback}
                  disabled={loadingAiFeedback}
                  className="h-10 w-full gap-2 rounded-xl"
                >
                  {loadingAiFeedback ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      분석 중...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      이 항목 추세 분석받기
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* 타임라인 */}
            <section className="space-y-2">
              <h2 className={cn("text-sm font-semibold", accent)}>타임라인</h2>
              {timelineData.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                  기간 내 기록이 없습니다.
                </p>
              ) : (
                <>
                  <ul className="space-y-2">
                    {pageItems.map((t) => (
                      <li
                        key={t.id}
                        className="flex items-start justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">{t.title}</p>
                          <p className="truncate text-xs text-muted-foreground">{t.description}</p>
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">{t.date}</span>
                      </li>
                    ))}
                  </ul>

                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-4 pt-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="이전 페이지"
                        disabled={page === 0}
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        {page + 1} / {totalPages}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="다음 페이지"
                        disabled={page >= totalPages - 1}
                        onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
