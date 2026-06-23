// 공복(간헐적 단식) 타이머의 상태와 기록을 브라우저(localStorage)에 보관한다.
// 별도 백엔드 테이블 없이 이 기기 기준으로 진행 상태와 완료 세션 히스토리를 관리하며,
// 종합 리포트에서는 히스토리를 집계해 분석에 반영한다.

/** 현재 진행 중인 공복 상태 */
export interface FastingState {
  /** 공복 시작 시각 (epoch ms). 진행 중이 아니면 null */
  startedAt: number | null;
  /** 목표 공복 시간 (시간 단위) */
  goalHours: number;
}

/** 완료된(종료된) 공복 세션 한 건 */
export interface FastingSession {
  start: number; // epoch ms
  end: number; // epoch ms
  durationMs: number;
  goalHours: number;
}

export const DEFAULT_GOAL_HOURS = 18;

// 히스토리가 무한히 커지지 않도록 최근 200건만 보관한다.
const MAX_HISTORY = 200;

const stateKey = (userId: string) => `fasting:${userId}`;
const historyKey = (userId: string) => `fasting-history:${userId}`;

export function loadFastingState(userId: string): FastingState {
  try {
    const raw = localStorage.getItem(stateKey(userId));
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<FastingState>;
      return {
        startedAt: typeof parsed.startedAt === "number" ? parsed.startedAt : null,
        goalHours: typeof parsed.goalHours === "number" ? parsed.goalHours : DEFAULT_GOAL_HOURS,
      };
    }
  } catch {
    /* 손상된 값은 무시하고 초기 상태로 */
  }
  return { startedAt: null, goalHours: DEFAULT_GOAL_HOURS };
}

export function saveFastingState(userId: string, state: FastingState): void {
  try {
    localStorage.setItem(stateKey(userId), JSON.stringify(state));
  } catch {
    /* 저장 실패해도 화면 동작은 유지 */
  }
}

export function loadFastingHistory(userId: string): FastingSession[] {
  try {
    const raw = localStorage.getItem(historyKey(userId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as FastingSession[];
    }
  } catch {
    /* 무시 */
  }
  return [];
}

/** 완료된 공복 세션을 히스토리에 추가하고 갱신된 배열을 반환한다. */
export function appendFastingSession(userId: string, session: FastingSession): FastingSession[] {
  const next = [...loadFastingHistory(userId), session].slice(-MAX_HISTORY);
  try {
    localStorage.setItem(historyKey(userId), JSON.stringify(next));
  } catch {
    /* 무시 */
  }
  return next;
}

export interface FastingSummary {
  /** 집계 기간 내 완료 공복 횟수 */
  count: number;
  /** 평균 공복 시간(시간) */
  avgHours: number;
  /** 최장 공복 시간(시간) */
  maxHours: number;
  /** 목표 시간 이상 달성한 횟수 */
  goalMetCount: number;
}

/** sinceMs(epoch) 이후 종료된 공복 세션을 집계한다. */
export function summarizeFasting(history: FastingSession[], sinceMs: number): FastingSummary {
  const recent = history.filter((s) => s.end >= sinceMs);
  if (recent.length === 0) {
    return { count: 0, avgHours: 0, maxHours: 0, goalMetCount: 0 };
  }
  const hours = recent.map((s) => s.durationMs / 3_600_000);
  const total = hours.reduce((a, c) => a + c, 0);
  const max = hours.reduce((a, c) => Math.max(a, c), 0);
  const goalMet = recent.filter((s) => s.durationMs >= s.goalHours * 3_600_000).length;
  return {
    count: recent.length,
    avgHours: Math.round((total / recent.length) * 10) / 10,
    maxHours: Math.round(max * 10) / 10,
    goalMetCount: goalMet,
  };
}
