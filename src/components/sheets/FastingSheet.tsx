import { useEffect, useMemo, useState } from "react";
import { Play, Square, Timer } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UseFasting } from "@/hooks/useFasting";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fasting: UseFasting;
}

// 자주 쓰는 간헐적 단식 목표 (공복 시간)
const GOALS = [12, 18, 24, 48, 74] as const;

function formatElapsed(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/** 간헐적 단식용 공복 타이머. 상태는 useFasting 훅(localStorage 기반)에서 공유받는다. */
export function FastingSheet({ open, onOpenChange, fasting }: Props) {
  const { state, running, start, stop, setGoal } = fasting;
  const [now, setNow] = useState(() => Date.now());

  // 진행 중이고 시트가 열려 있을 때만 1초마다 현재 시각을 갱신한다.
  useEffect(() => {
    if (!open || state.startedAt == null) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [open, state.startedAt]);

  const elapsedMs = state.startedAt != null ? Math.max(0, now - state.startedAt) : 0;
  const goalMs = state.goalHours * 3600 * 1000;
  const pct = useMemo(
    () => (goalMs > 0 ? Math.min(100, Math.round((elapsedMs / goalMs) * 100)) : 0),
    [elapsedMs, goalMs],
  );
  const reached = state.startedAt != null && elapsedMs >= goalMs;

  const startedText =
    state.startedAt != null
      ? new Date(state.startedAt).toLocaleString("ko-KR", {
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-highlight" /> 공복 타이머
          </DrawerTitle>
          <DrawerDescription>
            간헐적 단식 공복 시간을 측정합니다. 공복 중에는 식단 입력이 잠깁니다.
          </DrawerDescription>
        </DrawerHeader>

        <div className="space-y-4 overflow-y-auto px-5 py-2">
          {/* 목표 공복 시간 선택 */}
          <div>
            <p className="mb-2 text-xs font-semibold text-muted-foreground">목표 공복 시간</p>
            <div className="grid grid-cols-5 gap-1.5">
              {GOALS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGoal(g)}
                  className={cn(
                    "min-h-[44px] rounded-lg border text-sm font-medium transition-colors",
                    state.goalHours === g
                      ? "border-highlight bg-highlight/15 text-highlight"
                      : "border-border text-muted-foreground hover:border-highlight/50",
                  )}
                >
                  {g}시간
                </button>
              ))}
            </div>
          </div>

          {/* 경과 시간 + 진척도 */}
          <div className="rounded-xl border border-border bg-background p-5 text-center">
            <p className="font-mono text-4xl font-black tabular-nums text-foreground">
              {formatElapsed(elapsedMs)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {running
                ? reached
                  ? `목표 ${state.goalHours}시간 달성! 🎉`
                  : `목표 ${state.goalHours}시간까지 진행 중`
                : "타이머가 정지되어 있습니다."}
            </p>
            <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  reached ? "bg-exercise" : "bg-highlight",
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {pct}%{startedText && ` · ${startedText} 시작`}
            </p>
          </div>
        </div>

        <DrawerFooter>
          {running ? (
            <Button variant="secondary" onClick={stop} className="gap-2">
              <Square className="h-4 w-4" />
              공복 종료
            </Button>
          ) : (
            <Button variant="highlight" onClick={start} className="gap-2">
              <Play className="h-4 w-4" />
              공복 시작
            </Button>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
