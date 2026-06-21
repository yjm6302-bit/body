import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

/**
 * 1인 전용 앱 인증 훅.
 * - VITE_APP_EMAIL / VITE_APP_PASSWORD 가 설정되어 있으면 자동 로그인 시도.
 * - 그 외에는 LoginScreen 에서 수동 로그인.
 */
export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        setSession(data.session);
        setLoading(false);
        return;
      }
      // 자동 로그인 (환경변수 제공 시)
      const email = import.meta.env.VITE_APP_EMAIL;
      const password = import.meta.env.VITE_APP_PASSWORD;
      if (email && password) {
        await supabase.auth.signInWithPassword({ email, password });
      }
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = (email: string, password: string) =>
    supabase.auth.signInWithPassword({ email, password });

  const signUp = (email: string, password: string) =>
    supabase.auth.signUp({ email, password });

  const signOut = () => supabase.auth.signOut();

  return { session, user: session?.user ?? null, loading, signIn, signUp, signOut };
}
