import { useEffect, useState } from 'react';
import { getAuthUser, isAuthenticated } from '../auth';
import '../styles/recipe.css';
import {
  createRecipeReview,
  deleteRecipeReview,
  fetchRecipeDetail,
  updateRecipeReview,
} from './recipeApi';

const SAVED_KEY = 'oneulfarm_saved_recipes';
const SCALE_OPTIONS = [
  { value: 0.5, label: '0.5배' },
  { value: 1, label: '1배' },
  { value: 2, label: '2배' },
];
const EMPTY_REVIEW_FORM = { rating: 5, content: '', imageFileList: [] };

export default function RecipeDetailPage({
  authUser: authUserProp,
  onAddMatchedProductsToCart,
  onBack,
  recipeNo,
}) {
  const authUser = authUserProp || getAuthUser();
  const isLoggedIn = isAuthenticated(authUser);
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [saved, setSaved] = useState(false);
  const [servingScale, setServingScale] = useState(1);
  const [actionMessage, setActionMessage] = useState('');
  const [selectedStep, setSelectedStep] = useState(null);
  const [reviewEditorMode, setReviewEditorMode] = useState('');
  const [reviewForm, setReviewForm] = useState(EMPTY_REVIEW_FORM);
  const [reviewImagePreviewList, setReviewImagePreviewList] = useState([]);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewErrorMessage, setReviewErrorMessage] = useState('');
  const [deletingReviewNo, setDeletingReviewNo] = useState(null);

  const ingredientList = Array.isArray(recipe?.ingredientList) ? recipe.ingredientList : [];
  const stepList = Array.isArray(recipe?.stepList) ? recipe.stepList : [];
  const reviewList = Array.isArray(recipe?.reviewList) ? recipe.reviewList : [];
  const recommendedProductList = dedupeProducts(recipe?.recommendedProductList || []);
  const myReview =
    reviewList.find((item) => Number(item.userNo) === Number(authUser?.userNo)) || null;
  const groupedIngredients = groupIngredients(ingredientList, servingScale);
  const quickFacts = [
    { label: '칼로리', value: recipe?.calories ? `${Math.round(Number(recipe.calories))} kcal` : '정보 없음' },
    { label: '재료 수', value: `${ingredientList.length}개` },
    { label: '조리 단계', value: `${stepList.length}단계` },
    { label: '권장 분량', value: ingredientList.length >= 12 ? '3~4인분' : ingredientList.length >= 7 ? '2~3인분' : '1~2인분' },
  ];
  const detailInfo = [
    { label: '보관 가이드', value: inferStorageGuide(recipe), hint: '조리 후 보관 기준' },
    { label: '추천 도구', value: inferToolGuide(stepList), hint: '미리 준비하면 편한 도구' },
    { label: '알레르기', value: inferAllergenGuide(ingredientList), hint: '민감 재료 먼저 체크' },
  ];
  const reviewAverage = reviewList.length
    ? (reviewList.reduce((sum, item) => sum + toNumber(item.rating, 0), 0) / reviewList.length).toFixed(1)
    : '0.0';
  const existingReviewImages =
    reviewEditorMode === 'edit' && !reviewForm.imageFileList.length && myReview?.imageList
      ? myReview.imageList
      : [];

  useEffect(() => {
    let cancelled = false;

    async function loadDetail() {
      setLoading(true);
      setErrorMessage('');
      setActionMessage('');
      closeReviewEditor();

      try {
        const data = await fetchRecipeDetail(recipeNo);
        if (cancelled) return;
        setRecipe(data);
        setSaved(isRecipeSaved(data?.recipeNo));
      } catch (error) {
        if (cancelled) return;
        setRecipe(null);
        setErrorMessage(error?.message || '레시피 상세 정보를 불러오지 못했습니다.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (recipeNo != null) {
      loadDetail();
    } else {
      setLoading(false);
      setErrorMessage('잘못된 레시피 경로입니다.');
    }

    return () => {
      cancelled = true;
    };
  }, [recipeNo]);

  useEffect(() => {
    if (!selectedStep || typeof document === 'undefined') return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedStep]);

  useEffect(() => () => {
    reviewImagePreviewList.forEach((item) => item.objectUrl && URL.revokeObjectURL(item.objectUrl));
  }, [reviewImagePreviewList]);

  function closeReviewEditor() {
    setReviewEditorMode('');
    setReviewForm(EMPTY_REVIEW_FORM);
    setReviewErrorMessage('');
    setReviewImagePreviewList((prev) => {
      prev.forEach((item) => item.objectUrl && URL.revokeObjectURL(item.objectUrl));
      return [];
    });
  }

  async function reloadDetail(message = '') {
    try {
      const data = await fetchRecipeDetail(recipeNo);
      setRecipe(data);
      setSaved(isRecipeSaved(data?.recipeNo));
      if (message) setActionMessage(message);
    } catch (error) {
      setErrorMessage(error?.message || '레시피 상세 정보를 다시 불러오지 못했습니다.');
    }
  }

  function toggleSave() {
    const nextSaved = !saved;
    const current = readSavedRecipeNos();
    const next = nextSaved
      ? Array.from(new Set([...current, Number(recipe.recipeNo)]))
      : current.filter((value) => Number(value) !== Number(recipe.recipeNo));
    window.localStorage.setItem(SAVED_KEY, JSON.stringify(next));
    setSaved(nextSaved);
    setActionMessage(nextSaved ? '레시피를 저장했어요.' : '저장한 레시피에서 제거했어요.');
  }

  async function handleShare() {
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
    try {
      if (navigator.share) {
        await navigator.share({ title: recipe.recipeName, text: `${recipe.recipeName} 레시피`, url: shareUrl });
        setActionMessage('레시피를 공유했어요.');
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
      setActionMessage('레시피 링크를 복사했어요.');
    } catch (error) {
      setActionMessage('공유 중 문제가 발생했어요.');
    }
  }

  async function handleAddIngredients() {
    setActionMessage('');
    if (!recommendedProductList.length) {
      setActionMessage('판매 중인 상품과 일치하는 재료가 없어요.');
      return;
    }
    if (!isLoggedIn) {
      window.location.hash = '#/login';
      return;
    }
    if (typeof onAddMatchedProductsToCart !== 'function') {
      setActionMessage('장바구니 기능이 아직 연결되지 않았어요.');
      return;
    }
    const addedCount = await onAddMatchedProductsToCart(recommendedProductList);
    setActionMessage(
      addedCount > 0
        ? `판매 중인 일치 재료 ${addedCount}개를 장바구니에 담았어요.`
        : '담을 수 있는 판매 상품이 없어요.'
    );
  }

  function startCreateReview() {
    if (!isLoggedIn) {
      window.location.hash = '#/login';
      return;
    }
    closeReviewEditor();
    setReviewEditorMode('create');
    setReviewForm({ ...EMPTY_REVIEW_FORM });
  }

  function startEditReview() {
    if (!myReview) return;
    closeReviewEditor();
    setReviewEditorMode('edit');
    setReviewForm({
      rating: Number(myReview.rating || 5),
      content: myReview.content || '',
      imageFileList: [],
    });
  }

  function handleReviewFieldChange(event) {
    const { name, value } = event.target;
    setReviewErrorMessage('');
    setReviewForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleRatingSelect(rating) {
    setReviewErrorMessage('');
    setReviewForm((prev) => ({ ...prev, rating }));
  }

  function handleReviewImageChange(event) {
    const nextFiles = Array.from(event.target.files || []).slice(0, 3);
    setReviewImagePreviewList((prev) => {
      prev.forEach((item) => item.objectUrl && URL.revokeObjectURL(item.objectUrl));
      return nextFiles.map((file, index) => ({
        key: `${file.name}-${index}`,
        objectUrl: URL.createObjectURL(file),
      }));
    });
    setReviewForm((prev) => ({ ...prev, imageFileList: nextFiles }));
  }

  function removeSelectedImage(index) {
    setReviewImagePreviewList((prev) => {
      const next = prev.filter((_, currentIndex) => currentIndex !== index);
      const removed = prev[index];
      if (removed?.objectUrl) URL.revokeObjectURL(removed.objectUrl);
      return next;
    });
    setReviewForm((prev) => ({
      ...prev,
      imageFileList: prev.imageFileList.filter((_, currentIndex) => currentIndex !== index),
    }));
  }

  async function submitReview(event) {
    event.preventDefault();
    if (!String(reviewForm.content || '').trim()) {
      setReviewErrorMessage('리뷰 내용을 입력해주세요.');
      return;
    }
    setReviewSubmitting(true);
    setReviewErrorMessage('');
    try {
      if (reviewEditorMode === 'edit' && myReview) {
        await updateRecipeReview(recipe.recipeNo, myReview.reviewNo, reviewForm);
        closeReviewEditor();
        await reloadDetail('리뷰를 수정했어요.');
      } else {
        await createRecipeReview(recipe.recipeNo, reviewForm);
        closeReviewEditor();
        await reloadDetail('리뷰를 등록했어요.');
      }
    } catch (error) {
      setReviewErrorMessage(error?.message || '레시피 리뷰를 저장하지 못했습니다.');
    } finally {
      setReviewSubmitting(false);
    }
  }

  async function removeReview(reviewNo) {
    if (!window.confirm('작성한 레시피 리뷰를 삭제할까요?')) return;
    setDeletingReviewNo(reviewNo);
    try {
      await deleteRecipeReview(recipe.recipeNo, reviewNo);
      closeReviewEditor();
      await reloadDetail('리뷰를 삭제했어요.');
    } catch (error) {
      setReviewErrorMessage(error?.message || '레시피 리뷰를 삭제하지 못했습니다.');
    } finally {
      setDeletingReviewNo(null);
    }
  }

  if (loading) {
    return <RecipeStateCard icon="LOADING" title="레시피 상세를 불러오는 중입니다" description="재료와 조리 단계를 정리하고 있어요." />;
  }

  if (errorMessage || !recipe) {
    return (
      <RecipeStateCard
        icon="404"
        title="레시피 상세를 찾지 못했습니다"
        description={errorMessage || '잘못된 경로이거나 삭제된 레시피입니다.'}
        action={<button className="btn" type="button" onClick={onBack}>레시피 목록으로</button>}
      />
    );
  }

  return (
    <div className="recipe-page recipe-detail-page">
      <section className="recipe-detail-head">
        <button className="btn-outline recipe-back-link" type="button" onClick={onBack}>레시피 목록으로</button>
        <div className="recipe-breadcrumbs" aria-label="breadcrumb">
          <span>홈</span><span aria-hidden="true">/</span><span>레시피</span><span aria-hidden="true">/</span><strong>{recipe.recipeName}</strong>
        </div>
      </section>

      <section className="recipe-detail-hero">
        <article className="recipe-hero-media-card">
          {recipe.imageUrl ? <img alt={recipe.recipeName} className="recipe-detail-main-image" src={recipe.imageUrl} /> : <div className="recipe-detail-main-fallback">{getRecipeEmoji(recipe.recipeName)}</div>}
        </article>
        <article className="recipe-hero-panel recipe-detail-panel">
          <div className="recipe-hero-topline">
            <span className="recipe-kicker">RECIPE / DETAIL</span>
          </div>
          <div className="recipe-hero-copy">
            <h1>{recipe.recipeName}</h1>
            <p className="recipe-hero-summary">{summarize(recipe.description)}</p>
          </div>
          <div className="recipe-hero-quickfacts" aria-label="핵심 정보">
            {quickFacts.map((item) => <div className="recipe-hero-fact" key={item.label}><strong>{item.value}</strong><span>{item.label}</span></div>)}
          </div>
          <div className="recipe-hero-actions">
            <button className="btn recipe-action-primary" type="button" onClick={handleAddIngredients}>한번에 담기</button>
            <button className={`btn-outline recipe-action-ghost ${saved ? 'is-active' : ''}`} type="button" aria-pressed={saved} onClick={toggleSave}>{saved ? '저장됨' : '저장'}</button>
            <button className="btn-outline recipe-action-ghost" type="button" onClick={handleShare}>공유</button>
          </div>
          <div className="recipe-scale-row">
            <div className="recipe-scale-copy"><strong>재료 양 조절</strong></div>
            <div className="recipe-scale-options">
              {SCALE_OPTIONS.map((option) => <button key={option.value} className={`btn-chip ${servingScale === option.value ? 'active' : ''}`} type="button" onClick={() => setServingScale(option.value)}>{option.label}</button>)}
            </div>
          </div>
          {actionMessage ? <p className="recipe-action-feedback" role="status" aria-live="polite">{actionMessage}</p> : null}
        </article>
      </section>

      <section className="recipe-detail-info-layout">
        <article className="recipe-detail-panel recipe-detail-panel--tight recipe-detail-info-panel">
          <div className="recipe-section-head"><div><span className="recipe-kicker">DETAIL INFO</span><h2>조리 전 체크</h2></div></div>
          <div className="recipe-insight-list">
            {detailInfo.map((item) => <div className="recipe-insight-row" key={item.label}><div className="recipe-insight-row__meta"><span className="recipe-insight-row__label">{item.label}</span><small className="recipe-insight-row__hint">{item.hint}</small></div><strong className="recipe-insight-row__value">{item.value}</strong></div>)}
          </div>
        </article>
        <article className="recipe-detail-panel recipe-detail-panel--tight recipe-detail-ingredient-panel">
          <div className="recipe-section-head"><div><span className="recipe-kicker">INGREDIENTS</span><h2>재료 정리</h2></div></div>
          <div className="recipe-ingredient-groups">
            {groupedIngredients.map((section) => <section className="recipe-ingredient-group" key={section.title}><div className="recipe-ingredient-group__head"><strong>{section.title}</strong><span>{section.items.length}개</span></div><ul className="recipe-ingredient-list">{section.items.map((item) => <li className="recipe-ingredient-row" key={item.key}><span className="recipe-ingredient-name" title={item.name}>{item.name}</span><strong className="recipe-ingredient-amount">{item.amount || '적당량'}</strong></li>)}</ul></section>)}
          </div>
        </article>
      </section>

      {recommendedProductList.length ? (
        <section className="recipe-recommend-section recipe-detail-panel">
          <div className="recipe-section-head">
            <div><span className="recipe-kicker">MATCHED PRODUCT</span><h2>판매 중인 재료 상품</h2></div>
          </div>
          <div className="recipe-recommend-grid">
            {recommendedProductList.map((product) => {
              const avgPrice = toNumber(product.avgPrice, toNumber(product.salePrice, 0));
              const gap = Math.max(avgPrice - toNumber(product.salePrice, 0), 0);
              const savingRate = toNumber(product.savingRate, avgPrice > 0 ? (gap / avgPrice) * 100 : 0);
              const isValue = savingRate > 0;

              return (
                <article className="recipe-recommend-card" key={product.productNo || product.productName}>
                  <div className="recipe-recommend-card__head">
                    <div>
                      <strong className="recipe-recommend-card__title">{product.productName}</strong>
                      <div className="recipe-recommend-card__meta">
                        <span>{product.categoryName || '농산물'}</span><span>•</span><span>{product.origin || '원산지 확인'}</span>
                      </div>
                    </div>
                    <span className={`recipe-recommend-badge ${isValue ? 'is-accent' : ''}`}>{isValue ? `${Math.round(savingRate)}% 절약` : '판매 중'}</span>
                  </div>
                  <div className="recipe-recommend-card__body">
                    <div className="recipe-recommend-price">
                      <strong>{formatCurrency(product.salePrice)}</strong>
                      <span>시장 평균가 {formatCurrency(avgPrice)}</span>
                    </div>
                    <div className="recipe-recommend-match">
                      <span>평균가 대비</span>
                      <strong>{isValue ? `${formatCurrency(gap)} 낮음` : '현재가 수준'}</strong>
                    </div>
                  </div>
                  <div className="recipe-recommend-card__foot">
                    <span className="recipe-recommend-stock">재고 {toNumber(product.stockQty, 0)}개</span>
                    <button className="btn-outline recipe-recommend-action" type="button" onClick={() => { window.location.hash = `#/products/${product.productNo}`; }}>
                      상품 보기
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="recipe-detail-panel recipe-review-section">
        <div className="recipe-section-head recipe-section-head--review">
          <div><span className="recipe-kicker">REVIEW</span><h2>레시피 리뷰</h2></div>
          <div className="recipe-review-summary"><strong>{reviewAverage}</strong><span>평균 별점 · 리뷰 {reviewList.length}건</span></div>
        </div>

        <div className="recipe-review-toolbar">
          <div className="recipe-review-toolbar__actions">
            {!myReview ? (
              <button className="btn" type="button" onClick={startCreateReview}>리뷰 작성</button>
            ) : (
              <>
                <button className="btn" type="button" onClick={startEditReview}>내 리뷰 수정</button>
                <button className="btn-outline" type="button" onClick={() => removeReview(myReview.reviewNo)} disabled={deletingReviewNo === myReview.reviewNo}>
                  {deletingReviewNo === myReview.reviewNo ? '삭제 중...' : '내 리뷰 삭제'}
                </button>
              </>
            )}
          </div>
        </div>

        {!isLoggedIn ? (
          <div className="recipe-review-login-note">
            <span>로그인하면 리뷰를 작성하고 수정할 수 있습니다.</span>
            <button className="btn-outline" type="button" onClick={() => { window.location.hash = '#/login'; }}>로그인하러 가기</button>
          </div>
        ) : null}

        {reviewEditorMode ? (
          <article className="recipe-review-editor">
            <div className="recipe-review-editor__head">
              <div>
                <strong>{reviewEditorMode === 'edit' ? '내 리뷰 수정' : '레시피 리뷰 작성'}</strong>
                <span>별점, 이미지, 텍스트를 함께 등록할 수 있어요.</span>
              </div>
              <button className="btn-outline" type="button" onClick={closeReviewEditor}>닫기</button>
            </div>
            <form className="recipe-review-form" onSubmit={submitReview}>
              <div className="recipe-review-form__row">
                <div className="recipe-review-field recipe-review-field--stars">
                  <span>별점</span>
                  <div className="recipe-review-star-input" role="radiogroup" aria-label="별점 선택">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        className={`recipe-review-star-button ${Number(reviewForm.rating) >= rating ? 'is-active' : ''}`}
                        onClick={() => handleRatingSelect(rating)}
                        aria-label={`${rating}점`}
                      >
                        ★
                      </button>
                    ))}
                    <strong className="recipe-review-star-value">{Number(reviewForm.rating)}점</strong>
                  </div>
                </div>
              </div>

              <label className="recipe-review-field">
                <span>리뷰 내용</span>
                <textarea
                  name="content"
                  rows={5}
                  value={reviewForm.content}
                  onChange={handleReviewFieldChange}
                  placeholder="재료 상태, 조리 난이도, 맛과 식감 등을 자유롭게 남겨주세요."
                />
              </label>

              <label className="recipe-review-field">
                <span>리뷰 이미지</span>
                <input accept="image/*" multiple type="file" onChange={handleReviewImageChange} />
                <small>최대 3장까지 업로드할 수 있습니다.</small>
              </label>

              {reviewImagePreviewList.length ? (
                <div className="recipe-review-image-list">
                  {reviewImagePreviewList.map((item, index) => (
                    <div className="recipe-review-image-card" key={item.key}>
                      <img alt={`선택한 리뷰 이미지 ${index + 1}`} src={item.objectUrl} />
                      <button type="button" className="btn-chip" onClick={() => removeSelectedImage(index)}>제거</button>
                    </div>
                  ))}
                </div>
              ) : existingReviewImages.length ? (
                <div className="recipe-review-image-list">
                  {existingReviewImages.map((image, index) => (
                    <div className="recipe-review-image-card" key={image.reviewImageNo || index}>
                      <img alt={`기존 리뷰 이미지 ${index + 1}`} src={resolveReviewImageUrl(image.imageUrl)} />
                    </div>
                  ))}
                </div>
              ) : null}

              {reviewEditorMode === 'edit' && myReview?.imageList?.length ? <p className="recipe-review-form__hint">새 이미지를 선택하지 않으면 기존 이미지가 그대로 유지됩니다.</p> : null}
              {reviewErrorMessage ? <p className="recipe-review-error" role="alert">{reviewErrorMessage}</p> : null}

              <div className="recipe-review-form__actions">
                <button className="btn-outline" type="button" onClick={closeReviewEditor}>취소</button>
                <button className="btn" disabled={reviewSubmitting} type="submit">
                  {reviewSubmitting ? (reviewEditorMode === 'edit' ? '수정 중...' : '등록 중...') : (reviewEditorMode === 'edit' ? '리뷰 수정' : '리뷰 등록')}
                </button>
              </div>
            </form>
          </article>
        ) : null}

        {reviewList.length ? (
          <div className="recipe-review-list">
            {reviewList.map((review) => {
              const isMine = Number(review.userNo) === Number(authUser?.userNo);
              const imageList = Array.isArray(review.imageList) ? review.imageList : [];

              return (
                <article className="recipe-review-card" key={review.reviewNo}>
                  <div className="recipe-review-card__head">
                    <div>
                      <strong>{review.nickname || (isMine ? '나' : '회원')}</strong>
                      <div className="recipe-review-card__meta">
                        <span>{renderStars(review.rating)}</span><span>•</span><span>{formatReviewTimestamp(review)}</span>
                      </div>
                    </div>
                    <div className="recipe-review-card__actions">
                      {isMine ? <span className="recipe-review-card__mine">내 리뷰</span> : null}
                      {isMine ? (
                        <>
                          <button className="btn-chip" type="button" onClick={startEditReview}>수정</button>
                          <button className="btn-chip" type="button" onClick={() => removeReview(review.reviewNo)} disabled={deletingReviewNo === review.reviewNo}>
                            {deletingReviewNo === review.reviewNo ? '삭제 중' : '삭제'}
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <p className="recipe-review-card__content">{review.content}</p>
                  {imageList.length ? (
                    <div className="recipe-review-card__images">
                      {imageList.map((image, index) => (
                        <img
                          key={image.reviewImageNo || index}
                          alt={`레시피 리뷰 이미지 ${index + 1}`}
                          className="recipe-review-card__image"
                          src={resolveReviewImageUrl(image.imageUrl)}
                        />
                      ))}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : (
          <RecipeStateCard
            icon="REVIEW"
            title="아직 등록된 레시피 리뷰가 없어요"
            description="처음 후기를 남기고 별점과 사진으로 이 레시피 경험을 공유해보세요."
            action={!myReview && isLoggedIn ? <button className="btn" type="button" onClick={startCreateReview}>첫 리뷰 작성</button> : null}
            extraClassName="recipe-review-empty"
          />
        )}
      </section>

      <section className="recipe-step-section">
        <div className="recipe-step-section__head recipe-step-section__head--detail">
          <div><span className="recipe-kicker">STEP GUIDE</span><h2>조리 단계</h2></div>
        </div>
        {stepList.length ? (
          <div className="recipe-step-list recipe-step-list--dense">
            {stepList.map((step, index) => {
              const stepSeq = step.stepSeq || index + 1;
              const description = normalizeStepDescription(step.description);
              const title = buildStepTitle(step.description);

              return (
                <article className="recipe-step-card recipe-step-card--dense" key={step.stepNo || `${recipe.recipeNo}-${stepSeq}`}>
                  <div className="recipe-step-copy recipe-step-copy--dense">
                    <div className="recipe-step-copy__meta">
                      <span className="recipe-step-chip">STEP {String(stepSeq).padStart(2, '0')}</span>
                      <strong>{title}</strong>
                    </div>
                    <p>{description}</p>
                  </div>
                  <button
                    className="recipe-step-media recipe-step-media--dense recipe-step-media--button"
                    type="button"
                    onClick={() => step.primaryImageUrl && setSelectedStep({ ...step, stepSeq, title, description })}
                    disabled={!step.primaryImageUrl}
                    aria-label={step.primaryImageUrl ? `${recipe.recipeName} ${stepSeq}단계 사진 보기` : `${recipe.recipeName} ${stepSeq}단계 사진 없음`}
                  >
                    {step.primaryImageUrl ? (
                      <img alt={`${recipe.recipeName} ${stepSeq}단계`} src={step.primaryImageUrl} />
                    ) : (
                      <div className="recipe-step-fallback"><span>IMG</span>단계 사진 없음</div>
                    )}
                  </button>
                </article>
              );
            })}
          </div>
        ) : (
          <RecipeStateCard icon="STEP" title="조리 순서가 아직 없어요" description="레시피 단계 데이터가 들어오면 이 영역에서 순서대로 보여집니다." />
        )}
      </section>

      {selectedStep ? (
        <div className="recipe-step-modal" role="presentation" onClick={() => setSelectedStep(null)}>
          <div className="recipe-step-modal__card" role="dialog" aria-modal="true" aria-label={`${recipe.recipeName} ${selectedStep.stepSeq}단계 사진 보기`} onClick={(event) => event.stopPropagation()}>
            <div className="recipe-step-modal__head">
              <div className="recipe-step-modal__title">
                <span className="recipe-kicker">STEP {String(selectedStep.stepSeq).padStart(2, '0')}</span>
                <h2>{selectedStep.title}</h2>
              </div>
              <button className="recipe-step-modal__close" type="button" onClick={() => setSelectedStep(null)}>닫기</button>
            </div>
            <div className="recipe-step-modal__body">
              <div className="recipe-step-modal__image">
                <img alt={`${recipe.recipeName} ${selectedStep.stepSeq}단계`} src={selectedStep.primaryImageUrl} />
              </div>
              <p>{selectedStep.description}</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function RecipeStateCard({ icon, title, description, action, extraClassName = '' }) {
  return (
    <section className={`recipe-state-card recipe-detail-state ${extraClassName}`.trim()}>
      <div className="recipe-state-icon">{icon}</div>
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </section>
  );
}

function dedupeProducts(productList) {
  const map = new Map();
  (Array.isArray(productList) ? productList : []).forEach((product) => {
    const productNo = Number(product?.productNo);
    if (!Number.isFinite(productNo) || map.has(productNo)) return;
    map.set(productNo, product);
  });
  return Array.from(map.values());
}

function groupIngredients(ingredientList, scale) {
  const groups = new Map([
    ['기본 재료', []],
    ['양념·소스', []],
    ['토핑·마무리', []],
  ]);

  ingredientList.forEach((ingredient, index) => {
    const name = stripIngredientText(ingredient?.ingredientName) || '재료';
    const amount = scaleAmount(stripIngredientText(ingredient?.amount) || extractAmount(ingredient?.ingredientName) || '적당량', scale);
    const target = resolveIngredientGroup(name);
    groups.get(target).push({ key: ingredient?.ingredientNo || `${name}-${index}`, name, amount });
  });

  return Array.from(groups.entries()).filter(([, items]) => items.length).map(([title, items]) => ({ title, items }));
}

function resolveIngredientGroup(name) {
  const normalized = name.toLowerCase();
  const sauceKeywords = ['소스', '드레싱', '양념', '육수', '간장', '고추장', '된장', '식초', '설탕', '소금', '참기름', '버터', '마요'];
  const toppingKeywords = ['깨', '치즈', '허브', '고명', '토핑', '견과', '파슬리', '후추'];
  if (sauceKeywords.some((keyword) => normalized.includes(keyword))) return '양념·소스';
  if (toppingKeywords.some((keyword) => normalized.includes(keyword))) return '토핑·마무리';
  return '기본 재료';
}

function stripIngredientText(value) {
  return String(value || '')
    .replace(/\r?\n/g, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/[()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[,:·\-/]+/, '')
    .replace(/[,:·\-/]+$/, '')
    .trim();
}

function extractAmount(value) {
  const matched = String(value || '').match(/\(([^()]*)\)/);
  return matched ? stripIngredientText(matched[1]) : '';
}

function scaleAmount(value, scale) {
  if (!value || scale === 1) return value;
  return value.replace(/(\d+\s+\d+\s*\/\s*\d+|\d+\s*\/\s*\d+|\d+(?:\.\d+)?)/g, (token) => {
    const numericValue = parseFraction(token);
    if (numericValue == null) return token;
    const scaled = Math.round(numericValue * scale * 100) / 100;
    return Number.isInteger(scaled) ? String(scaled) : String(scaled).replace(/\.0$/, '');
  });
}

function parseFraction(token) {
  const normalized = token.replace(/\s+/g, ' ').trim();
  if (normalized.includes(' ')) {
    const [whole, fraction] = normalized.split(/\s+/, 2);
    const wholeNumber = Number(whole);
    const fractionNumber = parseFraction(fraction);
    return Number.isFinite(wholeNumber) && fractionNumber != null ? wholeNumber + fractionNumber : null;
  }
  if (normalized.includes('/')) {
    const [numerator, denominator] = normalized.split('/');
    const top = Number(numerator);
    const bottom = Number(denominator);
    return Number.isFinite(top) && Number.isFinite(bottom) && bottom !== 0 ? top / bottom : null;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function inferStorageGuide(recipe) {
  const text = `${recipe?.recipeName || ''} ${recipe?.description || ''}`.toLowerCase();
  if (text.includes('샐러드') || text.includes('무침')) return '냉장 보관, 당일 섭취 권장';
  if (text.includes('국') || text.includes('찌개') || text.includes('수프')) return '냉장 보관, 1~2일 내 섭취 권장';
  if (text.includes('구이') || text.includes('볶음')) return '냉장 보관, 2일 내 섭취 권장';
  return '냉장 보관, 2~3일 내 섭취 권장';
}

function inferToolGuide(stepList) {
  const text = stepList.map((step) => step.description || '').join(' ').toLowerCase();
  const tools = [];
  if (text.includes('팬') || text.includes('프라이팬')) tools.push('팬');
  if (text.includes('냄비') || text.includes('솥')) tools.push('냄비');
  if (text.includes('오븐') || text.includes('에어프라이어')) tools.push('오븐/에어프라이어');
  if (text.includes('믹서') || text.includes('블렌더')) tools.push('믹서');
  if (text.includes('도마') || text.includes('칼')) tools.push('도마/칼');
  return tools.length ? Array.from(new Set(tools)).slice(0, 3).join(', ') : '기본 조리 도구';
}

function inferAllergenGuide(ingredientList) {
  const names = ingredientList.map((ingredient) => stripIngredientText(ingredient?.ingredientName).toLowerCase());
  const allergens = [];
  if (names.some((name) => ['우유', '치즈', '버터', '크림', '요거트'].some((keyword) => name.includes(keyword)))) allergens.push('유제품');
  if (names.some((name) => ['계란', '달걀'].some((keyword) => name.includes(keyword)))) allergens.push('계란');
  if (names.some((name) => ['밀가루', '국수', '면', '파스타', '빵'].some((keyword) => name.includes(keyword)))) allergens.push('밀');
  if (names.some((name) => ['콩', '두부', '된장', '간장', '고추장'].some((keyword) => name.includes(keyword)))) allergens.push('대두');
  if (names.some((name) => ['새우', '게', '조개', '멸치', '문어'].some((keyword) => name.includes(keyword)))) allergens.push('해산물');
  if (names.some((name) => ['아몬드', '호두', '땅콩', '잣', '견과'].some((keyword) => name.includes(keyword)))) allergens.push('견과류');
  return allergens.length ? Array.from(new Set(allergens)).join(', ') : '주요 알레르기 재료가 많지 않음';
}

function buildStepTitle(description) {
  const normalized = normalizeStepDescription(description);
  if (!normalized) return '조리 진행';
  const rules = [
    { title: '재료 손질', keywords: ['씻', '썰', '손질', '자르'] },
    { title: '볶기', keywords: ['볶', '굽', '프라이팬', '부치', '가열'] },
    { title: '끓이기', keywords: ['끓', '국물', '육수', '조리'] },
    { title: '섞기', keywords: ['섞', '버무', '무치', '비비', '혼합'] },
    { title: '굽기', keywords: ['오븐', '에어프라이어', '토스트'] },
    { title: '마무리', keywords: ['완성', '마무리', '올려', '담아', '토핑'] },
  ];
  const matched = rules.find((rule) => rule.keywords.some((keyword) => normalized.includes(keyword)));
  if (matched) return matched.title;
  const preview = normalized.split(/[.!?]/)[0].split(' ').slice(0, 4).join(' ');
  return preview && !/^\d+$/.test(preview) ? (preview.length <= 18 ? preview : `${preview.slice(0, 18)}...`) : '조리 진행';
}

function normalizeStepDescription(description) {
  return stripIngredientText(description)
    .replace(/^\s*\d+\s*[.)-]?\s*/, '')
    .replace(/^\s*step\s*\d+\s*[.)-]?\s*/i, '')
    .replace(/^\s*\d+\s*단계\s*/g, '')
    .trim();
}

function renderStars(rating) {
  const safeRating = Math.max(1, Math.min(5, Number(rating || 5)));
  return `${'★'.repeat(safeRating)}${'☆'.repeat(5 - safeRating)}`;
}

// eslint-disable-next-line no-unused-vars
function formatDate(value) {
  if (!value) return '방금 전';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

function summarize(value) {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return '레시피 설명이 아직 등록되지 않았습니다.';
  return normalized.length <= 150 ? normalized : `${normalized.slice(0, 150)}...`;
}

function formatCurrency(value) {
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(toNumber(value, 0));
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readSavedRecipeNos() {
  try {
    const rawValue = window.localStorage.getItem(SAVED_KEY);
    const parsedValue = JSON.parse(rawValue || '[]');
    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch (error) {
    return [];
  }
}

function isRecipeSaved(recipeNo) {
  return readSavedRecipeNos().some((value) => Number(value) === Number(recipeNo));
}

function getRecipeEmoji(recipeName) {
  const name = stripIngredientText(recipeName).toLowerCase();
  if (name.includes('국') || name.includes('탕') || name.includes('수프')) return '🍲';
  if (name.includes('샐러드') || name.includes('무침')) return '🥗';
  if (name.includes('볶음') || name.includes('구이')) return '🍳';
  if (name.includes('파스타') || name.includes('국수')) return '🍝';
  return '🍽️';
}

function resolveApiImageUrl(imageUrl) {
  if (!imageUrl) return '';
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  const explicitBaseUrl = (process.env.REACT_APP_API_BASE_URL || '').trim().replace(/\/+$/, '');
  if (explicitBaseUrl) return `${explicitBaseUrl}${imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`}`;
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/backend')) {
    return imageUrl.startsWith('/backend/') ? imageUrl : `/backend${imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`}`;
  }
  return imageUrl;
}

function resolveReviewImageUrl(imageUrl) {
  const resolvedUrl = resolveApiImageUrl(imageUrl);
  if (!resolvedUrl) return '';
  if (/^https?:\/\//i.test(resolvedUrl)) return resolvedUrl;
  if (resolvedUrl.startsWith('/api/')) return `/backend${resolvedUrl}`;
  return resolvedUrl;
}

function formatReviewDate(value) {
  if (!value) return '방금 전';
  const date = parseReviewDateValue(value);
  if (!date) return String(value);
  return `${String(date.getFullYear()).slice(-2)}/${padReviewDate(date.getMonth() + 1)}/${padReviewDate(date.getDate())} ${padReviewDate(date.getHours())}:${padReviewDate(date.getMinutes())}`;
}

function formatReviewTimestamp(review) {
  const createdDate = parseReviewDateValue(review?.createdAt);
  const updatedDate = parseReviewDateValue(review?.updatedAt);

  if (updatedDate && createdDate && updatedDate.getTime() !== createdDate.getTime()) {
    return `수정 ${formatReviewDate(updatedDate)}`;
  }

  return formatReviewDate(review?.createdAt);
}

function parseReviewDateValue(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (Array.isArray(value)) {
    const [year, month, day, hour = 0, minute = 0, second = 0] = value;
    const parsed = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second)
    );
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (value && typeof value === 'object') {
    const hasDateParts =
      value.year != null &&
      (value.monthValue != null || value.month != null) &&
      (value.dayOfMonth != null || value.day != null);

    if (hasDateParts) {
      const parsed = new Date(
        Number(value.year),
        Number(value.monthValue ?? value.month) - 1,
        Number(value.dayOfMonth ?? value.day),
        Number(value.hour || 0),
        Number(value.minute || 0),
        Number(value.second || 0)
      );

      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    const commaParts = trimmed.split(',').map((part) => part.trim());

    if (commaParts.length >= 5 && commaParts.every((part) => /^-?\d+$/.test(part))) {
      const [year, month, day, hour = '0', minute = '0', second = '0'] = commaParts;
      const parsed = new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        Number(second)
      );
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    const isoCandidate = trimmed.includes('T') ? trimmed : trimmed.replace(' ', 'T');
    const parsed = new Date(isoCandidate);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
}

function padReviewDate(value) {
  return String(value).padStart(2, '0');
}
