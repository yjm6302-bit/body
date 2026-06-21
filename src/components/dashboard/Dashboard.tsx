import { useState } from "react";
import { LogOut, HeartPulse } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useDailyBundle } from "@/hooks/useDailyBundle";
import { useSupplementSettings } from "@/hooks/useSupplementSettings";
import { Button } from "@/components/ui/button";
import { DateNav } from "./DateNav";
import { ProfileHeader } from "./ProfileHeader";
import { LogGrid, type SheetKey } from "./LogGrid";
import { FeedbackPanel } from "@/components/feedback/FeedbackPanel";
import { CardioSheet } from "@/components/sheets/CardioSheet";
import { StrengthSheet } from "@/components/sheets/StrengthSheet";
import { StretchingSheet } from "@/components/sheets/StretchingSheet";
import { DietSheet } from "@/components/sheets/DietSheet";
import { SupplementSheet } from "@/components/sheets/SupplementSheet";
import { WaterSheet } from "@/components/sheets/WaterSheet";
import { SleepSheet } from "@/components/sheets/SleepSheet";
import { UploadSheet } from "@/components/sheets/UploadSheet";

interface Props {
  userId: string;
}

export function Dashboard({ userId }: Props) {
  const { signOut } = useAuth();
  const [date, setDate] = useState(() => new Date());
  const [active, setActive] = useState<SheetKey | null>(null);

  const { profile, update: updateProfile } = useProfile(userId);
  const { bundle, reload } = useDailyBundle(userId, date);
  const { settings, reload: reloadSettings } = useSupplementSettings(userId);

  const recordId = bundle.record?.id;
  const close = () => setActive(null);
  const onSaved = () => {
    void reload();
  };

  return (
    <div className="flex flex-1 flex-col">
      {/* 헤더 */}
      <header className="flex items-center justify-between px-4 pt-safe pt-4">
        <div className="flex items-center gap-2">
          <HeartPulse className="h-5 w-5 text-primary" />
          <span className="font-bold">건강관리</span>
        </div>
        <Button variant="ghost" size="icon" aria-label="로그아웃" onClick={() => signOut()}>
          <LogOut className="h-4 w-4 text-muted-foreground" />
        </Button>
      </header>

      <main className="flex flex-1 flex-col gap-4 p-4 pb-24">
        <DateNav date={date} onChange={setDate} />

        <ProfileHeader
          profile={profile}
          record={bundle.record}
          onProfileUpdate={updateProfile}
          onWeightSaved={onSaved}
        />

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">데일리 입력</h2>
          <LogGrid bundle={bundle} onOpen={setActive} />
        </section>

        <FeedbackPanel
          bundle={bundle}
          profile={profile}
          settings={settings}
          onSaved={onSaved}
        />
      </main>

      {/* 바텀 시트들 — recordId 가 준비된 경우에만 데이터 입력 가능 */}
      {recordId && (
        <>
          <CardioSheet
            open={active === "cardio"}
            onOpenChange={close}
            recordId={recordId}
            logs={bundle.cardio}
            onSaved={onSaved}
          />
          <StrengthSheet
            open={active === "strength"}
            onOpenChange={close}
            recordId={recordId}
            logs={bundle.strength}
            onSaved={onSaved}
          />
          <StretchingSheet
            open={active === "stretching"}
            onOpenChange={close}
            recordId={recordId}
            logs={bundle.stretching}
            onSaved={onSaved}
          />
          <DietSheet
            open={active === "diet"}
            onOpenChange={close}
            recordId={recordId}
            logs={bundle.diet}
            onSaved={onSaved}
          />
          <SupplementSheet
            open={active === "supplement"}
            onOpenChange={close}
            userId={userId}
            recordId={recordId}
            settings={settings}
            logs={bundle.supplements}
            onSettingsChanged={reloadSettings}
            onSaved={onSaved}
          />
          <WaterSheet
            open={active === "water"}
            onOpenChange={close}
            recordId={recordId}
            logs={bundle.water}
            onSaved={onSaved}
          />
          <SleepSheet
            open={active === "sleep"}
            onOpenChange={close}
            date={date}
            record={bundle.record}
            onSaved={onSaved}
          />
          <UploadSheet
            open={active === "upload"}
            onOpenChange={close}
            userId={userId}
            date={date}
            onSaved={onSaved}
          />
        </>
      )}
    </div>
  );
}
