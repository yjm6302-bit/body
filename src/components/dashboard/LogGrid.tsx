import {
  Footprints,
  Dumbbell,
  StretchHorizontal,
  Utensils,
  Pill,
  GlassWater,
  Moon,
  Timer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DailyBundle } from "@/types/database";

export type SheetKey =
  | "cardio"
  | "strength"
  | "stretching"
  | "diet"
  | "supplement"
  | "water"
  | "sleep"
  | "fasting";

interface TileDef {
  key: SheetKey;
  label: string;
  icon: typeof Footprints;
  accent: string; // 아이콘/배지 색 (운동=green, 영양=amber, 수분·수면=blue)
}

// 색상(영역)별 배치: 1행=초록(운동), 2행=주황(영양/타이머)을 나란히,
// 파랑(수분·수면)은 오른쪽 4번째 열에 상하로 정렬되도록 순서를 구성한다.
//   유산소 무산소 스트레칭 | 수분
//   식단   영양제 공복타이머 | 수면
const TILES: TileDef[] = [
  { key: "cardio", label: "유산소", icon: Footprints, accent: "text-exercise" },
  { key: "strength", label: "무산소", icon: Dumbbell, accent: "text-exercise" },
  { key: "stretching", label: "스트레칭", icon: StretchHorizontal, accent: "text-exercise" },
  { key: "water", label: "수분", icon: GlassWater, accent: "text-trust" },
  { key: "diet", label: "식단", icon: Utensils, accent: "text-highlight" },
  { key: "supplement", label: "영양제", icon: Pill, accent: "text-highlight" },
  { key: "fasting", label: "공복타이머", icon: Timer, accent: "text-highlight" },
  { key: "sleep", label: "수면", icon: Moon, accent: "text-trust" },
];

/** 각 항목별 입력 요약(개수/뱃지)을 계산 */
function summaryFor(key: SheetKey, bundle: DailyBundle): string | null {
  switch (key) {
    case "cardio":
      return bundle.cardio.length ? `${bundle.cardio.length}건` : null;
    case "strength":
      return bundle.strength.length ? `${bundle.strength.length}개` : null;
    case "stretching":
      return bundle.stretching.length ? `${bundle.stretching.length}건` : null;
    case "diet":
      return bundle.diet.length ? `${bundle.diet.length}끼` : null;
    case "supplement": {
      const taken = bundle.supplements.filter((s) => s.taken).length;
      return taken ? `${taken}개 복용` : null;
    }
    case "water": {
      const ml = bundle.water.reduce((s, w) => s + w.amount_ml, 0);
      return ml ? `${ml}ml` : null;
    }
    case "sleep":
      return bundle.record?.sleep_start && bundle.record?.sleep_end ? "기록됨" : null;
    case "fasting":
      // 공복 진행 상태는 FastingSheet 내부(로컬 저장)에서 관리하므로 배지는 표시하지 않는다.
      return null;
  }
}

interface Props {
  bundle: DailyBundle;
  onOpen: (key: SheetKey) => void;
  /** 공복 진행 중이면 식단 입력을 잠근다. */
  fastingActive?: boolean;
}

export function LogGrid({ bundle, onOpen, fastingActive = false }: Props) {
  return (
    <div className="grid grid-cols-4 gap-2.5">
      {TILES.map(({ key, label, icon: Icon, accent }) => {
        // 공복 중에는 식단 타일을 비활성화한다.
        const locked = key === "diet" && fastingActive;
        const summary = summaryFor(key, bundle);
        return (
          <button
            key={key}
            type="button"
            disabled={locked}
            // 드로어는 onOpenAutoFocus 를 막아 포커스를 자동 이동시키지 않는다.
            // 트리거 버튼이 포커스를 유지한 채 vaul 이 배경에 aria-hidden 을 걸면
            // "focused element hidden from AT" 경고가 발생하므로, 열기 전에 blur 한다.
            onClick={(e) => {
              e.currentTarget.blur();
              onOpen(key);
            }}
            className={cn(
              "relative flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-surface p-1",
              "transition-colors hover:border-primary/50 active:scale-[0.97]",
              locked && "cursor-not-allowed opacity-40 hover:border-border active:scale-100",
            )}
          >
            <Icon className={cn("h-6 w-6", accent)} />
            <span className="text-xs font-medium text-foreground">{label}</span>
            {locked ? (
              <span className="absolute right-1 top-1 rounded-full bg-highlight/15 px-1.5 py-0.5 text-[0.6rem] font-semibold text-highlight">
                공복 중
              </span>
            ) : (
              summary && (
                <span className="absolute right-1 top-1 rounded-full bg-primary/15 px-1.5 py-0.5 text-[0.6rem] font-semibold text-primary">
                  {summary}
                </span>
              )
            )}
          </button>
        );
      })}
    </div>
  );
}
