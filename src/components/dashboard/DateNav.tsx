import { useState } from "react";
import { addDays, format, isToday } from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Props {
  date: Date;
  onChange: (date: Date) => void;
}

/** 상단 날짜 네비게이션: 이전/다음 이동 + 달력 직접 선택 */
export function DateNav({ date, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const today = isToday(date);

  return (
    <div className="flex items-center justify-between gap-2">
      <Button
        variant="ghost"
        size="icon"
        aria-label="이전 날짜"
        onClick={() => onChange(addDays(date, -1))}
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" className="flex-1 flex-col gap-0.5 py-1.5">
            <span className="flex items-center gap-1.5 text-base font-bold">
              <CalendarDays className="h-4 w-4 text-primary" />
              {format(date, "yyyy년 M월 d일", { locale: ko })}
            </span>
            <span className="text-xs text-muted-foreground">
              {today ? "오늘" : format(date, "EEEE", { locale: ko })}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="center">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => {
              if (d) {
                onChange(d);
                setOpen(false);
              }
            }}
            disabled={{ after: new Date() }}
          />
        </PopoverContent>
      </Popover>

      <Button
        variant="ghost"
        size="icon"
        aria-label="다음 날짜"
        disabled={today}
        onClick={() => onChange(addDays(date, 1))}
      >
        <ChevronRight className="h-5 w-5" />
      </Button>
    </div>
  );
}
