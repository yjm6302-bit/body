import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

/** 환경변수 미설정 시 안내 화면 */
export function SetupNotice() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-highlight">
            <AlertTriangle className="h-5 w-5" /> 환경 설정이 필요합니다
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            <code className="rounded bg-background px-1 text-foreground">.env.example</code> 를{" "}
            <code className="rounded bg-background px-1 text-foreground">.env</code> 로 복사한 뒤
            아래 값을 채워주세요.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>VITE_SUPABASE_URL</li>
            <li>VITE_SUPABASE_ANON_KEY</li>
          </ul>
          <p>
            Supabase 프로젝트 생성 후{" "}
            <code className="rounded bg-background px-1 text-foreground">supabase/schema.sql</code>{" "}
            을 SQL Editor 에서 실행하면 테이블이 준비됩니다.
          </p>
          <p>
            Gemini API 키는{" "}
            <code className="rounded bg-background px-1 text-foreground">
              supabase secrets set GEMINI_API_KEY=...
            </code>{" "}
            로 등록하고{" "}
            <code className="rounded bg-background px-1 text-foreground">
              supabase functions deploy gemini
            </code>{" "}
            으로 배포하세요.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
