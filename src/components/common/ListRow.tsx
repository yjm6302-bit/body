import { cn } from "@/lib/utils";

interface ListRowProps extends React.LiHTMLAttributes<HTMLLIElement> {
  /** 내용이 여러 줄이면 "start"로 상단 정렬 (기본 center) */
  align?: "center" | "start";
}

/**
 * 리스트 항목 행 셸 공통 규칙.
 * rounded-md border + bg-background, 좌우 끝 정렬. 시트 전역 동일한 행 모양을 보장한다.
 */
export function ListRow({ align = "center", className, children, ...props }: ListRowProps) {
  return (
    <li
      className={cn(
        "flex justify-between rounded-md border border-border bg-background px-3 py-2 text-sm",
        align === "start" ? "items-start" : "items-center",
        className,
      )}
      {...props}
    >
      {children}
    </li>
  );
}
