import {
  Footprints,
  Dumbbell,
  StretchHorizontal,
  Utensils,
  Pill,
  GlassWater,
  Moon,
  ScanLine,
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
  | "upload";

interface TileDef {
  key: SheetKey;
  label: string;
  icon: typeof Footprints;
  accent: string; // 아이콘/배지 색 (운동=green, 영양=amber, 수분·수면=blue)
}

const TILES: TileDef[] = [
  { key: "cardio", label: "유산소", icon: Footprints, accent: "text-exercise" },
  { key: "strength", label: "무산소", icon: Dumbbell, accent: "text-exercise" },
  { key: "stretching", label: "스트레칭", icon: StretchHorizontal, accent: "text-exercise" },
  { key: "diet", label: "식단", icon: Utensils, accent: "text-highlight" },
  { key: "supplement", label: "영양제", icon: Pill, accent: "text-highlight" },
  { key: "water", label: "수분", icon: GlassWater, accent: "text-trust" },
  { key: "sleep", label: "수면", icon: Moon, accent: "text-trust" },
  { key: "upload", label: "검진/인바디", icon: ScanLine, accent: "text-muted-foreground" },
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
    case "upload":
      return null;
  }
}

interface Props {
  bundle: DailyBundle;
  onOpen: (key: SheetKey) => void;
}

export function LogGrid({ bundle, onOpen }: Props) {
  return (
    <div className="grid grid-cols-4 gap-2.5">
      {TILES.map(({ key, label, icon: Icon, accent }) => {
        const summary = summaryFor(key, bundle);
        return (
          <button
            key={key}
            type="button"
            onClick={() => onOpen(key)}
            className={cn(
              "relative flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-surface p-1",
              "transition-colors hover:border-primary/50 active:scale-[0.97]",
            )}
          >
            <Icon className={cn("h-6 w-6", accent)} />
            <span className="text-xs font-medium text-foreground">{label}</span>
            {summary && (
              <span className="absolute right-1 top-1 rounded-full bg-primary/15 px-1.5 py-0.5 text-[0.6rem] font-semibold text-primary">
                {summary}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
