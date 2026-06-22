import { Loader2, Plus, Check } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";

interface SubmitButtonProps extends ButtonProps {
  /** 진행 중이면 스피너로 바뀌고 비활성화된다. */
  busy?: boolean;
  /** 유휴 상태 아이콘: 리스트에 항목을 더하면 "add"(＋), 레코드를 덮어쓰면 "save"(✓). */
  action?: "add" | "save";
}

/**
 * 시트 주(主) 액션 버튼 공통 규칙.
 * - 색(variant)은 도메인색을 넘겨준다: exercise / trust / highlight / default
 * - busy → Loader2, 아니면 action 아이콘. ({busy && ...} 금지, 항상 삼항)
 * - 라벨은 children: 항목 추가="추가", 레코드 저장="저장"
 */
export function SubmitButton({
  busy = false,
  action = "add",
  disabled,
  children,
  ...props
}: SubmitButtonProps) {
  return (
    <Button disabled={busy || disabled} {...props}>
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : action === "save" ? (
        <Check className="h-4 w-4" />
      ) : (
        <Plus className="h-4 w-4" />
      )}
      {children}
    </Button>
  );
}
