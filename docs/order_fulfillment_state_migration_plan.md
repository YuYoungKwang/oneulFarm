# 주문/배송 상태값 마이그레이션 계획

## 1. 목적
- 현재 시스템이 사용 중인 주문 상태와 배송 상태를 새 운영 구조에 맞는 상태 체계로 옮긴다.
- 기존 데이터 이관, 백엔드 로직 변경, 프론트 라벨 변경을 한 번에 뒤섞지 않고 단계적으로 진행할 수 있게 기준을 만든다.

## 2. 현재 상태값 현황

### 2.1 주문 상태
현재 `OFT_ORDERS.ORDER_STATUS`는 다음 값을 사용한다.

| 현재 값 | 의미 | 확인 위치 |
|---|---|---|
| `CREATED` | 주문 생성 직후 | [db_query.sql](/d:/study/oneulFarm/backend/src/main/webapp/WEB-INF/sql/db_query.sql) |
| `PAID` | 결제완료 | [OrderServiceImpl.java](/d:/study/oneulFarm/backend/src/main/java/com/app/service/OrderServiceImpl.java) |
| `SHIPPING` | 배송 진행 중인 주문 | [AdminServiceImpl.java](/d:/study/oneulFarm/backend/src/main/java/com/app/service/AdminServiceImpl.java) |
| `COMPLETED` | 배송 완료 후 최종 완료 | [AdminServiceImpl.java](/d:/study/oneulFarm/backend/src/main/java/com/app/service/AdminServiceImpl.java) |
| `CANCELED` | 취소 또는 취소 처리 완료 | [dashboard-mapper.xml](/d:/study/oneulFarm/backend/src/main/webapp/WEB-INF/mybatis/mapper/dashboard-mapper.xml) |

### 2.2 배송 상태
현재 `OFT_DELIVERY.DELIVERY_STATUS`는 다음 값을 사용한다.

| 현재 값 | 의미 | 확인 위치 |
|---|---|---|
| `READY` | 배송 준비 | [db_query.sql](/d:/study/oneulFarm/backend/src/main/webapp/WEB-INF/sql/db_query.sql) |
| `SHIPPING` | 배송 중 | [order-mapper.xml](/d:/study/oneulFarm/backend/src/main/webapp/WEB-INF/mybatis/mapper/order-mapper.xml) |
| `DELIVERED` | 배송 완료 | [review-mapper.xml](/d:/study/oneulFarm/backend/src/main/webapp/WEB-INF/mybatis/mapper/review-mapper.xml) |

### 2.3 현재 구조의 문제
- 주문 상태 하나에 결제, 배송, 취소 의미가 섞여 있다.
- 취소 상태가 별도 컬럼이 아니라 `CANCELED` 하나로 뭉개져 있다.
- 배송 상태는 실제 배송사의 작업 단계보다 단순하다.
- 프론트와 백엔드가 `PAID/SHIPPING/COMPLETED`, `READY/SHIPPING/DELIVERED`에 직접 의존하고 있다.

## 3. 목표 상태 체계

### 3.1 주문 상태
| 목표 값 | 의미 |
|---|---|
| `PAYMENT_COMPLETED` | 결제완료, 운영 검토 전 |
| `ORDER_ACCEPTED` | 운영자가 주문 수락 |
| `ORDER_REJECTED` | 운영자가 주문 거절 |

### 3.2 취소 상태
| 목표 값 | 의미 |
|---|---|
| `NONE` | 취소 이슈 없음 |
| `CANCEL_REQUESTED` | 고객이 취소 요청 |
| `CANCEL_ACCEPTED` | 운영자가 취소 수락 |
| `CANCEL_REJECTED` | 운영자가 취소 거절 |

### 3.3 배송 상태
| 목표 값 | 의미 |
|---|---|
| `NOT_STARTED` | 배송 시작 전 |
| `WAYBILL_ASSIGNED` | 송장 등록 완료 |
| `PICKED_UP` | 배송사 접수 완료 |
| `IN_TRANSIT` | 배송 중 |
| `DELIVERED` | 배송 완료 |

### 3.4 구매확정 상태
| 목표 값 | 의미 |
|---|---|
| `PURCHASE_PENDING` | 구매확정 대기 |
| `PURCHASE_CONFIRMED` | 고객 구매확정 완료 |

## 4. 상태 매핑 규칙

### 4.1 주문 상태 매핑
| 현재 값 | 목표 주문 상태 | 목표 취소 상태 | 설명 |
|---|---|---|---|
| `CREATED` | `PAYMENT_COMPLETED` | `NONE` | 실제 운영에서는 결제 직전/직후 구분이 애매하면 결제완료로 정리 필요 |
| `PAID` | `PAYMENT_COMPLETED` | `NONE` | 가장 명확한 결제완료 상태 |
| `SHIPPING` | `ORDER_ACCEPTED` | `NONE` | 주문은 수락된 상태로 본다 |
| `COMPLETED` | `ORDER_ACCEPTED` | `NONE` | 주문 자체는 수락 상태 유지, 배송 상태로 완료 표현 |
| `CANCELED` | 별도 판단 필요 | `CANCEL_ACCEPTED` 또는 `NONE` | 기존 데이터 검토 후 수동 분기 필요 |

### 4.2 배송 상태 매핑
| 현재 값 | 목표 배송 상태 | 설명 |
|---|---|---|
| `READY` | `NOT_STARTED` | 송장 미등록 포함 |
| `SHIPPING` | `IN_TRANSIT` | 기존에는 접수 단계가 없음 |
| `DELIVERED` | `DELIVERED` | 동일 |

### 4.3 주의가 필요한 케이스
- `ORDER_STATUS = CANCELED`인 주문은 실제로
  - 운영자 거절인지
  - 고객 취소 수락인지
  - 테스트 데이터인지
  구분이 필요하다.
- `ORDER_STATUS = COMPLETED`인데 배송 상태가 `DELIVERED`가 아닌 데이터가 있으면 정합성 검토가 먼저다.
- `TRACKING_NO`는 있는데 `DELIVERY_STATUS = READY`인 경우는 송장 등록 시점 데이터로 재분류할 수 있다.

## 5. 마이그레이션 전략

### 5.1 1단계: 컬럼 추가
- 기존 컬럼은 유지
- 새 컬럼 추가
  - `OFT_ORDERS.CANCEL_STATUS`
  - `OFT_ORDERS.PURCHASE_CONFIRM_STATUS`
  - `OFT_ORDERS.PURCHASE_CONFIRMED_AT`
  - `OFT_DELIVERY.CARRIER_CODE`
  - `OFT_DELIVERY.WAYBILL_STATUS`
  - `OFT_DELIVERY.WAYBILL_ASSIGNED_AT`
  - `OFT_DELIVERY.PICKED_UP_AT`
  - `OFT_DELIVERY.IN_TRANSIT_AT`
  - `OFT_DELIVERY.UPDATED_AT`

### 5.2 2단계: 백필
- 현재 `ORDER_STATUS`, `DELIVERY_STATUS`, `TRACKING_NO`, `DELIVERED_AT` 기준으로 새 컬럼을 채운다.
- `CANCELED` 데이터는 우선 별도 추출 후 수동 검토한다.

### 5.3 3단계: 코드 호환 구간
- 백엔드는 새 상태를 우선 사용하되, 구 데이터가 남아 있으면 구 상태도 해석할 수 있게 한다.
- 프론트 라벨 매핑도 한동안 구 상태와 새 상태를 모두 수용하게 한다.

### 5.4 4단계: 신규 로직 전환
- 운영자 화면은 `ORDER_ACCEPTED`, `ORDER_REJECTED`, `CANCEL_*` 중심으로 전환
- 배송사 화면은 `WAYBILL_ASSIGNED`, `PICKED_UP`, `IN_TRANSIT`, `DELIVERED` 중심으로 전환
- 고객 화면은 주문/취소/배송 상태를 분리 렌더링

### 5.5 5단계: 구 상태 정리
- 모든 코드가 새 상태만 보게 된 후
  - 구 라벨 매핑 제거
  - 구 상태 전용 분기 제거
  - 필요 시 `ORDER_STATUS` 허용값 최종 정리

## 6. 코드 영향 범위

### 6.1 백엔드
- [OrderServiceImpl.java](/d:/study/oneulFarm/backend/src/main/java/com/app/service/OrderServiceImpl.java)
- [AdminServiceImpl.java](/d:/study/oneulFarm/backend/src/main/java/com/app/service/AdminServiceImpl.java)
- [order-mapper.xml](/d:/study/oneulFarm/backend/src/main/webapp/WEB-INF/mybatis/mapper/order-mapper.xml)
- [admin-mapper.xml](/d:/study/oneulFarm/backend/src/main/webapp/WEB-INF/mybatis/mapper/admin-mapper.xml)
- [review-mapper.xml](/d:/study/oneulFarm/backend/src/main/webapp/WEB-INF/mybatis/mapper/review-mapper.xml)
- [dashboard-mapper.xml](/d:/study/oneulFarm/backend/src/main/webapp/WEB-INF/mybatis/mapper/dashboard-mapper.xml)

### 6.2 프론트
- [AdminApp.js](/d:/study/oneulFarm/frontend/src/AdminApp.js)
- [OrdersView.js](/d:/study/oneulFarm/frontend/src/OrdersView.js)
- [appUtils.js](/d:/study/oneulFarm/frontend/src/appUtils.js)
- [orderUiUtils.js](/d:/study/oneulFarm/frontend/src/components/orderUiUtils.js)
- [OrdersPage.js](/d:/study/oneulFarm/frontend/src/components/OrdersPage.js)

## 7. 권장 실행 순서
1. 새 컬럼과 신규 테이블 반영
2. 백필 SQL 작성
3. 구 상태 데이터 현황 조회
4. 백엔드 호환 로직 반영
5. 프론트 상태 라벨 이중 지원
6. 운영자/배송사/고객 화면 분리 구현
7. 최종적으로 구 상태 제거

## 8. 먼저 확인할 SQL
- `ORDER_STATUS = 'CANCELED'` 주문 수
- `ORDER_STATUS`별 건수
- `DELIVERY_STATUS`별 건수
- `TRACKING_NO IS NOT NULL`인데 배송 상태가 `READY`인 데이터
- `DELIVERED_AT IS NOT NULL`인데 배송 상태가 `DELIVERED`가 아닌 데이터

실행용 쿼리 파일:
- [order_fulfillment_state_audit_queries.sql](/d:/study/oneulFarm/backend/src/main/webapp/WEB-INF/sql/order_fulfillment_state_audit_queries.sql)

## 9. 결론
- 다음 구현 전에 가장 먼저 할 일은 `실데이터 상태 분포 확인`이다.
- 특히 `CANCELED`를 `주문 거절`로 볼지 `취소 수락`으로 볼지 자동 결정하면 위험하다.
- 따라서 DDL 다음 단계는 `현행 데이터 점검 SQL + 백필 규칙 확정`이 맞다.

## 10. 관련 백필 초안
- 신규 컬럼 채우기와 이력 적재 초안:
  - [order_fulfillment_backfill_draft.sql](/d:/study/oneulFarm/backend/src/main/webapp/WEB-INF/sql/order_fulfillment_backfill_draft.sql)
