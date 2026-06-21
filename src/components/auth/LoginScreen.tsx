import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/toaster";
import { HeartPulse, Loader2 } from "lucide-react";

export function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState(import.meta.env.VITE_APP_EMAIL ?? "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const getKoreanErrorMessage = (msg: string): string => {
    const lower = msg.toLowerCase();
    if (lower.includes("invalid login credentials")) {
      return "이메일 또는 비밀번호가 일치하지 않습니다.";
    }
    if (lower.includes("user already registered")) {
      return "이미 가입된 이메일 주소입니다.";
    }
    if (lower.includes("email not confirmed") || lower.includes("verification")) {
      return "이메일 인증이 필요합니다. 메일함을 확인해 주세요.";
    }
    if (lower.includes("password")) {
      return "비밀번호 규칙이 올바르지 않습니다. (최소 6자 이상)";
    }
    if (lower.includes("rate limit") || lower.includes("too many requests")) {
      return "요청 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.";
    }
    return msg;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const fn = mode === "signin" ? signIn : signUp;
      const { error } = await fn(email, password);
      if (error) {
        toast.error(getKoreanErrorMessage(error.message));
      } else if (mode === "signup") {
        toast.success("가입 완료! 이메일 인증 후 로그인하세요.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6">
      <div className="mb-8 flex flex-col items-center gap-2">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15">
          <HeartPulse className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-xl font-bold">건강관리</h1>
        <p className="text-sm text-muted-foreground">매일의 기록이 건강을 만듭니다</p>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>{mode === "signin" ? "로그인" : "회원가입"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "signin" ? "로그인" : "회원가입"}
            </Button>
          </form>
          <button
            type="button"
            className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin" ? "계정이 없으신가요? 회원가입" : "이미 계정이 있으신가요? 로그인"}
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
