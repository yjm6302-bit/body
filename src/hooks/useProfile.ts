import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types/database";

export function useProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    setProfile((data as Profile) ?? null);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const update = useCallback(
    async (patch: Partial<Pick<Profile, "birth_date" | "gender" | "height">>) => {
      if (!userId) return;
      const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
      if (error) throw error;
      await load();
    },
    [userId, load],
  );

  return { profile, loading, update, reload: load };
}
