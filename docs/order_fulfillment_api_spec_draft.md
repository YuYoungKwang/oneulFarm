# 주문/배송 분리 API 명세 초안

## 1. 목적
- 고객용 `내 주문`, 운영자용 `주문 관리`, 배송사용 `배송 관리`를 분리 구현하기 위한 API 계약 초안이다.
- 현재 구현 API를 바로 덮어쓰는 문서가 아니라, 신규 구조로 전환할 때 기준이 되는 초안이다.

## 2. 공통 원칙
- 응답 본문은 JSON 기준으로 가정한다.
- 날짜/시간은 ISO-8601 문자열로 통일한다.
- 상태값은 신규 상태 체계를 사용한다.
- 권한은 `CUSTOMER`, `ADMIN`, `CARRIER` 역할 기준으로 나눈다.
- 에러 응답은 최소한 `code`, `message`, `details` 필드를 가진다.

## 3. 공통 응답 예시

```json
{
  "success": true,
  "data": {},
  "message": "OK"
}
```

에러 예시:

```json
{
  "success": false,
  "code": "ORDER_STATUS_INVALID",
  "message": "현재 상태에서는 주문 거절을 할 수 없습니다.",
  "details": {
    "orderNo": 123,
    "orderStatus": "ORDER_ACCEPTED",
    "deliveryStatus": "WAYBILL_ASSIGNED"
  }
}
```

## 4. 고객용 API

### 4.1 내 주문 목록 조회
- `GET /api/orders/me`
- 권한: `CUSTOMER`

쿼리 파라미터:
- `orderStatus`
- `cancelStatus`
- `deliveryStatus`
- `dateFrom`
- `dateTo`
- `page`
- `size`

응답 예시:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "orderNo": 101,
        "orderId": "OFT-20260325-001",
        "orderedAt": "2026-03-25T10:15:00",
        "orderStatus": "ORDER_ACCEPTED",
        "cancelStatus": "NONE",
        "deliveryStatus": "IN_TRANSIT",
        "purchaseConfirmStatus": "PURCHASE_PENDING",
        "trackingNo": "CJ-20260325-000123",
        "carrierCode": "CJ",
        "carrierName": "CJ대한통운",
        "finalAmount": 18500,
        "itemSummary": "감자 외 2건",
        "thumbnailImageNos": [11, 15, 18]
      }
    ],
    "page": 1,
    "size": 20,
    "totalCount": 1
  }
}
```

### 4.2 내 주문 상세 조회
- `GET /api/orders/me/{orderNo}`
- 권한: `CUSTOMER`

응답 핵심 필드:
- 주문 기본 정보
- 결제 정보
- 배송 정보
- 배송 추적 요약
- 주문 상품 목록
- 취소 요청 여부
- 리뷰 작성 가능 여부
- 구매확정 가능 여부

### 4.3 취소 요청
- `POST /api/orders/me/{orderNo}/cancel-request`
- 권한: `CUSTOMER`

요청 예시:

```json
{
  "reason": "배송 전이라 주문을 취소하고 싶습니다."
}
```

성공 조건:
- 주문 상태가 `PAYMENT_COMPLETED` 또는 `ORDER_ACCEPTED`
- 배송 상태가 `NOT_STARTED`
- 기존 취소 요청 미존재

### 4.4 배송 추적 조회
- `GET /api/orders/me/{orderNo}/tracking`
- 권한: `CUSTOMER`

응답 예시:

```json
{
  "success": true,
  "data": {
    "orderNo": 101,
    "carrierCode": "CJ",
    "carrierName": "CJ대한통운",
    "trackingNo": "CJ-20260325-000123",
    "deliveryStatus": "IN_TRANSIT",
    "events": [
      {
        "status": "WAYBILL_ASSIGNED",
        "message": "송장번호가 등록되었습니다.",
        "recordedAt": "2026-03-25T11:00:00"
      },
      {
        "status": "PICKED_UP",
        "message": "배송사에서 상품을 접수했습니다.",
        "recordedAt": "2026-03-25T13:00:00"
      }
    ]
  }
}
```

### 4.5 구매확정
- `POST /api/orders/me/{orderNo}/confirm`
- 권한: `CUSTOMER`

성공 조건:
- 배송 상태가 `DELIVERED`
- 구매확정 상태가 `PURCHASE_PENDING`

## 5. 운영자용 API

### 5.1 주문 목록 조회
- `GET /api/admin/orders`
- 권한: `ADMIN`

쿼리 파라미터:
- `orderStatus`
- `cancelStatus`
- `deliveryStatus`
- `carrierCode`
- `dateFrom`
- `dateTo`
- `keyword`
- `page`
- `size`

응답 핵심 필드:
- 주문자
- 주문 상태
- 취소 상태
- 배송 상태
- 배송사
- 송장번호
- 결제 금액

### 5.2 주문 상세 조회
- `GET /api/admin/orders/{orderNo}`
- 권한: `ADMIN`

응답 포함 항목:
- 주문/결제/배송/고객/상품 상세
- 주문 상태 이력
- 취소 요청 이력
- 현재 가능한 액션 목록

### 5.3 주문 수락
- `PATCH /api/admin/orders/{orderNo}/accept`
- 권한: `ADMIN`

요청 예시:

```json
{
  "memo": "재고 및 결제 확인 완료"
}
```

성공 조건:
- 현재 주문 상태가 `PAYMENT_COMPLETED`
- 취소 요청 상태가 `NONE`

### 5.4 주문 거절
- `PATCH /api/admin/orders/{orderNo}/reject`
- 권한: `ADMIN`

요청 예시:

```json
{
  "reason": "재고 부족으로 주문을 거절합니다."
}
```

성공 조건:
- 현재 주문 상태가 `PAYMENT_COMPLETED`
- 송장 미등록

### 5.5 취소 수락
- `PATCH /api/admin/orders/{orderNo}/cancel/accept`
- 권한: `ADMIN`

요청 예시:

```json
{
  "reason": "배송 시작 전 요청으로 취소를 수락합니다."
}
```

성공 조건:
- 취소 상태가 `CANCEL_REQUESTED`
- 배송 상태가 `NOT_STARTED`

### 5.6 취소 거절
- `PATCH /api/admin/orders/{orderNo}/cancel/reject`
- 권한: `ADMIN`

요청 예시:

```json
{
  "reason": "이미 송장이 등록되어 취소할 수 없습니다."
}
```

## 6. 배송사용 API

### 6.1 배송 처리 대상 목록
- `GET /api/carrier/orders`
- 권한: `CARRIER`

쿼리 파라미터:
- `deliveryStatus`
- `dateFrom`
- `dateTo`
- `keyword`
- `page`
- `size`

응답 핵심 필드:
- 주문번호
- 수취인
- 주소
- 배송 상태
- 배송사
- 송장번호

### 6.2 배송 상세 조회
- `GET /api/carrier/orders/{orderNo}`
- 권한: `CARRIER`

응답 포함 항목:
- 주문/배송 기본 정보
- 배송 추적 이력
- 현재 가능한 배송 액션

### 6.3 송장 등록
- `POST /api/carrier/orders/{orderNo}/waybill`
- 권한: `CARRIER`

요청 예시:

```json
{
  "carrierCode": "CJ"
}
```

응답 예시:

```json
{
  "success": true,
  "data": {
    "orderNo": 101,
    "carrierCode": "CJ",
    "carrierName": "CJ대한통운",
    "trackingNo": "CJ-20260325-000123",
    "deliveryStatus": "WAYBILL_ASSIGNED"
  }
}
```

### 6.4 제품 접수
- `PATCH /api/carrier/orders/{orderNo}/pickup`
- 권한: `CARRIER`

성공 조건:
- 배송 상태가 `WAYBILL_ASSIGNED`

### 6.5 배송중 처리
- `PATCH /api/carrier/orders/{orderNo}/in-transit`
- 권한: `CARRIER`

성공 조건:
- 배송 상태가 `PICKED_UP`

### 6.6 배송완료 처리
- `PATCH /api/carrier/orders/{orderNo}/delivered`
- 권한: `CARRIER`

성공 조건:
- 배송 상태가 `IN_TRANSIT`

## 7. 더미 배송사 API

### 7.1 배송 생성
- `POST /api/carrier/shipments`

요청 예시:

```json
{
  "orderNo": 101,
  "carrierCode": "CJ"
}
```

### 7.2 송장 조회
- `GET /api/carrier/shipments/{trackingNo}`

### 7.3 배송 추적 이력 조회
- `GET /api/carrier/shipments/{trackingNo}/tracking`

### 7.4 상태 변경
- `PATCH /api/carrier/shipments/{trackingNo}/pickup`
- `PATCH /api/carrier/shipments/{trackingNo}/in-transit`
- `PATCH /api/carrier/shipments/{trackingNo}/delivered`

## 8. 상태값 검증 규칙
- `ORDER_ACCEPTED` 이후에는 주문 거절 불가
- `WAYBILL_ASSIGNED` 이후에는 고객 취소 요청 불가
- `DELIVERED` 이전에는 구매확정 불가
- `DELIVERED` 이전에는 리뷰 작성 불가
- 배송사 계정은 자기 배송사 주문만 접근 가능

## 9. 다음 구현 연결점
- DB 초안:
  - [order_fulfillment_separation_ddl_draft.sql](/d:/study/oneulFarm/backend/src/main/webapp/WEB-INF/sql/order_fulfillment_separation_ddl_draft.sql)
- 상태 이관 계획:
  - [order_fulfillment_state_migration_plan.md](/d:/study/oneulFarm/docs/order_fulfillment_state_migration_plan.md)
- 점검 쿼리:
  - [order_fulfillment_state_audit_queries.sql](/d:/study/oneulFarm/backend/src/main/webapp/WEB-INF/sql/order_fulfillment_state_audit_queries.sql)
- 백필 초안:
  - [order_fulfillment_backfill_draft.sql](/d:/study/oneulFarm/backend/src/main/webapp/WEB-INF/sql/order_fulfillment_backfill_draft.sql)
