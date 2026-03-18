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
  const totalSavedAmountLabel = formatPrice(profile.totalSavedAmount);

  return (
    <>
      <section className="page-head">
        <div>
          <h1>마이페이지</h1>
          <p>개인 정보와 배송지, 최근 주문 상태를 한 화면에서 확인하는 개인 허브입니다.</p>
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
              <button type="button" className="btn-outline" onClick={onOpenProfileDetail}>
                상세 개인정보
              </button>
              <button type="button" className="btn" onClick={onOpenAddressModal}>
                배송지 관리
              </button>
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
              <strong>최근 주문일</strong>
              <span>{recentOrder ? formatDate(recentOrder.orderedAt) : '주문 없음'}</span>
            </div>
          </div>

          <div className="savings-highlight">
            <div className="savings-highlight__label">누적 절약 금액</div>
            <div className="savings-highlight__value">{profileLoading ? '불러오는 중...' : totalSavedAmountLabel}</div>
            <div className="savings-highlight__sub">오늘의농장에서 시장 평균가 대비 아낀 금액입니다.</div>
          </div>

          {recentOrder ? (
            <div className="mypage-recent-order">
              <div className="mypage-recent-order__label">최근 주문</div>
              <div className="mypage-recent-order__content">
                <strong>{recentOrder.displayProductName}</strong>
                <span>{recentOrder.orderId} · {formatDate(recentOrder.orderedAt)}</span>
                <span className={`status-pill ${getDeliveryBadgeClass(recentOrder.deliveryStatus)}`}>
                  {getDeliveryLabel(recentOrder.deliveryStatus)}
                </span>
                <span>결제 {formatPrice(recentOrder.finalAmount)}</span>
                <span className="mypage-recent-order__saving">절약 {formatPrice(recentOrder.totalSavedAmount)}</span>
              </div>
            </div>
          ) : (
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
              <div className="section-sub">
                상품 화면과의 실제 연동 전까지는 미리보기 형태로만 제공합니다.
              </div>
            </div>
            <span className="badge green">연동 예정</span>
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
                  <button type="button" className="btn btn-disabled" disabled>
                    장바구니 연동 예정
                  </button>
                  <a href="#/products" className="btn-outline">상품 보러가기</a>
                </div>
                <button type="button" className="btn line btn-disabled" disabled>
                  찜 해제 연동 예정
                </button>
              </article>
            ))}
          </div>
        </section>
      )}

      {activeTab === 'reviews' && (
        <section className="section grid-2">
          <article className="card">
            <div className="section-head">
              <div>
                <div className="card-title">작성 가능한 리뷰</div>
                <div className="section-sub">
                  주문 상품과의 실제 연동 전까지는 준비 상태로 유지합니다.
                </div>
              </div>
              <span className="badge green">연동 예정</span>
            </div>
            <div className="insight-list">
              {writableReviews.map((review) => (
                <div key={review.name} className="insight-item insight-item--review">
                  <div className="thumb-mini">{review.emoji}</div>
                  <div>
                    <strong>{review.name}</strong>
                    <span>{review.orderId} / {review.date}</span>
                  </div>
                  <button type="button" className="btn btn-disabled" disabled>
                    리뷰 작성 예정
                  </button>
                </div>
              ))}
            </div>
          </article>

          <article className="card">
            <div className="section-head">
              <div>
                <div className="card-title">내가 작성한 리뷰</div>
                <div className="section-sub">
                  리뷰 기능과 상품 화면이 정리되면 실제 데이터로 교체됩니다.
                </div>
              </div>
              <span className="badge green">연동 예정</span>
            </div>
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
                    <button type="button" className="btn-outline btn-disabled" disabled>수정 예정</button>
                    <button type="button" className="btn line btn-disabled" disabled>삭제 예정</button>
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
