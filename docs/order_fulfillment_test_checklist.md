# 주문/배송 분리 테스트 체크리스트

## 1. 목적
- 주문/배송 분리 구조 구현 후 반드시 확인해야 하는 기능/상태/권한 테스트 항목을 정리한다.

## 2. 데이터 사전 조건
- 일반 고객 계정 1개 이상
- 운영자 계정 1개 이상
- 배송사 계정 1개 이상
- 결제완료 주문 데이터
- 배송중 주문 데이터
- 배송완료 주문 데이터
- 취소 요청 주문 데이터

## 3. 고객용 `내 주문`

### 3.1 목록
- 내 주문만 조회된다
- 주문 상태, 취소 상태, 배송 상태가 각각 구분되어 보인다
- 주문번호 검색이 동작한다
- 기간 필터가 동작한다

### 3.2 상세
- 주문 상세에 수취인/주소/결제정보/상품목록이 보인다
- 배송 추적 타임라인이 보인다
- 배송사/송장번호가 보인다

### 3.3 취소 요청
- `NOT_STARTED` 상태에서는 취소 요청 가능
- `WAYBILL_ASSIGNED` 이후에는 취소 요청 불가
- 중복 취소 요청이 막힌다

### 3.4 리뷰/구매확정
- `DELIVERED` 전에는 리뷰 작성 버튼이 안 보인다
- `DELIVERED` 후 미작성 상태면 리뷰 작성 버튼이 보인다
- `DELIVERED` 후 구매확정 버튼이 보인다
- 구매확정 후 상태가 정상 반영된다

## 4. 운영자용 `주문 관리`

### 4.1 목록/상세
- 결제완료 주문이 조회된다
- 취소 요청 주문이 따로 식별된다
- 주문 상세에 상태 이력이 보인다

### 4.2 주문 수락
- `PAYMENT_COMPLETED` 주문은 수락 가능
- 수락 후 `ORDER_ACCEPTED`로 변경된다
- 이력 테이블에 기록된다

### 4.3 주문 거절
- 송장 등록 전에는 거절 가능
- 송장 등록 후에는 거절 불가
- 거절 사유가 저장된다

### 4.4 취소 수락/거절
- `CANCEL_REQUESTED` 상태에서만 처리 가능
- 취소 수락 후 고객 화면에 반영된다
- 취소 거절 후 거절 사유가 남는다

## 5. 배송사용 `배송 관리`

### 5.1 목록/상세
- 해당 배송사에 할당된 주문만 조회된다
- 배송 상세에 수취인/주소/상품목록/송장번호가 보인다

### 5.2 송장 등록
- `NOT_STARTED` 주문에 송장 등록 가능
- 송장 등록 후 `WAYBILL_ASSIGNED`가 된다
- 송장번호 중복이 막힌다

### 5.3 제품 접수 / 배송중 / 배송완료
- `WAYBILL_ASSIGNED -> PICKED_UP`
- `PICKED_UP -> IN_TRANSIT`
- `IN_TRANSIT -> DELIVERED`
- 순서가 어긋난 요청은 막힌다

### 5.4 배송 추적
- 상태 변경 때마다 추적 이벤트가 쌓인다
- 고객 화면에서도 동일 이력이 조회된다

## 6. 권한 테스트
- 고객이 운영자 API 호출 불가
- 고객이 배송사 API 호출 불가
- 운영자가 배송사 전용 처리 API를 직접 쓰지 않게 제한 가능 여부 확인
- 배송사 계정은 자기 배송사 주문 외 접근 불가

## 7. 데이터 정합성 테스트
- 주문 상태/배송 상태가 서로 모순되지 않는다
- `DELIVERED_AT`과 배송 상태가 일치한다
- `TRACKING_NO`와 `CARRIER_CODE`가 함께 저장된다
- 이력 테이블 누락이 없다

## 8. 마이그레이션 테스트
- 기존 `PAID` 주문이 `PAYMENT_COMPLETED`로 해석된다
- 기존 `SHIPPING` 주문이 `ORDER_ACCEPTED + IN_TRANSIT`로 해석된다
- 기존 `COMPLETED` 주문이 `ORDER_ACCEPTED + DELIVERED`로 해석된다
- 기존 `CANCELED` 주문은 자동 분류 대상과 수동 검토 대상이 분리된다

## 9. UI/문구 테스트
- 상태 라벨이 중복 의미 없이 보인다
- 고객/운영자/배송사 페이지에서 버튼 문구가 역할에 맞다
- 툴팁/안내 문구가 과하지 않다

## 10. 최종 시연 시나리오
1. 고객이 주문한다
2. 운영자가 주문을 수락한다
3. 배송사가 송장을 등록한다
4. 배송사가 제품 접수 처리한다
5. 배송사가 배송중 처리한다
6. 배송사가 배송완료 처리한다
7. 고객이 배송 추적을 확인한다
8. 고객이 리뷰를 작성한다
9. 고객이 구매확정을 한다
10. 별도 주문에서 고객이 취소 요청하고 운영자가 수락/거절한다

## 11. 관련 문서
- [order_fulfillment_separation_plan.md](/d:/study/oneulFarm/docs/order_fulfillment_separation_plan.md)
- [order_fulfillment_api_spec_draft.md](/d:/study/oneulFarm/docs/order_fulfillment_api_spec_draft.md)
- [order_fulfillment_ui_wireframe_draft.md](/d:/study/oneulFarm/docs/order_fulfillment_ui_wireframe_draft.md)
- [order_fulfillment_state_migration_plan.md](/d:/study/oneulFarm/docs/order_fulfillment_state_migration_plan.md)
