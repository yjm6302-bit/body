import { useState } from "react";
import { Trash2, Plus, Loader2 } from "lucide-react";
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
import { insertLog, deleteLog } from "@/lib/repository";
import { formatDuration } from "@/lib/utils";
import type { CardioLog } from "@/types/database";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recordId: string;
  logs: CardioLog[];
  onSaved: () => void;
}

const TYPES = ["달리기", "자전거", "수영", "걷기", "기타"];

export function CardioSheet({ open, onOpenChange, recordId, logs, onSaved }: Props) {
  const [type, setType] = useState(TYPES[0]);
  const [distance, setDistance] = useState("");
  const [min, setMin] = useState("");
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setDistance("");
    setMin("");
  };

  const add = async () => {
    const dist = Number(distance);
    const duration = Number(min || 0) * 60; // 분 단위 입력 → 초 단위 저장
    if (!dist || dist <= 0) return toast.error("거리를 입력하세요.");
    if (duration <= 0) return toast.error("시간을 입력하세요.");
    setBusy(true);
    try {
      await insertLog("cardio_logs", {
        daily_record_id: recordId,
        type,
        distance: dist,
        duration,
      });
      toast.success("유산소 운동이 기록되었습니다.");
      reset();
      onSaved();
    } catch {
      toast.error("저장에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteLog("cardio_logs", id);
      onSaved();
    } catch {
      toast.error("삭제에 실패했습니다.");
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>유산소 운동</DrawerTitle>
          <DrawerDescription>운동 종류, 거리, 시간을 기록하세요.</DrawerDescription>
        </DrawerHeader>

        <div className="space-y-4 overflow-y-auto px-5 py-2">
          <div className="flex flex-wrap gap-2">
            {TYPES.map((t) => (
              <Button
                key={t}
                type="button"
                size="sm"
                variant={type === t ? "default" : "secondary"}
                onClick={() => setType(t)}
              >
                {t}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="dist">거리(km)</Label>
              <Input
                id="dist"
                type="number"
                inputMode="decimal"
                step="0.1"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="min">시간(분)</Label>
              <Input
                id="min"
                type="number"
                inputMode="numeric"
                value={min}
                onChange={(e) => setMin(e.target.value)}
              />
            </div>
          </div>

          {logs.length > 0 && (
            <ul className="space-y-2">
              {logs.map((l) => (
                <li
                  key={l.id}
                  className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  <span>
                    <span className="font-medium text-exercise">{l.type}</span> · {l.distance}km ·{" "}
                    {formatDuration(l.duration)}
                  </span>
                  <button onClick={() => remove(l.id)} aria-label="삭제">
                    <Trash2 className="h-4 w-4 text-danger" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <DrawerFooter>
          <Button onClick={add} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            추가하기
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
