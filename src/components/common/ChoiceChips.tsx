import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "@/components/ui/button";

interface ChoiceChipsProps<T extends string> {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  /** 선택된 칩 색 = 도메인색(exercise/trust/highlight/default). 비선택은 항상 secondary. */
  activeVariant?: ButtonProps["variant"];
  /** 컨테이너 레이아웃. 기본은 flex-wrap, 균등폭 고정개수는 "grid grid-cols-N gap-2" 전달. */
  className?: string;
}

/**
 * 세그먼트(선택) 칩 묶음 공통 규칙.
 * 활성=도메인색 / 비활성=secondary / size=sm 고정.
 */
export function ChoiceChips<T extends string>({
  options,
  value,
  onChange,
  activeVariant = "default",
  className,
}: ChoiceChipsProps<T>) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {options.map((opt) => (
        <Button
          key={opt}
          type="button"
          size="sm"
          variant={value === opt ? activeVariant : "secondary"}
          onClick={() => onChange(opt)}
        >
          {opt}
        </Button>
      ))}
    </div>
  );
}
