import { tabs, wishlist, writableReviews, myReviews } from './mockData';
import {
  formatDate,
  formatPrice,
  getDeliveryBadgeClass,
  getDeliveryLabel,
  getOrderStats,
  getProfileInitials,
} from './appUtils';
import OrderDetailPanel from './OrderDetailPanel';

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
  profile,
  profileLoading,
  profileError,
  onOpenProfileEdit,
  onOpenAddressModal,
}) {
  const stats = getOrderStats(orders);
  const accountLabel = profile.userId || 'mypage01';
  const emailLabel = profile.email || '-';
  const phoneLabel = profile.phone || '-';
  const defaultAddressLabel = profile.defaultAddress || '등록된 기본 배송지가 없습니다.';
  const profileName = profile.nickname || '마이페이지 사용자';

  return (
    <>
      <section className="page-head">
        <div>
          <h1>마이페이지</h1>
          <p>프로필 요약과 주문, 찜, 리뷰를 한 곳에서 관리하는 개인 화면입니다.</p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn-outline" onClick={onOpenProfileEdit}>회원정보 수정</button>
          <button type="button" className="btn" onClick={onOpenAddressModal}>배송지 관리</button>
        </div>
      </section>

      {profileError && <article className="card feedback-card feedback-card--error">{profileError}</article>}

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
          <div className="stat-value stat-value--compact">{profileLoading ? '...' : '기본 배송지'}</div>
          <div className="section-sub">{profileLoading ? '불러오는 중...' : defaultAddressLabel}</div>
        </article>
        <article className="stat-card">
          <div className="stat-label">계정 정보</div>
          <div className="stat-value stat-value--compact">{profileLoading ? '...' : accountLabel}</div>
          <div className="section-sub">{profileLoading ? '불러오는 중...' : emailLabel}</div>
        </article>
      </div>

      <section className="section grid-2 mypage-intro">
        <article className="card profile-summary-card">
          <div className="profile-summary">
            <div className="profile-badge">{getProfileInitials(profile)}</div>
            <div>
              <div className="card-title">{profileLoading ? '불러오는 중...' : profileName}</div>
              <div className="card-sub">@{accountLabel}</div>
            </div>
          </div>

          <div className="insight-list">
            <div className="insight-item">
              <strong>이메일</strong>
              <span>{profileLoading ? '불러오는 중...' : emailLabel}</span>
            </div>
            <div className="insight-item">
              <strong>연락처</strong>
              <span>{profileLoading ? '불러오는 중...' : phoneLabel}</span>
            </div>
            <div className="insight-item">
              <strong>기본 배송지</strong>
              <span>{profileLoading ? '불러오는 중...' : defaultAddressLabel}</span>
            </div>
          </div>
        </article>

        <article className="card">
          <div className="card-title">빠른 작업</div>
          <div className="card-sub">자주 쓰는 액션을 먼저 배치했습니다.</div>
          <div className="mini-recipes quick-actions-grid">
            <article className="mini-recipe">
              <div className="mini-thumb" />
              <h4>회원정보 수정</h4>
              <p>이메일, 연락처, 닉네임을 바로 수정합니다.</p>
              <button type="button" className="btn-text" onClick={onOpenProfileEdit}>바로 수정</button>
            </article>
            <article className="mini-recipe">
              <div className="mini-thumb" />
              <h4>배송지 관리</h4>
              <p>기본 배송지 변경과 주소 추가를 관리합니다.</p>
              <button type="button" className="btn-text" onClick={onOpenAddressModal}>배송지 보기</button>
            </article>
            <article className="mini-recipe">
              <div className="mini-thumb" />
              <h4>대시보드 이동</h4>
              <p>절약 금액과 소비 패턴 분석을 확인합니다.</p>
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

          {ordersLoading && <article className="card feedback-card">주문 목록을 불러오는 중입니다.</article>}
          {!ordersLoading && ordersError && <article className="card feedback-card feedback-card--error">{ordersError}</article>}
          {!ordersLoading && !ordersError && orders.length === 0 && <article className="card feedback-card">주문 내역이 없습니다.</article>}

          {!ordersLoading && !ordersError && orders.length > 0 && (
            <section className="order-list">
              {orders.map((order) => (
                <div key={order.orderNo} className="order-list-entry">
                  <article className={`order-card ${selectedOrderNo === order.orderNo ? 'is-selected' : ''}`}>
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

                  {selectedOrderNo === order.orderNo && (
                    <OrderDetailPanel detail={orderDetail} loading={detailLoading} error={detailError} />
                  )}
                </div>
              ))}
            </section>
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

export default MyPageView;
