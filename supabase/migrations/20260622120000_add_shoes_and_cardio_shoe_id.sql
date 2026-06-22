-- ============================================================================
-- 2026-06-22 신발장(shoes) 도입 + cardio_logs.shoe_id 추가
-- ----------------------------------------------------------------------------
-- 배경: 유산소 운동에 나이키런 방식의 운동화별 누적 주행거리 관리(신발장)를 추가한다.
--       유산소 기록 시 신발을 선택하면 거리가 자동 누적되고,
--       앱 사용 전 누적분은 initial_distance 베이스라인으로 수동 입력한다.
-- 적용: 운영 중인 DB에 대해 Supabase 대시보드 > SQL Editor 에서 한 번 실행한다.
--       모든 구문은 멱등(idempotent)하여 여러 번 실행해도 안전하다.
-- ============================================================================

-- 1) 신발장 테이블 (사용자 마스터 데이터)
create table if not exists public.shoes (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles (id) on delete cascade,
  name             varchar not null,                 -- 신발명
  initial_distance numeric not null default 0,       -- 이전 누적 거리(km) 베이스라인
  created_at       timestamptz not null default now()
);

-- 2) RLS: 본인 신발만 접근
alter table public.shoes enable row level security;
drop policy if exists "own shoes" on public.shoes;
create policy "own shoes" on public.shoes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 3) cardio_logs 에 사용 신발 연결 (신발 삭제 시 기록은 보존, 합산에서만 제외)
alter table public.cardio_logs
  add column if not exists shoe_id uuid references public.shoes (id) on delete set null;

-- ----------------------------------------------------------------------------
-- 롤백 (필요 시)
--   alter table public.cardio_logs drop column if exists shoe_id;
--   drop table if exists public.shoes cascade;
-- ============================================================================
