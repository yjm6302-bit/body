import { useEffect, useState } from "react";
import { Moon } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/common/SubmitButton";
import { toast } from "@/components/ui/toaster";
import { updateDailyRecord } from "@/lib/repository";
import { calcSleepHours } from "@/lib/utils";
import type { DailyRecord } from "@/types/database";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date;
  record: DailyRecord | null;
  onSaved: () => void;
}

const DEFAULT_BED_HOUR = 23; // 취침 기본 23:00
const DEFAULT_WAKE_HOUR = 7; // 기상 기본 07:00

/** Date -> datetime-local input 값 ("YYYY-MM-DDTHH:MM", 로컬 타임존) */
function toLocalInput(d: Date): string {
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}

/** ISO 문자열 -> datetime-local 값 */
function isoToLocalInput(iso: string): string {
  return toLocalInput(new Date(iso));
}

/** 지금 시각을 한국시간(KST) 기준 datetime-local 값("YYYY-MM-DDTHH:MM")으로 반환 */
function nowKstInput(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export function SleepSheet({ open, onOpenChange, date, record, onSaved }: Props) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [busy, setBusy] = useState(false);

  // 기록이 있으면 그 값을, 없으면 기본값(취침=전날 23:00 / 기상=선택일 07:00)을 채운다.
  useEffect(() => {
    if (!open) return;

    if (record?.sleep_start) {
      setStart(isoToLocalInput(record.sleep_start));
    } else {
      const bed = new Date(date);
      bed.setDate(bed.getDate() - 1);
      bed.setHours(DEFAULT_BED_HOUR, 0, 0, 0);
      setStart(toLocalInput(bed));
    }

    if (record?.sleep_end) {
      setEnd(isoToLocalInput(record.sleep_end));
    } else {
      const wake = new Date(date);
      wake.setHours(DEFAULT_WAKE_HOUR, 0, 0, 0);
      setEnd(toLocalInput(wake));
    }
  }, [open, date, record?.sleep_start, record?.sleep_end]);

  const startIso = start ? new Date(start).toISOString() : null;
  const endIso = end ? new Date(end).toISOString() : null;
  const hours = calcSleepHours(startIso, endIso);

  const save = async () => {
    if (!record) return;
    if (start && end && (!hours || hours <= 0)) {
      return toast.error("기상 시각이 취침 시각보다 늦어야 합니다.");
    }
    setBusy(true);
    try {
      await updateDailyRecord(record.id, { sleep_start: startIso, sleep_end: endIso });
      toast.success("수면 기록이 저장되었습니다.");
      onSaved();
      onOpenChange(false);
    } catch {
      toast.error("저장에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>수면</DrawerTitle>
          <DrawerDescription>
            기본값이 채워져 있습니다. 시각만 대략 맞춰 조정하세요.
          </DrawerDescription>
        </DrawerHeader>

        <div className="space-y-4 px-5 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="sleep-start">취침 시각</Label>
            <div className="flex items-center gap-2">
              <Input
                id="sleep-start"
                type="datetime-local"
                className="flex-1"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => setStart(nowKstInput())}
              >
                지금
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sleep-end">기상 시각</Label>
            <div className="flex items-center gap-2">
              <Input
                id="sleep-end"
                type="datetime-local"
                className="flex-1"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => setEnd(nowKstInput())}
              >
                지금
              </Button>
            </div>
          </div>

          {hours != null && (
            <div className="flex items-center justify-center gap-2 rounded-lg border border-border bg-background py-3">
              <Moon className="h-5 w-5 text-trust" />
              <span className="text-lg font-bold text-trust">총 {hours}시간</span>
            </div>
          )}
        </div>

        <DrawerFooter>
          <SubmitButton variant="trust" action="save" busy={busy} onClick={save}>
            저장
          </SubmitButton>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
