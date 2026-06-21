import { useCallback, useEffect, useState } from "react";
import { fetchSupplementSettings } from "@/lib/repository";
import type { SupplementSetting } from "@/types/database";

export function useSupplementSettings(userId: string | undefined) {
  const [settings, setSettings] = useState<SupplementSetting[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      setSettings(await fetchSupplementSettings(userId));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { settings, loading, reload };
}
