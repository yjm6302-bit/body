import { differenceInYears } from "date-fns";
import { Drawer as DrawerPrimitive } from "vaul";
import {
  Stethoscope,
  Dumbbell,
  Footprints,
  GlassWater,
  LogOut,
  Moon,
  Pill,
  ScanLine,
  Scale,
  Utensils,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { StatCategory } from "@/lib/stats";
import type { Profile } from "@/types/database";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile | null;
  onSelectReport: () => void;
  onSelectCategory: (category: StatCategory) => void;
  onLogout: () => void;
}

const CATEGORIES: { key: StatCategory; label: string; icon: typeof Scale; accent: string }[] = [
  { key: "weight", label: "체중", icon: Scale, accent: "text-trust" },
  { key: "cardio", label: "유산소", icon: Footprints, accent: "text-exercise" },
  { key: "strength", label: "무산소", icon: Dumbbell, accent: "text-exercise" },
  { key: "diet", label: "식단", icon: Utensils, accent: "text-highlight" },
  { key: "water", label: "수분", icon: GlassWater, accent: "text-trust" },
  { key: "sleep", label: "수면", icon: Moon, accent: "text-trust" },
  { key: "supplement", label: "영양제", icon: Pill, accent: "text-highlight" },
  { key: "metric", label: "검진/인바디", icon: ScanLine, accent: "text-muted-foreground" },
];

/** 좌측 슬라이드인 사이드바 드로어 (햄버거 메뉴) */
export function Sidebar({
  open,
  onOpenChange,
  profile,
  onSelectReport,
  onSelectCategory,
  onLogout,
}: Props) {
  const age = profile ? differenceInYears(new Date(), new Date(profile.birth_date)) : null;

  return (
    <DrawerPrimitive.Root direction="right" open={open} onOpenChange={onOpenChange}>
      <DrawerPrimitive.Portal>
        <DrawerPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70" />
        <DrawerPrimitive.Content
          className="fixed inset-y-0 right-0 z-50 flex w-[82%] max-w-xs flex-col border-l border-border bg-surface"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DrawerPrimitive.Title className="sr-only">메뉴</DrawerPrimitive.Title>
          <DrawerPrimitive.Description className="sr-only">
            통계 및 종합 소견 메뉴
          </DrawerPrimitive.Description>

          {/* 프로필 요약 */}
          <div
            className="border-b border-border px-5 pb-4"
            style={{ paddingTop: "calc(env(safe-area-inset-top) + 3.5rem)" }}
          >
            <p className="text-base font-bold text-foreground">
              {profile?.gender ?? "—"}
              {age != null && <span className="text-muted-foreground"> · 만 {age}세</span>}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              키 {profile?.height ?? "—"}cm
            </p>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
            {/* 종합 건강 소견 */}
            <button
              type="button"
              onClick={onSelectReport}
              className="flex w-full items-center justify-between rounded-lg bg-primary/10 px-3 py-3 text-left transition-colors hover:bg-primary/15"
            >
              <span className="flex items-center gap-2.5">
                <Stethoscope className="h-5 w-5 text-primary" />
                <span className="font-semibold text-foreground">종합 건강 소견</span>
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>

            <p className="px-3 pb-1 pt-4 text-xs font-semibold text-muted-foreground">
              항목별 통계 및 타임라인
            </p>
            {CATEGORIES.map(({ key, label, icon: Icon, accent }) => (
              <button
                key={key}
                type="button"
                onClick={() => onSelectCategory(key)}
                className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-left transition-colors hover:bg-muted/60"
              >
                <span className="flex items-center gap-2.5">
                  <Icon className={cn("h-5 w-5", accent)} />
                  <span className="font-medium text-foreground">{label}</span>
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </nav>

          {/* 로그아웃 */}
          <div className="border-t border-border px-3 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <Button
              variant="ghost"
              onClick={onLogout}
              className="w-full justify-start gap-2.5 text-muted-foreground"
            >
              <LogOut className="h-5 w-5" />
              로그아웃
            </Button>
          </div>
        </DrawerPrimitive.Content>
      </DrawerPrimitive.Portal>
    </DrawerPrimitive.Root>
  );
}
