import { supabase } from "@/lib/supabase";
import { toDateKey } from "@/lib/utils";
import type {
  AiFeedback,
  CardioLog,
  DailyBundle,
  DailyRecord,
  DietLog,
  HealthMetric,
  StrengthLog,
  StretchingLog,
  SupplementLog,
  SupplementSetting,
  WaterLog,
} from "@/types/database";

/**
 * 해당 날짜의 daily_records 헤더를 조회하고, 없으면 생성한다.
 * 모든 자식 로그(유산소/식단 등)는 이 레코드 id에 매달린다.
 */
export async function getOrCreateDailyRecord(
  userId: string,
  date: Date,
): Promise<DailyRecord> {
  const dateKey = toDateKey(date);

  const { data: existing, error: selErr } = await supabase
    .from("daily_records")
    .select("*")
    .eq("user_id", userId)
    .eq("date", dateKey)
    .maybeSingle();
  if (selErr) throw selErr;
  if (existing) return existing as DailyRecord;

  const { data: created, error: insErr } = await supabase
    .from("daily_records")
    .insert({ user_id: userId, date: dateKey })
    .select("*")
    .single();
  if (insErr) throw insErr;
  return created as DailyRecord;
}

/** 하루치 통합 데이터(헤더 + 모든 자식 로그)를 한 번에 패치 */
export async function fetchDailyBundle(userId: string, date: Date): Promise<DailyBundle> {
  const record = await getOrCreateDailyRecord(userId, date);
  const rid = record.id;

  const [cardio, strength, stretching, diet, water, supplements] = await Promise.all([
    supabase.from("cardio_logs").select("*").eq("daily_record_id", rid),
    supabase.from("strength_logs").select("*").eq("daily_record_id", rid),
    supabase.from("stretching_logs").select("*").eq("daily_record_id", rid),
    supabase.from("diet_logs").select("*").eq("daily_record_id", rid),
    supabase.from("water_logs").select("*").eq("daily_record_id", rid).order("created_at"),
    supabase.from("supplement_logs").select("*").eq("daily_record_id", rid),
  ]);

  for (const res of [cardio, strength, stretching, diet, water, supplements]) {
    if (res.error) throw res.error;
  }

  return {
    record,
    cardio: (cardio.data ?? []) as CardioLog[],
    strength: (strength.data ?? []) as StrengthLog[],
    stretching: (stretching.data ?? []) as StretchingLog[],
    diet: (diet.data ?? []) as DietLog[],
    water: (water.data ?? []) as WaterLog[],
    supplements: (supplements.data ?? []) as SupplementLog[],
  };
}

// --- daily_records 필드 갱신 -------------------------------------------------
export async function updateDailyRecord(
  id: string,
  patch: Partial<Pick<DailyRecord, "weight" | "sleep_start" | "sleep_end" | "ai_feedback">>,
): Promise<void> {
  const { error } = await supabase.from("daily_records").update(patch).eq("id", id);
  if (error) throw error;
}

export async function saveAiFeedback(id: string, feedback: AiFeedback): Promise<void> {
  return updateDailyRecord(id, { ai_feedback: feedback });
}

// --- 자식 로그 insert / delete (제네릭) --------------------------------------
type LogTable =
  | "cardio_logs"
  | "strength_logs"
  | "stretching_logs"
  | "diet_logs"
  | "water_logs";

export async function insertLog<T extends object>(
  table: LogTable,
  row: T & { daily_record_id: string },
): Promise<void> {
  const { error } = await supabase.from(table).insert(row);
  if (error) throw error;
}

export async function deleteLog(table: LogTable, id: string): Promise<void> {
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw error;
}

// --- 영양제 설정 (마스터) ----------------------------------------------------
export async function fetchSupplementSettings(userId: string): Promise<SupplementSetting[]> {
  const { data, error } = await supabase
    .from("supplement_settings")
    .select("*")
    .eq("user_id", userId)
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as SupplementSetting[];
}

export async function addSupplementSetting(
  row: Omit<SupplementSetting, "id" | "created_at">,
): Promise<void> {
  const { error } = await supabase.from("supplement_settings").insert(row);
  if (error) throw error;
}

export async function deleteSupplementSetting(id: string): Promise<void> {
  const { error } = await supabase.from("supplement_settings").delete().eq("id", id);
  if (error) throw error;
}

/** 특정 날짜·영양제의 복용 여부를 upsert (체크 토글) */
export async function setSupplementTaken(
  dailyRecordId: string,
  supplementSettingId: string,
  taken: boolean,
): Promise<void> {
  const { error } = await supabase.from("supplement_logs").upsert(
    {
      daily_record_id: dailyRecordId,
      supplement_setting_id: supplementSettingId,
      taken,
    },
    { onConflict: "daily_record_id,supplement_setting_id" },
  );
  if (error) throw error;
}

// --- 인바디 / 건강검진 ------------------------------------------------------
export async function addHealthMetric(
  row: Omit<HealthMetric, "id" | "created_at">,
): Promise<void> {
  const { error } = await supabase.from("health_metrics").insert(row);
  if (error) throw error;
}
