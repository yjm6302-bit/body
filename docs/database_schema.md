# 🗄️ 데이터베이스 스키마 명세서

본 문서는 Supabase(PostgreSQL) 상에 구축될 10개 테이블의 릴레이션 관계(ERD) 및 상세 컬럼 규격을 설명합니다.

---

## 1. 개략적 데이터 릴레이션 (ERD)

```mermaid
erDiagram
    profiles ||--oI daily_records : "has many"
    profiles ||--oI supplement_settings : "manages"
    profiles ||--oI health_metrics : "records"
    
    daily_records ||--oI cardio_logs : "tracks"
    daily_records ||--oI strength_logs : "tracks"
    daily_records ||--oI stretching_logs : "tracks"
    daily_records ||--oI diet_logs : "tracks"
    daily_records ||--oI water_logs : "tracks"
    daily_records ||--oI supplement_logs : "tracks"
    
    supplement_settings ||--oI supplement_logs : "logged by"
```

---

## 2. 테이블 상세 사양

### 1) `profiles` (사용자 개인 기본 정보)
*   **설명**: 사용자의 기본 계정 프로필 및 고정형 신체 정보(생년월일, 키, 성별 등)를 보관합니다.
*   **구조**:
    | 컬럼명 | 데이터 타입 | 제약 조건 | 설명 |
    | :--- | :--- | :--- | :--- |
    | `id` | `uuid` | PK, FK (auth.users.id) | Supabase 사용자 고유 식별값 |
    | `birth_date` | `date` | Default '1992-08-19' | 생년월일 |
    | `gender` | `varchar` | Default '남자' | 성별 |
    | `height` | `numeric` | Default 167 | 키 (cm) |
    | `created_at` | `timestamp` | Default now() | 생성 일자 |

### 2) `daily_records` (데일리 건강 메인 테이블)
*   **설명**: 하루 단위 건강 데이터의 메인 헤더 레코드입니다.
*   **구조**:
    | 컬럼명 | 데이터 타입 | 제약 조건 | 설명 |
    | :--- | :--- | :--- | :--- |
    | `id` | `uuid` | PK | 레코드 식별 아이디 |
    | `user_id` | `uuid` | FK (profiles.id) | 작성자 ID |
    | `date` | `date` | NOT NULL, Unique(user_id, date) | 기록 날짜 |
    | `weight` | `numeric` | NULL 가능 | 당일 몸무게 (kg) |
    | `sleep_start` | `timestamp` | NULL 가능 | 취침 시간 |
    | `sleep_end` | `timestamp` | NULL 가능 | 기상 시간 |
    | `ai_feedback` | `jsonb` | NULL 가능 | Gemini AI 피드백 텍스트 (종합/운동/영양/수면 카테고리 포함) |

### 3) `cardio_logs` (유산소 운동 기록)
*   **설명**: 달리기, 자전거 등 유산소 운동 데이터 기록 테이블.
*   **구조**:
    | 컬럼명 | 데이터 타입 | 제약 조건 | 설명 |
    | :--- | :--- | :--- | :--- |
    | `id` | `uuid` | PK | 고유 번호 |
    | `daily_record_id`| `uuid` | FK (daily_records.id) ON DELETE CASCADE | 데일리 기록 ID |
    | `distance` | `numeric` | NOT NULL | 달린 거리 (km) |
    | `duration` | `integer` | NOT NULL | 소요 시간 (초 단위) |

### 4) `strength_logs` (무산소 운동 기록)
*   **설명**: 헬스, 웨이트 트레이닝 운동 기록. 세트별 상세 무게 및 횟수는 JSON 배열로 보관합니다.
*   **구조**:
    | 컬럼명 | 데이터 타입 | 제약 조건 | 설명 |
    | :--- | :--- | :--- | :--- |
    | `id` | `uuid` | PK | 고유 번호 |
    | `daily_record_id`| `uuid` | FK (daily_records.id) ON DELETE CASCADE | 데일리 기록 ID |
    | `exercise_name` | `varchar` | NOT NULL | 운동 이름 (예: 스쿼트, 벤치프레스) |
    | `sets` | `jsonb` | NOT NULL | 세트 정보 배열 `[{"weight": 60, "reps": 10}, ...]` |

### 5) `stretching_logs` (스트레칭 기록)
*   **설명**: 가벼운 몸풀기 또는 요가 등의 스트레칭 로그.
*   **구조**:
    | 컬럼명 | 데이터 타입 | 제약 조건 | 설명 |
    | :--- | :--- | :--- | :--- |
    | `id` | `uuid` | PK | 고유 번호 |
    | `daily_record_id`| `uuid` | FK (daily_records.id) ON DELETE CASCADE | 데일리 기록 ID |
    | `name` | `varchar` | NOT NULL | 스트레칭 종류/부위 |
    | `duration` | `integer` | NOT NULL | 수행 시간 (분 단위) |

### 6) `diet_logs` (음식 및 식단 기록)
*   **설명**: 아침/점심/저녁/간식 종류별 식단 키워드를 보관하는 테이블.
*   **구조**:
    | 컬럼명 | 데이터 타입 | 제약 조건 | 설명 |
    | :--- | :--- | :--- | :--- |
    | `id` | `uuid` | PK | 고유 번호 |
    | `daily_record_id`| `uuid` | FK (daily_records.id) ON DELETE CASCADE | 데일리 기록 ID |
    | `meal_type` | `varchar` | NOT NULL (아침/점심/저녁/간식) | 식사 시간 구분 |
    | `keywords` | `text[]` | NOT NULL | 먹은 음식 태그 리스트 (예: `{"닭가슴살", "바나나"}`) |

### 7) `water_logs` (수분 섭취 기록)
*   **설명**: 당일 물 섭취량을 ml 단위로 누적 기록하기 위한 로그 테이블.
*   **구조**:
    | 컬럼명 | 데이터 타입 | 제약 조건 | 설명 |
    | :--- | :--- | :--- | :--- |
    | `id` | `uuid` | PK | 고유 번호 |
    | `daily_record_id`| `uuid` | FK (daily_records.id) ON DELETE CASCADE | 데일리 기록 ID |
    | `amount_ml` | `integer` | NOT NULL | 섭취량 (ml) |

### 8) `supplement_settings` (영양제 기본 패키징 설정)
*   **설명**: 사용자가 복용하는 영양제 마스터 정보 및 섭취 시간대(패키징) 정보.
*   **구조**:
    | 컬럼명 | 데이터 타입 | 제약 조건 | 설명 |
    | :--- | :--- | :--- | :--- |
    | `id` | `uuid` | PK | 영양제 설정 식별값 |
    | `user_id` | `uuid` | FK (profiles.id) | 작성자 ID |
    | `name` | `varchar` | NOT NULL | 영양제 제품 이름 (예: 종합비타민) |
    | `dosage` | `varchar` | NULL 가능 | 성분 및 복용량 (예: 1정) |
    | `package_time` | `varchar` | NOT NULL (아침/점심/저녁) | 주로 복용할 시간대 |

### 9) `supplement_logs` (영양제 복용 체크 로그)
*   **설명**: 특정 날짜에 대상 영양제를 섭취했는지 체크 여부를 보관.
*   **구조**:
    | 컬럼명 | 데이터 타입 | 제약 조건 | 설명 |
    | :--- | :--- | :--- | :--- |
    | `id` | `uuid` | PK | 고유 번호 |
    | `daily_record_id`| `uuid` | FK (daily_records.id) ON DELETE CASCADE | 데일리 기록 ID |
    | `supplement_setting_id` | `uuid` | FK (supplement_settings.id) | 복용한 영양제 원본 ID |
    | `taken` | `boolean` | Default false | 복용 여부 체크 상태 |

### 10) `health_metrics` (종합 검진 및 인바디 데이터)
*   **설명**: AI 이미지 파싱을 거쳐 추출 완료된 정형 건강 수치를 담는 데이터 테이블.
*   **구조**:
    | 컬럼명 | 데이터 타입 | 제약 조건 | 설명 |
    | :--- | :--- | :--- | :--- |
    | `id` | `uuid` | PK | 고유 번호 |
    | `user_id` | `uuid` | FK (profiles.id) | 작성자 ID |
    | `date` | `date` | NOT NULL | 측정일/검사일 |
    | `metric_type` | `varchar` | NOT NULL (inbody / checkup) | 데이터 타입 분류 (인바디 / 건강검진) |
    | `data` | `jsonb` | NOT NULL | 파싱된 정형 JSON 수치 셋 |
