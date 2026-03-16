<div class="cover">
  <div class="cover-top">
    <div class="eyebrow">SYSTEM DESIGN · 설계서</div>
    <h1>농산물 시세 분석 기반<br>직거래 플랫폼 설계서</h1>
    <p class="subtitle">아키텍처 · 데이터 모델 · API 기준 · 배치 설계 · 운영 정책</p>
    <div class="summary">
      <p><strong>문서 목적</strong><br>본 문서는 개발 기준 아키텍처, Oracle 기반 데이터 설계 원칙, 핵심 테이블 구조, 배치 처리 흐름, API 설계 기준을 정의한다. 구현 단계에서 “무엇을 어떻게 저장하고 계산할 것인가”를 빠르게 확인할 수 있는 기준 문서로 사용한다.</p>
    </div>
    <div class="meta-grid">
      <div class="meta-item"><div class="meta-label">문서 버전</div><div class="meta-value">v1.0</div></div>
      <div class="meta-item"><div class="meta-label">문서 상태</div><div class="meta-value">개발 기준안</div></div>
      <div class="meta-item"><div class="meta-label">DBMS</div><div class="meta-value">Oracle</div></div>
      <div class="meta-item"><div class="meta-label">기준 일자</div><div class="meta-value">2026-03-10</div></div>
    </div>
    <div class="badges">
      <span class="badge">Oracle / VARCHAR2 / NUMBER</span>
      <span class="badge">BLOB + URL 혼합 이미지 전략</span>
      <span class="badge">배치 기반 시세 수집</span>
      <span class="badge">절약 통계 집계 구조</span>
    </div>
  </div>
  <div class="cover-bottom">
    <div>Internal Design Specification</div>
    <div>Markdown / PDF 동시 배포본</div>
  </div>
</div>

<div class="page-break"></div>

# 1. 문서 사용 안내

본 설계서는 다음 질문에 대한 기준 답변을 제공한다.

- 어떤 기술 스택을 기준으로 구현할 것인가?
- 시세 데이터는 어떤 흐름으로 수집·저장·비교할 것인가?
- 상품/주문/리뷰/통계는 어떤 테이블로 분리할 것인가?
- Oracle 기준으로 컬럼 타입과 기본 정책은 어떻게 둘 것인가?
- 이미지 데이터는 어떤 테이블은 BLOB로, 어떤 데이터는 URL로 둘 것인가?

<div class="box">
<strong>AI 입력용 핵심 컨텍스트</strong>

- 백엔드: Spring Boot
- 프론트엔드: React
- 데이터베이스: Oracle
- 직접 매입/소분 운영 구조
- 시세 데이터: 공공 API 배치 수집 → PRICE_SNAPSHOT 저장 → 상품과 비교
- 대시보드: ORDER_ITEM 기준 절약 금액 저장 → 월별/품목별 집계 테이블 사용
- 이미지 정책:
  - PRODUCT_IMAGE / REVIEW_IMAGE / MAIN_BANNER = BLOB
  - RECIPE / RECIPE_STEP = IMAGE_URL
</div>

# 2. 설계 원칙

## 2.1 아키텍처 원칙

1. **도메인 분리**  
   사용자, 상품, 시세, 주문, 리뷰, 레시피, 대시보드, 관리자 도메인을 구분한다.

2. **시점 데이터 보존**  
   주문 시점의 평균가를 `ORDER_ITEM`에 별도로 저장하여 추후 시세가 바뀌어도 당시 절약 금액을 재현할 수 있게 한다.

3. **운영 현실성 우선**  
   MVP에서는 운영자가 직접 관리 가능한 구조를 우선하고, 결제/배송/물류 연동은 확장 구조로 둔다.

4. **AI/협업 친화성**  
   테이블명, API 명칭, 화면 용어를 최대한 일치시켜 문서와 코드 사이의 번역 비용을 줄인다.

## 2.2 Oracle 설계 기본 정책

| 항목 | 기준 |
|---|---|
| 문자열 | `VARCHAR2` 사용 |
| 숫자형 PK | `NUMBER(19)` 기준 |
| 불리언 대체 | `CHAR(1)` 사용, `Y/N` 값 저장 |
| 시간 | 생성/수정 시각은 `TIMESTAMP` 사용 |
| 본문형 텍스트 | 설명/리뷰는 `CLOB` 사용 |
| 이미지 파일 | 핵심 운영 이미지(BLOB 대상)는 `BLOB` 사용 |
| 논리 삭제 | 필요한 경우 `STATUS` 또는 `DELETED_AT` 컬럼 사용 |

# 3. 시스템 구성

## 3.1 상위 아키텍처

![시스템 아키텍처](agri_platform_architecture.png)

<div class="figure-caption">그림 1. 프론트엔드, API 서버, 배치, Oracle, 외부 API의 관계</div>

## 3.2 구성 요소 설명

| 구성 요소 | 역할 | 비고 |
|---|---|---|
| 사용자 웹(React) | 상품 탐색, 장바구니, 주문, 대시보드 | 일반 사용자 전용 UI |
| 관리자 화면 | 매입/소분/재고/주문 관리 | 권한 기반 접근 |
| Spring Boot API | 인증, 상품, 주문, 리뷰, 레시피, 대시보드 제공 | REST API 중심 |
| Scheduler / Batch | 시세 수집, 레시피 동기화, 통계 집계 | 정기 실행 |
| Oracle DB | 핵심 업무 데이터 저장 | 운영 기준 저장소 |
| 외부 시세 API | 가격 데이터 수집 | KAMIS / aT 등 |
| 외부 레시피 API | 레시피/영양정보 조회 | 이미지 URL 사용 가능 |

# 4. 도메인 모델 요약

## 4.1 사용자 도메인

- `USERS`: 사용자 계정 정보
- `USER_ADDRESS`: 배송지
- `TERMS_AGREEMENT`: 약관 동의
- 인증/권한은 `ROLE`, `STATUS` 기반으로 제어

## 4.2 상품/운영 도메인

- `PRODUCT_CATEGORY`: 카테고리
- `PRODUCT`: 판매 상품
- `PRODUCT_IMAGE`: 상품 이미지(BLOB)
- `PURCHASE_BATCH`: 매입 배치
- `PACKAGE_HISTORY`: 소분 이력

## 4.3 시세 도메인

- `PRICE_SNAPSHOT`: 시세 스냅샷
- `PRODUCT_PRICE_MATCH`: 상품과 시세의 비교 결과

## 4.4 주문 도메인

- `CART`, `CART_ITEM`
- `ORDERS`, `ORDER_ITEM`
- `PAYMENT`, `DELIVERY`

## 4.5 콘텐츠 도메인

- `REVIEW`, `REVIEW_IMAGE`
- `RECIPE`, `RECIPE_INGREDIENT`, `RECIPE_STEP`
- `PRODUCT_RECIPE_MAP`
- `MAIN_BANNER`

## 4.6 통계 도메인

- `USER_DASHBOARD_SUMMARY`
- `USER_MONTHLY_STATS`
- `USER_PRODUCT_STATS`

# 5. 이미지 저장 전략

## 5.1 확정 정책

<div class="decision">
<strong>BLOB 저장 대상</strong><br>
`PRODUCT_IMAGE`, `REVIEW_IMAGE`, `MAIN_BANNER`
</div>

<div class="decision">
<strong>URL 저장 대상</strong><br>
`RECIPE.IMAGE_URL`, `RECIPE_STEP.IMAGE_URL`
</div>

## 5.2 정책 근거

| 대상 | 저장 방식 | 이유 |
|---|---|---|
| 상품 이미지 | BLOB | 운영자가 직접 관리하는 핵심 자산이며, 상품 삭제/수정과 함께 일관되게 관리하기 쉬움 |
| 리뷰 이미지 | BLOB | 서비스 내부 UGC 성격이 강하며 별도 스토리지를 두지 않아도 됨 |
| 메인 배너 | BLOB | 운영 배너를 DB만으로 관리 가능 |
| 레시피 대표 이미지 | URL | 외부 API 제공 이미지까지 모두 BLOB로 저장하면 용량/동기화 부담이 큼 |
| 레시피 단계 이미지 | URL | 외부 레시피 데이터 특성상 URL 유지가 운영 효율적 |

## 5.3 BLOB 컬럼 운영 권장안

상품/리뷰/배너 이미지 테이블에는 BLOB 본문 외에도 아래 메타 정보를 함께 저장하는 것을 권장한다.

| 컬럼 | 목적 |
|---|---|
| `IMAGE_NAME` | 원본 파일명 |
| `IMAGE_EXT` | 확장자 |
| `MIME_TYPE` | `image/jpeg`, `image/png` 등 |
| `IMAGE_SIZE` | 파일 크기(bytes) |
| `IMAGE_DATA` | 실제 바이너리 데이터 |

# 6. 데이터 흐름 설계

## 6.1 시세 수집 흐름

1. 스케줄러가 외부 시세 API를 호출
2. 품목 코드, 단위, 날짜 기준으로 정규화
3. `PRICE_SNAPSHOT`에 저장
4. 이동 평균 및 변동률 계산
5. 상품과 비교하여 `PRODUCT_PRICE_MATCH` 생성
6. 상세 화면과 대시보드에 사용

## 6.2 상품 운영 흐름

1. 관리자가 매입 정보를 `PURCHASE_BATCH`에 등록
2. 소분 이력을 `PACKAGE_HISTORY`에 저장
3. `PRODUCT` 재고와 판매 상태를 갱신
4. `PRODUCT_IMAGE`에 이미지 업로드
5. 상품 목록/상세에 노출

## 6.3 주문 및 절약 집계 흐름

1. 사용자가 상품을 장바구니에 담음
2. 주문 생성 시 `ORDER_ITEM`에 주문 시점 판매가와 평균가 저장
3. `SAVED_AMOUNT` 계산
4. 월별/품목별 통계 테이블 갱신
5. 마이페이지 대시보드에 반영

## 6.4 레시피 연결 흐름

1. 외부 레시피 API에서 기본 정보/재료/단계를 조회
2. `RECIPE`, `RECIPE_INGREDIENT`, `RECIPE_STEP` 저장
3. 재료명 또는 품목코드를 기준으로 `PRODUCT_RECIPE_MAP` 생성
4. 상품 상세 및 대시보드 추천 영역에 활용

# 7. ERD 요약

![핵심 ERD](agri_platform_core_erd.png)

<div class="figure-caption">그림 2. 문서 본문용 핵심 ERD 요약</div>

<p class="small center">상세 전체 ERD는 별도 ERD 산출물 파일로 관리한다.</p>

## 7.1 핵심 관계 요약

| 부모 | 자식 | 관계 |
|---|---|---|
| `USERS` | `USER_ADDRESS`, `TERMS_AGREEMENT`, `ORDERS`, `WISHLIST`, `REVIEW`, `USER_MONTHLY_STATS`, `USER_PRODUCT_STATS` | 1:N |
| `USERS` | `CART`, `USER_DASHBOARD_SUMMARY` | 1:1 또는 사실상 1:1 |
| `PRODUCT_CATEGORY` | `PRODUCT` | 1:N |
| `PRODUCT` | `PRODUCT_IMAGE`, `ORDER_ITEM`, `REVIEW`, `WISHLIST`, `PRODUCT_RECIPE_MAP`, `USER_PRODUCT_STATS` | 1:N |
| `ORDERS` | `ORDER_ITEM`, `PAYMENT`, `DELIVERY` | 1:N 또는 1:1 |
| `RECIPE` | `RECIPE_INGREDIENT`, `RECIPE_STEP`, `PRODUCT_RECIPE_MAP` | 1:N |

## 7.2 핵심 테이블 선택 이유

### `ORDER_ITEM`
절약 금액 계산의 기준이 되는 테이블이다. 주문 당시의 `UNIT_PRICE`, `MARKET_AVG_PRICE`, `SAVED_AMOUNT`를 저장해야 이후 가격 변동과 무관하게 사용자의 절약 이력을 재현할 수 있다.

### `PRICE_SNAPSHOT`
외부 API 데이터를 원본에 가깝게 보존하는 역할을 한다. 상품 상세 화면뿐 아니라 관리자 분석, 추후 가격 예측 기능의 입력 데이터로도 활용할 수 있다.

### `USER_MONTHLY_STATS`, `USER_PRODUCT_STATS`
대시보드를 매번 실시간으로 무거운 집계 쿼리로 계산하지 않기 위해 사용한다. MVP에서는 배치 기반 집계, 필요 시 주문 완료 시점 부분 갱신으로 확장 가능하다.

# 8. 핵심 테이블 설계 요약

## 8.1 사용자/인증 관련

| 테이블 | 핵심 컬럼 | 설명 |
|---|---|---|
| `USERS` | `USER_ID`, `EMAIL`, `PASSWORD`, `ROLE`, `STATUS` | 계정/권한/상태 관리 |
| `USER_ADDRESS` | `ADDRESS_ID`, `USER_ID`, `IS_DEFAULT` | 다중 배송지 관리 |
| `TERMS_AGREEMENT` | `USER_ID`, `TERMS_TYPE`, `IS_AGREED` | 약관 동의 이력 보관 |

## 8.2 상품/시세 관련

| 테이블 | 핵심 컬럼 | 설명 |
|---|---|---|
| `PRODUCT` | `PRODUCT_NAME`, `UNIT`, `PACKAGE_WEIGHT`, `SALE_PRICE`, `STOCK_QTY` | 판매 상품 |
| `PURCHASE_BATCH` | `PURCHASE_QTY`, `PURCHASE_PRICE`, `PURCHASE_DATE` | 매입 원물 기록 |
| `PACKAGE_HISTORY` | `BATCH_ID`, `PRODUCT_ID`, `PACKAGED_QTY` | 소분 기록 |
| `PRICE_SNAPSHOT` | `ITEM_CODE`, `AVG_PRICE`, `SNAPSHOT_DATE` | 시세 원본 데이터 |
| `PRODUCT_PRICE_MATCH` | `PRICE_GAP`, `SAVING_RATE`, `BADGE_TYPE` | 상품-시세 비교 결과 |

## 8.3 주문/통계 관련

| 테이블 | 핵심 컬럼 | 설명 |
|---|---|---|
| `ORDERS` | `ORDER_NO`, `ORDER_STATUS`, `FINAL_AMOUNT` | 주문 기본 정보 |
| `ORDER_ITEM` | `UNIT_PRICE`, `MARKET_AVG_PRICE`, `SAVED_AMOUNT` | 주문 상세 및 절약 계산 기준 |
| `USER_DASHBOARD_SUMMARY` | `TOTAL_ORDER_COUNT`, `TOTAL_PURCHASE_AMOUNT`, `TOTAL_SAVED_AMOUNT` | 사용자 요약 카드 |
| `USER_MONTHLY_STATS` | `STATS_YEAR`, `STATS_MONTH`, `SAVED_AMOUNT` | 월별 차트 |
| `USER_PRODUCT_STATS` | `PRODUCT_ID`, `TOTAL_QUANTITY`, `TOTAL_SAVED_AMOUNT` | 품목별 분석 |

# 9. API 설계 기준

## 9.1 기본 원칙

- REST 스타일을 따른다.
- 화면 단위가 아니라 **도메인 단위 URL**을 사용한다.
- 조회와 집계 API는 분리한다.
- 에러 응답 포맷은 공통 구조로 통일한다.
- 관리자 API는 사용자 API와 권한을 분리한다.

## 9.2 대표 엔드포인트 예시

| Method | URI | 설명 |
|---|---|---|
| `POST` | `/api/auth/signup` | 회원가입 |
| `POST` | `/api/auth/login` | 로그인 |
| `GET` | `/api/products` | 상품 목록 조회 |
| `GET` | `/api/products/{id}` | 상품 상세 조회 |
| `GET` | `/api/prices` | 시세 목록/검색 |
| `GET` | `/api/prices/trend` | 기간별 시세 추이 |
| `POST` | `/api/cart/items` | 장바구니 담기 |
| `POST` | `/api/orders` | 주문 생성 |
| `GET` | `/api/orders/me` | 내 주문 목록 |
| `GET` | `/api/dashboard/summary` | 대시보드 요약 |
| `GET` | `/api/dashboard/monthly` | 월별 절약 통계 |
| `GET` | `/api/dashboard/products` | 품목별 절약 통계 |
| `GET` | `/api/recipes/recommended` | 구매이력 기반 레시피 추천 |
| `POST` | `/api/admin/purchases` | 매입 등록 |
| `POST` | `/api/admin/packages` | 소분 등록 |
| `PATCH` | `/api/admin/orders/{id}/status` | 주문/배송 상태 변경 |

## 9.3 공통 응답 예시

```json
{
  "success": true,
  "data": {
    "totalSavedAmount": 18200,
    "monthlySavedAmount": 6200,
    "favoriteProduct": "감자"
  },
  "message": "대시보드 요약 조회 성공"
}
```

## 9.4 에러 응답 예시

```json
{
  "success": false,
  "errorCode": "ORDER_NOT_FOUND",
  "message": "주문 정보를 찾을 수 없습니다."
}
```

# 10. 인증 / 권한 / 보안

## 10.1 인증 기준안

- 기본안: **JWT 기반 인증**
- 확장안: Refresh Token 적용
- 로그인 유지: Access Token + 필요 시 Refresh Token 재발급

## 10.2 권한 정책

| 권한 | 가능 기능 |
|---|---|
| `USER` | 상품 조회, 장바구니, 주문, 리뷰, 마이페이지 |
| `ADMIN` | 매입/소분/재고/주문/배송/배너 관리 |
| 비로그인 | 메인, 상품 일부 조회, 시세 일부 조회 가능 / 주문·찜·리뷰는 제한 |

## 10.3 보안 고려사항

- 비밀번호는 해시 저장
- 관리자 API는 별도 권한 체크
- BLOB 업로드 시 MIME 타입/크기 제한
- 외부 API 호출 결과는 입력 검증 후 저장
- 주문/대시보드 API는 사용자 본인 데이터만 접근 가능해야 함

# 11. 배치 / 스케줄러 설계

## 11.1 배치 작업 목록

| 작업명 | 실행 주기 | 주요 결과 |
|---|---|---|
| 시세 수집 배치 | 일 1회 또는 여러 회 | `PRICE_SNAPSHOT` 저장 |
| 시세 비교 배치 | 시세 수집 직후 | `PRODUCT_PRICE_MATCH` 갱신 |
| 레시피 동기화 배치 | 일 1회 또는 수동 | 레시피 테이블 갱신 |
| 월별 통계 집계 배치 | 일 1회 | `USER_MONTHLY_STATS` 갱신 |
| 품목별 통계 집계 배치 | 일 1회 | `USER_PRODUCT_STATS` 갱신 |

## 11.2 실패 처리 원칙

- 외부 API 실패 시 재시도 횟수 제한
- 마지막 성공 시점 기록
- 부분 실패 로그 저장
- 데이터 중복 저장 방지 키 설정
- 관리자 화면에서 최근 동기화 상태 확인 가능하게 설계

# 12. 비기능 요구사항

## 12.1 성능

- 상품 목록/상세는 일반 사용자가 체감상 빠르게 열려야 한다.
- 대시보드 API는 가능하면 집계 테이블을 활용해 응답 시간을 줄인다.
- BLOB 데이터는 목록 조회에서 직접 내려주지 않고 별도 조회 혹은 썸네일 전략을 고려한다.

## 12.2 안정성

- 배치 실패가 사용자 주문 흐름에 직접 영향을 주지 않도록 분리
- 주문 상태 변경은 트랜잭션으로 보장
- 재고 차감은 동시성 이슈를 고려한 처리 필요

## 12.3 확장성

- PG, 물류, AI 추천, 가격 예측 기능을 붙일 수 있도록 도메인 분리를 유지
- 외부 API 공급처가 바뀌어도 내부 표준 품목/단위 구조는 유지

# 13. 구현 우선순위

| 우선순위 | 범위 |
|---|---|
| 1순위 | 회원, 상품, 장바구니, 주문, 시세 비교, 관리자 재고 관리 |
| 2순위 | 대시보드, 통계 집계, 레시피 연결 |
| 3순위 | 리뷰 이미지, 배너 운영, 관리자 통계 보강 |
| 4순위 | PG/배송 연동, 추천 고도화, AI 기능 |

# 14. 테스트 기준

## 14.1 기능 테스트

- 회원가입/로그인/로그아웃
- 상품 검색/필터/상세 조회
- 장바구니 담기/삭제/수량 변경
- 주문 생성 및 주문 상태 조회
- 시세 그래프/평균가 비교 노출
- 누적 절약 금액/월별 절약 금액 계산

## 14.2 데이터 테스트

- 시세 수집 중복 여부
- 단위 정규화 정확성
- 주문 시점 평균가 저장 여부
- 통계 집계 결과의 합계 일치 여부
- 이미지 BLOB 저장/조회 정상 여부

## 14.3 권한 테스트

- 비로그인 사용자의 제한 기능 차단
- 일반 사용자와 관리자 API 접근 제어
- 타인 주문/리뷰/대시보드 데이터 접근 차단

# 15. 향후 확장 포인트

- 가격 예측 모델
- 수요 예측 기반 발주 보조
- 사용자 세그먼트 추천
- 구매 이력 기반 식단/장보기 추천
- 배너 A/B 테스트
- 관리자 운영 지표 대시보드

# 16. 결론

본 설계서는 **직접 매입·소분 판매 구조**, **공공 시세 데이터 기반 가격 비교**, **사용자 절약 대시보드**, **Oracle 중심 데이터 설계**라는 네 축을 기준으로 작성되었다.

핵심은 “시세를 보여주는 기능”과 “실제 구매 경험”이 분리되지 않는다는 점이다.  
즉, 시세 데이터는 단순 참고 정보가 아니라 상품 상세, 주문, 절약 집계, 대시보드 분석까지 이어지는 **핵심 업무 데이터**로 취급되어야 한다.

이 기준을 유지하면, 프로젝트는 단순 쇼핑몰이 아니라 **데이터 제품 성격을 가진 커머스 서비스**로 설계·설명할 수 있다.



# 추천 시스템 설계 (추가)

추천 기능은 시세 데이터, 레시피 데이터, 사용자 구매 데이터를 결합하여 생성된다.

## 추천 데이터 유형

- 시세 기반 추천
- 구매 타이밍 추천
- 인기 농산물 추천
- 레시피 기반 추천
- 밀키트 추천

## 추천 데이터 흐름

시세 데이터 수집
↓
가격 추이 분석
↓
구매 타이밍 추천
↓
인기 농산물 분석
↓
레시피 매칭
↓
밀키트 구성
↓
추천 페이지 노출

## 추천 API

GET /api/recommend  
추천 페이지 데이터 조회

GET /api/recommend/trending  
네이버 데이터랩 기반 인기 농산물 조회

GET /api/recommend/mealkit  
레시피 기반 밀키트 추천
