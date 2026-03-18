# 진행 현황

## 1. 문서 목적

이 문서는 `oneulFarm` 프로젝트에서 현재까지 진행한 실제 구현 내용을 작업 기준으로 정리한 문서다.
설계 문서와 달리 다음 내용을 계속 누적 기록한다.

- 어떤 기능을 어디까지 구현했는지
- 어떤 API와 화면이 실제로 연결되었는지
- 어떤 오류가 있었고 어떻게 해결했는지
- 지금 당장 남아 있는 작업이 무엇인지
- 배포 과정에서 다시 주의해야 할 점이 무엇인지

운영 원칙:

- 기능 하나가 끝나면 이 문서를 갱신한다.
- 문서는 요약이 아니라 실제 작업 추적이 가능할 정도로 구체적으로 적는다.
- 설계/기획은 `docs` 폴더에 두고, 실제 진행 현황과 작업 메모는 `chl`에 둔다.
- 소스 기준 상태와 Tomcat 배포본 기준 상태가 다를 수 있으므로, 배포 관련 이슈도 반드시 남긴다.

## 2. 최신 반영일

- 2026-03-18

## 3. 현재 전체 상태 요약

현재 기준으로 마이페이지와 대시보드 핵심 기능은 대부분 실제 API까지 연결된 상태다.
단, 리뷰관리와 찜한상품은 아직 실데이터 연동 전이며, 일부 문서 파일은 인코딩 정리가 더 필요하다.

현재 동작 확인이 끝난 큰 흐름:

- 주문 목록 조회
- 주문 상세 조회
- 대시보드 요약 카드
- 대시보드 차트 및 패턴 영역
- 회원정보 조회/수정
- 비밀번호 변경
- 이메일/닉네임 중복 확인
- 배송지 목록/추가/수정/삭제/기본 배송지 변경

아직 실연동이 안 된 대표 영역:

- 리뷰관리
- 찜한상품

## 4. 기능별 상세 진행 현황

### 4.1 주문

#### 백엔드

구현 완료:

- `GET /api/orders/me`
- `GET /api/orders/me/{orderNo}`

관련 구현:

- 주문 목록 조회 쿼리 작성
- 주문 목록 배송 상태/기간 필터 조회 지원
- 주문 상세 조회 쿼리 작성
- 주문/배송/결제/상품/절약 정보 조합 로직 구현
- 상세 응답에 리뷰 존재 여부, 리뷰 작성 가능 여부 계산 반영

처리한 문제:

- 주문 상세 `@PathVariable` 이름 미지정으로 인한 바인딩 오류 수정
- `LocalDateTime` 직렬화 관련 응답 문제 정리
- `order-mapper.xml` 안 XML 예약 문자 비교 연산자(`<=`, `>=`) 미이스케이프로 Tomcat 기동 실패 발생
  - `&lt;=`, `&gt;=`로 수정

관련 파일:

- [OrderController.java](d:/study/oneulFarm/backend/src/main/java/com/app/controller/OrderController.java)
- [OrderService.java](d:/study/oneulFarm/backend/src/main/java/com/app/service/OrderService.java)
- [OrderServiceImpl.java](d:/study/oneulFarm/backend/src/main/java/com/app/service/OrderServiceImpl.java)
- [OrderDao.java](d:/study/oneulFarm/backend/src/main/java/com/app/dao/OrderDao.java)
- [OrderDaoImpl.java](d:/study/oneulFarm/backend/src/main/java/com/app/dao/OrderDaoImpl.java)
- [order-mapper.xml](d:/study/oneulFarm/backend/src/main/webapp/WEB-INF/mybatis/mapper/order-mapper.xml)

#### 프론트

구현 완료:

- 주문내역 탭 실제 API 연동
- 주문내역 필터/기간 조회 UI 및 API 연동
- 주문 상세 패널 실제 API 연동
- 주문 카드를 클릭하면 해당 카드 바로 아래에서 상세 열림
- 다시 클릭하면 닫히는 토글 동작 적용
- 첫 진입 시 주문 상세 자동 열림 제거

관련 파일:

- [AccountApp.js](d:/study/oneulFarm/frontend/src/AccountApp.js)
- [MyPageView.js](d:/study/oneulFarm/frontend/src/MyPageView.js)
- [OrderDetailPanel.js](d:/study/oneulFarm/frontend/src/OrderDetailPanel.js)

현재 상태:

- 주문 흐름은 실사용 가능한 수준으로 연결 완료

### 4.2 대시보드

#### 백엔드

구현 완료:

- `GET /api/dashboard/summary`
- `GET /api/dashboard/monthly-savings`
- `GET /api/dashboard/product-savings`
- `GET /api/dashboard/patterns`

집계 항목:

- 총 구매 횟수
- 총 구매 금액
- 누적 절약 금액
- 이번 달 절약 금액
- 월별 절약 금액
- 품목별 절약 분석
- 평균 구매 단가
- 절약률
- 최다 구매 품목
- 최근 구매 상품

처리한 문제:

- `dashboard-mapper.xml` XML 파싱 오류 수정
- 월별/패턴 API 404 및 미배포 이슈 정리

관련 파일:

- [DashboardController.java](d:/study/oneulFarm/backend/src/main/java/com/app/controller/DashboardController.java)
- [DashboardService.java](d:/study/oneulFarm/backend/src/main/java/com/app/service/DashboardService.java)
- [DashboardServiceImpl.java](d:/study/oneulFarm/backend/src/main/java/com/app/service/DashboardServiceImpl.java)
- [DashboardDao.java](d:/study/oneulFarm/backend/src/main/java/com/app/dao/DashboardDao.java)
- [DashboardDaoImpl.java](d:/study/oneulFarm/backend/src/main/java/com/app/dao/DashboardDaoImpl.java)
- [dashboard-mapper.xml](d:/study/oneulFarm/backend/src/main/webapp/WEB-INF/mybatis/mapper/dashboard-mapper.xml)

#### 프론트

구현 완료:

- 상단 KPI 카드 실제 데이터 연결
- 월별 절약 금액 차트 실제 데이터 연결
- 품목별 절약 분석 실제 데이터 연결
- 평균 구매 단가/절약률/최다 구매 품목/최근 구매 상품 실제 데이터 연결
- 로딩/빈 상태/에러 상태 기본 처리

처리한 문제:

- `averagePurchaseUnitPrice` undefined 오류 수정
  - `DashboardView`에 필요한 상세 props 누락 보완

관련 파일:

- [AccountApp.js](d:/study/oneulFarm/frontend/src/AccountApp.js)
- [DashboardView.js](d:/study/oneulFarm/frontend/src/DashboardView.js)
- [appUtils.js](d:/study/oneulFarm/frontend/src/appUtils.js)

현재 상태:

- 대시보드 영역은 더미 없이 실제 API 기준으로 동작

### 4.3 회원정보 / 상세 개인정보

#### 백엔드

구현 완료:

- `GET /api/users/me`
- `PATCH /api/users/me`
- `PATCH /api/users/me/password`
- `GET /api/users/check-email`
- `GET /api/users/check-nickname`

처리 내용:

- 회원 기본 정보 조회
- 닉네임/이메일/연락처 수정
- 현재 비밀번호 검증 후 새 비밀번호 변경
- 이메일/닉네임 중복 체크 API 제공

관련 파일:

- [UserController.java](d:/study/oneulFarm/backend/src/main/java/com/app/controller/UserController.java)
- [UserService.java](d:/study/oneulFarm/backend/src/main/java/com/app/service/UserService.java)
- [UserServiceImpl.java](d:/study/oneulFarm/backend/src/main/java/com/app/service/UserServiceImpl.java)
- [UserDao.java](d:/study/oneulFarm/backend/src/main/java/com/app/dao/UserDao.java)
- [UserDaoImpl.java](d:/study/oneulFarm/backend/src/main/java/com/app/dao/UserDaoImpl.java)
- [user-mapper.xml](d:/study/oneulFarm/backend/src/main/webapp/WEB-INF/mybatis/mapper/user-mapper.xml)

#### 프론트

진행 흐름:

1. 처음에는 수정 모달 방식으로 연결
2. 이후 상세 개인정보 페이지로 분리
3. 다시 여러 카드 구조가 복잡해서 항목별 인라인 편집 방식으로 리팩터링

현재 구조:

- 상세 개인정보 페이지 1개
- 한 리스트 안에서 정보 표시
- 수정 가능한 항목만 우측 `수정` 또는 `변경` 버튼 제공
- 닉네임/이메일/연락처는 인라인 편집
- 비밀번호는 같은 목록 안에서 인라인 변경

추가 적용:

- 회원번호 제거
- 상단 `@아이디`, 누적 절약 금액 배지 제거
- 비밀번호 변경 실패 메시지 상세화
- 이메일/닉네임 중복 확인 버튼 추가
- 중복 확인 없이 값 변경 저장 차단

관련 파일:

- [AccountApp.js](d:/study/oneulFarm/frontend/src/AccountApp.js)
- [MyPageView.js](d:/study/oneulFarm/frontend/src/MyPageView.js)
- [ProfileDetailView.js](d:/study/oneulFarm/frontend/src/ProfileDetailView.js)
- [account.css](d:/study/oneulFarm/frontend/src/styles/account.css)

현재 상태:

- 회원정보 수정 핵심 흐름 완료
- 추가 보강 대상은 성공/실패 메시지 통일 정도

### 4.4 배송지 관리

#### 백엔드

구현 완료:

- `GET /api/users/me/addresses`
- `POST /api/users/me/addresses`
- `PATCH /api/users/me/addresses/{addressNo}`
- `PATCH /api/users/me/addresses/{addressNo}/default`
- `DELETE /api/users/me/addresses/{addressNo}`

정책 반영:

- 배송지가 1개뿐이면 반드시 기본 배송지 유지
- 현재 기본 배송지를 일반 배송지로 바꾸는 수정 차단
- 기본 배송지 삭제 제한
- 생성/수정 요청 DTO를 [AddressRequestDto.java](d:/study/oneulFarm/backend/src/main/java/com/app/dto/AddressRequestDto.java) 하나로 통합

관련 파일:

- [AddressController.java](d:/study/oneulFarm/backend/src/main/java/com/app/controller/AddressController.java)
- [AddressService.java](d:/study/oneulFarm/backend/src/main/java/com/app/service/AddressService.java)
- [AddressServiceImpl.java](d:/study/oneulFarm/backend/src/main/java/com/app/service/AddressServiceImpl.java)
- [AddressDao.java](d:/study/oneulFarm/backend/src/main/java/com/app/dao/AddressDao.java)
- [AddressDaoImpl.java](d:/study/oneulFarm/backend/src/main/java/com/app/dao/AddressDaoImpl.java)
- [address-mapper.xml](d:/study/oneulFarm/backend/src/main/webapp/WEB-INF/mybatis/mapper/address-mapper.xml)

#### 프론트

구현 완료:

- 배송지 목록 조회
- 배송지 추가
- 배송지 수정
- 기본 배송지 변경
- 배송지 삭제
- 삭제 전 확인 창

UI/UX 개선:

- 목록 중심 모달 구조 적용
- 배송지 추가 시 목록을 숨기고 입력 모드로 전환
- 수정 모드 별도 처리
- 배송지 수가 늘어나도 모달을 뚫지 않도록 내부 스크롤 구조 고정
- 기본 배송지 카드를 테두리/배경으로 강조
- 삭제 버튼 빨간 스타일 적용
- 기본 배송지 체크 해제 시도 시 안내 메시지 및 차단
- 등록/수정 에러 메시지 세분화

관련 파일:

- [AccountApp.js](d:/study/oneulFarm/frontend/src/AccountApp.js)
- [AddressModal.js](d:/study/oneulFarm/frontend/src/AddressModal.js)
- [account.css](d:/study/oneulFarm/frontend/src/styles/account.css)

현재 상태:

- 배송지 관리 핵심 기능 완료
- 추후 보강 가능 항목은 문구 톤 정리 정도

## 5. DTO 및 구조 정리 메모

최근 정리한 내용:

- 배송지 생성/수정 요청 DTO 중복 제거
- [AddressRequestDto.java](d:/study/oneulFarm/backend/src/main/java/com/app/dto/AddressRequestDto.java) 로 통합
- Tomcat 배포본에 남아 있던 예전 주문 상세 분리 DTO 클래스 정리

판단 기준:

- 같은 테이블을 보더라도 역할이 다르면 분리 유지
- 생성/수정 요청처럼 필드와 검증이 같으면 통합

현재 상태:

- 배송지 요청 DTO는 통합 완료
- 주문 관련 DTO는 역할 차이에 따라 유지

## 6. 최근 수정 사항 상세 기록

### 2026-03-18

- `progress.md`를 UTF-8 기준으로 다시 작성
- `implementation_plan.md`를 UTF-8 기준으로 다시 작성
- `.editorconfig` 추가
- `.vscode/settings.json` 추가
- 저장 인코딩을 UTF-8 기준으로 고정
- `.gitattributes` 추가
- backend/frontend Eclipse 프로젝트 인코딩 설정 파일 추가
- VS Code 통합 터미널 기본 프로필도 UTF-8 PowerShell로 고정
- `order-mapper.xml` 비교 연산자 이스케이프 처리
- 배송지 삭제 확인 창 추가
- 이메일/닉네임 중복 체크 연결
- 배송지 기본값 해제 불가 규칙 적용
- 배송지 모달 스크롤 구조 고정
- 기본 배송지 카드 강조 적용
- 회원 탈퇴 API 및 상세 개인정보 탈퇴 섹션 추가
- 탈퇴 전용 DTO를 제거하고 `CurrentPasswordRequestDto` 공용 DTO로 통합
- 주문내역 배송 상태/기간 필터 기능 추가
- 주문 기능을 마이페이지에서 분리하는 방향으로 계정 화면 구조 리팩터링 시작
- 계정 화면 내부 로컬 내비게이션 추가
- 마이페이지는 요약 허브 중심으로 축소하고 주문관리 전용 페이지를 별도 구성
- 마이페이지 내부 중복 이동 버튼과 카드 섹션을 줄이고 프로필 중심 구조로 단순화
- 계정 내부 탭 순서를 마이페이지 우선 기준으로 재배치

## 7. 현재 남은 작업

### 7.1 실연동이 남은 영역

- 리뷰관리 목록/API 연동
- 찜한상품 목록/API 연동

### 7.2 기능 보강

- 회원정보 저장 성공/실패 메시지 통일
- 배송지 관련 문구 톤 정리
- 리뷰/찜을 현재 마이페이지 구조에 맞게 정리

### 7.3 문서/정리

- [implementation_plan.md](d:/study/oneulFarm/chl/implementation_plan.md) UTF-8 재정리
- 필요 시 DTO 사용 현황 별도 문서화

## 8. 배포 및 개발 중 주의 사항

### 8.1 소스와 Tomcat 배포본이 다름

이 프로젝트는 소스 파일을 고쳐도 Tomcat 실행본이 자동으로 완전히 맞지 않을 수 있다.
실행 중인 실제 파일은 보통 아래 경로에 있다.

`C:\Users\admin\eclipse-workspace\.metadata\.plugins\org.eclipse.wst.server.core\tmp0\wtpwebapps\backend`

주의할 점:

- 컨트롤러/서비스/DTO/매퍼 추가 후 Tomcat 재시작이 필요한 경우가 많다.
- 소스에는 없는데 배포본에는 남아 있는 구 클래스 때문에 이상한 오류가 날 수 있다.
- 배포본 `WEB-INF/classes`와 `WEB-INF/mybatis/mapper`를 필요 시 직접 확인해야 한다.

### 8.2 Java 버전

- Tomcat 런타임은 Java 21 기준
- 수동 컴파일 시 `--release 21`로 맞추지 않으면 `UnsupportedClassVersionError`가 날 수 있음

### 8.3 인코딩

- 앞으로 새 파일/수정 파일은 UTF-8 기준으로 관리
- PowerShell 콘솔 출력은 여전히 한글이 깨져 보일 수 있음
- 콘솔 출력이 깨져 보여도 파일 자체는 정상일 수 있으므로 IDE에서 다시 확인 필요
- 이미 깨진 파일은 변환보다 재작성하는 편이 안전함

## 9. 다음 작업 기준

현재 우선 후보:

1. 리뷰관리 실데이터 연동
2. 찜한상품 실데이터 연동
3. 회원정보/배송지 UX 보강

현재 대화 흐름상 다음 작업을 다시 잡을 때는 아래 기준으로 판단한다.

- 리뷰/상품이 본인 담당 범위인지 먼저 확인
- 담당 범위가 아니면 찜 또는 UX 보강보다 우선순위를 재조정
- 대시보드/마이페이지 메인 흐름은 이미 연결돼 있으므로, 다음부터는 미완료 영역을 닫는 작업 위주로 진행
