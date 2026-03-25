# 주문/배송 관리 분리 설계 초안

## 1. 목적
- 현재 주문 관련 화면은 고객 조회, 운영 처리, 배송 실행 관점이 섞여 있어 실제 서비스 운영 흐름과 다르다.
- 이를 `고객용 내 주문`, `운영자용 주문 관리`, `배송사용 배송 관리` 3개 영역으로 분리한다.
- 본 문서는 구현 전 단계에서 상태 체계, 역할 구분, API 방향, DB 초안을 먼저 고정하기 위한 설계 문서다.

## 2. 전제
- 고객은 주문 조회, 취소 요청, 배송 조회, 리뷰 작성, 구매확정만 수행한다.
- 운영자는 주문 수락/거절, 취소 요청 수락/거절을 수행한다.
- 배송사는 송장 등록, 제품 접수, 배송중 처리, 배송완료 처리를 수행한다.
- 취소는 `고객 요청 -> 운영자 수락/거절` 구조로 간다.
- 주문 거절은 `송장 등록 전까지` 가능하다.
- 배송완료 이후에는 리뷰 작성과 구매확정 흐름을 연결한다.

## 3. 페이지 분리 방향

### 3.1 고객용 `내 주문`
- 목적: 내 주문 확인과 후속 요청 처리
- 핵심 기능
  - 주문 목록 조회
  - 주문 상세 조회
  - 취소 요청
  - 배송 조회
  - 배송완료 후 리뷰 작성
  - 구매확정

### 3.2 운영자용 `주문 관리`
- 목적: 주문 승인과 취소 검토
- 핵심 기능
  - 결제완료 주문 검토
  - 주문 수락
  - 주문 거절
  - 취소 요청 수락
  - 취소 요청 거절
  - 배송사 인계 전 상태 관리

### 3.3 배송사용 `배송 관리`
- 목적: 송장 발급과 배송 실행
- 핵심 기능
  - 주문 접수
  - 송장번호 발급
  - 제품 접수 처리
  - 배송중 처리
  - 배송완료 처리
  - 배송 추적 이벤트 기록

## 3-1. 배송사 엔티티 필요성
- 배송 추적을 단순 문자열 기반으로만 처리하면 `배송사 페이지`, `배송사별 송장 발급`, `배송사별 상태 관리`를 현실적으로 분리하기 어렵다.
- 이번 구조에서는 배송사를 실제 관리 주체로 다루므로 `배송사 마스터 테이블`을 둔다.
- 배송 관련 데이터는 `배송사`, `송장`, `배송 상태`, `추적 이력`이 분리되어야 한다.
- 따라서 최소한 아래 3개 구조가 필요하다.
  - `OFT_CARRIER`
  - `OFT_DELIVERY` 확장
  - `OFT_DELIVERY_TRACKING_HISTORY`

## 4. 상태 모델

### 4.1 주문 상태
| 상태 코드 | 의미 | 변경 주체 |
|---|---|---|
| `PAYMENT_COMPLETED` | 결제완료, 아직 운영 검토 전 | 시스템 |
| `ORDER_ACCEPTED` | 운영자가 주문 처리 가능 상태로 수락 | 운영자 |
| `ORDER_REJECTED` | 운영자가 주문 거절 | 운영자 |

### 4.2 취소 상태
| 상태 코드 | 의미 | 변경 주체 |
|---|---|---|
| `NONE` | 취소 이슈 없음 | 시스템 |
| `CANCEL_REQUESTED` | 고객이 취소 요청 | 고객 |
| `CANCEL_ACCEPTED` | 운영자가 취소 수락 | 운영자 |
| `CANCEL_REJECTED` | 운영자가 취소 거절 | 운영자 |

### 4.3 배송 상태
| 상태 코드 | 의미 | 변경 주체 |
|---|---|---|
| `NOT_STARTED` | 배송 시작 전 | 시스템 또는 운영자 |
| `WAYBILL_ASSIGNED` | 송장 등록 완료 | 배송사 |
| `PICKED_UP` | 제품 접수 완료 | 배송사 |
| `IN_TRANSIT` | 배송중 | 배송사 |
| `DELIVERED` | 배송완료 | 배송사 |

### 4.4 구매확정 상태
| 상태 코드 | 의미 | 변경 주체 |
|---|---|---|
| `PURCHASE_PENDING` | 배송완료 후 구매확정 대기 | 시스템 |
| `PURCHASE_CONFIRMED` | 고객이 구매확정 | 고객 |

## 5. 상태 전이 정책

### 5.1 주문 상태 전이
- `PAYMENT_COMPLETED -> ORDER_ACCEPTED`
- `PAYMENT_COMPLETED -> ORDER_REJECTED`
- `ORDER_ACCEPTED` 이후에는 주문 거절 불가
- 주문 거절은 `송장 등록 전`까지만 허용

### 5.2 취소 상태 전이
- 고객은 `PAYMENT_COMPLETED`, `ORDER_ACCEPTED`, `NOT_STARTED` 범위에서 취소 요청 가능
- `CANCEL_REQUESTED -> CANCEL_ACCEPTED`
- `CANCEL_REQUESTED -> CANCEL_REJECTED`
- `WAYBILL_ASSIGNED` 이후는 기본 정책상 취소 요청 불가
- 이후 필요하면 반품/환불 프로세스를 별도로 설계한다

### 5.3 배송 상태 전이
- `NOT_STARTED -> WAYBILL_ASSIGNED`
- `WAYBILL_ASSIGNED -> PICKED_UP`
- `PICKED_UP -> IN_TRANSIT`
- `IN_TRANSIT -> DELIVERED`
- 배송 상태는 배송사 화면에서만 변경 가능

### 5.4 리뷰/구매확정 정책
- 리뷰 작성 가능 조건
  - 배송 상태가 `DELIVERED`
  - 기존 리뷰 없음
- 구매확정 가능 조건
  - 배송 상태가 `DELIVERED`
- 권장 흐름
  - `DELIVERED -> PURCHASE_PENDING`
  - 고객이 구매확정한 뒤에도 리뷰 작성은 허용

## 6. 권한별 기능표
| 기능 | 고객 | 운영자 | 배송사 |
|---|---|---|---|
| 주문 목록 조회 | O | O | O |
| 주문 상세 조회 | O | O | O |
| 주문 수락 | X | O | X |
| 주문 거절 | X | O | X |
| 취소 요청 | O | X | X |
| 취소 수락/거절 | X | O | X |
| 송장 등록 | X | X | O |
| 제품 접수 | X | X | O |
| 배송중 처리 | X | X | O |
| 배송완료 처리 | X | X | O |
| 배송 추적 조회 | O | O | O |
| 리뷰 작성 | O | X | X |
| 구매확정 | O | X | X |

## 7. 화면 요구사항

### 7.1 고객용 `내 주문`
- 목록 컬럼
  - 주문번호
  - 주문일시
  - 상품 대표 이미지
  - 상품 요약
  - 주문 상태
  - 취소 상태
  - 배송 상태
  - 배송 조회 버튼
- 상세 화면
  - 수취인
  - 주소
  - 연락처
  - 상품 정보
  - 결제 정보
  - 배송 추적 타임라인
  - 취소 요청 버튼
  - 리뷰 작성 버튼
  - 구매확정 버튼

### 7.2 운영자용 `주문 관리`
- 목록 컬럼
  - 주문번호
  - 주문일시
  - 주문자
  - 상품 요약
  - 결제 상태
  - 주문 상태
  - 취소 상태
  - 배송 상태
- 상세 화면
  - 주문자 정보
  - 배송지 정보
  - 상품 구성
  - 거절 사유
  - 취소 요청 사유
  - 운영 메모
  - 액션 버튼
    - 주문 수락
    - 주문 거절
    - 취소 수락
    - 취소 거절

### 7.3 배송사용 `배송 관리`
- 목록 컬럼
  - 주문번호
  - 수취인
  - 주소
  - 상품 요약
  - 배송사
  - 송장번호
  - 배송 상태
- 상세 화면
  - 주문/배송 기본 정보
  - 송장 등록/조회
  - 상태 변경 버튼
    - 제품 접수
    - 배송중
    - 배송완료
  - 배송 추적 이력

## 8. 더미 배송사 API 설계

### 8.1 목적
- 실제 배송사 연동 전에도 현실적인 배송관리 흐름을 시연할 수 있게 한다.
- 송장 발급, 상태 변경, 추적 이력을 내부 더미 API로 제공한다.

### 8.2 API 초안
| 메서드 | 경로 | 설명 |
|---|---|---|
| `POST` | `/api/carrier/shipments` | 주문을 배송 접수하고 송장번호 발급 |
| `GET` | `/api/carrier/shipments/{trackingNo}` | 송장 기본 정보 조회 |
| `GET` | `/api/carrier/shipments/{trackingNo}/tracking` | 배송 추적 이력 조회 |
| `PATCH` | `/api/carrier/shipments/{trackingNo}/pickup` | 제품 접수 처리 |
| `PATCH` | `/api/carrier/shipments/{trackingNo}/in-transit` | 배송중 처리 |
| `PATCH` | `/api/carrier/shipments/{trackingNo}/delivered` | 배송완료 처리 |

### 8.3 송장번호 생성 규칙 초안
- 예시
  - `CJ-20260325-000123`
  - `LOGEN-20260325-000124`
- 구성 요소
  - 배송사 코드
  - 발급일
  - 일련번호

### 8.4 추적 이벤트 예시
| 순서 | 상태 | 메시지 |
|---|---|---|
| 1 | `WAYBILL_ASSIGNED` | 송장번호가 등록되었습니다. |
| 2 | `PICKED_UP` | 배송사에서 상품을 접수했습니다. |
| 3 | `IN_TRANSIT` | 배송이 시작되었습니다. |
| 4 | `DELIVERED` | 배송이 완료되었습니다. |

## 9. API 설계 초안

### 9.1 고객용 API
| 메서드 | 경로 | 설명 |
|---|---|---|
| `GET` | `/api/orders/me` | 내 주문 목록 조회 |
| `GET` | `/api/orders/me/{orderNo}` | 내 주문 상세 조회 |
| `POST` | `/api/orders/me/{orderNo}/cancel-request` | 취소 요청 |
| `POST` | `/api/orders/me/{orderNo}/confirm` | 구매확정 |
| `GET` | `/api/orders/me/{orderNo}/tracking` | 배송 추적 조회 |

### 9.2 운영자용 API
| 메서드 | 경로 | 설명 |
|---|---|---|
| `GET` | `/api/admin/orders` | 주문 목록 조회 |
| `GET` | `/api/admin/orders/{orderNo}` | 주문 상세 조회 |
| `PATCH` | `/api/admin/orders/{orderNo}/accept` | 주문 수락 |
| `PATCH` | `/api/admin/orders/{orderNo}/reject` | 주문 거절 |
| `PATCH` | `/api/admin/orders/{orderNo}/cancel/accept` | 취소 수락 |
| `PATCH` | `/api/admin/orders/{orderNo}/cancel/reject` | 취소 거절 |

### 9.3 배송사용 API
| 메서드 | 경로 | 설명 |
|---|---|---|
| `GET` | `/api/carrier/orders` | 배송 처리 대상 목록 |
| `GET` | `/api/carrier/orders/{orderNo}` | 배송 대상 상세 |
| `POST` | `/api/carrier/orders/{orderNo}/waybill` | 송장 등록 |
| `PATCH` | `/api/carrier/orders/{orderNo}/pickup` | 제품 접수 |
| `PATCH` | `/api/carrier/orders/{orderNo}/in-transit` | 배송중 처리 |
| `PATCH` | `/api/carrier/orders/{orderNo}/delivered` | 배송완료 처리 |

## 10. DB 설계 초안

### 10.1 기존 테이블 활용
- `OFT_ORDERS`
  - 주문 상태, 취소 상태, 구매확정 상태 컬럼 확장
- `OFT_DELIVERY`
  - 배송 상태, 배송사, 송장번호, 처리 시각 컬럼 보강

### 10.2 신규 테이블 권장

#### `OFT_CARRIER`
- 목적: 배송사 마스터 관리
- 필요 이유
  - 배송사 페이지 분리
  - 배송사별 송장 발급 규칙 관리
  - 배송사별 활성/비활성 관리
  - 배송사 코드 기준 추적 이력 관리
- 권장 컬럼
  - `CARRIER_CODE`
  - `CARRIER_NAME`
  - `TRACKING_URL_TEMPLATE`
  - `STATUS`
  - `CREATED_AT`
  - `UPDATED_AT`

#### `OFT_ORDER_STATUS_HISTORY`
- 목적: 주문 상태 변경 이력 저장
- 권장 컬럼
  - `ORDER_STATUS_HISTORY_NO`
  - `ORDER_NO`
  - `PREV_ORDER_STATUS`
  - `NEXT_ORDER_STATUS`
  - `CHANGED_BY_TYPE`
  - `CHANGED_BY`
  - `CHANGE_REASON`
  - `CHANGED_AT`

#### `OFT_ORDER_CANCEL_REQUEST`
- 목적: 취소 요청/처리 이력 관리
- 권장 컬럼
  - `CANCEL_REQUEST_NO`
  - `ORDER_NO`
  - `REQUESTED_BY_USER_NO`
  - `CANCEL_STATUS`
  - `REQUEST_REASON`
  - `DECISION_REASON`
  - `DECIDED_BY`
  - `REQUESTED_AT`
  - `DECIDED_AT`

#### `OFT_DELIVERY_TRACKING_HISTORY`
- 목적: 배송 추적 이벤트 저장
- 권장 컬럼
  - `TRACKING_HISTORY_NO`
  - `ORDER_NO`
  - `DELIVERY_NO`
  - `CARRIER_CODE`
  - `TRACKING_NO`
  - `TRACKING_STATUS`
  - `TRACKING_MESSAGE`
  - `RECORDED_BY`
  - `RECORDED_AT`

### 10.3 컬럼 추가 권장

#### `OFT_DELIVERY`
- `WAYBILL_STATUS`
- `CARRIER_CODE`
- `TRACKING_NO`
- `WAYBILL_ASSIGNED_AT`
- `PICKED_UP_AT`
- `IN_TRANSIT_AT`
- `DELIVERED_AT`

설명:
- `COURIER_NAME` 문자열만 두는 대신 `CARRIER_CODE` 기준으로 배송사를 연결한다.
- `TRACKING_NO`는 송장번호 자체를 저장한다.
- 시각 컬럼은 배송 추적 타임라인 요약과 운영 화면의 빠른 확인에 사용한다.

#### `OFT_ORDERS`
- `ORDER_STATUS`
- `CANCEL_STATUS`
- `PURCHASE_CONFIRM_STATUS`
- `PURCHASE_CONFIRMED_AT`

### 10.4 배송사 계정 구조 결정
- 이번 설계에서는 배송사용 페이지를 별도로 둘 예정이므로 배송사 로그인 주체가 필요하다.
- 1차 구현 권장안
  - `OFT_USERS.ROLE`에 `CARRIER` 추가
  - 배송사 소속 정보는 사용자와 배송사 코드를 매핑하는 방식으로 관리
- 권장 이유
  - 기존 로그인/인증 구조를 최대한 재사용 가능
  - 별도 인증 시스템을 새로 만들지 않아도 됨
  - 운영자/배송사 권한 분기 구현이 단순함
- 추가 권장 테이블
  - `OFT_CARRIER_USER`
    - `CARRIER_USER_NO`
    - `USER_NO`
    - `CARRIER_CODE`
    - `STATUS`
    - `CREATED_AT`
- 이 구조를 쓰면 하나의 배송사에 여러 배송사용 계정을 연결할 수 있다.

## 11. 구현 우선순위

### 1차
- 상태 코드 확정
- DB 컬럼/배송사/이력 테이블 설계
- 운영자용 주문 관리 API
- 배송사용 더미 API

### 2차
- 운영자용 주문 관리 화면
- 배송사용 배송 관리 화면
- 고객용 내 주문 개편

### 3차
- 배송완료 후 구매확정
- 리뷰 작성 연결 강화
- 알림/메시지 정교화

## 12. 구현 시작 순서 제안
1. 상태 전이표 확정
2. DB 변경안 초안 작성
3. 배송사 마스터/배송사 계정 구조 확정
4. API 명세 확정
5. 운영자용 주문 관리 백엔드
6. 배송사용 더미 배송 API
7. 운영자/배송사 UI
8. 고객용 내 주문 UI

## 13. 결정 사항 요약
- 고객용, 운영자용, 배송사용 페이지는 분리한다.
- 취소는 고객 요청 후 운영자가 수락/거절한다.
- 주문 거절은 송장 등록 전까지 허용한다.
- 배송완료 후 리뷰 작성과 구매확정을 연결한다.
- 실제 배송사 연동 전에는 더미 배송사 API를 둔다.
- 배송 추적과 배송사 페이지 분리를 위해 `배송사 마스터 테이블`과 `배송 추적 이력 테이블`을 포함한다.
- 배송사 계정은 1차 구현에서 `ROLE 확장 + 배송사 매핑 테이블` 방식으로 간다.

## 14. 관련 SQL 초안
- 실제 반영 전 검토용 DDL 초안:
  - [order_fulfillment_separation_ddl_draft.sql](/d:/study/oneulFarm/backend/src/main/webapp/WEB-INF/sql/order_fulfillment_separation_ddl_draft.sql)

## 15. 관련 마이그레이션 문서
- 상태값 이관 기준 및 단계별 적용 계획:
  - [order_fulfillment_state_migration_plan.md](/d:/study/oneulFarm/docs/order_fulfillment_state_migration_plan.md)

## 16. 관련 API 명세 초안
- 고객/운영자/배송사 분리 기준 API 초안:
  - [order_fulfillment_api_spec_draft.md](/d:/study/oneulFarm/docs/order_fulfillment_api_spec_draft.md)

## 17. 관련 UI 와이어프레임 초안
- 고객/운영자/배송사 화면 구조 초안:
  - [order_fulfillment_ui_wireframe_draft.md](/d:/study/oneulFarm/docs/order_fulfillment_ui_wireframe_draft.md)

## 18. 관련 구현 로드맵
- 실제 구현 순서와 단계별 목표:
  - [order_fulfillment_implementation_roadmap.md](/d:/study/oneulFarm/docs/order_fulfillment_implementation_roadmap.md)

## 19. 관련 테스트 체크리스트
- 기능/권한/상태 전이 검증 항목:
  - [order_fulfillment_test_checklist.md](/d:/study/oneulFarm/docs/order_fulfillment_test_checklist.md)
