import { myPageTabs, wishlist, writableReviews, myReviews } from './mockData';
import {
  formatDate,
  formatPrice,
  getDeliveryBadgeClass,
  getDeliveryLabel,
  getProfileInitials,
} from './appUtils';

function MyPageView({
  activeTab,
  setActiveTab,
  orders,
  profile,
  profileLoading,
  profileError,
  onOpenProfileDetail,
  onOpenAddressModal,
}) {
  const recentOrder = orders[0] || null;
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
          <p>개인 정보와 주소, 최근 주문 흐름을 한눈에 확인하는 요약 허브 화면입니다.</p>
        </div>
      </section>

      {profileError && <article className="card feedback-card feedback-card--error">{profileError}</article>}

      <section className="section">
        <article className="card profile-summary-card profile-summary-card--single">
          <div className="profile-summary profile-summary--spread">
            <div className="profile-summary__identity">
              <div className="profile-badge">{getProfileInitials(profile)}</div>
              <div>
                <div className="card-title">{profileLoading ? '불러오는 중...' : profileName}</div>
                <div className="card-sub">@{accountLabel}</div>
              </div>
            </div>
            <div className="profile-summary__actions">
              <button type="button" className="btn-outline" onClick={onOpenProfileDetail}>상세 개인정보</button>
              <button type="button" className="btn" onClick={onOpenAddressModal}>배송지 관리</button>
            </div>
          </div>

          <div className="profile-summary-grid">
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
            <div className="insight-item">
              <strong>최근 주문 상태</strong>
              <span>{recentOrder ? getDeliveryLabel(recentOrder.deliveryStatus) : '주문 없음'}</span>
            </div>
          </div>
          {recentOrder && (
            <div className="mypage-recent-order">
              <div className="mypage-recent-order__label">최근 주문</div>
              <div className="mypage-recent-order__content">
                <strong>{recentOrder.displayProductName}</strong>
                <span>{recentOrder.orderId} · {formatDate(recentOrder.orderedAt)}</span>
                <span className={`status-pill ${getDeliveryBadgeClass(recentOrder.deliveryStatus)}`}>
                  {getDeliveryLabel(recentOrder.deliveryStatus)}
                </span>
                <span>결제 {formatPrice(recentOrder.finalAmount)}</span>
              </div>
            </div>
          )}
          {!recentOrder && (
            <div className="mypage-recent-order mypage-recent-order--empty">
              <div className="mypage-recent-order__label">최근 주문</div>
              <div className="section-sub">아직 주문 내역이 없습니다.</div>
            </div>
          )}
        </article>
      </section>

      <section className="section">
        <div className="tab-row">
          {myPageTabs.map((tab) => (
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

      {activeTab === 'wishlist' && (
        <section className="section">
          <div className="section-head">
            <div>
              <div className="section-title">찜한 상품</div>
              <div className="section-sub">현재는 계정 화면 전용 데모 데이터로 구성되어 있습니다.</div>
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
                  <a href="#/products" className="btn-outline">상세</a>
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
