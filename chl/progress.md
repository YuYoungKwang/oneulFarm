# 진행 현황

## 1. 문서 목적

이 문서는 `oneulFarm` 프로젝트에서 현재까지 실제로 구현한 내용과 최근 수정 사항, 남은 작업, 배포 시 주의할 점을 기록하는 작업 추적 문서다.

관리 기준:

- 기능이 끝나거나 구조가 바뀌면 바로 갱신한다.
- 설계 문서가 아니라 실제 구현 기준으로 적는다.
- 현재 동작 여부, 관련 파일, 문제 원인과 해결 방향까지 같이 남긴다.

## 2. 최신 반영일

- 2026-03-19

## 3. 현재 전체 상태 요약

현재 기준으로 마이페이지, 주문관리, 대시보드, 상세 개인정보, 배송지 관리의 핵심 기능은 실제 API까지 연결된 상태다.

구현 완료 범위:

- 마이페이지 허브 화면
- 주문관리 페이지 분리
- 주문 목록 조회
- 주문 상세 조회
- 주문 상태/기간 필터
- 대시보드 요약
- 대시보드 차트 및 소비 패턴
- 상세 개인정보 조회/수정
- 이메일/닉네임 중복 확인
- 비밀번호 변경
- 회원 탈퇴
- 배송지 목록/추가/수정/삭제/기본 배송지 변경

아직 미연동 또는 데모 상태:

- 없음

## 4. 기능별 상세 진행 현황

### 4.1 주문

백엔드 완료:

- `GET /api/orders/me`
- `GET /api/orders/me/{orderNo}`
- 배송 상태 필터
- 기간 조회 필터

프론트 완료:

- 주문 기능을 마이페이지에서 분리해 `#/orders` 전용 화면으로 이동
- 주문 필터/기간 조회 UI 구현
- 주문 카드 토글형 상세 보기
- 주문 상세는 카드 바로 아래에서 열리도록 정리

관련 파일:

- [OrderController.java](d:/study/oneulFarm/backend/src/main/java/com/app/controller/OrderController.java)
- [OrderService.java](d:/study/oneulFarm/backend/src/main/java/com/app/service/OrderService.java)
- [OrderServiceImpl.java](d:/study/oneulFarm/backend/src/main/java/com/app/service/OrderServiceImpl.java)
- [OrderDao.java](d:/study/oneulFarm/backend/src/main/java/com/app/dao/OrderDao.java)
- [OrderDaoImpl.java](d:/study/oneulFarm/backend/src/main/java/com/app/dao/OrderDaoImpl.java)
- [order-mapper.xml](d:/study/oneulFarm/backend/src/main/webapp/WEB-INF/mybatis/mapper/order-mapper.xml)
- [AccountApp.js](d:/study/oneulFarm/frontend/src/AccountApp.js)
- [OrdersView.js](d:/study/oneulFarm/frontend/src/OrdersView.js)
- [OrderDetailPanel.js](d:/study/oneulFarm/frontend/src/OrderDetailPanel.js)

처리했던 주요 문제:

- `@PathVariable` 이름 미지정으로 주문 상세 바인딩 실패
- `order-mapper.xml` XML 비교 연산자 미이스케이프
- 주문상품 더미 데이터 누락으로 목록/집계 비정상

현재 상태:

- 목록/상세/필터 모두 동작 확인

### 4.2 대시보드

백엔드 완료:

- `GET /api/dashboard/summary`
- `GET /api/dashboard/monthly-savings`
- `GET /api/dashboard/product-savings`
- `GET /api/dashboard/patterns`

프론트 완료:

- KPI 카드 실제 연동
- 월별 절약 금액 차트 실제 연동
- 품목별 절약 분석 실제 연동
- 평균 구매 단가, 절약률, 최다 구매 품목, 최근 구매 상품 실제 연동

관련 파일:

- [DashboardController.java](d:/study/oneulFarm/backend/src/main/java/com/app/controller/DashboardController.java)
- [DashboardService.java](d:/study/oneulFarm/backend/src/main/java/com/app/service/DashboardService.java)
- [DashboardServiceImpl.java](d:/study/oneulFarm/backend/src/main/java/com/app/service/DashboardServiceImpl.java)
- [DashboardDao.java](d:/study/oneulFarm/backend/src/main/java/com/app/dao/DashboardDao.java)
- [DashboardDaoImpl.java](d:/study/oneulFarm/backend/src/main/java/com/app/dao/DashboardDaoImpl.java)
- [dashboard-mapper.xml](d:/study/oneulFarm/backend/src/main/webapp/WEB-INF/mybatis/mapper/dashboard-mapper.xml)
- [DashboardView.js](d:/study/oneulFarm/frontend/src/DashboardView.js)
- [AccountApp.js](d:/study/oneulFarm/frontend/src/AccountApp.js)

처리했던 주요 문제:

- dashboard mapper XML 파싱 오류
- 대시보드 상세 props 누락으로 `averagePurchaseUnitPrice` undefined 발생

현재 상태:

- 요약/차트/패턴 모두 실제 API 기준으로 동작

### 4.3 마이페이지

구조 변경:

- 상단 계정 로컬 탭 순서를 `마이페이지 / 주문관리 / 대시보드`로 재정리
- 마이페이지는 허브 화면 역할만 하도록 단순화
- 주문 기능은 별도 주문관리 페이지로 분리

현재 구성:

- 프로필 요약 카드 1개
- 최근 주문 요약 1개
- 하단 탭
  - 찜한 상품
  - 리뷰 관리

현재 상태:

- 허브 역할 기준으로 정리 완료
- 관심 활동은 별도 탭으로 분리 완료

관련 파일:

- [MyPageView.js](d:/study/oneulFarm/frontend/src/MyPageView.js)
- [ActivityView.js](d:/study/oneulFarm/frontend/src/ActivityView.js)
- [AccountApp.js](d:/study/oneulFarm/frontend/src/AccountApp.js)
- [account.css](d:/study/oneulFarm/frontend/src/styles/account.css)

### 4.4 상세 개인정보

백엔드 완료:

- `GET /api/users/me`
- `PATCH /api/users/me`
- `PATCH /api/users/me/password`
- `GET /api/users/check-email`
- `GET /api/users/check-nickname`
- `PATCH /api/users/me/withdraw`

프론트 완료:

- 별도 상세 개인정보 페이지
- 항목별 인라인 편집 구조
- 이메일/닉네임 중복 확인
- 비밀번호 변경
- 회원 탈퇴

관련 파일:

- [UserController.java](d:/study/oneulFarm/backend/src/main/java/com/app/controller/UserController.java)
- [UserService.java](d:/study/oneulFarm/backend/src/main/java/com/app/service/UserService.java)
- [UserServiceImpl.java](d:/study/oneulFarm/backend/src/main/java/com/app/service/UserServiceImpl.java)
- [UserDao.java](d:/study/oneulFarm/backend/src/main/java/com/app/dao/UserDao.java)
- [UserDaoImpl.java](d:/study/oneulFarm/backend/src/main/java/com/app/dao/UserDaoImpl.java)
- [user-mapper.xml](d:/study/oneulFarm/backend/src/main/webapp/WEB-INF/mybatis/mapper/user-mapper.xml)
- [ProfileDetailView.js](d:/study/oneulFarm/frontend/src/ProfileDetailView.js)
- [AccountApp.js](d:/study/oneulFarm/frontend/src/AccountApp.js)

정리한 사항:

- 회원번호 제거
- 상단 중복 요약 배지 제거
- 탈퇴 전용 DTO 제거 후 공용 현재 비밀번호 DTO로 통합

### 4.5 배송지 관리

백엔드 완료:

- `GET /api/users/me/addresses`
- `POST /api/users/me/addresses`
- `PATCH /api/users/me/addresses/{addressNo}`
- `PATCH /api/users/me/addresses/{addressNo}/default`
- `DELETE /api/users/me/addresses/{addressNo}`

프론트 완료:

- 배송지 관리 모달
- 목록 / 추가 / 수정 모드 분리
- 삭제 확인 창
- 기본 배송지 강조
- 기본 배송지 해제 차단
- 목록 영역 내부 스크롤 고정

관련 파일:

- [AddressController.java](d:/study/oneulFarm/backend/src/main/java/com/app/controller/AddressController.java)
- [AddressService.java](d:/study/oneulFarm/backend/src/main/java/com/app/service/AddressService.java)
- [AddressServiceImpl.java](d:/study/oneulFarm/backend/src/main/java/com/app/service/AddressServiceImpl.java)
- [AddressDao.java](d:/study/oneulFarm/backend/src/main/java/com/app/dao/AddressDao.java)
- [AddressDaoImpl.java](d:/study/oneulFarm/backend/src/main/java/com/app/dao/AddressDaoImpl.java)
- [address-mapper.xml](d:/study/oneulFarm/backend/src/main/webapp/WEB-INF/mybatis/mapper/address-mapper.xml)
- [AddressModal.js](d:/study/oneulFarm/frontend/src/AddressModal.js)
- [AccountApp.js](d:/study/oneulFarm/frontend/src/AccountApp.js)
- [account.css](d:/study/oneulFarm/frontend/src/styles/account.css)

정책:

- 배송지는 항상 기본 배송지가 하나는 있어야 함
- 배송지가 1개뿐이면 기본 배송지 해제 불가
- 현재 기본 배송지를 일반 배송지로 바꾸는 수정 차단

### 4.6 관심 활동

백엔드 완료:

- `GET /api/reviews/me/writable`
- `GET /api/reviews/me`
- `POST /api/reviews`
- `PATCH /api/reviews/{reviewNo}`
- `DELETE /api/reviews/{reviewNo}`

프론트 완료:

- 찜한 상품을 `oneulFarmWishlist` + 상품 API 기준으로 실제 렌더링
- 찜한 상품에서 장바구니 담기 / 상품 보러가기 / 찜 해제 연결
- 작성 가능한 리뷰 목록 실제 렌더링
- 내가 작성한 리뷰 목록 실제 렌더링
- 리뷰 작성 / 수정 / 삭제 인라인 폼 연결

관련 파일:

- [ReviewController.java](d:/study/oneulFarm/backend/src/main/java/com/app/controller/ReviewController.java)
- [ReviewService.java](d:/study/oneulFarm/backend/src/main/java/com/app/service/ReviewService.java)
- [ReviewServiceImpl.java](d:/study/oneulFarm/backend/src/main/java/com/app/service/ReviewServiceImpl.java)
- [ReviewDao.java](d:/study/oneulFarm/backend/src/main/java/com/app/dao/ReviewDao.java)
- [ReviewDaoImpl.java](d:/study/oneulFarm/backend/src/main/java/com/app/dao/ReviewDaoImpl.java)
- [review-mapper.xml](d:/study/oneulFarm/backend/src/main/webapp/WEB-INF/mybatis/mapper/review-mapper.xml)
- [ActivityReviewDto.java](d:/study/oneulFarm/backend/src/main/java/com/app/dto/ActivityReviewDto.java)
- [ReviewRequestDto.java](d:/study/oneulFarm/backend/src/main/java/com/app/dto/ReviewRequestDto.java)
- [ActivityView.js](d:/study/oneulFarm/frontend/src/ActivityView.js)
- [AccountApp.js](d:/study/oneulFarm/frontend/src/AccountApp.js)
- [account.css](d:/study/oneulFarm/frontend/src/styles/account.css)

현재 상태:

- 관심 활동 더미 제거 완료
- 실제 데이터 기준으로 동작
- 새 리뷰 API는 톰캣 재시작 후 최종 확인 필요

## 5. DTO 정리 메모

정리 완료:

- 배송지 생성/수정 요청 DTO 통합
- [AddressRequestDto.java](d:/study/oneulFarm/backend/src/main/java/com/app/dto/AddressRequestDto.java) 사용
- 회원 탈퇴 전용 DTO 제거
- [CurrentPasswordRequestDto.java](d:/study/oneulFarm/backend/src/main/java/com/app/dto/CurrentPasswordRequestDto.java) 공용 사용

기준:

- 필드와 검증이 같으면 요청 DTO는 최대한 통합
- 역할이 다르면 같은 테이블이어도 분리 유지

## 6. 최근 수정 사항

### 2026-03-19

- 관심 활동의 찜한 상품 / 리뷰 관리를 실제 데이터로 연동
- 계정 화면 API 경로를 `/api` 기준으로 다시 통일
- 레시피 API 경로를 `/api/recipes` 기준으로 수정
- `orders` 라우트를 계정용 주문관리 경로로 복구
- 상품 앱 주문 날짜 포맷 함수가 배열 날짜 응답을 처리하도록 보강

### 2026-03-18

- 계정 화면 한글 깨짐 정리
- `AccountApp.js`, `MyPageView.js`, `OrdersView.js`, `ProfileDetailView.js`, `AddressModal.js`, `DashboardView.js`, `OrderDetailPanel.js`, `appUtils.js`, `MainNav.js`, `mockData.js` UTF-8 기준으로 재정리
- 주문관리 상단 히어로 카드 제거로 화면 밀도 완화
- 마이페이지 찜/리뷰 탭을 `연동 예정` 상태에 맞게 톤다운
- 상세 개인정보 수정 시 입력창과 중복 확인 버튼을 같은 줄에 배치하도록 인라인 편집 레이아웃 조정
- 절약 금액을 마이페이지, 주문관리, 대시보드에서 같은 시각 언어로 강조하도록 카드/숫자 스타일 보강
- `account.css`에 비활성 버튼 스타일 보강
- `progress.md`, `implementation_plan.md` 재정리 필요 상태 확인
- `cmd /c npm run build` 통과

### 이전 반영 요약

- 주문관리 페이지 분리
- 배송지 수정 기능 추가
- 배송지 삭제 확인 창 추가
- 기본 배송지 해제 방지 규칙 추가
- 회원 탈퇴 기능 추가
- 주문 필터/기간 조회 추가
- 대시보드 상세 API 연동 완료

## 7. 현재 남은 작업

우선순위가 남아 있는 항목:

- 찜한 상품 실제 API 연동 여부 확인
- 리뷰 관리 실제 API 연동 여부 확인
- 회원정보/배송지 성공 메시지 톤 정리
- 모바일 미세 조정 최종 점검

## 8. 배포 및 개발 주의 사항

### 8.1 Tomcat 배포본

실행 중인 파일은 Eclipse Tomcat 배포본 기준으로 확인해야 한다.

주요 경로:

- `C:\Users\admin\eclipse-workspace\.metadata\.plugins\org.eclipse.wst.server.core\tmp0\wtpwebapps\backend`

주의:

- 컨트롤러/서비스/DTO/매퍼 추가 후에는 Tomcat 재시작이 필요한 경우가 많음
- 소스와 배포본이 어긋나면 `ClassNotFound`, `Mapper not found`, 구버전 클래스 잔존 문제가 발생할 수 있음

### 8.2 Java 버전

- Tomcat 런타임 기준은 Java 21
- 수동 컴파일 시 `--release 21` 기준 유지 필요

### 8.3 인코딩

- 저장 인코딩 기준은 UTF-8
- `.editorconfig`, `.gitattributes`, `.vscode/settings.json`, Eclipse project prefs 적용
- PowerShell 콘솔 출력은 여전히 깨져 보일 수 있으므로 실제 파일은 IDE에서 확인하는 것이 안전

## 9. 다음 작업 기준

다음 작업은 아래 기준으로 선택한다.

1. 내 담당 범위인지 먼저 확인
2. 이미 완성된 마이페이지/대시보드 흐름을 깨지 않는지 확인
3. 다른 사람 작업과 충돌할 가능성이 큰지 확인
4. 공용 CSS가 아니라면 `styles/account.css`에 한정해서 처리

현재 다음 후보:

- 관심 활동 실제 사용 흐름 검증
- 계정 화면 마감 다듬기
- 모바일 최종 점검
## 2026-03-19 추가 반영

- 관심 활동의 찜한 상품 카드에서 가격 표기를 `현재가`와 `↓ n% 절약` 형태로 재구성했다.
- 절약률이 있는 상품은 초록 배지형 강조로 보여 주고, 절약률이 없으면 기존 보조 문구를 유지한다.
- 대시보드에서 `평균 구매 단가` 카드를 제거하고, KPI 위계와 소비 패턴 카드 설명을 다시 정리했다.
- 최다 구매 품목과 최근 구매 상품은 카드형 리스트로 바꿔 한눈에 읽히도록 밀도를 조정했다.
- 대시보드 KPI 카드에는 핵심/보조 위계를 더 강하게 주고, 차트 섹션에 배지와 보조 라벨을 추가했다.
- 하단 리스트 카드에는 `TOP n`, `최근 n` 배지를 넣어 정보 순서를 더 빨리 읽을 수 있게 정리했다.
- 대시보드의 월별 절약 차트와 품목별 절약 바에는 진입 애니메이션을 추가해 막대가 순서대로 차오르게 했다.
