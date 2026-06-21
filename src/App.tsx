import { useAuth } from "@/hooks/useAuth";
import { isSupabaseConfigured } from "@/lib/supabase";
import { Toaster } from "@/components/ui/toaster";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { LoginScreen } from "@/components/auth/LoginScreen";
import { SetupNotice } from "@/components/auth/SetupNotice";
import { Loader2 } from "lucide-react";

export default function App() {
  const { user, loading } = useAuth();

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col bg-background">
      {!isSupabaseConfigured ? (
        <SetupNotice />
      ) : loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : user ? (
        <Dashboard userId={user.id} />
      ) : (
        <LoginScreen />
      )}
      <Toaster />
    </div>
  );
}
