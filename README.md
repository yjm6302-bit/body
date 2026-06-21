# 건강관리 앱 (1인 전용)

React(Vite) + Tailwind + shadcn 스타일 UI + Supabase + Google Gemini 기반의
모바일 웹 건강관리 애플리케이션입니다. 기획 문서는 [`docs/`](docs/README.md) 참고.

## 기술 스택

- **Frontend**: React 19 + Vite 6 + TypeScript
- **Styling**: Tailwind CSS (프리미엄 다크 테마) + Radix UI / vaul 바텀시트
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **AI**: Google Gemini 2.5 Flash (`@google/genai`) — 이미지 파싱 / 데일리 피드백
- **배포 대상**: Cloudflare Pages

## 빠른 시작

```bash
npm install

# 환경변수 설정
cp .env.example .env
#  → VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY / VITE_GEMINI_API_KEY 채우기

npm run dev      # 개발 서버 (http://localhost:5173)
npm run build    # 타입체크 + 프로덕션 빌드
npm run preview  # 빌드 결과 미리보기
```

> 환경변수가 비어 있어도 앱은 실행되며, 화면에 설정 안내(SetupNotice)가 표시됩니다.

## Supabase 준비

1. [supabase.com](https://supabase.com) 에서 프로젝트 생성
2. **SQL Editor** 에 [`supabase/schema.sql`](supabase/schema.sql) 전체를 붙여넣고 실행
   - 10개 테이블 + RLS 정책 + 신규 가입 시 `profiles` 자동 생성 트리거가 만들어집니다.
3. **Authentication > Providers** 에서 이메일 로그인 활성화
4. 앱 첫 화면에서 회원가입 → 로그인 (또는 `.env` 의 `VITE_APP_EMAIL/PASSWORD` 로 자동 로그인)

## 폴더 구조

```
src/
├─ App.tsx                  # 인증 분기 (Setup / Login / Dashboard)
├─ lib/
│  ├─ supabase.ts           # Supabase 클라이언트
│  ├─ gemini.ts             # Gemini: 이미지 파싱 + 피드백 생성
│  ├─ repository.ts         # 모든 DB 쿼리(CRUD)
│  └─ utils.ts              # cn, 날짜/시간 유틸
├─ hooks/                   # useAuth / useProfile / useDailyBundle / useSupplementSettings
├─ types/database.ts        # 테이블 타입 정의
└─ components/
   ├─ ui/                   # 디자인 시스템 프리미티브 (button, drawer, input ...)
   ├─ auth/                 # LoginScreen, SetupNotice
   ├─ dashboard/            # DateNav, ProfileHeader, LogGrid, Dashboard
   ├─ sheets/               # 8대 데일리 입력 바텀시트
   └─ feedback/             # AI 피드백 패널
```

## 주요 기능

- 상단 날짜 네비게이션(이전/다음/달력) — 날짜 변경 시 해당일 데이터 실시간 패치
- 기본 정보(생년월일/성별/키) 표시·수정 + 데일리 몸무게 입력
- 8대 데일리 입력(바텀시트): 유산소 · 무산소(세트 관리) · 스트레칭 · 식단(태그) ·
  영양제(시간대별 체크) · 수분(퀵버튼) · 수면(시간 계산) · 검진/인바디 AI 파싱
- AI 데일리 피드백: 종합 / 운동 / 영양 / 수면 카테고리 + 건강 점수

## Cloudflare Pages 배포

- **Build command**: `npm run build`
- **Build output**: `dist`
- **Environment variables**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_GEMINI_API_KEY` 등록

## 디자인 시스템 메모

- 폰트: 스포카 한 산스 네오 (`index.html` CDN 로드)
- 컬러: 운동=에메랄드(`exercise`), 수분·수면=오션블루(`trust`), 영양=앰버(`highlight`), 위험=레드(`danger`)
- 모든 터치 타겟 ≥ 44px, 입력은 모달 대신 바텀시트, 숫자 입력은 `inputmode` 적용
