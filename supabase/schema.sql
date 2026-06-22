-- ============================================================================
-- 건강관리 앱 데이터베이스 스키마 (Supabase / PostgreSQL)
-- database_schema.md 명세 기준 10개 테이블 + RLS 정책
-- Supabase 대시보드 > SQL Editor 에 붙여넣어 한 번에 실행하세요.
-- ============================================================================

-- 1) profiles : 사용자 개인 기본 정보 -----------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  birth_date  date        not null default '1992-08-19',
  gender      varchar     not null default '남자',
  height      numeric     not null default 167,
  created_at  timestamptz not null default now()
);

-- 2) daily_records : 데일리 건강 메인 테이블 ----------------------------------
create table if not exists public.daily_records (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  date         date not null,
  weight       numeric,
  sleep_start  timestamptz,
  sleep_end    timestamptz,
  ai_feedback  jsonb,
  created_at   timestamptz not null default now(),
  unique (user_id, date)
);
create index if not exists idx_daily_records_user_date
  on public.daily_records (user_id, date);

-- 2-1) shoes : 신발장(운동화별 누적 주행거리 관리) ----------------------------
create table if not exists public.shoes (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles (id) on delete cascade,
  name             varchar not null,                 -- 신발명
  initial_distance numeric not null default 0,       -- 이전 누적 거리(km) 베이스라인
  created_at       timestamptz not null default now()
);

-- 3) cardio_logs : 유산소 운동 기록 -------------------------------------------
create table if not exists public.cardio_logs (
  id              uuid primary key default gen_random_uuid(),
  daily_record_id uuid not null references public.daily_records (id) on delete cascade,
  type            varchar not null default '달리기',
  distance        numeric not null,
  duration        integer not null,  -- 초 단위
  shoe_id         uuid references public.shoes (id) on delete set null  -- 사용한 신발(신발장)
);
-- 이미 이전 버전(shoe_id 컬럼 없음)으로 테이블을 만들었다면 아래를 한 번 실행하세요.
--   alter table public.cardio_logs add column if not exists shoe_id uuid references public.shoes (id) on delete set null;

-- 4) strength_logs : 무산소 운동 기록 -----------------------------------------
create table if not exists public.strength_logs (
  id              uuid primary key default gen_random_uuid(),
  daily_record_id uuid not null references public.daily_records (id) on delete cascade,
  exercise_name   varchar not null,
  sets            jsonb   not null   -- [{"weight":60,"reps":10}, ...]
);

-- 5) stretching_logs : 스트레칭 기록 ------------------------------------------
create table if not exists public.stretching_logs (
  id              uuid primary key default gen_random_uuid(),
  daily_record_id uuid not null references public.daily_records (id) on delete cascade,
  name            varchar not null,
  duration        integer not null   -- 분 단위
);

-- 6) diet_logs : 음식 및 식단 기록 --------------------------------------------
create table if not exists public.diet_logs (
  id              uuid primary key default gen_random_uuid(),
  daily_record_id uuid not null references public.daily_records (id) on delete cascade,
  meal_type       varchar not null,  -- 아침/점심/저녁/간식
  keywords        text[]  not null
);

-- 7) water_logs : 수분 섭취 기록 ----------------------------------------------
create table if not exists public.water_logs (
  id              uuid primary key default gen_random_uuid(),
  daily_record_id uuid not null references public.daily_records (id) on delete cascade,
  amount_ml       integer not null,
  created_at      timestamptz not null default now()
);

-- 8) supplement_settings : 영양제 기본 패키징 설정 ----------------------------
create table if not exists public.supplement_settings (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  name          varchar not null,  -- 영양제 제품 이름 (예: 종합비타민)
  dosage        varchar,           -- 성분 및 복용량 (예: 1정)
  ingredients   text,              -- 전체 성분 자유 입력(여러 줄 붙여넣기)
  package_time  varchar not null,  -- 아침/점심/저녁/취침
  created_at    timestamptz not null default now()
);
-- 이미 이전 버전(ingredients 컬럼 없음)으로 테이블을 만들었다면 아래를 한 번 실행하세요.
--   alter table public.supplement_settings add column if not exists ingredients text;

-- 9) supplement_logs : 영양제 복용 체크 로그 ----------------------------------
create table if not exists public.supplement_logs (
  id                    uuid primary key default gen_random_uuid(),
  daily_record_id       uuid not null references public.daily_records (id) on delete cascade,
  supplement_setting_id uuid not null references public.supplement_settings (id) on delete cascade,
  taken                 boolean not null default false,
  unique (daily_record_id, supplement_setting_id)
);

-- 10) health_metrics : 종합 검진 및 인바디 데이터 -----------------------------
create table if not exists public.health_metrics (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  date         date not null,
  metric_type  varchar not null,  -- inbody / checkup
  data         jsonb not null,
  created_at   timestamptz not null default now()
);

-- ============================================================================
-- Row Level Security : 본인 데이터만 접근 가능하도록 제한
-- ============================================================================
alter table public.profiles            enable row level security;
alter table public.daily_records       enable row level security;
alter table public.shoes               enable row level security;
alter table public.cardio_logs         enable row level security;
alter table public.strength_logs       enable row level security;
alter table public.stretching_logs     enable row level security;
alter table public.diet_logs           enable row level security;
alter table public.water_logs          enable row level security;
alter table public.supplement_settings enable row level security;
alter table public.supplement_logs     enable row level security;
alter table public.health_metrics      enable row level security;

-- profiles : 본인 행만
create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- user_id 컬럼을 직접 가진 테이블
create policy "own daily_records" on public.daily_records
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own supplement_settings" on public.supplement_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own shoes" on public.shoes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own health_metrics" on public.health_metrics
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- daily_record_id 를 통해 소유권을 검증하는 자식 테이블들
create or replace function public.owns_daily_record(record_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.daily_records dr
    where dr.id = record_id and dr.user_id = auth.uid()
  );
$$;

create policy "own cardio_logs" on public.cardio_logs
  for all using (public.owns_daily_record(daily_record_id))
  with check (public.owns_daily_record(daily_record_id));
create policy "own strength_logs" on public.strength_logs
  for all using (public.owns_daily_record(daily_record_id))
  with check (public.owns_daily_record(daily_record_id));
create policy "own stretching_logs" on public.stretching_logs
  for all using (public.owns_daily_record(daily_record_id))
  with check (public.owns_daily_record(daily_record_id));
create policy "own diet_logs" on public.diet_logs
  for all using (public.owns_daily_record(daily_record_id))
  with check (public.owns_daily_record(daily_record_id));
create policy "own water_logs" on public.water_logs
  for all using (public.owns_daily_record(daily_record_id))
  with check (public.owns_daily_record(daily_record_id));
create policy "own supplement_logs" on public.supplement_logs
  for all using (public.owns_daily_record(daily_record_id))
  with check (public.owns_daily_record(daily_record_id));

-- ============================================================================
-- 신규 가입 시 profiles 행 자동 생성 트리거
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
