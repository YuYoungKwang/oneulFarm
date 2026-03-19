import { formatDate, formatPrice } from './appUtils';

const myPageTabs = [
  { id: 'wishlist', label: '찜한 상품' },
  { id: 'reviews', label: '리뷰 관리' },
];

function renderStars(rating) {
  const safeRating = Math.max(1, Math.min(5, Number(rating || 5)));
  return '★'.repeat(safeRating) + '☆'.repeat(5 - safeRating);
}

function ActivityView({
  activeTab,
  setActiveTab,
  wishlistItems,
  wishlistLoading,
  wishlistError,
  wishlistActionProductNo,
  onAddWishlistItemToCart,
  onRemoveWishlistItem,
  writableReviews,
  myReviews,
  reviewsLoading,
  reviewsError,
  reviewEditor,
  reviewForm,
  reviewFormError,
  reviewSubmitting,
  deletingReviewNo,
  onStartCreateReview,
  onStartEditReview,
  onCancelReviewEditor,
  onReviewFormChange,
  onReviewSubmit,
  onDeleteReview,
}) {
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
              찜한 상품은 상품 화면과 같은 기준으로, 리뷰 관리는 실제 주문/리뷰 데이터 기준으로 연결했습니다.
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
                    상품 화면에서 찜한 상품을 그대로 불러오고, 여기서 바로 장바구니 담기와 찜 해제가 가능합니다.
                  </div>
                </div>
                <span className="badge green">실데이터 연동</span>
              </div>

              {wishlistLoading && (
                <article className="card feedback-card">찜한 상품을 불러오는 중입니다.</article>
              )}
              {!wishlistLoading && wishlistError && (
                <article className="card feedback-card feedback-card--error">{wishlistError}</article>
              )}
              {!wishlistLoading && !wishlistError && wishlistItems.length === 0 && (
                <article className="card feedback-card">찜한 상품이 없습니다.</article>
              )}

              {!wishlistLoading && !wishlistError && wishlistItems.length > 0 && (
                <div className="product-grid">
                  {wishlistItems.map((item) => (
                    <article key={item.productNo} className="product-card">
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
                        <button
                          type="button"
                          className="btn"
                          onClick={() => onAddWishlistItemToCart(item.productNo)}
                          disabled={wishlistActionProductNo === item.productNo}
                        >
                          {wishlistActionProductNo === item.productNo ? '담는 중...' : '장바구니 담기'}
                        </button>
                        <a href={`#/products/${item.productNo}`} className="btn-outline">상품 보러가기</a>
                      </div>
                      <button
                        type="button"
                        className="btn line"
                        onClick={() => onRemoveWishlistItem(item.productNo)}
                      >
                        찜 해제
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeTab === 'reviews' && (
            <section className="activity-panel-block review-stack">
              {reviewEditor && (
                <article className="card review-editor-card">
                  <div className="section-head">
                    <div>
                      <div className="card-title">
                        {reviewEditor.mode === 'edit' ? '리뷰 수정' : '리뷰 작성'}
                      </div>
                      <div className="section-sub">
                        {reviewEditor.productName}
                        {reviewEditor.orderId ? ` · ${reviewEditor.orderId}` : ''}
                      </div>
                    </div>
                    <button type="button" className="btn-outline" onClick={onCancelReviewEditor}>
                      닫기
                    </button>
                  </div>

                  <form className="review-editor-form" onSubmit={onReviewSubmit}>
                    <label className="form-field">
                      <span>별점</span>
                      <select name="rating" value={reviewForm.rating} onChange={onReviewFormChange}>
                        {[5, 4, 3, 2, 1].map((rating) => (
                          <option key={rating} value={rating}>
                            {rating}점
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="form-field">
                      <span>리뷰 내용</span>
                      <textarea
                        name="content"
                        value={reviewForm.content}
                        onChange={onReviewFormChange}
                        rows={5}
                        placeholder="상품 상태, 가격 만족도, 재구매 의사 등을 자유롭게 남겨 주세요."
                      />
                    </label>
                    {reviewFormError && <div className="form-error">{reviewFormError}</div>}
                    <div className="review-editor-actions">
                      <button type="button" className="btn-outline" onClick={onCancelReviewEditor}>
                        취소
                      </button>
                      <button type="submit" className="btn" disabled={reviewSubmitting}>
                        {reviewSubmitting
                          ? (reviewEditor.mode === 'edit' ? '수정 중...' : '작성 중...')
                          : (reviewEditor.mode === 'edit' ? '리뷰 수정' : '리뷰 등록')}
                      </button>
                    </div>
                  </form>
                </article>
              )}

              {reviewsLoading && (
                <article className="card feedback-card">리뷰 데이터를 불러오는 중입니다.</article>
              )}
              {!reviewsLoading && reviewsError && (
                <article className="card feedback-card feedback-card--error">{reviewsError}</article>
              )}

              {!reviewsLoading && !reviewsError && (
                <>
                  <article className="card review-panel">
                    <div className="section-head">
                      <div>
                        <div className="card-title">작성 가능한 리뷰</div>
                        <div className="section-sub">
                          배송 완료된 주문 상품 중 아직 리뷰를 작성하지 않은 항목입니다.
                        </div>
                      </div>
                      <span className="badge green">{writableReviews.length}건</span>
                    </div>

                    {writableReviews.length === 0 ? (
                      <article className="feedback-card">작성 가능한 리뷰가 없습니다.</article>
                    ) : (
                      <div className="review-card-list">
                        {writableReviews.map((review) => (
                          <article key={review.orderItemNo} className="review-card review-card--draft">
                            <div className="review-card__media">
                              <div className="thumb-mini">📝</div>
                            </div>
                            <div className="review-card__body">
                              <div className="review-card__top">
                                <div>
                                  <div className="review-card__title">{review.productName}</div>
                                  <div className="review-card__meta">
                                    {review.orderId} · {formatDate(review.orderedAt)}
                                  </div>
                                </div>
                                <span className="review-status review-status--draft">리뷰 작성 가능</span>
                              </div>
                              <p className="review-card__text">
                                상품 만족도와 실제 받은 상태를 남기면 상품 상세 리뷰에도 함께 반영됩니다.
                              </p>
                            </div>
                            <div className="review-card__actions">
                              <button type="button" className="btn" onClick={() => onStartCreateReview(review)}>
                                리뷰 작성
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </article>

                  <article className="card review-panel">
                    <div className="section-head">
                      <div>
                        <div className="card-title">내가 작성한 리뷰</div>
                        <div className="section-sub">
                          작성한 리뷰를 수정하거나 삭제할 수 있습니다.
                        </div>
                      </div>
                      <span className="badge green">{myReviews.length}건</span>
                    </div>

                    {myReviews.length === 0 ? (
                      <article className="feedback-card">작성한 리뷰가 없습니다.</article>
                    ) : (
                      <div className="review-card-list">
                        {myReviews.map((review) => (
                          <article key={review.reviewNo} className="review-card review-card--published">
                            <div className="review-card__media">
                              <div className="thumb-mini">⭐</div>
                            </div>
                            <div className="review-card__body">
                              <div className="review-card__top">
                                <div>
                                  <div className="review-card__title">{review.productName}</div>
                                  <div className="review-card__meta">
                                    {review.orderId} · {formatDate(review.createdAt)}
                                  </div>
                                </div>
                                <span className="review-status review-status--published">작성 완료</span>
                              </div>
                              <div className="review-rating">{renderStars(review.rating)}</div>
                              <div className="review-quote">{review.content}</div>
                            </div>
                            <div className="review-card__actions review-card__actions--stacked">
                              <button type="button" className="btn-outline" onClick={() => onStartEditReview(review)}>
                                수정
                              </button>
                              <button
                                type="button"
                                className="btn line"
                                onClick={() => onDeleteReview(review.reviewNo)}
                                disabled={deletingReviewNo === review.reviewNo}
                              >
                                {deletingReviewNo === review.reviewNo ? '삭제 중...' : '삭제'}
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </article>
                </>
              )}
            </section>
          )}
        </div>
      </section>
    </>
  );
}

export default ActivityView;
