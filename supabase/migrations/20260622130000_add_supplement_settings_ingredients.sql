-- ============================================================================
-- 2026-06-22 supplement_settings.ingredients 컬럼 추가
-- ----------------------------------------------------------------------------
-- 배경: 영양제 설정에 전체 성분 자유 입력(ingredients) 기능이 추가되었으나,
--       이전 버전 스키마로 생성된 운영 DB 테이블에는 해당 컬럼이 없어
--       영양제 등록 시 PostgREST 가 PGRST204(컬럼 없음) → HTTP 400 을 반환한다.
-- 증상: POST /rest/v1/supplement_settings 400
--       "Could not find the 'ingredients' column of 'supplement_settings'
--        in the schema cache"
-- 적용: 운영 중인 DB에 대해 Supabase 대시보드 > SQL Editor 에서 한 번 실행한다.
--       구문은 멱등(idempotent)하여 여러 번 실행해도 안전하다.
-- ============================================================================

alter table public.supplement_settings
  add column if not exists ingredients text;  -- 전체 성분 자유 입력(여러 줄 붙여넣기)

-- 스키마 캐시 즉시 갱신 (선택: 보통 수 초 내 자동 반영됨)
notify pgrst, 'reload schema';

-- ----------------------------------------------------------------------------
-- 롤백 (필요 시)
--   alter table public.supplement_settings drop column if exists ingredients;
-- ============================================================================
