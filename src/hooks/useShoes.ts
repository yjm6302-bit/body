import { useCallback, useEffect, useState } from "react";
import { fetchShoesWithMileage } from "@/lib/repository";
import type { ShoeWithMileage } from "@/types/database";

export function useShoes(userId: string | undefined) {
  const [shoes, setShoes] = useState<ShoeWithMileage[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      setShoes(await fetchShoesWithMileage(userId));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { shoes, loading, reload };
}
