# 📊 통계/타임라인 및 종합소견 기능 구현 명세서 (Agent Instruction)

본 문서는 다른 AI 에이전트가 본 프로젝트의 **햄버거 메뉴 전환, 항목별 통계 및 타임라인, AI 종합소견** 기능을 공용 컴포넌트 설계와 함께 완벽하게 구현할 수 있도록 돕는 지침서이자 상세 구현 명세서입니다.

---

## 1. 개요 및 요구사항
1. **좌측 상단 로그아웃 버튼 제거 및 햄버거 메뉴 도입**
   * 헤더에 햄버거 아이콘(Menu) 버튼 배치.
   * 버튼 클릭 시 좌측에서 슬라이드인(Slide-in) 형태로 사이드바 드로어가 열림.
2. **사이드바 메뉴 구성**
   * 사용자 프로필 요약 (성별, 나이, 키)
   * **[종합 건강 소견]** (독립 메뉴)
   * **[항목별 통계 및 타임라인]** (체중, 유산소, 무산소, 식단, 수분, 수면, 영양제, 검진/인바디)
   * 하단에 **[로그아웃]** 버튼
3. **항목별 통계/타임라인 공용 컴포넌트화**
   * 각 카테고리의 구성(주간/년간 필터, 통계 요약 카드, 차트, 타임라인 리스트, AI 트렌드 분석)이 유사하므로 **`StatsLayout`**이라는 공용 프레젠테이션 컴포넌트를 설계하여 재사용성을 극대화합니다.
4. **통합 AI 종합소견(Comprehensive AI Report)**
   * 프로필 + 최근 검진/인바디(3회분) + 최근 30일간의 모든 일상 로그를 통합 취합하여 하나의 종합 건강 보고서를 생성해 보여줍니다.

---

## 2. 기술 스택 및 라이브러리 추가
* **차트 라이브러리**: 모바일 화면에 맞춰 유연하게 렌더링되고 애니메이션이 미려한 `recharts` 라이브러리를 사용합니다.
  ```bash
  npm install recharts
  npm install --save-dev @types/recharts
  ```
* **아이콘**: `lucide-react`를 활용합니다.
* **날짜 연산**: `date-fns` 라이브러리가 프로젝트 내에 이미 존재하므로 이를 적극 활용합니다.

---

## 3. 데이터 흐름 및 Repository 확장 (`src/lib/repository.ts`)

기간 조회를 위해 아래와 같이 기존 Supabase 데이터 조회를 기간(`startDate` ~ `endDate`) 단위로 처리하는 레포지토리 함수들을 정의하거나 확장해야 합니다.

### 3-1. 기간 단위 일상 로그 조회 함수
통계를 내기 위해 지정한 기간 동안의 `daily_records` 및 모든 하위 자식 테이블 데이터를 한 번에 가져오는 쿼리를 작성합니다.
```typescript
// 예시: 특정 기간 동안의 daily_records 및 자식 로그들을 한 번에 조회
export async function fetchDailyRecordsInRange(
  userId: string, 
  startDate: string, // YYYY-MM-DD
  endDate: string    // YYYY-MM-DD
) {
  // 1. 기간 내 daily_records 패치
  const { data: records, error } = await supabase
    .from("daily_records")
    .select("*")
    .eq("user_id", userId)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: false });

  if (error) throw error;
  if (!records || records.length === 0) return [];

  const recordIds = records.map(r => r.id);

  // 2. 각 테이블에서 recordIds에 매칭되는 데이터 병렬 패치
  const [cardio, strength, stretching, diet, water, supplements] = await Promise.all([
    supabase.from("cardio_logs").select("*").in("daily_record_id", recordIds),
    supabase.from("strength_logs").select("*").in("daily_record_id", recordIds),
    supabase.from("stretching_logs").select("*").in("daily_record_id", recordIds),
    supabase.from("diet_logs").select("*").in("daily_record_id", recordIds),
    supabase.from("water_logs").select("*").in("daily_record_id", recordIds),
    supabase.from("supplement_logs").select("*").in("daily_record_id", recordIds),
  ]);

  return {
    records,
    cardio: cardio.data ?? [],
    strength: strength.data ?? [],
    stretching: stretching.data ?? [],
    diet: diet.data ?? [],
    water: water.data ?? [],
    supplements: supplements.data ?? [],
  };
}
```

### 3-2. 검진 및 인바디 전체 조회 함수
`health_metrics` 테이블에서 사용자의 검진/인바디 목록을 역순으로 정렬하여 전부 가져옵니다.
```typescript
export async function fetchAllHealthMetrics(userId: string): Promise<HealthMetric[]> {
  const { data, error } = await supabase
    .from("health_metrics")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as HealthMetric[];
}
```

---

## 4. AI 분석 API 개발 (`src/lib/gemini.ts`)

트렌드 분석 및 종합소견 생성을 위해 2개의 API를 추가 또는 정비합니다.

### 4-1. 개요 항목별 트렌드 분석 (`generateTrendFeedback`)
특정 항목(예: 체중, 운동 등)의 기간 내 요약 텍스트 데이터를 받아 Gemini를 통해 해당 항목에 집중된 2~3문장 분량의 분석 조언을 반환합니다.
* **Input**: 카테고리명(예: "유산소 운동"), 통계 정보 요약 텍스트
* **Output**: `{ feedback: string }`

### 4-2. 종합소견 생성 (`generateComprehensiveReport`)
사용자의 인바디/검진 데이터와 30일간의 일상 라이프 로그 요약을 기반으로 종합적인 리포트를 발행합니다.
* **Prompt 요구조건**:
  - 체성분 및 검진 결과 분석 (근육량, 체지방량, 대사 건강 지표 등의 위험도 평가)
  - 일상 로그(식습관, 수분, 수면, 운동)와 신체 상태 간의 인과관계 분석 및 피드백
  - 향후 4주간의 맞춤 운동/식이 프로그램 제안
* **Output Schema**:
  ```json
  {
    "overallScore": 85, // 0~100 종합 신체 건강 점수
    "bodyCompositionAnalysis": "체성분 상태 분석 내용...",
    "lifestyleAnalysis": "운동, 수면, 식단 연계 평가 내용...",
    "actionPlan": "향후 추천 솔루션 및 액션 플랜..."
  }
  ```

---

## 5. UI 컴포넌트 설계 및 구현 가이드

공용 통계 화면은 하나의 공용 레이아웃을 통해 구현함으로써 중복 코드를 최소화하고 일관된 테마를 제공합니다.

### 5-1. 공용 통계 레이아웃 컴포넌트 (`src/components/stats/StatsLayout.tsx`)
이 컴포넌트는 다음 속성을 받아 렌더링을 담당합니다.
```typescript
interface StatSummaryItem {
  label: string;
  value: string | number;
  subValue?: string;
}

interface TimelineItem {
  id: string;
  date: string;
  title: string;
  description: string;
}

interface StatsLayoutProps {
  title: string;
  icon: React.ReactNode;
  summaryItems: StatSummaryItem[];
  chartData: any[]; // Recharts에 주입할 데이터 배열
  chartConfig: {
    xKey: string;
    yKeys: { key: string; color: string; name: string }[];
  };
  timelineData: TimelineItem[];
  aiFeedbackText: string | null;
  onGenerateAiFeedback: () => Promise<void>;
  loadingAiFeedback: boolean;
}
```
* **동작 세부 사항**:
  * **기간 선택**: 주간(최근 7일) / 연간(최근 12달) 탭을 제공하여 부모 컴포넌트가 상위 데이터를 재조회하도록 유도합니다.
  * **지표 요약 카드**: `summaryItems`를 격자형(Grid) 카드로 출력합니다.
  * **라인/바 차트**: `recharts`의 `<ResponsiveContainer>`, `<LineChart>`, `<BarChart>` 등을 사용하여 전달받은 `chartData`를 아름다운 그라디언트와 함께 렌더링합니다.
  * **AI 피드백 패널**: 블러 그라디언트 보더(`border bg-surface`) 디자인을 적용하고, 로딩 스피너 및 반짝임(`lucide-react/Sparkles`) 아이콘을 배치합니다.
  * **타임라인 목록**: 스크롤이 가능한 역순 일지 뷰를 렌더링합니다.

### 5-2. 사이드바 드로어 컴포넌트 (`src/components/dashboard/Sidebar.tsx`)
* Radix UI / Shadcn 기반의 `Sheet` 또는 커스텀 모바일 드로어를 구현합니다.
* 사용자가 카테고리를 클릭하면 `Dashboard.tsx` 혹은 `App.tsx` 내의 뷰 상태(`currentView`)가 변경되도록 콜백을 실행합니다.

### 5-3. 종합소견 화면 (`src/components/stats/ComprehensiveReportView.tsx`)
* 독립적으로 작동하는 전체 화면 뷰입니다.
* 사용자의 최근 30일 통계와 인바디 데이터를 카드 그리드로 요약하여 보여주고, 대형 **[AI 통합 건강 보고서 발행하기]** 버튼을 제공합니다.
* 결과물은 **종합 점수 게이지 바**, **체성분 분석 카드**, **일상/영양 피드백**, **실천 가이드** 등 여러 구획으로 나누어 풍부한 레이아웃으로 출력합니다.

---

## 6. 구현 절차 제언 (에이전트 실행 순서)
1. **의존성 설치**: `recharts` 패키지를 설치합니다.
2. **Repository 확장**: `src/lib/repository.ts`에 기간 내 데이터 통합 조회 쿼리와 `health_metrics` 전체 조회 함수를 추가합니다.
3. **Gemini API 추가**: `src/lib/gemini.ts`에 항목별 트렌드 분석 및 종합소견 생성 프롬프트를 처리하는 두 가지 메인 함수를 개발합니다.
4. **공용 UI 구현**:
   * `src/components/stats/StatsLayout.tsx` (공용 통계/타임라인 프레젠터)
   * `src/components/dashboard/Sidebar.tsx` (햄버거 사이드바)
5. **각 항목별 통계 컨테이너 구현**:
   * `WeightStats`, `CardioStats`, `StrengthStats`, `DietStats`, `WaterStats`, `SleepStats`, `SupplementStats`, `MetricStats`
   * 각 컨테이너는 본인에 맞는 데이터를 조회하여 가공(평균, 합산 등)한 뒤 `StatsLayout`에 주입합니다.
6. **종합소견 뷰 구현**: `ComprehensiveReportView.tsx` 개발.
7. **메인 화면 연계**: `Dashboard.tsx`의 헤더 로그아웃 버튼을 `Sidebar`로 교체하고, `currentView` 상태값에 따라 대시보드 메인, 항목별 통계 뷰, 종합소견 뷰로 동적 스위칭이 되도록 설정합니다.
