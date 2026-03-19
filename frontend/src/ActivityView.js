import { myPageTabs, wishlist, writableReviews, myReviews } from './mockData';
import { formatPrice } from './appUtils';

function ActivityView({ activeTab, setActiveTab }) {
  return (
    <>
      <section className="page-head">
        <div>
          <h1>관심 활동</h1>
          <p>찜한 상품과 리뷰처럼 상품 콘텐츠와 연결되는 활동을 모아서 보는 화면입니다.</p>
        </div>
      </section>

      <section className="section">
        <div className="mypage-section-header mypage-section-header--activity">
          <div>
            <span className="badge green">콘텐츠 영역</span>
            <div className="mypage-section-header__title">관심 활동</div>
            <div className="section-sub">
              관리 기능과 섞이지 않도록 찜과 리뷰를 별도 탭으로 분리했습니다.
            </div>
          </div>
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
        </div>

        <div className="activity-panel-surface">
          {activeTab === 'wishlist' && (
            <section className="activity-panel-block">
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
            <section className="activity-panel-block review-stack">
              <article className="card review-panel">
                <div className="section-head">
                  <div>
                    <div className="card-title">작성 가능한 리뷰</div>
                    <div className="section-sub">
                      주문 상품과의 실제 연동 전까지는 준비 상태로 유지됩니다.
                    </div>
                  </div>
                  <span className="badge green">연동 예정</span>
                </div>

                <div className="review-card-list">
                  {writableReviews.map((review) => (
                    <article key={`${review.orderId}-${review.name}`} className="review-card review-card--draft">
                      <div className="review-card__media">
                        <div className="thumb-mini">{review.emoji}</div>
                      </div>
                      <div className="review-card__body">
                        <div className="review-card__top">
                          <div>
                            <div className="review-card__title">{review.name}</div>
                            <div className="review-card__meta">{review.orderId} · {review.date}</div>
                          </div>
                          <span className="review-status review-status--draft">리뷰 작성 가능</span>
                        </div>
                        <p className="review-card__text">
                          상품 상태와 만족도를 기록할 수 있도록 리뷰 작성 흐름을 준비 중입니다.
                        </p>
                      </div>
                      <div className="review-card__actions">
                        <button type="button" className="btn btn-disabled" disabled>
                          리뷰 작성 예정
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </article>

              <article className="card review-panel">
                <div className="section-head">
                  <div>
                    <div className="card-title">내가 작성한 리뷰</div>
                    <div className="section-sub">
                      리뷰 기능과 상품 화면을 정리하면 실제 데이터로 교체됩니다.
                    </div>
                  </div>
                  <span className="badge green">연동 예정</span>
                </div>

                <div className="review-card-list">
                  {myReviews.map((review) => (
                    <article key={`${review.name}-${review.date}`} className="review-card review-card--published">
                      <div className="review-card__media">
                        <div className="thumb-mini">{review.emoji}</div>
                      </div>
                      <div className="review-card__body">
                        <div className="review-card__top">
                          <div>
                            <div className="review-card__title">{review.name}</div>
                            <div className="review-card__meta">{review.date}</div>
                          </div>
                          <span className="review-status review-status--published">작성 완료</span>
                        </div>
                        <div className="review-rating">{review.rating}</div>
                        <div className="review-quote">{review.content}</div>
                      </div>
                      <div className="review-card__actions review-card__actions--stacked">
                        <button type="button" className="btn-outline btn-disabled" disabled>수정 예정</button>
                        <button type="button" className="btn line btn-disabled" disabled>삭제 예정</button>
                      </div>
                    </article>
                  ))}
                </div>
              </article>
            </section>
          )}
        </div>
      </section>
    </>
  );
}

export default ActivityView;
