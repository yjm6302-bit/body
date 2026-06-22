import { useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/common/SubmitButton";
import { ChoiceChips } from "@/components/common/ChoiceChips";
import { DeleteButton } from "@/components/common/DeleteButton";
import { ListRow } from "@/components/common/ListRow";
import { toast } from "@/components/ui/toaster";
import { insertLog, deleteLog } from "@/lib/repository";
import type { StretchingLog } from "@/types/database";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recordId: string;
  logs: StretchingLog[];
  onSaved: () => void;
}

const PARTS = ["목", "어깨", "허리", "다리", "전신"];

export function StretchingSheet({ open, onOpenChange, recordId, logs, onSaved }: Props) {
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("");
  const [busy, setBusy] = useState(false);

  const add = async () => {
    if (!name.trim()) return toast.error("부위/이름을 입력하세요.");
    const min = Number(duration);
    if (!min || min <= 0) return toast.error("수행 시간을 입력하세요.");
    setBusy(true);
    try {
      await insertLog("stretching_logs", {
        daily_record_id: recordId,
        name: name.trim(),
        duration: min,
      });
      toast.success("스트레칭이 기록되었습니다.");
      setName("");
      setDuration("");
      onSaved();
    } catch {
      toast.error("저장에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteLog("stretching_logs", id);
      onSaved();
    } catch {
      toast.error("삭제에 실패했습니다.");
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>스트레칭</DrawerTitle>
          <DrawerDescription>부위/이름과 수행 시간(분)을 기록하세요.</DrawerDescription>
        </DrawerHeader>

        <div className="space-y-4 overflow-y-auto px-5 py-2">
          <ChoiceChips options={PARTS} value={name} onChange={setName} activeVariant="exercise" />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="st-name">부위/이름</Label>
              <Input id="st-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="st-dur">시간(분)</Label>
              <Input
                id="st-dur"
                type="number"
                inputMode="numeric"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
          </div>

          {logs.length > 0 && (
            <ul className="space-y-2">
              {logs.map((l) => (
                <ListRow key={l.id}>
                  <span>
                    <span className="font-medium text-exercise">{l.name}</span> · {l.duration}분
                  </span>
                  <DeleteButton onClick={() => remove(l.id)} />
                </ListRow>
              ))}
            </ul>
          )}
        </div>

        <DrawerFooter>
          <SubmitButton variant="exercise" action="add" busy={busy} onClick={add}>
            추가
          </SubmitButton>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
