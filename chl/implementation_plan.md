# 구현 계획

## 1. 문서 목적

이 문서는 `oneulFarm` 프로젝트에서 현재 담당 범위의 구현 방향, 기능 우선순위, 화면 구조, 백엔드/프론트 분리 기준을 정리하는 계획 문서다.

역할:

- 무엇을 먼저 구현할지 결정
- 어떤 화면을 어떤 역할로 둘지 정리
- DTO, API, CSS 운영 기준을 맞춤
- 작업 도중 계획이 바뀌면 기록

## 2. 현재 담당 범위

현재 직접 작업하는 범위는 아래와 같다.

- 마이페이지
- 주문관리
- 대시보드
- 상세 개인정보
- 비밀번호 변경
- 회원 탈퇴
- 배송지 관리

현재 우선순위에서 뒤로 미룬 항목:

- 상품 상세 페이지

판단 기준:

- 상품 상세는 현재 담당 범위 밖일 가능성이 높음
- 리뷰는 필요하지만 상품 영역과 연결 범위 확인이 선행되어야 함

## 3. 전체 구현 방향

기본 방향:

1. 화면 구조를 먼저 안정화
2. 더미 데이터로 레이아웃 확인
3. 실제 API로 교체
4. 에러/빈 상태/검증 메시지 보강
5. 다른 작업물과 충돌하지 않게 파일 분리 및 CSS 범위 관리

현재 원칙:

- 기능은 가능한 한 화면/도메인 단위로 분리
- 계정 화면 CSS는 공용이 아니면 `frontend/src/styles/account.css`에 작성
- DTO는 최대한 늘리지 않고, 필드와 검증이 같으면 통합
- 진행 기록은 `chl` 폴더에 유지

## 4. 화면 구조 계획

### 4.1 마이페이지

역할:

- 개인 허브 화면
- 정보 요약과 관리 기능 진입

현재 목표 구조:

- 개인정보 관리
- 관심 활동
- 주문관리
- 대시보드

제외 원칙:

- 주문 전체 리스트는 넣지 않음
- 상단 탭과 중복되는 이동 버튼은 최소화
- 같은 정보가 여러 카드에 반복되지 않게 유지

### 4.1-1 관심 활동

역할:

- 찜한 상품과 리뷰 관리 전용 화면

현재 목표 구조:

- 상단 탭
  - 찜한 상품
  - 리뷰 관리
- 찜한 상품은 상품 화면과 같은 찜 상태를 재사용
- 리뷰 관리는 작성 가능한 리뷰 / 내가 작성한 리뷰 / 작성·수정 폼 연결

### 4.2 주문관리

역할:

- 주문 조회와 상세 확인 전용 화면

현재 목표 구조:

- 페이지 헤더
- 주문 필터 바
- 간단한 요약 카드
- 주문 리스트
- 카드 바로 아래 상세 패널

방향:

- 마이페이지에서 주문 기능을 분리한 상태 유지
- 주문 기능 확장 시 이 화면을 중심으로 확장

### 4.3 대시보드

역할:

- 절약 금액과 소비 패턴 분석

현재 목표 구조:

- KPI 4개
- 월별 절약 금액 차트
- 품목별 절약 분석
- 평균 구매 단가 / 절약률
- 최다 구매 품목 / 최근 구매 상품

방향:

- 요약과 분석을 분리하지 않고 한 페이지에서 처리
- 실제 데이터가 없을 때는 로딩/빈 상태를 명확히 표시

### 4.4 상세 개인정보

역할:

- 계정 정보 조회 및 수정 전용 화면

현재 목표 구조:

- 정보 리스트 1개
- 수정 가능한 항목만 우측 버튼 배치
- 인라인 편집
- 비밀번호는 같은 리스트 안에서 변경
- 하단 별도 섹션으로 회원 탈퇴

제외 원칙:

- 회원번호 같은 불필요 정보는 노출하지 않음
- 상단 중복 요약 배지는 두지 않음

### 4.5 배송지 관리

역할:

- 배송지 CRUD와 기본 배송지 관리

현재 목표 구조:

- 목록 모드
- 추가/수정 모드
- 모달 내부 스크롤 고정

방향:

- 목록과 입력 화면을 동시에 보여주지 않음
- 주소가 많아져도 모달이 화면을 뚫지 않게 유지
- 기본 배송지는 배지 + 카드 강조로 식별

## 5. 백엔드 구현 계획

### 5.1 주문

우선 구현:

- 주문 목록
- 주문 상세
- 배송 상태/기간 필터

구조:

- Controller / Service / Dao / Mapper 분리
- 주문 상세는 주문, 배송, 결제, 상품, 리뷰 가능 여부를 조합한 응답 사용

### 5.2 대시보드

우선 구현:

- summary
- monthly-savings
- product-savings
- patterns

방향:

- summary로 상단 KPI 먼저 연결
- 이후 차트와 패턴 집계 API 추가

### 5.3 회원정보

우선 구현:

- 내 정보 조회
- 내 정보 수정
- 비밀번호 변경
- 중복 체크
- 회원 탈퇴

방향:

- 로그인 체계 전까지는 `X-USER-NO` 헤더 사용
- 비밀번호 확인이 필요한 요청은 공용 DTO 우선 사용

### 5.4 배송지

우선 구현:

- 목록 조회
- 추가
- 수정
- 기본 배송지 변경
- 삭제

정책:

- 기본 배송지는 항상 하나 존재해야 함
- 배송지가 1개뿐이면 기본 배송지 해제 불가
- 기본 배송지 삭제는 제한하거나 대체 기본 배송지 필요

## 6. 프론트 구현 계획

### 6.1 파일 분리 기준

화면 단위 분리:

- `AccountApp`
- `MyPageView`
- `OrdersView`
- `DashboardView`
- `ProfileDetailView`
- `AddressModal`
- `OrderDetailPanel`

원칙:

- 새로운 기능이면 되도록 별도 컴포넌트로 분리
- 다른 사람이 많이 만질 공용 파일 수정은 최소화

### 6.2 CSS 운영 기준

원칙:

- 계정 화면 전용 스타일은 `frontend/src/styles/account.css`
- 범용 이름 남발보다 역할 중심 클래스 유지
- 공용 CSS는 정말 공용일 때만 수정

피해야 할 것:

- 초록-노랑 그라데이션
- `btn`, `card` 같은 범용 스타일에 무분별한 전역 수정

### 6.3 인코딩 운영 기준

기준:

- 저장 인코딩은 UTF-8
- `.editorconfig`, `.gitattributes`, VS Code, Eclipse 설정 유지
- 깨진 파일은 억지 변환보다 UTF-8로 다시 작성

## 7. 더미 데이터 및 테스트 계획

### 7.1 주문/대시보드 더미

목표:

- 사용자 `USER_NO = 1`
- 주문 4건
- 2026-01 / 2026-02 / 2026-03 데이터 확보
- 감자 1kg이 최다 구매 품목

검증 기준:

- 총 구매 횟수 4건
- 총 구매 금액 32,500원
- 누적 절약 금액 5,000원
- 월별 절약 금액이 3개월 이상 노출

### 7.2 배송지 더미

목표:

- 기본 배송지 1개
- 일반 배송지 여러 개
- 목록 스크롤, 기본 배송지 강조, 삭제/수정 플로우 확인

## 8. 중간에 바뀐 계획

변경된 주요 내용:

- 주문 기능을 마이페이지 안에 유지하지 않고 `주문관리`로 분리
- 상세 개인정보는 카드 분리형에서 항목별 인라인 편집 구조로 변경
- 배송지 관리는 펼침형이 아니라 목록/입력 모드 분리로 변경
- 관심 활동은 별도 탭으로 분리 후 실제 데이터로 연동
- DTO는 가능한 한 줄이고 공용 요청 DTO 통합 기준 적용

## 9. 남은 계획 항목

현재 남은 후보:

- 계정 화면 마감 UX 점검
- 모바일 최종 정리

## 10. 다음 작업 선택 기준

다음 작업을 정할 때는 아래 순서를 따른다.

1. 현재 담당 범위인지 확인
2. 이미 완성된 주문/대시보드/마이페이지 흐름을 깨지 않는지 확인
3. 다른 사람 작업과 충돌 가능성 확인
4. 화면 작업이면 account 전용 스타일로 해결 가능한지 확인

## Related Design Doc
- 주문/배송 역할 분리와 운영 흐름 재설계 초안:
  - [order_fulfillment_separation_plan.md](/d:/study/oneulFarm/docs/order_fulfillment_separation_plan.md)

## 2026-03-25 Order/Delivery Design Doc
- 주문/배송 분리 설계 문서: [order_fulfillment_separation_plan.md](/d:/study/oneulFarm/docs/order_fulfillment_separation_plan.md)

- 배송 추적과 배송사 전용 페이지 분리를 위해 문서에 배송사 마스터(OFT_CARRIER), 배송 추적 이력(OFT_DELIVERY_TRACKING_HISTORY), 배송사 계정 구조(ROLE 확장 + OFT_CARRIER_USER)를 반영했다.

- 주문/배송 분리 설계의 DB 적용 검토를 위해 [order_fulfillment_separation_ddl_draft.sql](/d:/study/oneulFarm/backend/src/main/webapp/WEB-INF/sql/order_fulfillment_separation_ddl_draft.sql) 초안을 추가했다.

- 상태값 이관을 위해 [order_fulfillment_state_migration_plan.md](/d:/study/oneulFarm/docs/order_fulfillment_state_migration_plan.md) 문서를 추가했다. 현재 ORDER_STATUS / DELIVERY_STATUS 사용처와 목표 상태 체계 매핑, 단계별 전환 순서를 정리했다.

- 실데이터 점검용 Oracle 쿼리 파일 [order_fulfillment_state_audit_queries.sql](/d:/study/oneulFarm/backend/src/main/webapp/WEB-INF/sql/order_fulfillment_state_audit_queries.sql)을 추가했다. 상태 분포, 취소 주문, 송장/배송상태 불일치, 배송사명 정규화 후보를 점검할 수 있다.

- 백필 검토용 SQL [order_fulfillment_backfill_draft.sql](/d:/study/oneulFarm/backend/src/main/webapp/WEB-INF/sql/order_fulfillment_backfill_draft.sql)을 추가했다. 안전한 기본값 채우기, 주문/배송 상태 변환, 배송사 코드 보정, 이력 테이블 초기 적재 초안을 포함한다.

- 고객/운영자/배송사 역할 분리 구현을 위한 [order_fulfillment_api_spec_draft.md](/d:/study/oneulFarm/docs/order_fulfillment_api_spec_draft.md) 문서를 추가했다. 요청/응답 구조, 권한, 상태 검증 규칙을 정리했다.

- 화면 구조용 [order_fulfillment_ui_wireframe_draft.md](/d:/study/oneulFarm/docs/order_fulfillment_ui_wireframe_draft.md), 실행 순서용 [order_fulfillment_implementation_roadmap.md](/d:/study/oneulFarm/docs/order_fulfillment_implementation_roadmap.md), 검증용 [order_fulfillment_test_checklist.md](/d:/study/oneulFarm/docs/order_fulfillment_test_checklist.md) 문서를 추가했다.
