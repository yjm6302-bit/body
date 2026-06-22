import { useCallback, useEffect, useState } from "react";
import { fetchAllHealthMetrics, fetchDailyRecordsInRange } from "@/lib/repository";
import { rangeFor, type Period } from "@/lib/stats";
import type { HealthMetric, RangeBundle } from "@/types/database";

const EMPTY: RangeBundle = {
  records: [],
  cardio: [],
  strength: [],
  stretching: [],
  diet: [],
  water: [],
  supplements: [],
};

/**
 * 통계 화면용: 선택한 기간(주간/연간)의 RangeBundle 과 전체 검진/인바디를 패치한다.
 * `today` 는 호출부에서 한 번만 생성해 넘겨 조회범위와 버킷 계산을 일치시킨다.
 */
export function useRangeBundle(userId: string | undefined, period: Period, today: Date) {
  const [data, setData] = useState<RangeBundle>(EMPTY);
  const [metrics, setMetrics] = useState<HealthMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const { start, end } = rangeFor(period, today);
      const [bundle, hm] = await Promise.all([
        fetchDailyRecordsInRange(userId, start, end),
        fetchAllHealthMetrics(userId),
      ]);
      setData(bundle);
      setMetrics(hm);
    } catch (e) {
      setError(e instanceof Error ? e.message : "데이터를 불러오지 못했습니다.");
      setData(EMPTY);
    } finally {
      setLoading(false);
    }
    // today 객체는 호출부에서 고정되므로 시간값으로 의존성 안정화
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, period, today.getTime()]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, metrics, loading, error, reload };
}
