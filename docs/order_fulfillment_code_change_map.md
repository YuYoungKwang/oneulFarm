# 주문/배송 분리 코드 변경 맵

## 1. 목적
- 주문/배송 분리 설계를 실제 코드베이스에 반영할 때 어떤 파일을 수정하거나 새로 만들어야 하는지 정리한다.
- 구현 착수 시 탐색 비용을 줄이고, 작업 순서를 명확하게 하기 위한 문서다.
- 기존 주문 화면을 부분 수정하는 접근보다, 역할별 신규 화면을 만드는 접근을 우선 기준으로 둔다.

## 2. 변경 범위 요약

### 2.1 백엔드
- 주문 상태 구조 개편
- 취소 요청/처리 API 추가
- 배송사/송장/추적 이력 구조 추가
- 운영자용 주문 관리 API 분리
- 배송사용 배송 관리 API 추가

### 2.2 프론트
- 고객용 `내 주문` 신규 구성
- 운영자용 `주문 관리` 신규 구성
- 배송사용 `배송 관리` 신규 추가
- 공통 상태 라벨/배지/타임라인 유틸 정리

## 3. 백엔드 변경 맵

### 3.1 SQL / 스키마

기존 파일
- [db_query.sql](/d:/study/oneulFarm/backend/src/main/webapp/WEB-INF/sql/db_query.sql)

검토용 초안 파일
- [order_fulfillment_separation_ddl_draft.sql](/d:/study/oneulFarm/backend/src/main/webapp/WEB-INF/sql/order_fulfillment_separation_ddl_draft.sql)
- [order_fulfillment_state_audit_queries.sql](/d:/study/oneulFarm/backend/src/main/webapp/WEB-INF/sql/order_fulfillment_state_audit_queries.sql)
- [order_fulfillment_backfill_draft.sql](/d:/study/oneulFarm/backend/src/main/webapp/WEB-INF/sql/order_fulfillment_backfill_draft.sql)

실제 반영 시 예상
- `db_query.sql`에 최종 스키마 반영
- 별도 마이그레이션 SQL 파일 추가 가능

### 3.2 DTO

기존 수정 후보
- [OrderDto.java](/d:/study/oneulFarm/backend/src/main/java/com/app/dto/OrderDto.java)
- [OrderItemDto.java](/d:/study/oneulFarm/backend/src/main/java/com/app/dto/OrderItemDto.java)
- [DeliveryDto.java](/d:/study/oneulFarm/backend/src/main/java/com/app/dto/DeliveryDto.java)

신규 DTO 후보
- `OrderCancelRequestDto.java`
- `OrderCancelDecisionDto.java`
- `OrderStatusHistoryDto.java`
- `DeliveryTrackingHistoryDto.java`
- `CarrierDto.java`
- `CarrierOrderDto.java`
- `CarrierShipmentRequestDto.java`

### 3.3 DAO

기존 수정 후보
- [OrderDao.java](/d:/study/oneulFarm/backend/src/main/java/com/app/dao/OrderDao.java)
- [OrderDaoImpl.java](/d:/study/oneulFarm/backend/src/main/java/com/app/dao/OrderDaoImpl.java)
- [AdminDao.java](/d:/study/oneulFarm/backend/src/main/java/com/app/dao/AdminDao.java)
- [AdminDaoImpl.java](/d:/study/oneulFarm/backend/src/main/java/com/app/dao/AdminDaoImpl.java)

신규 DAO 후보
- `CarrierDao.java`
- `CarrierDaoImpl.java`
- `OrderCancelDao.java`
- `OrderStatusHistoryDao.java`

### 3.4 Service

기존 수정 후보
- [OrderService.java](/d:/study/oneulFarm/backend/src/main/java/com/app/service/OrderService.java)
- [OrderServiceImpl.java](/d:/study/oneulFarm/backend/src/main/java/com/app/service/OrderServiceImpl.java)
- [AdminServiceImpl.java](/d:/study/oneulFarm/backend/src/main/java/com/app/service/AdminServiceImpl.java)

신규 Service 후보
- `CarrierService.java`
- `CarrierServiceImpl.java`
- `OrderFulfillmentService.java`
- `OrderCancellationService.java`

### 3.5 Controller

기존 수정 후보
- [OrderController.java](/d:/study/oneulFarm/backend/src/main/java/com/app/controller/OrderController.java)
- 기존 관리자 주문 컨트롤러가 있으면 그 파일

신규 Controller 후보
- `CarrierController.java`
- `CarrierShipmentController.java`
- 고객 취소/구매확정 전용 API가 분리 필요하면 `MyOrderController.java`

### 3.6 Mapper XML

기존 수정 후보
- [order-mapper.xml](/d:/study/oneulFarm/backend/src/main/webapp/WEB-INF/mybatis/mapper/order-mapper.xml)
- [admin-mapper.xml](/d:/study/oneulFarm/backend/src/main/webapp/WEB-INF/mybatis/mapper/admin-mapper.xml)
- [review-mapper.xml](/d:/study/oneulFarm/backend/src/main/webapp/WEB-INF/mybatis/mapper/review-mapper.xml)
- [dashboard-mapper.xml](/d:/study/oneulFarm/backend/src/main/webapp/WEB-INF/mybatis/mapper/dashboard-mapper.xml)

신규 Mapper XML 후보
- `carrier-mapper.xml`
- `order-cancel-mapper.xml`
- `order-status-history-mapper.xml`

## 4. 프론트 변경 맵

### 4.1 고객용 `내 주문`

기존 참고 후보
- [AccountApp.js](/d:/study/oneulFarm/frontend/src/AccountApp.js)
- [OrdersView.js](/d:/study/oneulFarm/frontend/src/OrdersView.js)
- [OrderDetailPanel.js](/d:/study/oneulFarm/frontend/src/OrderDetailPanel.js)
- [account.css](/d:/study/oneulFarm/frontend/src/styles/account.css)

신규 컴포넌트 후보
- `CustomerOrdersPage.js`
- `CustomerOrderDetailPanel.js`
- `CustomerOrderTrackingTimeline.js`
- `CustomerOrderStatusRow.js`
- `CancelRequestModal.js`
- `PurchaseConfirmModal.js`

신규 스타일 후보
- `customer-orders.css`

### 4.2 운영자용 `주문 관리`

기존 참고 후보
- [AdminApp.js](/d:/study/oneulFarm/frontend/src/AdminApp.js)
- [admin/AdminUi.js](/d:/study/oneulFarm/frontend/src/admin/AdminUi.js)

신규 컴포넌트 후보
- `AdminOrdersPageV2.js`
- `AdminOrderDetailPanelV2.js`
- `admin/AdminOrderFilters.js`
- `admin/AdminOrderSummaryCards.js`
- `admin/AdminOrderDecisionModal.js`
- `admin/AdminCancelDecisionModal.js`
- `admin/AdminOrderStatusHistoryPanel.js`

신규 스타일 후보
- `admin-orders-v2.css`

### 4.3 배송사용 `배송 관리`

신규 화면 후보
- `CarrierApp.js`
- `CarrierOrdersView.js`
- `CarrierOrderDetailPanel.js`
- `CarrierTrackingTimeline.js`

신규 스타일 후보
- `carrier.css`

### 4.4 공통 유틸

기존 수정 후보
- [appUtils.js](/d:/study/oneulFarm/frontend/src/appUtils.js)
- [components/orderUiUtils.js](/d:/study/oneulFarm/frontend/src/components/orderUiUtils.js)

신규 유틸 후보
- `orderStatusUtils.js`
- `carrierStatusUtils.js`

## 5. API 클라이언트 변경 맵

기존 수정 후보
- [productApi.js](/d:/study/oneulFarm/frontend/src/api/productApi.js)

신규 API 모듈 후보
- `orderApi.js`
- `adminOrderApi.js`
- `carrierApi.js`

## 6. 구현 순서별 파일 영향

### 6.1 1차: DB + 상태
- SQL 초안 파일 검토
- `OrderDto`, `DeliveryDto`
- `order-mapper.xml`

### 6.2 2차: 운영자 주문 관리 API
- `AdminServiceImpl`
- `AdminDaoImpl`
- `admin-mapper.xml`
- 관리자 관련 컨트롤러

### 6.3 3차: 배송사 API
- `CarrierController`
- `CarrierServiceImpl`
- `CarrierDaoImpl`
- `carrier-mapper.xml`

### 6.4 4차: 고객 API
- `OrderController`
- `OrderServiceImpl`
- `order-mapper.xml`

### 6.5 5차: 프론트 화면
- `AdminApp`
- `OrdersView`
- 신규 `Carrier*` 컴포넌트
- 전용 CSS 파일

## 7. 충돌 주의 포인트
- 기존 `OrdersView.js`는 최종적으로 교체 대상이지만, 초기에는 참고용으로만 두는 편이 안전함
- [AdminApp.js](/d:/study/oneulFarm/frontend/src/AdminApp.js)는 현재 주문 관련 로직이 크기 때문에 한 번에 크게 뜯기보다 신규 화면을 옆에 세우고 라우트만 연결하는 편이 안전함
- 상태 문자열이 백엔드/프론트에 하드코딩된 곳이 많아 일괄 변경 시 회귀 위험이 높음
- CSS는 역할별 전용 파일 또는 전용 클래스 네임스페이스로 분리해야 함

## 8. 추천 구현 단위
1. SQL/DTO/Mapper 기반 상태 구조 확장
2. 운영자 주문 처리 API
3. 배송사 API
4. 고객 주문 API
5. 관리자 UI
6. 배송사 UI
7. 고객 UI

## 9. 관련 문서
- [order_fulfillment_separation_plan.md](/d:/study/oneulFarm/docs/order_fulfillment_separation_plan.md)
- [order_fulfillment_api_spec_draft.md](/d:/study/oneulFarm/docs/order_fulfillment_api_spec_draft.md)
- [order_fulfillment_ui_wireframe_draft.md](/d:/study/oneulFarm/docs/order_fulfillment_ui_wireframe_draft.md)
- [order_fulfillment_implementation_roadmap.md](/d:/study/oneulFarm/docs/order_fulfillment_implementation_roadmap.md)
