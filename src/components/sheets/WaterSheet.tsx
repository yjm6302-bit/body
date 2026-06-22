import { useState } from "react";
import { Trash2, Plus, Loader2, GlassWater } from "lucide-react";
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
import { toast } from "@/components/ui/toaster";
import { insertLog, deleteLog } from "@/lib/repository";
import type { WaterLog } from "@/types/database";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recordId: string;
  logs: WaterLog[];
  onSaved: () => void;
}

const QUICK = [250, 500, 700];
const GOAL_ML = 2000;

export function WaterSheet({ open, onOpenChange, recordId, logs, onSaved }: Props) {
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState(false);

  const total = logs.reduce((s, w) => s + w.amount_ml, 0);
  const pct = Math.min(100, Math.round((total / GOAL_ML) * 100));

  const addAmount = async (ml: number) => {
    if (!ml || ml <= 0) return;
    setBusy(true);
    try {
      await insertLog("water_logs", { daily_record_id: recordId, amount_ml: ml });
      onSaved();
    } catch {
      toast.error("저장에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const addCustom = async () => {
    const ml = Number(custom);
    if (!ml || ml <= 0) return toast.error("섭취량을 입력하세요.");
    await addAmount(ml);
    setCustom("");
  };

  const remove = async (id: string) => {
    try {
      await deleteLog("water_logs", id);
      onSaved();
    } catch {
      toast.error("삭제에 실패했습니다.");
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>수분 섭취</DrawerTitle>
          <DrawerDescription>퀵 버튼이나 직접 입력으로 누적 기록하세요.</DrawerDescription>
        </DrawerHeader>

        <div className="space-y-4 overflow-y-auto px-5 py-2">
          {/* 진척도 */}
          <div className="rounded-lg border border-border bg-background p-4 text-center">
            <p className="text-2xl font-bold text-trust">
              {total}
              <span className="text-base font-normal text-muted-foreground"> / {GOAL_ML}ml</span>
            </p>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-trust transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {QUICK.map((q) => (
              <Button
                key={q}
                type="button"
                variant="trust"
                disabled={busy}
                onClick={() => addAmount(q)}
              >
                <GlassWater className="h-4 w-4" />+{q}
              </Button>
            ))}
          </div>

          <div className="flex gap-2">
            <Input
              type="number"
              inputMode="numeric"
              placeholder="직접 입력 (ml)"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
            />
            <Button type="button" variant="secondary" onClick={addCustom} disabled={busy} className="shrink-0">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>

          {logs.length > 0 && (
            <ul className="flex flex-wrap gap-2 border-t border-border pt-3">
              {logs.map((l) => (
                <li
                  key={l.id}
                  className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-sm"
                >
                  <span className="text-trust">{l.amount_ml}ml</span>
                  <button onClick={() => remove(l.id)} aria-label="삭제">
                    <Trash2 className="h-4 w-4 text-danger" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <DrawerFooter>
          <Button variant="trust" onClick={() => onOpenChange(false)}>
            완료
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
