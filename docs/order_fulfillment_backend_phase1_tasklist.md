# 주문/배송 분리 백엔드 1차 작업표

## 1. 목적
- 문서 단계에서 바로 구현 단계로 넘어갈 수 있도록, 백엔드 1차 작업을 파일 단위 체크리스트로 정리한다.
- 범위는 `상태 구조 확장 + 주문/배송/취소/배송사 기본 API 기반`까지다.

## 2. 1차 목표
- 신규 상태 체계를 DTO/Mapper/Service에서 읽고 쓸 수 있게 만든다.
- 운영자 주문 처리와 배송사 배송 처리의 최소 API 기반을 만든다.
- 구 상태와 신 상태가 한동안 함께 존재해도 서버가 깨지지 않게 한다.

## 3. 선행 조건
- [order_fulfillment_separation_ddl_draft.sql](/d:/study/oneulFarm/backend/src/main/webapp/WEB-INF/sql/order_fulfillment_separation_ddl_draft.sql) 검토
- [order_fulfillment_state_audit_queries.sql](/d:/study/oneulFarm/backend/src/main/webapp/WEB-INF/sql/order_fulfillment_state_audit_queries.sql) 실행 가능 상태 확인
- [order_fulfillment_backfill_draft.sql](/d:/study/oneulFarm/backend/src/main/webapp/WEB-INF/sql/order_fulfillment_backfill_draft.sql) 초안 이해

## 4. DTO 체크리스트

### 4.1 주문 DTO
- [ ] [OrderDto.java](/d:/study/oneulFarm/backend/src/main/java/com/app/dto/OrderDto.java)에 추가
  - `cancelStatus`
  - `purchaseConfirmStatus`
  - `purchaseConfirmedAt`
  - `carrierCode`
  - `carrierName`
  - `waybillStatus`
  - `waybillAssignedAt`
  - `pickedUpAt`
  - `inTransitAt`

### 4.2 배송 DTO
- [ ] [DeliveryDto.java](/d:/study/oneulFarm/backend/src/main/java/com/app/dto/DeliveryDto.java)에 추가
  - `carrierCode`
  - `waybillStatus`
  - `waybillAssignedAt`
  - `pickedUpAt`
  - `inTransitAt`
  - `updatedAt`

### 4.3 신규 DTO 생성
- [ ] `CarrierDto.java`
- [ ] `OrderStatusHistoryDto.java`
- [ ] `OrderCancelRequestDto.java`
- [ ] `OrderCancelDecisionDto.java`
- [ ] `DeliveryTrackingHistoryDto.java`
- [ ] `CarrierShipmentRequestDto.java`

## 5. Mapper 체크리스트

### 5.1 주문 매퍼
- [ ] [order-mapper.xml](/d:/study/oneulFarm/backend/src/main/webapp/WEB-INF/mybatis/mapper/order-mapper.xml)
  - 신규 상태 컬럼 조회 반영
  - 배송사/송장/마일스톤 컬럼 조회 반영
  - 고객용 취소 요청/구매확정 쿼리 추가 검토

### 5.2 관리자 매퍼
- [ ] [admin-mapper.xml](/d:/study/oneulFarm/backend/src/main/webapp/WEB-INF/mybatis/mapper/admin-mapper.xml)
  - 주문 상태 / 취소 상태 / 배송 상태 분리 조회
  - 주문 수락 / 주문 거절 쿼리 정리
  - 취소 수락 / 취소 거절 쿼리 추가
  - 상태 이력 insert 추가

### 5.3 신규 매퍼
- [ ] `carrier-mapper.xml`
- [ ] `order-cancel-mapper.xml`
- [ ] `order-status-history-mapper.xml`

## 6. DAO 체크리스트

### 6.1 기존 DAO 확장
- [ ] [OrderDao.java](/d:/study/oneulFarm/backend/src/main/java/com/app/dao/OrderDao.java)
- [ ] [OrderDaoImpl.java](/d:/study/oneulFarm/backend/src/main/java/com/app/dao/OrderDaoImpl.java)
- [ ] [AdminDao.java](/d:/study/oneulFarm/backend/src/main/java/com/app/dao/AdminDao.java)
- [ ] [AdminDaoImpl.java](/d:/study/oneulFarm/backend/src/main/java/com/app/dao/AdminDaoImpl.java)

### 6.2 신규 DAO
- [ ] `CarrierDao.java`
- [ ] `CarrierDaoImpl.java`
- [ ] `OrderCancelDao.java`
- [ ] `OrderCancelDaoImpl.java`
- [ ] `OrderStatusHistoryDao.java`
- [ ] `OrderStatusHistoryDaoImpl.java`

## 7. Service 체크리스트

### 7.1 기존 Service 확장
- [ ] [OrderService.java](/d:/study/oneulFarm/backend/src/main/java/com/app/service/OrderService.java)
- [ ] [OrderServiceImpl.java](/d:/study/oneulFarm/backend/src/main/java/com/app/service/OrderServiceImpl.java)
  - 고객 주문 목록/상세에 신규 상태 반영
  - 취소 요청 API 지원
  - 구매확정 API 지원
  - 구 상태 호환 처리

- [ ] [AdminServiceImpl.java](/d:/study/oneulFarm/backend/src/main/java/com/app/service/AdminServiceImpl.java)
  - 주문 수락
  - 주문 거절
  - 취소 수락
  - 취소 거절
  - 상태 이력 저장

### 7.2 신규 Service
- [ ] `CarrierService.java`
- [ ] `CarrierServiceImpl.java`
  - 송장 등록
  - 제품 접수
  - 배송중
  - 배송완료
  - 배송 추적 이력 조회

## 8. Controller 체크리스트

### 8.1 고객용
- [ ] [OrderController.java](/d:/study/oneulFarm/backend/src/main/java/com/app/controller/OrderController.java)
  - 목록/상세 신규 응답 구조 반영
  - 취소 요청 엔드포인트
  - 구매확정 엔드포인트
  - 배송 조회 엔드포인트

### 8.2 운영자용
- [ ] 관리자 주문 관련 컨트롤러 정리
  - 주문 수락
  - 주문 거절
  - 취소 수락
  - 취소 거절

### 8.3 배송사용
- [ ] `CarrierController.java`
- [ ] `CarrierShipmentController.java`

## 9. 상태 검증 규칙 체크리스트
- [ ] `PAYMENT_COMPLETED`에서만 주문 수락 가능
- [ ] 송장 등록 전까지만 주문 거절 가능
- [ ] `CANCEL_REQUESTED`에서만 취소 수락/거절 가능
- [ ] `WAYBILL_ASSIGNED -> PICKED_UP -> IN_TRANSIT -> DELIVERED` 순서 강제
- [ ] `DELIVERED` 전에는 구매확정 불가

## 10. 이력 처리 체크리스트
- [ ] 주문 상태 변경 시 `OFT_ORDER_STATUS_HISTORY` 기록
- [ ] 취소 요청/처리 시 `OFT_ORDER_CANCEL_REQUEST` 기록
- [ ] 배송 상태 변경 시 `OFT_DELIVERY_TRACKING_HISTORY` 기록

## 11. 호환성 체크리스트
- [ ] 기존 `PAID`, `SHIPPING`, `COMPLETED`, `CANCELED` 데이터 조회 시 서버 오류 없음
- [ ] 기존 `READY`, `SHIPPING`, `DELIVERED` 배송 데이터 조회 시 서버 오류 없음
- [ ] 리뷰 작성 가능 조건이 배송완료 기준으로 유지됨
- [ ] 대시보드에서 취소 제외 조건 재검토

## 12. 1차 완료 기준
- 운영자 주문 처리 API가 동작
- 배송사 배송 처리 API가 동작
- 고객 주문 조회에서 신규 상태 구조가 내려감
- 상태 이력이 저장됨
- 구 상태 데이터와 공존 가능

## 13. 다음 단계 연결
- 1차 완료 후 프론트 신규 화면 구현 시작
- 참조 문서:
  - [order_fulfillment_code_change_map.md](/d:/study/oneulFarm/docs/order_fulfillment_code_change_map.md)
  - [order_fulfillment_api_spec_draft.md](/d:/study/oneulFarm/docs/order_fulfillment_api_spec_draft.md)
  - [order_fulfillment_test_checklist.md](/d:/study/oneulFarm/docs/order_fulfillment_test_checklist.md)
