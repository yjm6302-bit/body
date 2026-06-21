// ============================================================================
// Supabase 테이블 타입 정의 (database_schema.md 기준)
// ============================================================================

export type MealType = "아침" | "점심" | "저녁" | "간식";
export type PackageTime = "아침" | "점심" | "저녁" | "취침";
export type MetricType = "inbody" | "checkup";

export interface Profile {
  id: string;
  birth_date: string; // YYYY-MM-DD
  gender: string;
  height: number;
  created_at: string;
}

export interface AiFeedback {
  overall: string; // 종합 피드백
  exercise: string; // 운동 피드백
  nutrition: string; // 영양 피드백
  sleep: string; // 수면 피드백
  score?: number; // 건강 점수 (0~100)
}

export interface DailyRecord {
  id: string;
  user_id: string;
  date: string;
  weight: number | null;
  sleep_start: string | null;
  sleep_end: string | null;
  ai_feedback: AiFeedback | null;
  created_at: string;
}

export interface CardioLog {
  id: string;
  daily_record_id: string;
  type: string;
  distance: number; // km
  duration: number; // 초
}

export interface StrengthSet {
  weight: number; // kg
  reps: number;
}

export interface StrengthLog {
  id: string;
  daily_record_id: string;
  exercise_name: string;
  sets: StrengthSet[];
}

export interface StretchingLog {
  id: string;
  daily_record_id: string;
  name: string;
  duration: number; // 분
}

export interface DietLog {
  id: string;
  daily_record_id: string;
  meal_type: MealType;
  keywords: string[];
}

export interface WaterLog {
  id: string;
  daily_record_id: string;
  amount_ml: number;
  created_at: string;
}

export interface SupplementSetting {
  id: string;
  user_id: string;
  name: string;
  dosage?: string | null;
  /** 전체 성분 자유 입력 (여러 줄 붙여넣기 가능) */
  ingredients?: string | null;
  package_time: PackageTime;
  created_at: string;
}

export interface SupplementLog {
  id: string;
  daily_record_id: string;
  supplement_setting_id: string;
  taken: boolean;
}

export interface HealthMetric {
  id: string;
  user_id: string;
  date: string;
  metric_type: MetricType;
  data: Record<string, unknown>;
  created_at: string;
}

/** 대시보드에서 사용하는 하루치 통합 데이터 묶음 */
export interface DailyBundle {
  record: DailyRecord | null;
  cardio: CardioLog[];
  strength: StrengthLog[];
  stretching: StretchingLog[];
  diet: DietLog[];
  water: WaterLog[];
  supplements: SupplementLog[];
}
