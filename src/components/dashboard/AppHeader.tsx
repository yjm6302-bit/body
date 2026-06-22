import { ChevronLeft, HeartPulse, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  onOpenMenu: () => void;
  /** 넘기면 좌측에 뒤로가기 버튼을 노출 (하위 화면용) */
  onBack?: () => void;
}

/**
 * 모든 화면 상단에 고정되는 공용 앱 헤더.
 * 좌측: (하위 화면) 뒤로가기 / 중앙: 브랜드 / 우측: 햄버거 메뉴
 */
export function AppHeader({ onOpenMenu, onBack }: Props) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/50 bg-background/90 px-4 pb-3 pt-safe pt-4 backdrop-blur">
      <div className="relative flex items-center justify-between">
        {/* 좌측: 뒤로가기 (없으면 동일 폭의 빈 슬롯) */}
        <div className="flex h-11 w-11 items-center">
          {onBack && (
            <Button variant="ghost" size="icon" aria-label="뒤로" onClick={onBack}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* 중앙: 브랜드 — 좌우 슬롯 폭과 무관하게 항상 중앙 고정 */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2">
          <HeartPulse className="h-5 w-5 text-primary" />
          <span className="font-bold">건강관리</span>
        </div>

        {/* 우측: 햄버거 메뉴 */}
        <Button
          variant="ghost"
          size="icon"
          aria-label="메뉴 열기"
          onClick={(e) => {
            // 드로어가 배경에 aria-hidden 을 걸기 전에 트리거에서 포커스를 뗀다
            e.currentTarget.blur();
            onOpenMenu();
          }}
        >
          <Menu className="h-5 w-5 text-foreground" />
        </Button>
      </div>
    </header>
  );
}
