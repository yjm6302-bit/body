import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface DeleteButtonProps {
  onClick: () => void;
  /** aria-label / 접근성 라벨 (기본 "삭제") */
  label?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * 리스트 항목 삭제 버튼 공통 규칙.
 * ghost 아이콘 버튼 + Trash2(text-danger). 터치 타겟 확보를 위해 p-1.5 패딩.
 */
export function DeleteButton({ onClick, label = "삭제", disabled, className }: DeleteButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "shrink-0 rounded-md p-1.5 text-foreground hover:bg-surface disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
    >
      <Trash2 className="h-4 w-4 text-danger" />
    </button>
  );
}
