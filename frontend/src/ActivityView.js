import { useEffect, useRef } from 'react';
import { formatDate, formatPrice } from './appUtils';
import InlineInfoTip from './components/InlineInfoTip';

const myPageTabs = [
  { id: 'wishlist', label: '찜한 상품' },
  { id: 'reviews', label: '리뷰 관리' },
];

function renderStars(rating) {
  const safeRating = Math.max(1, Math.min(5, Number(rating || 5)));
  return '★'.repeat(safeRating) + '☆'.repeat(5 - safeRating);
}

function getProductImageSrc(imageNo) {
  return imageNo ? `/backend/api/image/product/${imageNo}` : '';
}

function getReviewDisplayImageSrc(review) {
  if (review?.reviewImageNo) {
    return `/backend/api/image/review/${review.reviewImageNo}`;
  }

  return getProductImageSrc(review?.imageNo);
}

function getReviewEditorImageSrc(reviewEditor, reviewForm) {
  if (!reviewEditor) {
    return '';
  }

  if (reviewForm?.imageFile) {
    return URL.createObjectURL(reviewForm.imageFile);
  }

  if (reviewForm?.removeImage) {
    return '';
  }

  if (reviewEditor.reviewImageNo) {
    return `/backend/api/image/review/${reviewEditor.reviewImageNo}`;
  }

  return '';
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
  onReviewImageChange,
  onRemoveReviewImage,
  onReviewSubmit,
  onDeleteReview,
}) {
  const reviewEditorRef = useRef(null);
  const reviewPreviewUrl = getReviewEditorImageSrc(reviewEditor, reviewForm);

  useEffect(() => {
    if (!reviewEditor || !reviewEditorRef.current) {
      return;
    }

    const fixedHeaderOffset = 132;
    const top = reviewEditorRef.current.getBoundingClientRect().top + window.scrollY - fixedHeaderOffset;

    window.scrollTo({
      top: Math.max(top, 0),
      behavior: 'smooth',
    });
  }, [reviewEditor]);

  useEffect(() => {
    if (!reviewForm?.imageFile || !reviewPreviewUrl.startsWith('blob:')) {
      return undefined;
    }

    return () => {
      URL.revokeObjectURL(reviewPreviewUrl);
    };
  }, [reviewForm?.imageFile, reviewPreviewUrl]);

  return (
    <>
      <section className="page-head">
        <div>
          <div className="page-title-row">
            <h1>내 활동</h1>
            <InlineInfoTip content="찜한 상품과 리뷰처럼 상품 탐색 이후의 활동을 한곳에서 관리할 수 있습니다." />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="mypage-section-header mypage-section-header--activity">
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
                  <div className="section-title-row">
                    <div className="section-title">찜한 상품</div>
                    <InlineInfoTip content="상품 화면에서 찜한 항목을 모아 보고, 장바구니 담기나 상품 상세 이동으로 이어갈 수 있습니다." />
                  </div>
                </div>
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
                <div className="wishlist-list">
                  {wishlistItems.map((item) => (
                    <article key={item.productNo} className="wishlist-card">
                      <a href={`#/products/${item.productNo}`} className="wishlist-card__media wishlist-product-link-media">
                        {item.imageUrl ? (
                          <img className="wishlist-product-thumb" src={item.imageUrl} alt={item.name} />
                        ) : (
                          <div className="emoji">{item.emoji}</div>
                        )}
                      </a>
                      <a href={`#/products/${item.productNo}`} className="product-name wishlist-product-link">
                        {item.name}
                      </a>
                      <div className="price-row">
                        <div className="wishlist-price-block">
                          <div className="wishlist-price-label">현재가</div>
                          <div className="price">{formatPrice(item.price)}</div>
                        </div>
                        {item.savingRate > 0 ? (
                          <div className="wishlist-saving-rate" aria-label={`절약률 ${item.savingRate}%`}>
                            <span className="wishlist-saving-rate__arrow">↓</span>
                            <strong>{item.savingRate}%</strong>
                            <span>절약</span>
                          </div>
                        ) : (
                          <div className="avg">{item.avg}</div>
                        )}
                      </div>
                      <div className="product-foot">
                        <button
                          type="button"
                          className="btn"
                          onClick={() => onAddWishlistItemToCart(item.productNo)}
                          disabled={wishlistActionProductNo === item.productNo}
                        >
                          {wishlistActionProductNo === item.productNo ? '담는 중..' : '장바구니 담기'}
                        </button>
                        <a href={`#/products/${item.productNo}`} className="btn-outline">
                          상품 보러가기
                        </a>
                      </div>
                      <button
                        type="button"
                        className="btn-outline wishlist-remove-btn"
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
                <article ref={reviewEditorRef} className="card review-editor-card">
                  <div className="section-head">
                    <div>
                      <div className="section-title-row">
                        <div className="card-title">{reviewEditor.mode === 'edit' ? '리뷰 수정' : '리뷰 작성'}</div>
                        <InlineInfoTip content="별점과 내용을 바꾸고, 리뷰 사진도 새로 올리거나 제거할 수 있습니다." />
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
                        placeholder="상품 상태, 가격 만족도, 다시 구매하고 싶은 이유를 자유롭게 적어 주세요."
                      />
                    </label>
                    <div className="review-image-editor">
                      <div className="review-image-editor__label">리뷰 사진</div>
                      <div className="review-image-editor__body">
                        {reviewPreviewUrl ? (
                          <img
                            className="review-image-editor__preview"
                            src={reviewPreviewUrl}
                            alt={reviewEditor.productName}
                          />
                        ) : (
                          <div className="review-image-editor__placeholder">사진 없음</div>
                        )}
                        <div className="review-image-editor__controls">
                          <label className="btn-outline review-image-editor__file">
                            <input type="file" accept="image/*" onChange={onReviewImageChange} />
                            사진 선택
                          </label>
                          {reviewPreviewUrl && (
                            <button
                              type="button"
                              className="btn-outline review-image-editor__remove"
                              onClick={onRemoveReviewImage}
                            >
                              사진 제거
                            </button>
                          )}
                          <div className="review-image-editor__hint">
                            JPG, PNG, WEBP 파일을 1장까지 등록할 수 있습니다.
                          </div>
                        </div>
                      </div>
                    </div>
                    {reviewFormError && <div className="form-error">{reviewFormError}</div>}
                    <div className="review-editor-actions">
                      <button type="button" className="btn-outline" onClick={onCancelReviewEditor}>
                        취소
                      </button>
                      <button type="submit" className="btn" disabled={reviewSubmitting}>
                        {reviewSubmitting
                          ? (reviewEditor.mode === 'edit' ? '수정 중..' : '작성 중..')
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
                        <div className="section-title-row">
                          <div className="card-title">작성 가능한 리뷰</div>
                          <InlineInfoTip content="배송이 끝난 주문 중 아직 리뷰를 작성하지 않은 상품입니다." />
                        </div>
                      </div>
                      <span className="badge green">{writableReviews.length}건</span>
                    </div>

                    {writableReviews.length === 0 ? (
                      <article className="feedback-card">작성 가능한 리뷰가 없습니다.</article>
                    ) : (
                      <div className="review-card-list">
                        {writableReviews.map((review) => {
                          const reviewImageSrc = getReviewDisplayImageSrc(review);

                          return (
                            <article key={review.orderItemNo} className="review-card review-card--draft">
                              <div className="review-card__media">
                                {reviewImageSrc ? (
                                  <img
                                    className="review-card__thumb"
                                    src={reviewImageSrc}
                                    alt={review.productName}
                                  />
                                ) : (
                                  <div className="thumb-mini">리뷰</div>
                                )}
                              </div>
                              <div className="review-card__body">
                                <div className="review-card__top">
                                  <div>
                                    {review.productNo ? (
                                      <a href={`#/products/${review.productNo}`} className="review-product-link">
                                        {review.productName}
                                      </a>
                                    ) : (
                                      <div className="review-card__title">{review.productName}</div>
                                    )}
                                    <div className="review-card__meta">
                                      {review.orderId} · {formatDate(review.orderedAt)}
                                    </div>
                                  </div>
                                  <span className="review-status review-status--draft">리뷰 작성 가능</span>
                                </div>
                                <p className="review-card__text">
                                  상품 상태와 만족도를 남기면 다음 구매 때 비교하기 쉬워집니다.
                                </p>
                              </div>
                              <div className="review-card__actions">
                                <button type="button" className="btn" onClick={() => onStartCreateReview(review)}>
                                  리뷰 작성
                                </button>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </article>

                  <article className="card review-panel">
                    <div className="section-head">
                      <div>
                        <div className="section-title-row">
                          <div className="card-title">내가 작성한 리뷰</div>
                          <InlineInfoTip content="등록한 리뷰를 다시 확인하고, 필요하면 수정하거나 삭제할 수 있습니다." />
                        </div>
                      </div>
                      <span className="badge green">{myReviews.length}건</span>
                    </div>

                    {myReviews.length === 0 ? (
                      <article className="feedback-card">작성한 리뷰가 없습니다.</article>
                    ) : (
                      <div className="review-card-list">
                        {myReviews.map((review) => {
                          const reviewImageSrc = getReviewDisplayImageSrc(review);

                          return (
                            <article key={review.reviewNo} className="review-card review-card--published">
                              <div className="review-card__media">
                                {reviewImageSrc ? (
                                  <img
                                    className="review-card__thumb"
                                    src={reviewImageSrc}
                                    alt={review.productName}
                                  />
                                ) : (
                                  <div className="thumb-mini">리뷰</div>
                                )}
                              </div>
                              <div className="review-card__body">
                                <div className="review-card__top">
                                  <div>
                                    {review.productNo ? (
                                      <a href={`#/products/${review.productNo}`} className="review-product-link">
                                        {review.productName}
                                      </a>
                                    ) : (
                                      <div className="review-card__title">{review.productName}</div>
                                    )}
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
                                  className="btn-outline review-delete-btn"
                                  onClick={() => onDeleteReview(review.reviewNo)}
                                  disabled={deletingReviewNo === review.reviewNo}
                                >
                                  {deletingReviewNo === review.reviewNo ? '삭제 중..' : '삭제'}
                                </button>
                              </div>
                            </article>
                          );
                        })}
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
