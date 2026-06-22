import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useDailyBundle } from "@/hooks/useDailyBundle";
import { useSupplementSettings } from "@/hooks/useSupplementSettings";
import { useShoes } from "@/hooks/useShoes";
import { DateNav } from "./DateNav";
import { ProfileHeader } from "./ProfileHeader";
import { LogGrid, type SheetKey } from "./LogGrid";
import { Sidebar } from "./Sidebar";
import { AppHeader } from "./AppHeader";
import { StatsView } from "@/components/stats/StatsView";
import { ComprehensiveReportView } from "@/components/stats/ComprehensiveReportView";
import { FeedbackPanel } from "@/components/feedback/FeedbackPanel";
import type { StatCategory } from "@/lib/stats";
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

/** 현재 보여줄 화면: 대시보드 메인 / 종합소견 / 항목별 통계 */
type View = "dashboard" | "report" | StatCategory;

export function Dashboard({ userId }: Props) {
  const { signOut } = useAuth();
  const [date, setDate] = useState(() => new Date());
  const [active, setActive] = useState<SheetKey | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [view, setView] = useState<View>("dashboard");

  const { profile, update: updateProfile } = useProfile(userId);
  const { bundle, reload } = useDailyBundle(userId, date);
  const { settings, reload: reloadSettings } = useSupplementSettings(userId);
  const { shoes, reload: reloadShoes } = useShoes(userId);

  const recordId = bundle.record?.id;
  const close = () => setActive(null);
  const onSaved = () => {
    void reload();
  };

  const goto = (next: View) => {
    setView(next);
    setMenuOpen(false);
  };
  const backToDashboard = () => setView("dashboard");

  const sidebar = (
    <Sidebar
      open={menuOpen}
      onOpenChange={setMenuOpen}
      profile={profile}
      onSelectReport={() => goto("report")}
      onSelectCategory={(c) => goto(c)}
      onLogout={() => signOut()}
    />
  );

  // --- 종합 건강 소견 화면 ---------------------------------------------------
  if (view === "report") {
    return (
      <>
        <ComprehensiveReportView
          userId={userId}
          profile={profile}
          onBack={backToDashboard}
          onOpenMenu={() => setMenuOpen(true)}
        />
        {sidebar}
      </>
    );
  }

  // --- 항목별 통계/타임라인 화면 ---------------------------------------------
  if (view !== "dashboard") {
    return (
      <>
        <StatsView
          userId={userId}
          category={view}
          onBack={backToDashboard}
          onOpenMenu={() => setMenuOpen(true)}
        />
        {sidebar}
      </>
    );
  }

  // --- 대시보드 메인 화면 ----------------------------------------------------
  return (
    <div className="flex flex-1 flex-col">
      <AppHeader onOpenMenu={() => setMenuOpen(true)} />
      {sidebar}

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
            userId={userId}
            recordId={recordId}
            logs={bundle.cardio}
            shoes={shoes}
            onShoesChanged={reloadShoes}
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
