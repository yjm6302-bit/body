import { useState } from "react";
import { Trash2, Plus, Loader2, Settings2, ChevronLeft } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
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

const TIMES: PackageTime[] = ["아침", "점심", "저녁"];

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
  const [time, setTime] = useState<PackageTime>("아침");
  const [busy, setBusy] = useState(false);

  const takenMap = new Map(logs.map((l) => [l.supplement_setting_id, l.taken]));

  const toggle = async (settingId: string, next: boolean) => {
    try {
      await setSupplementTaken(recordId, settingId, next);
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
        package_time: time,
      });
      toast.success("영양제가 등록되었습니다.");
      setName("");
      setDosage("");
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
        <DrawerHeader className="flex-row items-center justify-between">
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
              return (
                <div key={t} className="space-y-2">
                  <p className="text-xs font-semibold text-highlight">{t}</p>
                  {items.map((s) => {
                    const checked = takenMap.get(s.id) ?? false;
                    return (
                      <label
                        key={s.id}
                        className="flex cursor-pointer items-center gap-3 rounded-md border border-border bg-background px-3 py-2.5"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) => toggle(s.id, Boolean(v))}
                        />
                        <span className="flex-1 text-sm">
                          {s.name}
                          {s.dosage && (
                            <span className="text-muted-foreground"> · {s.dosage}</span>
                          )}
                        </span>
                      </label>
                    );
                  })}
                </div>
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
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sup-dose">복용량 (선택)</Label>
                  <Input
                    id="sup-dose"
                    placeholder="예: 1정"
                    value={dosage}
                    onChange={(e) => setDosage(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>시간대</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {TIMES.map((t) => (
                      <Button
                        key={t}
                        type="button"
                        size="sm"
                        variant={time === t ? "highlight" : "secondary"}
                        onClick={() => setTime(t)}
                      >
                        {t}
                      </Button>
                    ))}
                  </div>
                </div>
                <Button variant="highlight" onClick={addSetting} disabled={busy} className="w-full">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  등록
                </Button>
              </div>

              {settings.length > 0 && (
                <ul className="space-y-2">
                  {settings.map((s) => (
                    <li
                      key={s.id}
                      className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm"
                    >
                      <span>
                        <span className="font-medium">{s.name}</span>
                        <span className="text-muted-foreground"> · {s.package_time}</span>
                      </span>
                      <button onClick={() => removeSetting(s.id)} aria-label="삭제">
                        <Trash2 className="h-4 w-4 text-danger" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        <DrawerFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            완료
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
