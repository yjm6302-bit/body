import { useEffect, useState } from "react";
import { differenceInYears } from "date-fns";
import { Settings2, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";
import { updateDailyRecord } from "@/lib/repository";
import type { DailyRecord, Profile } from "@/types/database";
import { ProfileEditSheet } from "./ProfileEditSheet";

interface Props {
  profile: Profile | null;
  record: DailyRecord | null;
  onProfileUpdate: (patch: Partial<Pick<Profile, "birth_date" | "gender" | "height">>) => Promise<void>;
  onWeightSaved: () => void;
}

/** 기본 정보(생년월일/성별/키) + 데일리 몸무게 입력 영역 */
export function ProfileHeader({ profile, record, onProfileUpdate, onWeightSaved }: Props) {
  const [weight, setWeight] = useState("");
  const [saving, setSaving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  // 날짜(레코드) 변경 시 입력값 동기화
  useEffect(() => {
    setWeight(record?.weight != null ? String(record.weight) : "");
  }, [record?.id, record?.weight]);

  const age = profile ? differenceInYears(new Date(), new Date(profile.birth_date)) : null;
  const dirty = record != null && weight !== (record.weight != null ? String(record.weight) : "");

  const saveWeight = async () => {
    if (!record) return;
    const value = weight.trim() === "" ? null : Number(weight);
    if (value != null && (Number.isNaN(value) || value <= 0)) {
      toast.error("올바른 몸무게를 입력하세요.");
      return;
    }
    setSaving(true);
    try {
      await updateDailyRecord(record.id, { weight: value });
      toast.success("몸무게가 저장되었습니다.");
      onWeightSaved();
    } catch {
      toast.error("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-start justify-between">
        <div className="space-y-0.5">
          <p className="text-sm font-medium text-foreground">
            {profile?.gender ?? "—"}
            {age != null && <span className="text-muted-foreground"> · 만 {age}세</span>}
          </p>
          <p className="text-xs text-muted-foreground">
            {profile?.birth_date ?? "—"} · 키 {profile?.height ?? "—"}cm
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          aria-label="프로필 설정"
          onClick={() => setEditOpen(true)}
        >
          <Settings2 className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>

      <div className="mt-3 flex items-end gap-2">
        <div className="flex-1">
          <label htmlFor="weight" className="text-xs text-muted-foreground">
            오늘 몸무게 (kg)
          </label>
          <Input
            id="weight"
            type="number"
            inputMode="decimal"
            step="0.1"
            placeholder="예: 65.4"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="mt-1"
          />
        </div>
        <Button onClick={saveWeight} disabled={!dirty || saving} className="shrink-0">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          저장
        </Button>
      </div>

      <ProfileEditSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        profile={profile}
        onSave={onProfileUpdate}
      />
    </div>
  );
}
