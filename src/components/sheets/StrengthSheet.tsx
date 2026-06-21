import { useState } from "react";
import { Trash2, Plus, Loader2, X } from "lucide-react";
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
import type { StrengthLog, StrengthSet } from "@/types/database";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recordId: string;
  logs: StrengthLog[];
  onSaved: () => void;
}

/** 번핏 스타일: 세트별 무게/횟수를 동적으로 추가 */
export function StrengthSheet({ open, onOpenChange, recordId, logs, onSaved }: Props) {
  const [name, setName] = useState("");
  const [sets, setSets] = useState<StrengthSet[]>([{ weight: 0, reps: 0 }]);
  const [busy, setBusy] = useState(false);

  const updateSet = (i: number, key: keyof StrengthSet, value: number) => {
    setSets((prev) => prev.map((s, idx) => (idx === i ? { ...s, [key]: value } : s)));
  };
  const addSet = () => {
    // 직전 세트 값을 복제하면 반복 입력이 편하다
    setSets((prev) => [...prev, prev[prev.length - 1] ?? { weight: 0, reps: 0 }]);
  };
  const removeSet = (i: number) => setSets((prev) => prev.filter((_, idx) => idx !== i));

  const reset = () => {
    setName("");
    setSets([{ weight: 0, reps: 0 }]);
  };

  const add = async () => {
    if (!name.trim()) return toast.error("운동 이름을 입력하세요.");
    const valid = sets.filter((s) => s.reps > 0);
    if (valid.length === 0) return toast.error("최소 한 세트의 횟수를 입력하세요.");
    setBusy(true);
    try {
      await insertLog("strength_logs", {
        daily_record_id: recordId,
        exercise_name: name.trim(),
        sets: valid,
      });
      toast.success("무산소 운동이 기록되었습니다.");
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
      await deleteLog("strength_logs", id);
      onSaved();
    } catch {
      toast.error("삭제에 실패했습니다.");
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>무산소 운동</DrawerTitle>
          <DrawerDescription>운동을 추가하고 세트별 무게·횟수를 기록하세요.</DrawerDescription>
        </DrawerHeader>

        <div className="space-y-4 overflow-y-auto px-5 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="ex-name">운동 이름</Label>
            <Input
              id="ex-name"
              placeholder="예: 스쿼트, 벤치프레스"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>세트</Label>
              <Button type="button" size="sm" variant="secondary" onClick={addSet}>
                <Plus className="h-3.5 w-3.5" />
                세트 추가
              </Button>
            </div>
            {sets.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-10 shrink-0 text-center text-sm font-semibold text-exercise">
                  {i + 1}세트
                </span>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="kg"
                  value={s.weight || ""}
                  onChange={(e) => updateSet(i, "weight", Number(e.target.value))}
                />
                <span className="text-xs text-muted-foreground">×</span>
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="회"
                  value={s.reps || ""}
                  onChange={(e) => updateSet(i, "reps", Number(e.target.value))}
                />
                <button
                  onClick={() => removeSet(i)}
                  disabled={sets.length === 1}
                  aria-label="세트 삭제"
                  className="disabled:opacity-30"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            ))}
          </div>

          {logs.length > 0 && (
            <ul className="space-y-2">
              {logs.map((l) => (
                <li
                  key={l.id}
                  className="flex items-start justify-between rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium text-exercise">{l.exercise_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {l.sets.map((s) => `${s.weight}kg×${s.reps}`).join(", ")}
                    </p>
                  </div>
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
            운동 추가
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
