import { supabase } from "@/lib/supabase";
import { toDateKey } from "@/lib/utils";
import type {
  AiFeedback,
  CardioLog,
  DailyBundle,
  DailyRecord,
  DietLog,
  HealthMetric,
  RangeBundle,
  Shoe,
  ShoeTimelineEntry,
  ShoeWithMileage,
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

  try {
    const { data: created, error: insErr } = await supabase
      .from("daily_records")
      .insert({ user_id: userId, date: dateKey })
      .select("*")
      .single();
    if (insErr) {
      if (insErr.code === "23505" || String((insErr as any).status) === "409" || insErr.message?.includes("duplicate")) {
        const { data: retryData, error: retryErr } = await supabase
          .from("daily_records")
          .select("*")
          .eq("user_id", userId)
          .eq("date", dateKey)
          .maybeSingle();
        if (!retryErr && retryData) {
          return retryData as DailyRecord;
        }
      }
      throw insErr;
    }
    return created as DailyRecord;
  } catch (err: any) {
    const { data: retryData, error: retryErr } = await supabase
      .from("daily_records")
      .select("*")
      .eq("user_id", userId)
      .eq("date", dateKey)
      .maybeSingle();
    if (!retryErr && retryData) {
      return retryData as DailyRecord;
    }
    throw err;
  }
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

// --- 신발장 (shoes) ----------------------------------------------------------
export async function fetchShoes(userId: string): Promise<Shoe[]> {
  const { data, error } = await supabase
    .from("shoes")
    .select("*")
    .eq("user_id", userId)
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as Shoe[];
}

/**
 * 신발 목록에 현재 주행거리(= initial_distance + 유산소 기록 합)를 합쳐 반환.
 * cardio_logs 는 RLS 로 본인 것만 조회되므로 클라이언트에서 신발별로 합산한다.
 */
export async function fetchShoesWithMileage(userId: string): Promise<ShoeWithMileage[]> {
  const shoes = await fetchShoes(userId);
  if (shoes.length === 0) return [];

  const { data: logs, error } = await supabase
    .from("cardio_logs")
    .select("shoe_id, distance")
    .not("shoe_id", "is", null);
  if (error) throw error;

  const sums = new Map<string, number>();
  for (const row of (logs ?? []) as { shoe_id: string; distance: number }[]) {
    sums.set(row.shoe_id, (sums.get(row.shoe_id) ?? 0) + Number(row.distance));
  }

  return shoes.map((s) => ({
    ...s,
    current_distance: Number((Number(s.initial_distance) + (sums.get(s.id) ?? 0)).toFixed(1)),
  }));
}

export async function addShoe(
  row: Pick<Shoe, "user_id" | "name" | "initial_distance">,
): Promise<void> {
  const { error } = await supabase.from("shoes").insert(row);
  if (error) throw error;
}

export async function updateShoe(
  id: string,
  patch: Partial<Pick<Shoe, "name" | "initial_distance">>,
): Promise<void> {
  const { error } = await supabase.from("shoes").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteShoe(id: string): Promise<void> {
  const { error } = await supabase.from("shoes").delete().eq("id", id);
  if (error) throw error;
}

/** 특정 신발의 주행 타임라인(기록 날짜 내림차순) */
export async function fetchShoeTimeline(shoeId: string): Promise<ShoeTimelineEntry[]> {
  const { data, error } = await supabase
    .from("cardio_logs")
    .select("id, type, distance, duration, daily_records(date)")
    .eq("shoe_id", shoeId);
  if (error) throw error;

  const rows = (data ?? []) as Array<{
    id: string;
    type: string;
    distance: number;
    duration: number;
    daily_records: { date: string } | { date: string }[] | null;
  }>;

  return rows
    .map((r) => {
      const rec = Array.isArray(r.daily_records) ? r.daily_records[0] : r.daily_records;
      return {
        id: r.id,
        date: rec?.date ?? "",
        type: r.type,
        distance: Number(r.distance),
        duration: r.duration,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

// --- 인바디 / 건강검진 ------------------------------------------------------
export async function addHealthMetric(
  row: Omit<HealthMetric, "id" | "created_at">,
): Promise<void> {
  const { error } = await supabase.from("health_metrics").insert(row);
  if (error) throw error;
}

/** 사용자의 검진/인바디 전체를 날짜 내림차순으로 조회 */
export async function fetchAllHealthMetrics(userId: string): Promise<HealthMetric[]> {
  const { data, error } = await supabase
    .from("health_metrics")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as HealthMetric[];
}

// --- 통계/타임라인: 기간 단위 통합 조회 -------------------------------------
/**
 * 지정 기간(startDate ~ endDate, YYYY-MM-DD) 동안의 daily_records 와
 * 모든 자식 로그를 한 번에 조회해 RangeBundle 로 반환한다.
 */
export async function fetchDailyRecordsInRange(
  userId: string,
  startDate: string,
  endDate: string,
): Promise<RangeBundle> {
  const { data: records, error } = await supabase
    .from("daily_records")
    .select("*")
    .eq("user_id", userId)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: false });
  if (error) throw error;

  const recs = (records ?? []) as DailyRecord[];
  const empty: RangeBundle = {
    records: recs,
    cardio: [],
    strength: [],
    stretching: [],
    diet: [],
    water: [],
    supplements: [],
  };
  if (recs.length === 0) return empty;

  const recordIds = recs.map((r) => r.id);

  const [cardio, strength, stretching, diet, water, supplements] = await Promise.all([
    supabase.from("cardio_logs").select("*").in("daily_record_id", recordIds),
    supabase.from("strength_logs").select("*").in("daily_record_id", recordIds),
    supabase.from("stretching_logs").select("*").in("daily_record_id", recordIds),
    supabase.from("diet_logs").select("*").in("daily_record_id", recordIds),
    supabase.from("water_logs").select("*").in("daily_record_id", recordIds),
    supabase.from("supplement_logs").select("*").in("daily_record_id", recordIds),
  ]);

  for (const res of [cardio, strength, stretching, diet, water, supplements]) {
    if (res.error) throw res.error;
  }

  return {
    records: recs,
    cardio: (cardio.data ?? []) as CardioLog[],
    strength: (strength.data ?? []) as StrengthLog[],
    stretching: (stretching.data ?? []) as StretchingLog[],
    diet: (diet.data ?? []) as DietLog[],
    water: (water.data ?? []) as WaterLog[],
    supplements: (supplements.data ?? []) as SupplementLog[],
  };
}
