import { useEffect, useMemo, useRef } from 'react';
import { formatDate, formatPrice } from './appUtils';
import InlineInfoTip from './components/InlineInfoTip';

const activityTabs = [
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

function getReviewPrimaryImageSrc(review) {
  if (Array.isArray(review?.imageList) && review.imageList.length > 0) {
    return `/backend/api/image/review/${review.imageList[0].reviewImageNo}`;
  }

  if (review?.reviewImageNo) {
    return `/backend/api/image/review/${review.reviewImageNo}`;
  }

  return getProductImageSrc(review?.imageNo);
}

function buildReviewPreviewItems(reviewForm) {
  const existingImages = Array.isArray(reviewForm?.existingImages) ? reviewForm.existingImages : [];
  const removedImageNos = Array.isArray(reviewForm?.removedImageNos) ? reviewForm.removedImageNos : [];
  const imageFiles = Array.isArray(reviewForm?.imageFiles) ? reviewForm.imageFiles : [];

  const existingPreviewItems = existingImages
    .filter((image) => !removedImageNos.includes(image.reviewImageNo))
    .map((image) => ({
      key: `existing-${image.reviewImageNo}`,
      type: 'existing',
      reviewImageNo: image.reviewImageNo,
      src: `/backend/api/image/review/${image.reviewImageNo}`,
      isBlob: false,
    }));

  const newPreviewItems = imageFiles.map((imageFile, index) => ({
    key: `new-${index}-${imageFile.name}`,
    type: 'new',
    index,
    src: URL.createObjectURL(imageFile),
    isBlob: true,
  }));

  return [...existingPreviewItems, ...newPreviewItems];
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
  const existingReviewImages = reviewForm?.existingImages;
  const removedReviewImageNos = reviewForm?.removedImageNos;
  const selectedReviewImageFiles = reviewForm?.imageFiles;
  const reviewPreviewItems = useMemo(
    () => buildReviewPreviewItems({
      existingImages: Array.isArray(existingReviewImages) ? existingReviewImages : [],
      removedImageNos: Array.isArray(removedReviewImageNos) ? removedReviewImageNos : [],
      imageFiles: Array.isArray(selectedReviewImageFiles) ? selectedReviewImageFiles : [],
    }),
    [existingReviewImages, removedReviewImageNos, selectedReviewImageFiles]
  );

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

  useEffect(() => () => {
    reviewPreviewItems.forEach((item) => {
      if (item.isBlob) {
        URL.revokeObjectURL(item.src);
      }
    });
  }, [reviewPreviewItems]);

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
            {activityTabs.map((tab) => (
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
                <div className="section-title-row">
                  <div className="section-title">찜한 상품</div>
                  <InlineInfoTip content="상품 화면에서 찜한 항목을 모아 보고, 장바구니 담기나 상품 상세 이동으로 이어갈 수 있습니다." />
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
                      <a
                        href={`#/products/${item.productNo}`}
                        className="wishlist-card__media wishlist-product-link-media"
                      >
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
                          {wishlistActionProductNo === item.productNo ? '담는 중...' : '장바구니 담기'}
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
                        <InlineInfoTip content="별점과 내용을 바꾸고 리뷰 사진을 여러 장까지 등록하거나 정리할 수 있습니다." />
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
                    <div className="form-field">
                      <span>별점</span>
                      <div className="review-star-picker" role="radiogroup" aria-label="별점 선택">
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <button
                            key={rating}
                            type="button"
                            className={`review-star-picker__button ${Number(reviewForm.rating) >= rating ? 'is-active' : ''}`}
                            onClick={() => onReviewFormChange({ target: { name: 'rating', value: String(rating) } })}
                            aria-label={`${rating}점`}
                          >
                            ★
                          </button>
                        ))}
                        <span className="review-star-picker__value">{Number(reviewForm.rating || 5)}점</span>
                      </div>
                    </div>

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
                      <div className="review-image-editor__body review-image-editor__body--stacked">
                        {reviewPreviewItems.length > 0 ? (
                          <div className="review-image-editor__grid">
                            {reviewPreviewItems.map((item) => (
                              <div key={item.key} className="review-image-editor__item">
                                <img
                                  className="review-image-editor__preview"
                                  src={item.src}
                                  alt={reviewEditor.productName}
                                />
                                <button
                                  type="button"
                                  className="review-image-editor__remove-chip"
                                  onClick={() => onRemoveReviewImage(item)}
                                >
                                  제거
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="review-image-editor__placeholder review-image-editor__placeholder--wide">
                            사진 없음
                          </div>
                        )}
                        <div className="review-image-editor__controls">
                          <label className="btn-outline review-image-editor__file">
                            <input type="file" accept="image/*" multiple onChange={onReviewImageChange} />
                            사진 선택
                          </label>
                          <div className="review-image-editor__hint">
                            JPG, PNG, WEBP 파일을 최대 3장까지 등록할 수 있습니다.
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
                      <div className="section-title-row">
                        <div className="card-title">작성 가능한 리뷰</div>
                        <InlineInfoTip content="배송이 끝난 주문 중 아직 리뷰를 작성하지 않은 상품입니다." />
                      </div>
                      <span className="badge green">{writableReviews.length}건</span>
                    </div>

                    {writableReviews.length === 0 ? (
                      <article className="feedback-card">작성 가능한 리뷰가 없습니다.</article>
                    ) : (
                      <div className="review-card-list">
                        {writableReviews.map((review) => {
                          const reviewImageSrc = getReviewPrimaryImageSrc(review);

                          return (
                            <article key={review.orderItemNo} className="review-card review-card--draft">
                              <div className="review-card__media">
                                {reviewImageSrc ? (
                                  <img className="review-card__thumb" src={reviewImageSrc} alt={review.productName} />
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
                      <div className="section-title-row">
                        <div className="card-title">내가 작성한 리뷰</div>
                        <InlineInfoTip content="등록한 리뷰를 다시 확인하고, 필요하면 수정하거나 삭제할 수 있습니다." />
                      </div>
                      <span className="badge green">{myReviews.length}건</span>
                    </div>

                    {myReviews.length === 0 ? (
                      <article className="feedback-card">작성한 리뷰가 없습니다.</article>
                    ) : (
                      <div className="review-card-list">
                        {myReviews.map((review) => {
                          const reviewImageSrc = getReviewPrimaryImageSrc(review);
                          const extraImages = Array.isArray(review.imageList) ? review.imageList.slice(1) : [];

                          return (
                            <article key={review.reviewNo} className="review-card review-card--published">
                              <div className="review-card__media">
                                {reviewImageSrc ? (
                                  <img className="review-card__thumb" src={reviewImageSrc} alt={review.productName} />
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
                                {extraImages.length > 0 && (
                                  <div className="review-card__gallery">
                                    {extraImages.map((image) => (
                                      <img
                                        key={image.reviewImageNo}
                                        className="review-card__gallery-thumb"
                                        src={`/backend/api/image/review/${image.reviewImageNo}`}
                                        alt={review.productName}
                                      />
                                    ))}
                                  </div>
                                )}
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
                                  {deletingReviewNo === review.reviewNo ? '삭제 중...' : '삭제'}
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
