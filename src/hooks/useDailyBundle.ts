import { useCallback, useEffect, useState } from "react";
import { fetchDailyBundle } from "@/lib/repository";
import type { DailyBundle } from "@/types/database";

const EMPTY: DailyBundle = {
  record: null,
  cardio: [],
  strength: [],
  stretching: [],
  diet: [],
  water: [],
  supplements: [],
};

/**
 * 선택된 날짜의 하루치 데이터를 패치/리프레시한다.
 * 날짜가 바뀌면 자동 재패치 (specification.md: 실시간 패치 요구사항).
 */
export function useDailyBundle(userId: string | undefined, date: Date) {
  const [bundle, setBundle] = useState<DailyBundle>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDailyBundle(userId, date);
      setBundle(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "데이터를 불러오지 못했습니다.");
      setBundle(EMPTY);
    } finally {
      setLoading(false);
    }
    // date 객체는 매 렌더 새로 생성되므로 시간값으로 의존성 고정
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, date.getTime()]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { bundle, loading, error, reload };
}
