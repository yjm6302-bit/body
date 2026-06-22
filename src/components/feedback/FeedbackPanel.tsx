import { useState } from "react";
import { Loader2, Sparkles, Trophy, Dumbbell, Apple, Moon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { generateFeedback } from "@/lib/gemini";
import { saveAiFeedback } from "@/lib/repository";
import { cn } from "@/lib/utils";
import type { DailyBundle, Profile, SupplementSetting } from "@/types/database";

interface Props {
  bundle: DailyBundle;
  profile: Profile | null;
  settings: SupplementSetting[];
  onSaved: () => void;
}

type TabKey = "overall" | "exercise" | "nutrition" | "sleep";

export function FeedbackPanel({ bundle, profile, settings, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("overall");

  const record = bundle.record;
  const feedback = record?.ai_feedback;

  // 하루치 건강 데이터를 취합하여 텍스트 요약본 작성
  const buildDailySummary = (): string => {
    const lines: string[] = [];

    // 1) 기본 정보 및 신체 스펙
    if (profile) {
      const birth = profile.birth_date ? `(생년월일: ${profile.birth_date})` : "";
      lines.push(`- 신체 스펙: 성별 ${profile.gender}, 키 ${profile.height}cm ${birth}`);
    }
    if (record?.weight) {
      lines.push(`- 당일 몸무게: ${record.weight}kg`);
    }

    // 2) 유산소 운동
    if (bundle.cardio.length > 0) {
      const cStr = bundle.cardio
        .map((c) => `${c.type} ${c.distance}km (소요시간: ${Math.round(c.duration / 60)}분)`)
        .join(", ");
      lines.push(`- 유산소 운동: ${cStr}`);
    } else {
      lines.push("- 유산소 운동: 기록 없음");
    }

    // 3) 무산소 운동
    if (bundle.strength.length > 0) {
      const sStr = bundle.strength
        .map((s) => {
          const setsDetails = s.sets
            .map((set, idx) => `${idx + 1}세트(${set.weight}kg, ${set.reps}회)`)
            .join(" / ");
          return `${s.exercise_name} [${setsDetails}]`;
        })
        .join("\n   ");
      lines.push(`- 무산소 운동:\n   ${sStr}`);
    } else {
      lines.push("- 무산소 운동: 기록 없음");
    }

    // 4) 스트레칭
    if (bundle.stretching.length > 0) {
      const strStr = bundle.stretching
        .map((s) => `${s.name} ${s.duration}분`)
        .join(", ");
      lines.push(`- 스트레칭: ${strStr}`);
    } else {
      lines.push("- 스트레칭: 기록 없음");
    }

    // 5) 식단 (음식)
    if (bundle.diet.length > 0) {
      const dStr = bundle.diet
        .map((d) => `${d.meal_type}(${d.keywords.join(", ")})`)
        .join(", ");
      lines.push(`- 식단: ${dStr}`);
    } else {
      lines.push("- 식단: 기록 없음");
    }

    // 6) 영양제
    if (settings.length > 0) {
      const supStr = settings
        .map((set) => {
          const log = bundle.supplements.find((l) => l.supplement_setting_id === set.id);
          const takenText = log?.taken ? "복용" : "미복용";
          const detail = [set.dosage, set.ingredients].filter(Boolean).join(", ");
          return `${set.name}(${set.package_time} - ${takenText}${detail ? `; ${detail}` : ""})`;
        })
        .join(", ");
      lines.push(`- 영양제 섭취: ${supStr}`);
    } else {
      lines.push("- 영양제 설정 및 섭취: 기록 없음");
    }

    // 7) 수분 (물)
    if (bundle.water.length > 0) {
      const totalWater = bundle.water.reduce((acc, w) => acc + w.amount_ml, 0);
      lines.push(`- 수분 섭취량: 총 ${totalWater}ml`);
    } else {
      lines.push("- 수분 섭취량: 0ml");
    }

    // 8) 수면
    if (record?.sleep_start && record?.sleep_end) {
      const start = new Date(record.sleep_start);
      const end = new Date(record.sleep_end);
      const sleepHours = ((end.getTime() - start.getTime()) / (1000 * 60 * 60)).toFixed(1);
      const startText = start.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
      const endText = end.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
      lines.push(`- 수면 시간: ${startText} ~ ${endText} (총 ${sleepHours}시간)`);
    } else {
      lines.push("- 수면 시간: 기록 없음");
    }

    return lines.join("\n");
  };

  const handleRequestFeedback = async () => {
    if (!record) return;
    setLoading(true);
    try {
      const summaryText = buildDailySummary();
      const aiResponse = await generateFeedback(summaryText);
      await saveAiFeedback(record.id, aiResponse);
      toast.success("AI 피드백이 업데이트되었습니다.");
      onSaved();
    } catch (error: any) {
      console.error(error);
      let errMsg = "피드백 생성에 실패했습니다.";
      const msg = String(error?.message || "").toLowerCase();
      const status = error?.status;

      if (status === 503 || msg.includes("503") || msg.includes("unavailable") || msg.includes("overloaded")) {
        errMsg = "현재 AI 서비스의 트래픽이 많아 일시적으로 응답이 지연되고 있습니다. 잠시 후 '다시 분석' 버튼을 눌러주세요.";
      } else if (status === 429 || msg.includes("429") || msg.includes("quota") || msg.includes("exhausted")) {
        errMsg = "AI 서비스 요청 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.";
      } else if (error instanceof Error) {
        errMsg = error.message;
      }
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!record) return null;

  return (
    <div className="rounded-2xl bg-card p-5 border border-border/50 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-highlight animate-pulse" />
          <h3 className="font-bold text-base text-card-foreground">AI 데일리 분석 피드백</h3>
        </div>
        {feedback && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRequestFeedback}
            disabled={loading}
            className="h-8 text-xs gap-1 border-border/60 hover:bg-muted"
          >
            {loading && <Loader2 className="h-3 w-3 animate-spin" />}
            다시 분석
          </Button>
        )}
      </div>

      {!feedback ? (
        <div className="flex flex-col items-center justify-center text-center">
          <Button
            onClick={handleRequestFeedback}
            disabled={loading}
            className="w-full max-w-xs h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-medium rounded-xl gap-2 shadow-md transition-all active:scale-[0.98]"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                분석 보고서 작성 중...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                오늘 하루 피드백 받기
              </>
            )}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* 건강 점수 및 종합 요약 */}
          <div className="flex items-center gap-3 bg-muted/40 p-4 rounded-xl border border-border/30">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-highlight/10 text-highlight">
              <Trophy className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-medium">오늘의 건강 점수</div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-highlight">{feedback.score ?? 80}</span>
                <span className="text-sm text-muted-foreground">/ 100점</span>
              </div>
            </div>
          </div>

          {/* 탭 인터페이스 (국내 모바일 터치 가이드라인: 높이 44px 이상 확보, 충분한 패딩) */}
          <div className="grid grid-cols-4 gap-1 p-1 bg-muted/60 rounded-xl">
            {(
              [
                { key: "overall", label: "종합", icon: Sparkles },
                { key: "exercise", label: "운동", icon: Dumbbell },
                { key: "nutrition", label: "영양", icon: Apple },
                { key: "sleep", label: "수면", icon: Moon },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "flex flex-col items-center justify-center py-2 text-xs font-medium rounded-lg transition-all min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    isActive
                      ? "bg-card text-card-foreground shadow-sm font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-card/30"
                  )}
                >
                  <Icon className={cn("h-4 w-4 mb-1", isActive ? "text-primary" : "text-muted-foreground")} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* 탭 콘텐츠 영역 */}
          <div className="min-h-[100px] py-2">
            <p className="text-sm text-card-foreground leading-relaxed whitespace-pre-line animate-in fade-in duration-200">
              {activeTab === "overall" && feedback.overall}
              {activeTab === "exercise" && feedback.exercise}
              {activeTab === "nutrition" && feedback.nutrition}
              {activeTab === "sleep" && feedback.sleep}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
