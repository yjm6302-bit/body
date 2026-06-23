import { useCallback, useEffect, useState } from "react";
import {
  appendFastingSession,
  loadFastingState,
  saveFastingState,
  type FastingState,
} from "@/lib/fasting";

export interface UseFasting {
  state: FastingState;
  /** 공복 진행 중 여부 */
  running: boolean;
  start: () => void;
  stop: () => void;
  setGoal: (goalHours: number) => void;
}

/**
 * 공복 타이머 상태를 관리하는 훅. Dashboard 에서 한 번 생성해
 * FastingSheet(시작/종료/목표)와 LogGrid(식단 잠금 판단)가 같은 상태를 공유한다.
 */
export function useFasting(userId: string): UseFasting {
  const [state, setState] = useState<FastingState>(() => loadFastingState(userId));

  // 사용자가 바뀌면 해당 사용자 상태를 다시 읽는다.
  useEffect(() => {
    setState(loadFastingState(userId));
  }, [userId]);

  const persist = useCallback(
    (next: FastingState) => {
      setState(next);
      saveFastingState(userId, next);
    },
    [userId],
  );

  const start = useCallback(() => {
    setState((prev) => {
      const next = { ...prev, startedAt: Date.now() };
      saveFastingState(userId, next);
      return next;
    });
  }, [userId]);

  const stop = useCallback(() => {
    setState((prev) => {
      // 종료 시 진행 중이던 세션을 히스토리에 기록한다.
      if (prev.startedAt != null) {
        const end = Date.now();
        appendFastingSession(userId, {
          start: prev.startedAt,
          end,
          durationMs: Math.max(0, end - prev.startedAt),
          goalHours: prev.goalHours,
        });
      }
      const next = { ...prev, startedAt: null };
      saveFastingState(userId, next);
      return next;
    });
  }, [userId]);

  const setGoal = useCallback(
    (goalHours: number) => persist({ ...state, goalHours }),
    [persist, state],
  );

  return { state, running: state.startedAt != null, start, stop, setGoal };
}
