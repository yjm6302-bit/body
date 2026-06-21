import { useEffect, useState } from "react";
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
import { Loader2 } from "lucide-react";
import type { Profile } from "@/types/database";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile | null;
  onSave: (patch: Partial<Pick<Profile, "birth_date" | "gender" | "height">>) => Promise<void>;
}

export function ProfileEditSheet({ open, onOpenChange, profile, onSave }: Props) {
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("남자");
  const [height, setHeight] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && profile) {
      setBirthDate(profile.birth_date);
      setGender(profile.gender);
      setHeight(String(profile.height));
    }
  }, [open, profile]);

  const save = async () => {
    setSaving(true);
    try {
      await onSave({ birth_date: birthDate, gender, height: Number(height) });
      toast.success("프로필이 업데이트되었습니다.");
      onOpenChange(false);
    } catch {
      toast.error("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>기본 정보 수정</DrawerTitle>
          <DrawerDescription>생년월일, 성별, 키는 프로필에 고정 저장됩니다.</DrawerDescription>
        </DrawerHeader>

        <div className="space-y-4 px-5 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="birth">생년월일</Label>
            <Input
              id="birth"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>성별</Label>
            <div className="grid grid-cols-2 gap-2">
              {["남자", "여자"].map((g) => (
                <Button
                  key={g}
                  type="button"
                  variant={gender === g ? "default" : "secondary"}
                  onClick={() => setGender(g)}
                >
                  {g}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="height">키 (cm)</Label>
            <Input
              id="height"
              type="number"
              inputMode="decimal"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
            />
          </div>
        </div>

        <DrawerFooter>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}저장
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
