# 주문/배송 분리 구현 로드맵

## 1. 목적
- 주문/배송 분리 설계를 실제 구현 작업 순서로 전개하기 위한 실행 문서다.
- 백엔드, 프론트, 데이터, QA를 한 흐름으로 정리한다.

## 2. 전체 단계

### Phase 1. 데이터 구조 준비
- `OFT_CARRIER` 추가
- `OFT_CARRIER_USER` 추가
- `OFT_ORDERS` 상태 컬럼 확장
- `OFT_DELIVERY` 배송사/송장/세부 상태 컬럼 확장
- `OFT_ORDER_STATUS_HISTORY` 추가
- `OFT_ORDER_CANCEL_REQUEST` 추가
- `OFT_DELIVERY_TRACKING_HISTORY` 추가

완료 기준:
- DDL 검토 완료
- 감사용 점검 SQL 실행 가능
- 백필 초안 준비 완료

### Phase 2. 상태 전환 백엔드
- 기존 주문/배송 상태 코드 해석부 정리
- 신규 상태 기준 DTO/매퍼/서비스 확장
- 구 상태와 신 상태를 함께 읽는 호환 레이어 추가

완료 기준:
- 주문/배송 상태 조회 API가 신규 상태 구조를 내려줌
- 구 데이터가 있어도 서버가 깨지지 않음

### Phase 3. 운영자용 주문 관리 API
- 주문 목록 조회
- 주문 상세 조회
- 주문 수락
- 주문 거절
- 취소 요청 수락
- 취소 요청 거절
- 주문 상태 이력 기록

완료 기준:
- 운영자용 주문 상태 처리 흐름이 API로 동작
- 상태 변경 시 이력이 남음

### Phase 4. 배송사용 배송 관리 API
- 배송 대상 목록 조회
- 배송 상세 조회
- 송장 등록
- 제품 접수
- 배송중 처리
- 배송완료 처리
- 배송 추적 이력 기록

완료 기준:
- 배송사 입장에서 주문을 배송 완료까지 처리 가능
- 배송 추적 이력이 축적됨

### Phase 5. 고객용 내 주문 API 정리
- 내 주문 목록 신규 응답 구조 적용
- 주문 상세에 주문/취소/배송 상태 분리 제공
- 취소 요청 API
- 배송 조회 API
- 구매확정 API

완료 기준:
- 고객 화면이 운영/배송 상태를 분리된 데이터로 받을 수 있음

### Phase 6. 프론트 화면 분리
- 고객용 `내 주문`
- 운영자용 `주문 관리`
- 배송사용 `배송 관리`

완료 기준:
- 세 페이지가 물리적으로 분리됨
- 각 역할에 맞는 버튼만 노출됨

### Phase 7. QA / 안정화
- 상태 전이 테스트
- 이력 누락 점검
- 구데이터 호환 테스트
- UI 문구/권한/예외 처리 정리

완료 기준:
- 시연 가능 수준 확보
- 운영 흐름 문서와 실제 동작이 일치

## 3. 세부 작업 분해

### 3.1 백엔드
- 신규 DTO 추가
- 기존 DTO 상태 필드 확장
- Mapper XML 신규 쿼리 추가
- Service 상태 검증 로직 추가
- Controller 역할별 엔드포인트 분리

### 3.2 프론트
- 고객/운영자/배송사 라우트 분리
- 목록/상세/처리 패널 설계 반영
- 상태 라벨 매핑 신규화
- 액션 버튼 조건부 렌더링
- 배송 추적 타임라인 UI

### 3.3 데이터
- 감사 쿼리 실행
- 상태 분포 확인
- `CANCELED` 주문 분류 규칙 확정
- 백필 실행 순서 검토

### 3.4 QA
- 주문 수락 전후 시나리오
- 취소 요청/수락/거절 시나리오
- 송장 등록/제품 접수/배송중/배송완료 시나리오
- 리뷰 작성/구매확정 조건 시나리오

## 4. 선행 의존성
- [order_fulfillment_separation_plan.md](/d:/study/oneulFarm/docs/order_fulfillment_separation_plan.md)
- [order_fulfillment_separation_ddl_draft.sql](/d:/study/oneulFarm/backend/src/main/webapp/WEB-INF/sql/order_fulfillment_separation_ddl_draft.sql)
- [order_fulfillment_state_migration_plan.md](/d:/study/oneulFarm/docs/order_fulfillment_state_migration_plan.md)
- [order_fulfillment_state_audit_queries.sql](/d:/study/oneulFarm/backend/src/main/webapp/WEB-INF/sql/order_fulfillment_state_audit_queries.sql)
- [order_fulfillment_backfill_draft.sql](/d:/study/oneulFarm/backend/src/main/webapp/WEB-INF/sql/order_fulfillment_backfill_draft.sql)
- [order_fulfillment_api_spec_draft.md](/d:/study/oneulFarm/docs/order_fulfillment_api_spec_draft.md)
- [order_fulfillment_ui_wireframe_draft.md](/d:/study/oneulFarm/docs/order_fulfillment_ui_wireframe_draft.md)

## 5. 우선순위
1. DDL/상태 이관 기준 확정
2. 운영자용 주문 관리 API
3. 배송사용 배송 관리 API
4. 고객용 내 주문 API 정리
5. 화면 구현
6. QA

## 6. 위험 요소
- 기존 `CANCELED` 데이터를 자동 분류하면 의미가 틀릴 수 있음
- 기존 프론트/백엔드가 구 상태 문자열에 직접 의존하고 있음
- 배송사 계정 구조를 뒤늦게 바꾸면 권한 로직을 다시 손봐야 함
- 리뷰 작성 가능 조건이 배송 상태 개편 영향권에 있음

## 7. 최종 목표
- 고객은 내 주문과 배송 추적을 명확하게 확인
- 운영자는 주문 승인/취소 처리를 현실적으로 수행
- 배송사는 송장부터 배송완료까지 전용 화면에서 처리
- 시스템은 상태/이력/권한이 섞이지 않는 구조로 전환
