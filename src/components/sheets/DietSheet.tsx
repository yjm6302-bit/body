import { useState } from "react";
import { Plus, X } from "lucide-react";
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
import { ChoiceChips } from "@/components/common/ChoiceChips";
import { DeleteButton } from "@/components/common/DeleteButton";
import { ListRow } from "@/components/common/ListRow";
import { toast } from "@/components/ui/toaster";
import { insertLog, deleteLog } from "@/lib/repository";
import type { DietLog, MealType } from "@/types/database";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recordId: string;
  logs: DietLog[];
  onSaved: () => void;
}

const MEALS: MealType[] = ["아침", "점심", "저녁", "간식"];

export function DietSheet({ open, onOpenChange, recordId, logs, onSaved }: Props) {
  const [meal, setMeal] = useState<MealType>("아침");
  const [draft, setDraft] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const addKeyword = () => {
    const k = draft.trim();
    if (!k) return;
    if (!keywords.includes(k)) setKeywords((prev) => [...prev, k]);
    setDraft("");
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addKeyword();
    }
  };

  const save = async () => {
    if (keywords.length === 0) return toast.error("음식 키워드를 1개 이상 추가하세요.");
    setBusy(true);
    try {
      await insertLog("diet_logs", {
        daily_record_id: recordId,
        meal_type: meal,
        keywords,
      });
      toast.success(`${meal} 식단이 기록되었습니다.`);
      setKeywords([]);
      setDraft("");
      onSaved();
    } catch {
      toast.error("저장에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteLog("diet_logs", id);
      onSaved();
    } catch {
      toast.error("삭제에 실패했습니다.");
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>식단</DrawerTitle>
          <DrawerDescription>식사 구분을 고르고 음식 키워드를 태그로 추가하세요.</DrawerDescription>
        </DrawerHeader>

        <div className="space-y-4 overflow-y-auto px-5 py-2">
          <ChoiceChips
            options={MEALS}
            value={meal}
            onChange={setMeal}
            activeVariant="highlight"
            className="grid grid-cols-4 gap-2"
          />

          <div className="space-y-1.5">
            <Label htmlFor="kw">음식 키워드</Label>
            <div className="flex gap-2">
              <Input
                id="kw"
                placeholder="예: 닭가슴살"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onKeyDown}
              />
              <Button type="button" variant="secondary" onClick={addKeyword} className="shrink-0">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {keywords.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {keywords.map((k) => (
                <span
                  key={k}
                  className="flex items-center gap-1 rounded-full bg-highlight/15 px-3 py-1 text-sm text-highlight"
                >
                  {k}
                  <button onClick={() => setKeywords((p) => p.filter((x) => x !== k))}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {logs.length > 0 && (
            <ul className="space-y-2 border-t border-border pt-3">
              {logs.map((l) => (
                <ListRow key={l.id} align="start">
                  <div>
                    <p className="font-medium text-highlight">{l.meal_type}</p>
                    <p className="text-xs text-muted-foreground">{l.keywords.join(", ")}</p>
                  </div>
                  <DeleteButton onClick={() => remove(l.id)} />
                </ListRow>
              ))}
            </ul>
          )}
        </div>

        <DrawerFooter>
          <SubmitButton variant="highlight" action="add" busy={busy} onClick={save}>
            추가
          </SubmitButton>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
