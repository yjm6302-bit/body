# 📋 건강관리 앱 개발 기획 문서 목록

본 문서는 1인 전용 모바일 건강관리 애플리케이션의 개발 스펙 및 기획을 부문별로 세분화하여 기록한 문서 모음입니다.

---

## 📂 문서 구조 가이드

각 문서는 용도와 부문에 따라 아래와 같이 분리되어 있습니다. 필요한 문서를 클릭하여 상세 내용을 확인하실 수 있습니다.

1. **[프로젝트 스펙 및 기능 명세서 (specification.md)](file:///c:/Users/Admin/Desktop/건강관리앱/docs/specification.md)**
   - 프로젝트 개요, 주요 개발 스펙(React, Cloudflare Pages, Supabase, Gemini API 등)
   - 모바일 화면별 기능 구성안 (기본정보, 8대 데일리 입력 항목, 4대 카테고리 AI 피드백)

2. **[디자인 시스템 및 UI 가이드라인 (design_system.md)](file:///c:/Users/Admin/Desktop/건강관리앱/docs/design_system.md)**
   - 기본 폰트 적용 방식 (스포카 한 산스 네오)
   - 추천 컬러 팔레트 색상표 및 용도 (다크 테마)
   - 국내 모바일 UI 개발 가이드 준수 사항 (터치 영역, 바텀 시트 선호 등)

3. **[데이터베이스 스키마 명세서 (database_schema.md)](file:///c:/Users/Admin/Desktop/건강관리앱/docs/database_schema.md)**
   - 전체 테이블 간의 관계도 (ERD)
   - 11개 테이블(`profiles`, `daily_records`, `shoes` 등)의 상세 컬럼 및 데이터 타입 명세
   - 신규 프로젝트용 최신 전체 스키마: `supabase/schema.sql`
   - 운영 중인 DB 변경분(증분 SQL): `supabase/migrations/` 폴더

---

## 🚀 향후 개발 로드맵

1. **1단계: 마크다운 기획 문서 최종 수립** (현재 단계 완료)
2. **2단계: Supabase 데이터베이스 생성 및 스키마 적용**
3. **3단계: React (Vite) 프로젝트 설정 및 디자인 라이브러리(Tailwind + Shadcn/ui) 구성**
4. **4단계: 개별 도메인별 컴포넌트(500줄 이하 규칙 적용) 및 커스텀 훅 개발**
5. **5단계: Google Gemini API 연동 (파싱 및 요약 피드백)**
6. **6단계: Cloudflare Pages를 통한 최종 배포 및 검증**
