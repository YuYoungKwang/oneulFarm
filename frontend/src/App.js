import { useEffect, useState } from 'react';
import './App.css';

const pageTabs = [
  { id: 'dashboard', label: '대시보드' },
  { id: 'mypage', label: '마이페이지' },
];

const tabs = [
  { id: 'orders', label: '주문내역' },
  { id: 'wishlist', label: '찜한상품' },
  { id: 'reviews', label: '리뷰관리' },
];

const wishlist = [
  { name: '햇감자 1kg', price: 4200, avg: '평균가보다 12% 저렴', badge: '혜택 상품', emoji: '🥔' },
  { name: '제주 당근 1kg', price: 2500, avg: '이번 주 관심 상품', badge: '찜 유지', emoji: '🥕' },
  { name: '유선 양파 1kg', price: 3200, avg: '재입고 알림 설정', badge: '알림', emoji: '🧅' },
];

const writableReviews = [
  { name: '양파 1kg', orderId: 'TEST-ORDER-20260317-001', date: '2026.03.15', emoji: '🧅' },
];

const myReviews = [
  {
    name: '감자 1kg',
    rating: '★★★★★',
    content: '배송도 빠르고 상태가 깔끔해서 다음에도 다시 주문할 것 같습니다.',
    date: '2026.03.16',
    emoji: '🥔',
  },
];

const monthlySavings = [
  { month: '1월', value: 500 },
  { month: '2월', value: 2400 },
  { month: '3월', value: 2100 },
];

const productSavings = [
  { name: '감자 1kg', value: 3400 },
  { name: '양파 1kg', value: 1100 },
  { name: '당근 1kg', value: 500 },
];

const topProducts = [
  { name: '감자 1kg', quantity: '3개', saved: '3,400원 절약' },
  { name: '양파 1kg', quantity: '2개', saved: '1,100원 절약' },
  { name: '당근 1kg', quantity: '1개', saved: '500원 절약' },
];

const recentProducts = [
  { name: '당근 1kg', orderedAt: '2026.03.16', detail: '최근 주문 1순위' },
  { name: '감자 1kg', orderedAt: '2026.03.15', detail: '리뷰 작성 완료' },
  { name: '양파 1kg', orderedAt: '2026.03.15', detail: '리뷰 작성 가능' },
];

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '';
const ORDER_API_BASE = `${API_BASE_URL}/api/orders`;
const DASHBOARD_API_BASE = `${API_BASE_URL}/api/dashboard`;
const DEMO_USER_NO = '1';

function formatPrice(value) {
  return `${Number(value || 0).toLocaleString('ko-KR')}원`;
}

function formatDate(value) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function formatDateTime(value) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getMonthlyHeight(value) {
  const maxValue = Math.max(...monthlySavings.map((item) => item.value));
  return `${(value / maxValue) * 100}%`;
}

function getProductWidth(value) {
  const maxValue = Math.max(...productSavings.map((item) => item.value));
  return `${(value / maxValue) * 100}%`;
}

function getDeliveryBadgeClass(status) {
  if (status === 'DELIVERED') {
    return 'done';
  }
  return 'ready';
}

function getDeliveryLabel(status) {
  const labels = {
    READY: '배송준비',
    SHIPPING: '배송중',
    DELIVERED: '배송완료',
  };

  return labels[status] || status || '-';
}

function getOrderStats(orders) {
  return {
    totalCount: orders.length,
    shippingCount: orders.filter((order) => order.deliveryStatus === 'SHIPPING' || order.deliveryStatus === 'READY').length,
    deliveredCount: orders.filter((order) => order.deliveryStatus === 'DELIVERED').length,
    totalSavedAmount: orders.reduce((sum, order) => sum + Number(order.totalSavedAmount || 0), 0),
  };
}

function DashboardView({ onMoveToMypage, summary, summaryLoading }) {
  const totalSavedAmount = formatPrice(summary.totalSavedAmount);
  const monthlySavedAmount = formatPrice(summary.monthlySavedAmount);
  const totalOrderCount = `${Number(summary.totalOrderCount || 0)}건`;
  const totalPurchaseAmount = formatPrice(summary.totalPurchaseAmount);

  return (
    <>
      <section className="page-head">
        <div>
          <h1>대시보드</h1>
          <p>절약 금액과 소비 패턴을 한 화면으로 정리한 개인 대시보드입니다.</p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn-outline" onClick={onMoveToMypage}>마이페이지 이동</button>
          <button type="button" className="btn">이번 달 리포트</button>
        </div>
      </section>

      <div className="stats-grid">
        <article className="stat-card">
          <div className="stat-label">누적 절약 금액</div>
          <div className="stat-value">{summaryLoading ? '...' : totalSavedAmount}</div>
          <div className="section-sub">주문 시점 기준 누적 합계</div>
        </article>
        <article className="stat-card">
          <div className="stat-label">이번 달 절약 금액</div>
          <div className="stat-value">{summaryLoading ? '...' : monthlySavedAmount}</div>
          <div className="section-sub">2026년 3월 기준</div>
        </article>
        <article className="stat-card">
          <div className="stat-label">총 구매 횟수</div>
          <div className="stat-value">{summaryLoading ? '...' : totalOrderCount}</div>
          <div className="section-sub">완료 및 진행 주문 포함</div>
        </article>
        <article className="stat-card">
          <div className="stat-label">총 구매 금액</div>
          <div className="stat-value">{summaryLoading ? '...' : totalPurchaseAmount}</div>
          <div className="section-sub">최종 결제 금액 합계</div>
        </article>
      </div>

      <section className="section grid-2">
        <article className="card">
          <div className="card-title">월별 절약 금액</div>
          <div className="card-sub">세로 막대 차트로 월별 절약 흐름을 보여줍니다.</div>
          <div className="chart-shell">
            <div className="bar-chart">
              {monthlySavings.map((item) => (
                <div key={item.month} className="bar-chart__item">
                  <div className="bar-chart__track">
                    <div
                      className="bar-chart__fill"
                      style={{ height: getMonthlyHeight(item.value) }}
                    />
                  </div>
                  <strong>{formatPrice(item.value)}</strong>
                  <span>{item.month}</span>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="card">
          <div className="card-title">품목별 절약 분석</div>
          <div className="card-sub">가로 막대 차트로 어떤 품목에서 절약이 큰지 확인합니다.</div>
          <div className="compare-bars">
            {productSavings.map((item) => (
              <div key={item.name} className="compare-item">
                <strong>{item.name}</strong>
                <div className="bar">
                  <span style={{ width: getProductWidth(item.value), background: 'var(--green)' }} />
                </div>
                <span>{formatPrice(item.value)}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="section grid-2 dashboard-bottom">
        <div className="stack">
          <article className="card">
            <div className="card-title">평균 구매 단가</div>
            <div className="stat-value">3,166원</div>
            <div className="section-sub">주문상품 기준 평균 구매 단가</div>
          </article>
          <article className="card">
            <div className="card-title">절약률</div>
            <div className="stat-value">18.07%</div>
            <div className="section-sub">금액 기준 가중 평균 절약률</div>
          </article>
        </div>

        <div className="stack">
          <article className="card">
            <div className="card-title">최다 구매 품목</div>
            <div className="insight-list">
              {topProducts.map((item) => (
                <div key={item.name} className="insight-item">
                  <strong>{item.name}</strong>
                  <span>{item.quantity} · {item.saved}</span>
                </div>
              ))}
            </div>
          </article>
          <article className="card">
            <div className="card-title">최근 구매 상품</div>
            <div className="insight-list">
              {recentProducts.map((item) => (
                <div key={item.name} className="insight-item">
                  <strong>{item.name}</strong>
                  <span>{item.orderedAt} · {item.detail}</span>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>
    </>
  );
}

function OrderDetailPanel({ detail, loading, error }) {
  if (loading) {
    return <article className="card feedback-card">주문 상세를 불러오는 중입니다.</article>;
  }

  if (error) {
    return <article className="card feedback-card feedback-card--error">{error}</article>;
  }

  if (!detail) {
    return <article className="card feedback-card">주문 카드를 선택하면 상세 정보를 볼 수 있습니다.</article>;
  }

  return (
    <article className="card detail-shell">
      <div className="section-head">
        <div>
          <div className="section-title">주문 상세</div>
          <div className="section-sub">{detail.orderInfo.orderId} · {formatDateTime(detail.orderInfo.orderedAt)}</div>
        </div>
        <span className={`status-pill ${getDeliveryBadgeClass(detail.deliveryInfo.deliveryStatus)}`}>
          {getDeliveryLabel(detail.deliveryInfo.deliveryStatus)}
        </span>
      </div>

      <div className="detail-grid">
        <section className="detail-block">
          <h3>주문 정보</h3>
          <div className="detail-row"><strong>주문번호</strong><span>{detail.orderInfo.orderId}</span></div>
          <div className="detail-row"><strong>주문일시</strong><span>{formatDateTime(detail.orderInfo.orderedAt)}</span></div>
          <div className="detail-row"><strong>주문상태</strong><span>{detail.orderInfo.orderStatus}</span></div>
        </section>

        <section className="detail-block">
          <h3>배송 정보</h3>
          <div className="detail-row"><strong>수령인</strong><span>{detail.deliveryInfo.recipientName}</span></div>
          <div className="detail-row"><strong>연락처</strong><span>{detail.deliveryInfo.recipientPhone}</span></div>
          <div className="detail-row"><strong>주소</strong><span>{detail.deliveryInfo.zipCode} {detail.deliveryInfo.address1} {detail.deliveryInfo.address2}</span></div>
          <div className="detail-row"><strong>택배사</strong><span>{detail.deliveryInfo.courierName || '-'}</span></div>
          <div className="detail-row"><strong>송장번호</strong><span>{detail.deliveryInfo.trackingNo || '-'}</span></div>
        </section>

        <section className="detail-block">
          <h3>결제 정보</h3>
          <div className="detail-row"><strong>결제수단</strong><span>{detail.paymentInfo.paymentMethod || '-'}</span></div>
          <div className="detail-row"><strong>결제상태</strong><span>{detail.paymentInfo.paymentStatus || '-'}</span></div>
          <div className="detail-row"><strong>결제일시</strong><span>{formatDateTime(detail.paymentInfo.paidAt)}</span></div>
          <div className="detail-row"><strong>결제금액</strong><span>{formatPrice(detail.paymentInfo.paidAmount)}</span></div>
        </section>

        <section className="detail-block">
          <h3>금액 요약</h3>
          <div className="detail-row"><strong>총 상품 금액</strong><span>{formatPrice(detail.amountSummary.totalAmount)}</span></div>
          <div className="detail-row"><strong>할인 금액</strong><span>{formatPrice(detail.amountSummary.discountAmount)}</span></div>
          <div className="detail-row"><strong>배송비</strong><span>{formatPrice(detail.amountSummary.deliveryFee)}</span></div>
          <div className="detail-row"><strong>최종 결제 금액</strong><span>{formatPrice(detail.amountSummary.finalAmount)}</span></div>
          <div className="detail-row detail-row--accent"><strong>총 절약 금액</strong><span>{formatPrice(detail.amountSummary.totalSavedAmount)}</span></div>
        </section>
      </div>

      <section className="detail-items">
        <h3>주문 상품</h3>
        <div className="detail-item-list">
          {detail.items.map((item) => (
            <article key={item.orderItemNo} className="detail-item-card">
              <div className="detail-item-top">
                <strong>{item.productName}</strong>
                <span>{item.quantity}개</span>
              </div>
              <div className="detail-row"><strong>구매 단가</strong><span>{formatPrice(item.unitPrice)}</span></div>
              <div className="detail-row"><strong>소계</strong><span>{formatPrice(item.subtotal)}</span></div>
              <div className="detail-row"><strong>소매가</strong><span>{formatPrice(item.marketAvgPrice)}</span></div>
              <div className="detail-row"><strong>절약 금액</strong><span>{formatPrice(item.savedAmount)}</span></div>
              <div className="detail-row"><strong>절약률</strong><span>{Number(item.savingRate || 0).toFixed(2)}%</span></div>
              <div className="detail-actions">
                {item.reviewWritable && <button type="button" className="btn">리뷰 작성</button>}
                {!item.reviewWritable && item.reviewExists && <button type="button" className="btn-outline">리뷰 보기</button>}
                {!item.reviewWritable && !item.reviewExists && <span className="detail-hint">리뷰 작성 조건 미충족</span>}
              </div>
            </article>
          ))}
        </div>
      </section>
    </article>
  );
}

function MyPageView({
  activeTab,
  setActiveTab,
  orders,
  ordersLoading,
  ordersError,
  selectedOrderNo,
  orderDetail,
  detailLoading,
  detailError,
  onSelectOrder,
  summary,
  summaryLoading,
}) {
  const stats = getOrderStats(orders);

  return (
    <>
      <section className="page-head">
        <div>
          <h1>마이페이지</h1>
          <p>프로필 요약과 주문, 찜, 리뷰를 한 곳에서 관리하는 개인 화면입니다.</p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn-outline">회원정보 수정</button>
          <button type="button" className="btn">배송지 관리</button>
        </div>
      </section>

      <div className="stats-grid">
        <article className="stat-card">
          <div className="stat-label">누적 절약 금액</div>
          <div className="stat-value">{summaryLoading ? '...' : formatPrice(summary.totalSavedAmount)}</div>
          <div className="section-sub">주문 시점 기준 누적 합계</div>
        </article>
        <article className="stat-card">
          <div className="stat-label">총 주문 건수</div>
          <div className="stat-value">{summaryLoading ? '...' : `${Number(summary.totalOrderCount || 0)}건`}</div>
          <div className="section-sub">완료 및 진행 주문 포함</div>
        </article>
        <article className="stat-card">
          <div className="stat-label">기본 배송지</div>
          <div className="stat-value stat-value--compact">서울시 강남구</div>
          <div className="section-sub">테스트로 1, 101동 101호</div>
        </article>
        <article className="stat-card">
          <div className="stat-label">계정 정보</div>
          <div className="stat-value stat-value--compact">mypage01</div>
          <div className="section-sub">mypage01@test.com</div>
        </article>
      </div>

      <section className="section grid-2 mypage-intro">
        <article className="card profile-summary-card">
          <div className="profile-summary">
            <div className="profile-badge">MY</div>
            <div>
              <div className="card-title">마이페이지테스터</div>
              <div className="card-sub">@mypage01</div>
            </div>
          </div>

          <div className="insight-list">
            <div className="insight-item">
              <strong>이메일</strong>
              <span>mypage01@test.com</span>
            </div>
            <div className="insight-item">
              <strong>연락처</strong>
              <span>010-1111-2222</span>
            </div>
            <div className="insight-item">
              <strong>기본 배송지</strong>
              <span>서울시 강남구 테스트로 1, 101동 101호</span>
            </div>
          </div>
        </article>

        <article className="card">
          <div className="card-title">빠른 작업</div>
          <div className="card-sub">자주 여는 액션을 먼저 배치했습니다.</div>
          <div className="mini-recipes quick-actions-grid">
            <article className="mini-recipe">
              <div className="mini-thumb" />
              <h4>회원정보 수정</h4>
              <p>이메일, 연락처, 비밀번호 변경</p>
            </article>
            <article className="mini-recipe">
              <div className="mini-thumb" />
              <h4>배송지 관리</h4>
              <p>기본 배송지 변경 및 주소 관리</p>
            </article>
            <article className="mini-recipe">
              <div className="mini-thumb" />
              <h4>대시보드 이동</h4>
              <p>절약 금액과 소비 패턴 분석</p>
            </article>
          </div>
        </article>
      </section>

      <section className="section">
        <div className="tab-row">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {activeTab === 'orders' && (
        <>
          <div className="quick-grid">
            <article className="quick-card">
              <div className="quick-label">총 주문</div>
              <div className="quick-value">{stats.totalCount}건</div>
            </article>
            <article className="quick-card soft-yellow">
              <div className="quick-label">배송중</div>
              <div className="quick-value">{stats.shippingCount}건</div>
            </article>
            <article className="quick-card soft-green">
              <div className="quick-label">배송완료</div>
              <div className="quick-value">{stats.deliveredCount}건</div>
            </article>
            <article className="quick-card">
              <div className="quick-label">주문 목록 절약 합계</div>
              <div className="quick-value">{formatPrice(stats.totalSavedAmount)}</div>
            </article>
          </div>

          {ordersLoading && (
            <article className="card feedback-card">주문 목록을 불러오는 중입니다.</article>
          )}

          {!ordersLoading && ordersError && (
            <article className="card feedback-card feedback-card--error">{ordersError}</article>
          )}

          {!ordersLoading && !ordersError && orders.length === 0 && (
            <article className="card feedback-card">주문 내역이 없습니다.</article>
          )}

          {!ordersLoading && !ordersError && orders.length > 0 && (
            <>
              <section className="order-list">
                {orders.map((order) => (
                  <article
                    key={order.orderNo}
                    className={`order-card ${selectedOrderNo === order.orderNo ? 'is-selected' : ''}`}
                  >
                    <div className="order-top">
                      <div>
                        <div className="card-title order-title">주문번호 {order.orderId}</div>
                        <div className="section-sub">{formatDate(order.orderedAt)} 주문</div>
                      </div>
                      <span className={`status-pill ${getDeliveryBadgeClass(order.deliveryStatus)}`}>
                        {getDeliveryLabel(order.deliveryStatus)}
                      </span>
                    </div>

                    <div className="order-summary-grid">
                      <div className="order-summary-item">
                        <strong>대표 상품</strong>
                        <span>{order.displayProductName}</span>
                      </div>
                      <div className="order-summary-item">
                        <strong>상품 수</strong>
                        <span>{order.itemCount}건</span>
                      </div>
                      <div className="order-summary-item">
                        <strong>최종 결제금액</strong>
                        <span>{formatPrice(order.finalAmount)}</span>
                      </div>
                      <div className="order-summary-item">
                        <strong>총 절약금액</strong>
                        <span>{formatPrice(order.totalSavedAmount)}</span>
                      </div>
                    </div>

                    <div className="help-row">
                      <span>{order.orderStatus} · {getDeliveryLabel(order.deliveryStatus)}</span>
                      <button type="button" className="btn-outline" onClick={() => onSelectOrder(order.orderNo)}>
                        주문 상세 보기
                      </button>
                    </div>
                  </article>
                ))}
              </section>

              <section className="section">
                <OrderDetailPanel detail={orderDetail} loading={detailLoading} error={detailError} />
              </section>
            </>
          )}
        </>
      )}

      {activeTab === 'wishlist' && (
        <section className="section">
          <div className="section-head">
            <div>
              <div className="section-title">찜한 상품</div>
              <div className="section-sub">관심 상품을 다시 구매하기 쉽게 카드형으로 정리했습니다.</div>
            </div>
          </div>

          <div className="product-grid">
            {wishlist.map((item) => (
              <article key={item.name} className="product-card">
                <div className="product-media">
                  <span className="badge green">{item.badge}</span>
                  <div className="emoji">{item.emoji}</div>
                </div>
                <div className="product-name">{item.name}</div>
                <div className="price-row">
                  <div className="price">{formatPrice(item.price)}</div>
                  <div className="avg">{item.avg}</div>
                </div>
                <div className="product-foot">
                  <button type="button" className="btn">장바구니 담기</button>
                  <a href="/" className="btn-outline">상세</a>
                </div>
                <button type="button" className="btn line">찜 해제</button>
              </article>
            ))}
          </div>
        </section>
      )}

      {activeTab === 'reviews' && (
        <section className="section grid-2">
          <article className="card">
            <div className="card-title">작성 가능한 리뷰</div>
            <div className="insight-list">
              {writableReviews.map((review) => (
                <div key={review.name} className="insight-item insight-item--review">
                  <div className="thumb-mini">{review.emoji}</div>
                  <div>
                    <strong>{review.name}</strong>
                    <span>{review.orderId} / {review.date}</span>
                  </div>
                  <button type="button" className="btn">리뷰 작성</button>
                </div>
              ))}
            </div>
          </article>

          <article className="card">
            <div className="card-title">내가 작성한 리뷰</div>
            <div className="insight-list">
              {myReviews.map((review) => (
                <div key={review.name} className="insight-item insight-item--review">
                  <div className="thumb-mini">{review.emoji}</div>
                  <div>
                    <strong>{review.name}</strong>
                    <span>{review.rating} / {review.date}</span>
                    <div className="section-sub">{review.content}</div>
                  </div>
                  <div className="review-buttons">
                    <button type="button" className="btn-outline">수정</button>
                    <button type="button" className="btn line">삭제</button>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>
      )}
    </>
  );
}

function App() {
  const [currentPage, setCurrentPage] = useState('mypage');
  const [activeTab, setActiveTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState('');
  const [selectedOrderNo, setSelectedOrderNo] = useState(null);
  const [orderDetail, setOrderDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [summary, setSummary] = useState({
    totalSavedAmount: 0,
    monthlySavedAmount: 0,
    totalOrderCount: 0,
    totalPurchaseAmount: 0,
  });
  const [summaryLoading, setSummaryLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchOrders() {
      setOrdersLoading(true);
      setOrdersError('');

      try {
        const response = await fetch(`${ORDER_API_BASE}/me`, {
          headers: {
            'X-USER-NO': DEMO_USER_NO,
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error('주문 목록을 불러오지 못했습니다.');
        }

        const payload = await response.json();
        const nextOrders = Array.isArray(payload.data) ? payload.data : [];
        setOrders(nextOrders);
        if (nextOrders.length > 0) {
          setSelectedOrderNo((current) => current ?? nextOrders[0].orderNo);
        }
      } catch (error) {
        if (error.name === 'AbortError') {
          return;
        }
        setOrdersError(error.message || '주문 목록을 불러오지 못했습니다.');
      } finally {
        setOrdersLoading(false);
      }
    }

    fetchOrders();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchSummary() {
      setSummaryLoading(true);

      try {
        const response = await fetch(`${DASHBOARD_API_BASE}/summary`, {
          headers: {
            'X-USER-NO': DEMO_USER_NO,
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error('대시보드 요약을 불러오지 못했습니다.');
        }

        const payload = await response.json();
        if (payload.data) {
          setSummary(payload.data);
        }
      } catch (error) {
        if (error.name === 'AbortError') {
          return;
        }
      } finally {
        setSummaryLoading(false);
      }
    }

    fetchSummary();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!selectedOrderNo) {
      setOrderDetail(null);
      setDetailError('');
      return;
    }

    const controller = new AbortController();

    async function fetchOrderDetail() {
      setDetailLoading(true);
      setDetailError('');

      try {
        const response = await fetch(`${ORDER_API_BASE}/me/${selectedOrderNo}`, {
          headers: {
            'X-USER-NO': DEMO_USER_NO,
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error('주문 상세를 불러오지 못했습니다.');
        }

        const payload = await response.json();
        setOrderDetail(payload.data || null);
      } catch (error) {
        if (error.name === 'AbortError') {
          return;
        }
        setOrderDetail(null);
        setDetailError(error.message || '주문 상세를 불러오지 못했습니다.');
      } finally {
        setDetailLoading(false);
      }
    }

    fetchOrderDetail();

    return () => controller.abort();
  }, [selectedOrderNo]);

  return (
    <div className="page-shell">
      <header className="top-nav">
        <button type="button" className="logo logo-button" onClick={() => setCurrentPage('mypage')}>
          <span className="logo-mark" />
          <span>oneulFarm</span>
        </button>

        <nav className="nav-links">
          <a className="nav-link" href="/">메인</a>
          <a className="nav-link" href="/">시세분석</a>
          <a className="nav-link" href="/">상품</a>
          <a className="nav-link" href="/">레시피</a>
          {pageTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`nav-link nav-link-button ${currentPage === tab.id ? 'is-active' : ''}`}
              onClick={() => setCurrentPage(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="nav-actions">
          <button type="button" className="icon-btn" aria-label="검색">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
          </button>
          <button type="button" className="icon-btn" aria-label="알림">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
              <path d="M15 17H5l1.4-1.6A2 2 0 0 0 7 14V10a5 5 0 1 1 10 0v4a2 2 0 0 0 .6 1.4L19 17h-4" />
              <path d="M10 19a2 2 0 0 0 4 0" />
            </svg>
          </button>
          <a className="btn-outline" href="/">로그아웃</a>
        </div>
      </header>

      <main className="container">
        {currentPage === 'mypage' ? (
          <MyPageView
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            orders={orders}
            ordersLoading={ordersLoading}
            ordersError={ordersError}
            selectedOrderNo={selectedOrderNo}
            orderDetail={orderDetail}
            detailLoading={detailLoading}
            detailError={detailError}
            onSelectOrder={setSelectedOrderNo}
            summary={summary}
            summaryLoading={summaryLoading}
          />
        ) : (
          <DashboardView
            onMoveToMypage={() => setCurrentPage('mypage')}
            summary={summary}
            summaryLoading={summaryLoading}
          />
        )}
      </main>

      <footer className="site-footer">
        <div className="footer-links">
          <a href="/">개인정보처리방침</a>
          <a href="/">이용약관</a>
          <a href="/">고객센터</a>
        </div>
        <div>© 2026 oneulFarm. All rights reserved.</div>
      </footer>
    </div>
  );
}

export default App;
