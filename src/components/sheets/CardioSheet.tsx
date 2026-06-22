import { useState } from "react";
import { Footprints, ChevronLeft } from "lucide-react";
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
import { formatDuration } from "@/lib/utils";
import { ShoeCloset } from "./ShoeCloset";
import type { CardioLog, ShoeWithMileage } from "@/types/database";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  recordId: string;
  logs: CardioLog[];
  shoes: ShoeWithMileage[];
  onShoesChanged: () => void;
  onSaved: () => void;
}

const TYPES = ["달리기", "걷기"];

export function CardioSheet({
  open,
  onOpenChange,
  userId,
  recordId,
  logs,
  shoes,
  onShoesChanged,
  onSaved,
}: Props) {
  const [closet, setCloset] = useState(false);
  const [type, setType] = useState(TYPES[0]);
  const [distance, setDistance] = useState("");
  const [min, setMin] = useState("");
  const [shoeId, setShoeId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setDistance("");
    setMin("");
  };

  const shoeName = (id: string | null) => shoes.find((s) => s.id === id)?.name;

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
        shoe_id: shoeId,
      });
      toast.success("유산소 운동이 기록되었습니다.");
      reset();
      onSaved();
      onShoesChanged(); // 신발 주행거리 갱신
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
      onShoesChanged();
    } catch {
      toast.error("삭제에 실패했습니다.");
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <DrawerTitle>{closet ? "신발장" : "유산소 운동"}</DrawerTitle>
            <DrawerDescription>
              {closet
                ? "신발별 주행거리와 타임라인을 관리하세요."
                : "운동 종류, 거리, 시간을 기록하세요."}
            </DrawerDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label={closet ? "뒤로" : "신발 추가"}
            onClick={() => setCloset((c) => !c)}
          >
            {closet ? (
              <ChevronLeft className="h-5 w-5" />
            ) : (
              <Footprints className="h-5 w-5 text-exercise" />
            )}
          </Button>
        </DrawerHeader>

        <div className="space-y-4 overflow-y-auto px-5 py-2">
          {closet ? (
            <ShoeCloset userId={userId} shoes={shoes} onChanged={onShoesChanged} />
          ) : (
            <>
              <ChoiceChips options={TYPES} value={type} onChange={setType} activeVariant="exercise" />

              {/* 신발 선택 */}
              <div className="space-y-1.5">
                <Label>신발 (선택)</Label>
                {/* shoes 는 created_at 오름차순 → '없음'이 가장 좌측, 최근 등록 신발이 가장 우측 */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={shoeId === null ? "exercise" : "secondary"}
                    onClick={() => setShoeId(null)}
                  >
                    없음
                  </Button>
                  {shoes.map((s) => (
                    <Button
                      key={s.id}
                      type="button"
                      size="sm"
                      variant={shoeId === s.id ? "exercise" : "secondary"}
                      onClick={() => setShoeId(s.id)}
                    >
                      {s.name}
                    </Button>
                  ))}
                </div>
                {shoes.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    우측 상단 신발장에서 신발을 먼저 등록하세요.
                  </p>
                )}
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
                    <ListRow key={l.id}>
                      <span>
                        <span className="font-medium text-exercise">{l.type}</span> · {l.distance}km ·{" "}
                        {formatDuration(l.duration)}
                        {shoeName(l.shoe_id ?? null) && (
                          <span className="text-muted-foreground"> · {shoeName(l.shoe_id ?? null)}</span>
                        )}
                      </span>
                      <DeleteButton onClick={() => remove(l.id)} />
                    </ListRow>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        <DrawerFooter>
          {closet ? (
            <Button variant="exercise" onClick={() => onOpenChange(false)}>
              완료
            </Button>
          ) : (
            <SubmitButton variant="exercise" action="add" busy={busy} onClick={add}>
              추가
            </SubmitButton>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
