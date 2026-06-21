import { useEffect, useState } from "react";
import { Loader2, Moon } from "lucide-react";
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

/** ISO timestamp -> datetime-local input 값 (로컬 타임존) */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}

export function SleepSheet({ open, onOpenChange, record, onSaved }: Props) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setStart(toLocalInput(record?.sleep_start ?? null));
      setEnd(toLocalInput(record?.sleep_end ?? null));
    }
  }, [open, record?.sleep_start, record?.sleep_end]);

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
          <DrawerDescription>취침/기상 시각을 입력하면 총 수면시간이 계산됩니다.</DrawerDescription>
        </DrawerHeader>

        <div className="space-y-4 px-5 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="sleep-start">취침 시각</Label>
            <Input
              id="sleep-start"
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sleep-end">기상 시각</Label>
            <Input
              id="sleep-end"
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </div>

          {hours != null && (
            <div className="flex items-center justify-center gap-2 rounded-lg border border-border bg-background py-3">
              <Moon className="h-5 w-5 text-trust" />
              <span className="text-lg font-bold text-trust">총 {hours}시간</span>
            </div>
          )}
        </div>

        <DrawerFooter>
          <Button variant="trust" onClick={save} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}저장
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
