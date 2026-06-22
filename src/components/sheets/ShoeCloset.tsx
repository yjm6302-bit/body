import { useEffect, useState } from "react";
import { ChevronRight, ChevronLeft, Loader2, Footprints } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/common/SubmitButton";
import { DeleteButton } from "@/components/common/DeleteButton";
import { ListRow } from "@/components/common/ListRow";
import { toast } from "@/components/ui/toaster";
import { addShoe, deleteShoe, updateShoe, fetchShoeTimeline } from "@/lib/repository";
import { formatDuration } from "@/lib/utils";
import type { ShoeWithMileage, ShoeTimelineEntry } from "@/types/database";

interface Props {
  userId: string;
  shoes: ShoeWithMileage[];
  onChanged: () => void;
}

export function ShoeCloset({ userId, shoes, onChanged }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // 목록 추가 폼 상태
  const [name, setName] = useState("");
  const [initDist, setInitDist] = useState("");
  const [busy, setBusy] = useState(false);

  const selected = shoes.find((s) => s.id === selectedId) ?? null;

  const add = async () => {
    if (!name.trim()) return toast.error("신발명을 입력하세요.");
    setBusy(true);
    try {
      await addShoe({
        user_id: userId,
        name: name.trim(),
        initial_distance: Number(initDist) || 0,
      });
      toast.success("신발이 등록되었습니다.");
      setName("");
      setInitDist("");
      onChanged();
    } catch {
      toast.error("등록에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteShoe(id);
      onChanged();
    } catch {
      toast.error("삭제에 실패했습니다.");
    }
  };

  // --- 신발 상세 ----------------------------------------------------------
  if (selected) {
    return (
      <ShoeDetail
        shoe={selected}
        onBack={() => setSelectedId(null)}
        onChanged={onChanged}
      />
    );
  }

  // --- 신발 목록 ----------------------------------------------------------
  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-lg border border-border bg-background p-3">
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="shoe-name">신발명</Label>
            <Input
              id="shoe-name"
              placeholder="예: 페가수스 41"
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="shoe-init">초기 누적(km)</Label>
            <Input
              id="shoe-init"
              type="number"
              inputMode="decimal"
              step="0.1"
              placeholder="0"
              value={initDist}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInitDist(e.target.value)}
            />
          </div>
        </div>
        <SubmitButton variant="exercise" action="add" busy={busy} onClick={add} className="w-full">
          추가
        </SubmitButton>
      </div>

      {shoes.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
          등록된 신발이 없습니다.
          <br />
          위에서 신발을 추가하세요.
        </p>
      ) : (
        <ul className="space-y-2">
          {shoes.map((s) => (
            <li key={s.id} className="flex items-center gap-2">
              <button
                onClick={() => setSelectedId(s.id)}
                className="flex flex-1 items-center justify-between rounded-md border border-border bg-background px-3 py-3 text-left"
              >
                <span className="flex items-center gap-2">
                  <Footprints className="h-4 w-4 text-exercise" />
                  <span className="font-medium">{s.name}</span>
                </span>
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{s.current_distance}km</span>
                  <ChevronRight className="h-4 w-4" />
                </span>
              </button>
              <DeleteButton onClick={() => remove(s.id)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ============================================================================
// 신발 상세 — 현재 주행거리 + 타임라인 + 이전 데이터 추가
// ============================================================================
function ShoeDetail({
  shoe,
  onBack,
  onChanged,
}: {
  shoe: ShoeWithMileage;
  onBack: () => void;
  onChanged: () => void;
}) {
  const [timeline, setTimeline] = useState<ShoeTimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDist, setAddDist] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchShoeTimeline(shoe.id)
      .then((t) => {
        if (alive) setTimeline(t);
      })
      .catch(() => toast.error("타임라인을 불러오지 못했습니다."))
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [shoe.id]);

  const addPrevData = async () => {
    const add = Number(addDist);
    if (!add || add <= 0) return toast.error("추가할 거리를 입력하세요.");
    setBusy(true);
    try {
      await updateShoe(shoe.id, {
        initial_distance: Number((Number(shoe.initial_distance) + add).toFixed(1)),
      });
      toast.success("이전 데이터가 추가되었습니다.");
      setAddDist("");
      onChanged();
    } catch {
      toast.error("저장에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2 self-start text-muted-foreground">
        <ChevronLeft className="h-4 w-4" />
        신발 목록
      </Button>

      {/* 신발명 + 현재 주행거리 */}
      <div className="rounded-lg border border-border bg-background p-4 text-center">
        <p className="flex items-center justify-center gap-2 text-base font-semibold">
          <Footprints className="h-5 w-5 text-exercise" />
          {shoe.name}
        </p>
        <p className="mt-2 text-3xl font-bold text-exercise">{shoe.current_distance}km</p>
        <p className="mt-1 text-xs text-muted-foreground">현재 주행거리</p>
      </div>

      {/* 이전 데이터 추가 */}
      <div className="space-y-2 rounded-lg border border-border bg-background p-3">
        <Label htmlFor="prev-dist">이전 데이터 추가 (km)</Label>
        <div className="flex gap-2">
          <Input
            id="prev-dist"
            type="number"
            inputMode="decimal"
            step="0.1"
            placeholder="예: 120.5"
            value={addDist}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddDist(e.target.value)}
          />
          <SubmitButton variant="secondary" action="add" busy={busy} onClick={addPrevData}>
            추가
          </SubmitButton>
        </div>
        <p className="text-xs text-muted-foreground">
          앱 사용 전 누적한 거리를 더합니다. 현재 베이스라인 {shoe.initial_distance}km
        </p>
      </div>

      {/* 타임라인 */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-exercise">타임라인</p>
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : timeline.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
            아직 이 신발로 기록한 운동이 없습니다.
          </p>
        ) : (
          <ul className="space-y-2">
            {timeline.map((t) => (
              <ListRow key={t.id}>
                <span className="text-muted-foreground">{t.date}</span>
                <span>
                  <span className="font-medium text-exercise">{t.type}</span> · {t.distance}km ·{" "}
                  {formatDuration(t.duration)}
                </span>
              </ListRow>
            ))}
            {Number(shoe.initial_distance) > 0 && (
              <li className="flex items-center justify-between rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
                <span>이전 누적</span>
                <span>{shoe.initial_distance}km</span>
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
