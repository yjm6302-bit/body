import { useEffect, useMemo, useState } from "react";
import {
  Dumbbell,
  Footprints,
  GlassWater,
  Moon,
  Pill,
  ScanLine,
  Scale,
  Utensils,
} from "lucide-react";
import { toast } from "@/components/ui/toaster";
import { useRangeBundle } from "@/hooks/useRangeBundle";
import { generateTrendFeedback } from "@/lib/gemini";
import { buildCategoryStats, type Period, type StatCategory } from "@/lib/stats";
import { StatsLayout } from "./StatsLayout";

interface Props {
  userId: string;
  category: StatCategory;
  onBack: () => void;
  onOpenMenu: () => void;
}

interface CategoryMeta {
  title: string;
  icon: React.ReactNode;
  accent: string;
}

const META: Record<StatCategory, CategoryMeta> = {
  weight: { title: "체중", icon: <Scale className="h-5 w-5" />, accent: "text-trust" },
  cardio: { title: "유산소", icon: <Footprints className="h-5 w-5" />, accent: "text-exercise" },
  strength: { title: "무산소", icon: <Dumbbell className="h-5 w-5" />, accent: "text-exercise" },
  diet: { title: "식단", icon: <Utensils className="h-5 w-5" />, accent: "text-highlight" },
  water: { title: "수분", icon: <GlassWater className="h-5 w-5" />, accent: "text-trust" },
  sleep: { title: "수면", icon: <Moon className="h-5 w-5" />, accent: "text-trust" },
  supplement: { title: "영양제", icon: <Pill className="h-5 w-5" />, accent: "text-highlight" },
  metric: { title: "검진/인바디", icon: <ScanLine className="h-5 w-5" />, accent: "text-muted-foreground" },
};

export function StatsView({ userId, category, onBack, onOpenMenu }: Props) {
  const [period, setPeriod] = useState<Period>("weekly");
  // 조회 범위와 차트 버킷 계산을 일치시키기 위한 기준 시각 (마운트 시 1회 고정)
  const [today] = useState(() => new Date());
  const { data, metrics, loading } = useRangeBundle(userId, period, today);

  const [aiText, setAiText] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const meta = META[category];
  const stats = useMemo(
    () => buildCategoryStats(category, data, metrics, period, today),
    [category, data, metrics, period, today],
  );

  // 카테고리/기간이 바뀌면 직전 트렌드 분석 결과는 초기화
  useEffect(() => {
    setAiText(null);
  }, [category, period]);

  const handleGenerate = async () => {
    setAiLoading(true);
    try {
      const { feedback } = await generateTrendFeedback(meta.title, stats.trendSummary);
      setAiText(feedback);
    } catch (error: any) {
      console.error(error);
      const msg = String(error?.message || "").toLowerCase();
      const status = error?.status;
      let errMsg = "추세 분석에 실패했습니다.";
      if (status === 503 || msg.includes("503") || msg.includes("unavailable") || msg.includes("overloaded")) {
        errMsg = "현재 AI 서비스 트래픽이 많습니다. 잠시 후 다시 시도해 주세요.";
      } else if (status === 429 || msg.includes("429") || msg.includes("quota") || msg.includes("exhausted")) {
        errMsg = "AI 서비스 요청 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.";
      } else if (error instanceof Error) {
        errMsg = error.message;
      }
      toast.error(errMsg);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <StatsLayout
      title={meta.title}
      icon={meta.icon}
      accent={meta.accent}
      period={period}
      onPeriodChange={setPeriod}
      loading={loading}
      summaryItems={stats.summaryItems}
      chartData={stats.chartData}
      chartConfig={stats.chartConfig}
      timelineData={stats.timelineData}
      aiFeedbackText={aiText}
      onGenerateAiFeedback={handleGenerate}
      loadingAiFeedback={aiLoading}
      onBack={onBack}
      onOpenMenu={onOpenMenu}
    />
  );
}
