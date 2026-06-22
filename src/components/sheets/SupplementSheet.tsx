import { useState } from "react";
import { Settings2, ChevronLeft } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { SubmitButton } from "@/components/common/SubmitButton";
import { ChoiceChips } from "@/components/common/ChoiceChips";
import { DeleteButton } from "@/components/common/DeleteButton";
import { ListRow } from "@/components/common/ListRow";
import { toast } from "@/components/ui/toaster";
import {
  setSupplementTaken,
  addSupplementSetting,
  deleteSupplementSetting,
} from "@/lib/repository";
import type { PackageTime, SupplementLog, SupplementSetting } from "@/types/database";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  recordId: string;
  settings: SupplementSetting[];
  logs: SupplementLog[];
  onSettingsChanged: () => void;
  onSaved: () => void;
}

const TIMES: PackageTime[] = ["아침", "점심", "저녁", "취침"];

export function SupplementSheet({
  open,
  onOpenChange,
  userId,
  recordId,
  settings,
  logs,
  onSettingsChanged,
  onSaved,
}: Props) {
  const [manage, setManage] = useState(false);
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [time, setTime] = useState<PackageTime>("아침");
  const [busy, setBusy] = useState(false);

  const takenMap = new Map(logs.map((l) => [l.supplement_setting_id, l.taken]));

  const toggleTime = async (items: SupplementSetting[], next: boolean) => {
    try {
      await Promise.all(items.map((s) => setSupplementTaken(recordId, s.id, next)));
      onSaved();
    } catch {
      toast.error("저장에 실패했습니다.");
    }
  };

  const addSetting = async () => {
    if (!name.trim()) return toast.error("영양제 이름을 입력하세요.");
    setBusy(true);
    try {
      await addSupplementSetting({
        user_id: userId,
        name: name.trim(),
        dosage: dosage.trim() || null,
        ingredients: ingredients.trim() || null,
        package_time: time,
      });
      toast.success("영양제가 등록되었습니다.");
      setName("");
      setDosage("");
      setIngredients("");
      onSettingsChanged();
    } catch {
      toast.error("등록에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const removeSetting = async (id: string) => {
    try {
      await deleteSupplementSetting(id);
      onSettingsChanged();
      onSaved();
    } catch {
      toast.error("삭제에 실패했습니다.");
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <DrawerTitle>{manage ? "영양제 설정" : "영양제"}</DrawerTitle>
            <DrawerDescription>
              {manage ? "복용 영양제를 등록·삭제합니다." : "시간대별로 복용 여부를 체크하세요."}
            </DrawerDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label={manage ? "뒤로" : "설정"}
            onClick={() => setManage((m) => !m)}
          >
            {manage ? <ChevronLeft className="h-5 w-5" /> : <Settings2 className="h-5 w-5" />}
          </Button>
        </DrawerHeader>

        <div className="space-y-4 overflow-y-auto px-5 py-2">
          {settings.length === 0 && !manage && (
            <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
              등록된 영양제가 없습니다.
              <br />
              우측 상단 설정에서 추가하세요.
            </p>
          )}

          {!manage &&
            TIMES.map((t) => {
              const items = settings.filter((s) => s.package_time === t);
              if (items.length === 0) return null;
              const allTaken = items.every((s) => takenMap.get(s.id) ?? false);
              return (
                <label
                  key={t}
                  className="flex cursor-pointer items-center gap-3 rounded-md border border-border bg-background px-3 py-3"
                >
                  <Checkbox
                    checked={allTaken}
                    onCheckedChange={(v) => toggleTime(items, Boolean(v))}
                  />
                  <span className="flex-1">
                    <span className="text-sm font-semibold text-highlight">{t}</span>
                    <span className="mt-0.5 block text-sm text-muted-foreground">
                      {items.map((s) => s.name).join(", ")}
                    </span>
                  </span>
                </label>
              );
            })}

          {manage && (
            <>
               <div className="space-y-3 rounded-lg border border-border bg-background p-3">
                <div className="space-y-1.5">
                  <Label htmlFor="sup-name">이름</Label>
                  <Input
                    id="sup-name"
                    placeholder="예: 종합비타민"
                    value={name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sup-dose">복용량 (선택)</Label>
                  <Input
                    id="sup-dose"
                    placeholder="예: 1정"
                    value={dosage}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDosage(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sup-ing">성분 (선택)</Label>
                  <Textarea
                    id="sup-ing"
                    placeholder={"성분표를 그대로 복사해 붙여넣으세요.\n예) 비타민C 1000mg, 아연 15mg,\n마그네슘 350mg, 비타민D 1000IU ..."}
                    value={ingredients}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setIngredients(e.target.value)}
                    rows={4}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>시간대</Label>
                  <ChoiceChips
                    options={TIMES}
                    value={time}
                    onChange={setTime}
                    activeVariant="highlight"
                    className="grid grid-cols-4 gap-2"
                  />
                </div>
                <SubmitButton
                  variant="highlight"
                  action="add"
                  busy={busy}
                  onClick={addSetting}
                  className="w-full"
                >
                  추가
                </SubmitButton>
              </div>

              {settings.length > 0 && (
                <ul className="space-y-2">
                  {settings.map((s) => (
                    <ListRow key={s.id}>
                      <span>
                        <span className="font-medium">{s.name}</span>
                        <span className="text-muted-foreground"> · {s.package_time}</span>
                      </span>
                      <DeleteButton onClick={() => removeSetting(s.id)} />
                    </ListRow>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        <DrawerFooter>
          <Button variant="highlight" onClick={() => onOpenChange(false)}>
            완료
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
