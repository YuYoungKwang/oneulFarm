import { useEffect, useState } from 'react';
import { getAuthUser, isAuthenticated } from '../auth';
import { fetchPriceTrendFromApi } from '../api/priceAnalysisApi';
import SafeImage from './SafeImage';
import '../styles/recipe.css';
import {
  createRecipeReview,
  deleteRecipeReview,
  fetchRecipeDetail,
  updateRecipeReview,
} from './recipeApi';

const SAVED_KEY = 'oneulfarm_saved_recipes';
const SCALE_OPTIONS = [
  { value: 0.5, label: '0.5인분' },
  { value: 1, label: '1인분' },
  { value: 2, label: '2인분' },
];
const EMPTY_REVIEW_FORM = {
  rating: 5,
  content: '',
  imageFileList: [],
};
const formatStepLabel = (stepSeq) => `STEP ${stepSeq}`;

export default function RecipeDetailPage({
  authUser: authUserProp,
  cartItems = [],
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
  const [productTrendMap, setProductTrendMap] = useState({});
  const [recipeCartModalOpen, setRecipeCartModalOpen] = useState(false);
  const [recipeCartDraft, setRecipeCartDraft] = useState([]);
  const cartQuantityMap = buildCartQuantityMap(cartItems);

  const ingredientList = Array.isArray(recipe?.ingredientList) ? recipe.ingredientList : [];
  const stepList = Array.isArray(recipe?.stepList) ? recipe.stepList : [];
  const reviewList = Array.isArray(recipe?.reviewList) ? recipe.reviewList : [];
  const recommendedProductList = dedupeProducts(recipe?.recommendedProductList || []);
  const ingredientMatchedProductMap = buildMatchedProductMap(
    ingredientList,
    recommendedProductList
  );
  const groupedIngredients = groupIngredients(
    ingredientList,
    servingScale,
    ingredientMatchedProductMap
  );
  const myReview =
    reviewList.find((item) => Number(item?.userNo) === Number(authUser?.userNo)) || null;
  const existingReviewImages =
    reviewEditorMode === 'edit' && !reviewForm.imageFileList.length && myReview?.imageList
      ? myReview.imageList
      : [];

  const quickFacts = [
    {
      label: '칼로리',
      value: recipe?.calories ? `${Math.round(toNumber(recipe.calories, 0))} kcal` : '정보 없음',
    },
    { label: '재료 수', value: `${ingredientList.length}개` },
    { label: '조리 단계', value: `${stepList.length}단계` },
    { label: '권장 분량', value: inferServingText(ingredientList.length) },
  ];
  const detailInfo = [
    {
      label: '보관 가이드',
      value: inferStorageGuide(recipe),
      hint: '조리 전 확인',
    },
    {
      label: '추천 도구',
      value: inferToolGuide(stepList),
      hint: '준비하면 좋은 도구',
    },
    {
      label: '알레르기 체크',
      value: inferAllergenGuide(ingredientList),
      hint: '민감한 재료 확인',
    },
  ];
  const reviewAverage = reviewList.length
    ? (
        reviewList.reduce((sum, item) => sum + toNumber(item?.rating, 0), 0) / reviewList.length
      ).toFixed(1)
    : '0.0';
  const trendFetchKey = recommendedProductList
    .map((product) => `${product?.productNo || ''}:${product?.itemCode || ''}`)
    .join('|');

  useEffect(() => {
    let cancelled = false;

    async function loadDetail() {
      setLoading(true);
      setErrorMessage('');
      setActionMessage('');
      closeReviewEditor();

      try {
        const data = await fetchRecipeDetail(recipeNo);
        if (cancelled) {
          return;
        }
        setRecipe(data);
        setSaved(isRecipeSaved(data?.recipeNo));
      } catch (error) {
        if (!cancelled) {
          setRecipe(null);
          setErrorMessage(error?.message || '레시피 상세 정보를 불러오지 못했습니다.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
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
    if ((!selectedStep && !recipeCartModalOpen) || typeof document === 'undefined') {
      return undefined;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [recipeCartModalOpen, selectedStep]);

  useEffect(() => {
    if (!selectedStep && !recipeCartModalOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') {
        return;
      }

      if (recipeCartModalOpen) {
        closeRecipeCartModal();
        return;
      }

      setSelectedStep(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [recipeCartModalOpen, selectedStep]);

  useEffect(
    () => () => {
      reviewImagePreviewList.forEach((item) => {
        if (item.objectUrl) {
          URL.revokeObjectURL(item.objectUrl);
        }
      });
    },
    [reviewImagePreviewList]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadProductTrends() {
      const candidateProducts = dedupeProducts(recipe?.recommendedProductList || []).filter(
        (product) => product?.productNo && product?.itemCode
      );

      if (!candidateProducts.length) {
        setProductTrendMap({});
        return;
      }

      const entries = await Promise.all(
        candidateProducts.map(async (product) => {
          try {
            const payload = await fetchPriceTrendFromApi({
              days: 30,
              itemCode: product.itemCode,
              marketType: product.marketType || 'RETAIL',
            });
            return [product.productNo, normalizeMiniTrendRows(payload?.trend || payload || [])];
          } catch (error) {
            return [product.productNo, []];
          }
        })
      );

      if (cancelled) {
        return;
      }

      setProductTrendMap(
        entries.reduce((accumulator, [productNo, rows]) => {
          accumulator[productNo] = rows;
          return accumulator;
        }, {})
      );
    }

    loadProductTrends();

    return () => {
      cancelled = true;
    };
  }, [trendFetchKey, recipe]);

  function closeReviewEditor() {
    setReviewEditorMode('');
    setReviewForm(EMPTY_REVIEW_FORM);
    setReviewErrorMessage('');
    setReviewImagePreviewList((previous) => {
      previous.forEach((item) => {
        if (item.objectUrl) {
          URL.revokeObjectURL(item.objectUrl);
        }
      });
      return [];
    });
  }

  async function reloadDetail(message = '') {
    try {
      const data = await fetchRecipeDetail(recipeNo);
      setRecipe(data);
      setSaved(isRecipeSaved(data?.recipeNo));
      if (message) {
        setActionMessage(message);
      }
    } catch (error) {
      setErrorMessage(error?.message || '레시피 상세 정보를 다시 불러오지 못했습니다.');
    }
  }

  function toggleSave() {
    if (!recipe?.recipeNo) {
      return;
    }

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
        await navigator.share({
          title: recipe?.recipeName || '레시피',
          text: `${recipe?.recipeName || '레시피'}를 공유합니다.`,
          url: shareUrl,
        });
        setActionMessage('레시피를 공유했어요.');
        return;
      }

      await navigator.clipboard.writeText(shareUrl);
      setActionMessage('레시피 링크를 복사했어요.');
    } catch (error) {
      setActionMessage('공유 중 문제가 발생했어요.');
    }
  }

  function handleAddIngredients() {
    openRecipeCartModal();
  }

  function openRecipeCartModal() {
    setActionMessage('');
    setSelectedStep(null);

    if (!recommendedProductList.length) {
      setActionMessage('지금 판매 중인 재료 상품이 없어요.');
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

    const nextDraft = buildRecipeCartDraft(groupedIngredients, cartQuantityMap);

    if (!nextDraft.length) {
      setActionMessage('담을 수 있는 판매 상품이 없어요.');
      return;
    }

    setRecipeCartDraft(nextDraft);
    setRecipeCartModalOpen(true);
  }

  function openProductDetail(productNo) {
    if (!productNo) {
      return;
    }
    window.location.hash = `#/products/${productNo}`;
  }

  async function handleIngredientCartAdd(productList, event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    if (!Array.isArray(productList) || !productList.length) {
      setActionMessage('장바구니에 담을 수 있는 상품이 없어요.');
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

    const primaryProduct = productList[0];
    const addedCount = await onAddMatchedProductsToCart(primaryProduct ? [primaryProduct] : []);
    setActionMessage(
      addedCount > 0
        ? `${primaryProduct?.productName || '상품'}을(를) 장바구니에 담았어요.`
        : '장바구니에 담지 못했어요.'
    );
  }

  function closeRecipeCartModal() {
    setRecipeCartModalOpen(false);
    setRecipeCartDraft([]);
  }

  function updateRecipeCartDraftItem(ingredientKey, updater) {
    setRecipeCartDraft((previousDraft) =>
      previousDraft.map((item) =>
        item.ingredientKey === ingredientKey ? updater(item) : item
      )
    );
  }

  function handleRecipeCartQuantityChange(ingredientKey, nextQuantity) {
    updateRecipeCartDraftItem(ingredientKey, (item) => {
      const selectedProduct = getSelectedRecipeCartProduct(item);
      return {
        ...item,
        quantity: clampRecipeCartQuantity(nextQuantity, selectedProduct),
      };
    });
  }

  function handleRecipeCartToggleItem(ingredientKey, included) {
    updateRecipeCartDraftItem(ingredientKey, (item) => ({
      ...item,
      included,
    }));
  }

  function handleRecipeCartCycleProduct(ingredientKey) {
    updateRecipeCartDraftItem(ingredientKey, (item) => {
      const candidateProducts = Array.isArray(item.candidateProducts)
        ? item.candidateProducts
        : [];

      if (candidateProducts.length < 2) {
        return item;
      }

      const nextIndex = (item.selectedProductIndex + 1) % candidateProducts.length;
      const nextProduct = candidateProducts[nextIndex];

      return {
        ...item,
        selectedProductIndex: nextIndex,
        quantity: clampRecipeCartQuantity(item.quantity, nextProduct),
      };
    });
  }

  async function handleConfirmRecipeCart() {
    if (typeof onAddMatchedProductsToCart !== 'function') {
      setActionMessage('장바구니 기능이 아직 연결되지 않았어요.');
      return;
    }

    const selectedItems = recipeCartDraft.filter((item) => item.included);
    if (!selectedItems.length) {
      setActionMessage('담을 품목을 하나 이상 선택해 주세요.');
      return;
    }

    const payload = selectedItems
      .map((item) => {
        const selectedProduct = getSelectedRecipeCartProduct(item);
        if (!selectedProduct?.productNo) {
          return null;
        }

        return {
          productNo: selectedProduct.productNo,
          quantity: item.quantity,
        };
      })
      .filter(Boolean);

    if (!payload.length) {
      setActionMessage('담을 수 있는 판매 상품이 없어요.');
      return;
    }

    const totalQuantity = payload.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const totalSaving = selectedItems.reduce((sum, item) => {
      const selectedProduct = getSelectedRecipeCartProduct(item);
      const salePrice = toNumber(selectedProduct?.salePrice, 0);
      const averagePrice = toNumber(
        selectedProduct?.avgPrice,
        salePrice
      );
      return sum + Math.max(averagePrice - salePrice, 0) * item.quantity;
    }, 0);

    const addedCount = await onAddMatchedProductsToCart(payload);
    closeRecipeCartModal();
    setActionMessage(
      addedCount > 0
        ? `선택한 품목 ${selectedItems.length}개를 장바구니에 담았어요. 총 ${totalQuantity}개, 총 절약 ${formatCurrency(totalSaving)}.`
        : '장바구니에 담지 못했어요.'
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

  function startEditReview(review = myReview) {
    if (!review) {
      return;
    }

    closeReviewEditor();
    setReviewEditorMode('edit');
    setReviewForm({
      rating: Number(review.rating || 5),
      content: review.content || '',
      imageFileList: [],
    });
  }

  function handleReviewFieldChange(event) {
    const { name, value } = event.target;
    setReviewErrorMessage('');
    setReviewForm((previous) => ({ ...previous, [name]: value }));
  }

  function handleRatingSelect(rating) {
    setReviewErrorMessage('');
    setReviewForm((previous) => ({ ...previous, rating }));
  }

  function handleReviewImageChange(event) {
    const nextFiles = Array.from(event.target.files || []).slice(0, 3);

    setReviewImagePreviewList((previous) => {
      previous.forEach((item) => {
        if (item.objectUrl) {
          URL.revokeObjectURL(item.objectUrl);
        }
      });

      return nextFiles.map((file, index) => ({
        key: `${file.name}-${index}`,
        objectUrl: URL.createObjectURL(file),
      }));
    });

    setReviewForm((previous) => ({
      ...previous,
      imageFileList: nextFiles,
    }));
  }

  function removeSelectedImage(index) {
    setReviewImagePreviewList((previous) => {
      const next = previous.filter((_, currentIndex) => currentIndex !== index);
      const removed = previous[index];
      if (removed?.objectUrl) {
        URL.revokeObjectURL(removed.objectUrl);
      }
      return next;
    });

    setReviewForm((previous) => ({
      ...previous,
      imageFileList: previous.imageFileList.filter((_, currentIndex) => currentIndex !== index),
    }));
  }

  async function submitReview(event) {
    event.preventDefault();

    if (!String(reviewForm.content || '').trim()) {
      setReviewErrorMessage('리뷰 내용을 입력해 주세요.');
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
      setReviewErrorMessage(error?.message || '리뷰를 저장하지 못했습니다.');
    } finally {
      setReviewSubmitting(false);
    }
  }

  async function removeReview(reviewNo) {
    if (!reviewNo || !window.confirm('리뷰를 삭제할까요?')) {
      return;
    }

    setDeletingReviewNo(reviewNo);
    setReviewErrorMessage('');

    try {
      await deleteRecipeReview(recipe.recipeNo, reviewNo);
      closeReviewEditor();
      await reloadDetail('리뷰를 삭제했어요.');
    } catch (error) {
      setReviewErrorMessage(error?.message || '리뷰를 삭제하지 못했습니다.');
    } finally {
      setDeletingReviewNo(null);
    }
  }

  if (loading) {
    return (
      <div className="recipe-page recipe-detail-page">
        <RecipeStateCard
          icon="🍳"
          title="레시피를 준비하고 있어요"
          description="상세 정보와 재료, 리뷰를 불러오는 중입니다."
        />
      </div>
    );
  }

  if (errorMessage || !recipe) {
    return (
      <div className="recipe-page recipe-detail-page">
        <RecipeStateCard
          icon="📄"
          title="레시피를 찾을 수 없어요"
          description={errorMessage || '요청한 레시피 정보를 불러오지 못했습니다.'}
          action={
            <button className="btn-outline recipe-back-link" type="button" onClick={onBack}>
              목록으로 돌아가기
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div className="recipe-page recipe-detail-page">
      <div className="recipe-detail-head">
        <button className="btn-outline recipe-back-link" type="button" onClick={onBack}>
          레시피 목록으로
        </button>
        <div className="recipe-breadcrumbs" aria-label="breadcrumb">
          <span>레시피</span>
          <span>/</span>
          <strong>{recipe.recipeName}</strong>
        </div>
      </div>

      <section className="recipe-detail-hero">
        <article className="recipe-hero-media-card">
          {recipe.imageUrl || recipe.mainImageUrl ? (
            <img
              className="recipe-detail-main-image"
              alt={recipe.recipeName}
              src={resolveApiImageUrl(recipe.imageUrl || recipe.mainImageUrl)}
            />
          ) : (
            <div className="recipe-detail-main-fallback">{getRecipeEmoji(recipe.recipeName)}</div>
          )}
        </article>

        <article className="recipe-hero-panel">
          <div className="recipe-hero-topline">
            <span className="recipe-detail-chip">RECIPE</span>
          </div>

          <div className="recipe-hero-copy">
            <h1>{recipe.recipeName}</h1>
            <p className="recipe-hero-summary">{summarize(recipe.description)}</p>
          </div>

          <div className="recipe-hero-quickfacts" aria-label="요약 정보">
            {quickFacts.map((item) => (
              <div className="recipe-hero-fact" key={item.label}>
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </div>
            ))}
          </div>

          <div className="recipe-hero-actions">
            <button className="btn recipe-action-primary" type="button" onClick={handleAddIngredients}>
              한 번에 담기
            </button>
            <button
              className={`btn-outline recipe-action-ghost ${saved ? 'is-active' : ''}`}
              type="button"
              aria-pressed={saved}
              onClick={toggleSave}
            >
              {saved ? '저장됨' : '저장'}
            </button>
            <button className="btn-outline recipe-action-ghost" type="button" onClick={handleShare}>
              공유
            </button>
          </div>

          <div className="recipe-scale-row">
            <div className="recipe-scale-copy">
              <strong>레시피 분량 조절</strong>
            </div>
            <div className="recipe-scale-options">
              {SCALE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  className={`btn-chip ${servingScale === option.value ? 'active' : ''}`}
                  type="button"
                  onClick={() => setServingScale(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {actionMessage ? (
            <p className="recipe-action-feedback" role="status" aria-live="polite">
              {actionMessage}
            </p>
          ) : null}
        </article>
      </section>

      <section className="recipe-detail-info-layout">
        <article className="recipe-detail-panel recipe-detail-panel--tight recipe-detail-info-panel">
          <div className="recipe-section-head">
            <div>
              <span className="recipe-kicker">DETAIL INFO</span>
              <h2>조리 전 체크</h2>
            </div>
          </div>

          <div className="recipe-insight-list">
            {detailInfo.map((item) => (
              <div className="recipe-insight-row" key={item.label}>
                <div className="recipe-insight-row__meta">
                  <span className="recipe-insight-row__label">{item.label}</span>
                  <small className="recipe-insight-row__hint">{item.hint}</small>
                </div>
                <strong className="recipe-insight-row__value">{item.value}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="recipe-detail-panel recipe-detail-panel--tight recipe-detail-ingredient-panel">
          <div className="recipe-section-head">
            <div>
              <span className="recipe-kicker">INGREDIENTS</span>
              <h2>재료 정리</h2>
            </div>
          </div>

          <div className="recipe-ingredient-groups">
            {groupedIngredients.map((section) => (
              <section className="recipe-ingredient-group" key={section.title}>
                <div className="recipe-ingredient-group__head">
                  <strong>{section.title}</strong>
                  <span>{section.items.length}개</span>
                </div>

                <ul className="recipe-ingredient-list">
                  {section.items.map((item) => (
                    <li
                      className={`recipe-ingredient-row ${item.isPurchasable ? 'is-purchasable' : ''}`}
                      key={item.key}
                      tabIndex={item.isPurchasable ? 0 : undefined}
                      onClick={() => {
                        if (item.isPurchasable && item.matchedProducts[0]?.productNo) {
                          openProductDetail(item.matchedProducts[0].productNo);
                        }
                      }}
                      onKeyDown={(event) => {
                        if (!item.isPurchasable) {
                          return;
                        }
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          openProductDetail(item.matchedProducts[0]?.productNo);
                        }
                      }}
                    >
                      <div className="recipe-ingredient-name-group">
                        <span className="recipe-ingredient-name" title={item.name}>
                          {item.name}
                        </span>
                        {item.isPurchasable ? (
                          <>
                            <span className="recipe-ingredient-badge">구매 가능</span>
                            <button
                              className="btn-outline recipe-ingredient-cart-button"
                              type="button"
                              onClick={(event) =>
                                handleIngredientCartAdd(item.matchedProducts, event)
                              }
                            >
                              담기
                            </button>
                          </>
                        ) : null}
                      </div>

                      <strong className="recipe-ingredient-amount">{item.amount || '적당량'}</strong>

                      {item.isPurchasable && item.matchedProducts.length ? (
                        <div className="recipe-ingredient-hover-card" role="presentation">
                          {item.matchedProducts.map((product) => {
                            const averagePrice = toNumber(
                              product.avgPrice,
                              toNumber(product.salePrice, 0)
                            );
                            const priceGap = Math.max(
                              averagePrice - toNumber(product.salePrice, 0),
                              0
                            );

                            return (
                              <article
                                className="recipe-ingredient-hover-item"
                                key={product.productNo || product.productName}
                              >
                                <div className="recipe-ingredient-hover-head">
                                  <div>
                                    <strong>{product.productName}</strong>
                                    <span>{product.origin || '산지 확인'}</span>
                                  </div>
                                  <span>
                                    {priceGap > 0
                                      ? `평균가 대비 ${formatCurrency(priceGap)} 절약`
                                      : '바로 구매 가능'}
                                  </span>
                                </div>
                                <div className="recipe-ingredient-hover-meta">
                                  <span>{formatCurrency(product.salePrice)}</span>
                                  <span>재고 {toNumber(product.stockQty, 0)}개</span>
                                </div>
                                <IngredientTrendMiniChart rows={productTrendMap[product.productNo] || []} />
                              </article>
                            );
                          })}
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </article>
      </section>

      <section className="recipe-step-section">
        <div className="recipe-step-section__head recipe-step-section__head--detail">
          <div>
            <span className="recipe-kicker">STEP GUIDE</span>
            <h2>조리 단계</h2>
          </div>
        </div>

        {stepList.length ? (
          <div className="recipe-step-list recipe-step-list--dense">
            {stepList.map((step, index) => {
              const stepSeq = step.stepSeq || index + 1;
              const description = normalizeStepDescription(step.description);

              return (
                <article
                  className="recipe-step-card recipe-step-card--dense"
                  key={step.stepNo || `${recipe.recipeNo}-${stepSeq}`}
                >
                  <div className="recipe-step-copy recipe-step-copy--dense">
                    <div className="recipe-step-copy__meta">
                      <span className="recipe-step-chip">
                        {formatStepLabel(String(stepSeq).padStart(2, '0'))}
                      </span>
                    </div>
                    <p>{description}</p>
                  </div>

                  {step.primaryImageUrl ? (
                    <button
                      className="recipe-step-media recipe-step-media--dense recipe-step-media--button"
                      type="button"
                      onClick={() => {
                        setSelectedStep({
                          ...step,
                          description,
                          stepSeq,
                        });
                      }}
                      aria-label={`${recipe.recipeName} ${stepSeq}단계 사진 보기`}
                    >
                      <img
                        alt={`${recipe.recipeName} ${stepSeq}단계`}
                        src={resolveApiImageUrl(step.primaryImageUrl)}
                      />
                    </button>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : (
          <RecipeStateCard
            extraClassName="recipe-detail-state"
            icon="📝"
            title="조리 순서가 아직 없어요"
            description="레시피 단계 데이터가 들어오면 이 영역에서 순서대로 보여줄게요."
          />
        )}
      </section>

      <section className="recipe-detail-panel recipe-review-section">
        <div className="recipe-section-head recipe-section-head--review">
          <div>
            <span className="recipe-kicker">REVIEW</span>
            <h2>레시피 리뷰</h2>
          </div>
          <div className="recipe-review-summary">
            <strong>{reviewAverage}</strong>
            <span>평균 평점 · 리뷰 {reviewList.length}건</span>
          </div>
        </div>

        <div className="recipe-review-toolbar">
          {!myReview && isLoggedIn ? (
            <div className="recipe-review-toolbar__actions">
              <button className="btn" type="button" onClick={startCreateReview}>
                리뷰 작성
              </button>
            </div>
          ) : (
            <p className="recipe-review-toolbar__copy">
              {myReview
                ? '내가 남긴 리뷰는 아래 목록에서 바로 수정하거나 삭제할 수 있어요.'
                : '로그인하면 리뷰를 남기고 사진도 함께 올릴 수 있어요.'}
            </p>
          )}
        </div>

        {!isLoggedIn ? (
          <div className="recipe-review-login-note">
            <span>로그인하면 리뷰를 작성하고 수정할 수 있어요.</span>
            <button
              className="btn-outline"
              type="button"
              onClick={() => {
                window.location.hash = '#/login';
              }}
            >
              로그인하러 가기
            </button>
          </div>
        ) : null}

        {reviewEditorMode ? (
          <article className="recipe-review-editor">
            <div className="recipe-review-editor__head">
              <div>
                <strong>{reviewEditorMode === 'edit' ? '내 리뷰 수정' : '레시피 리뷰 작성'}</strong>
                <span>별점, 텍스트, 이미지를 함께 남길 수 있어요.</span>
              </div>
              <button className="btn-outline" type="button" onClick={closeReviewEditor}>
                닫기
              </button>
            </div>

            <form className="recipe-review-form" onSubmit={submitReview}>
              <div className="recipe-review-form__row">
                <label className="recipe-review-field recipe-review-field--stars">
                  <span>별점</span>
                  <div className="recipe-review-star-input">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        className={`recipe-review-star-button ${
                          reviewForm.rating >= rating ? 'is-active' : ''
                        }`}
                        type="button"
                        onClick={() => handleRatingSelect(rating)}
                      >
                        ★
                      </button>
                    ))}
                    <strong className="recipe-review-star-value">{reviewForm.rating}.0</strong>
                  </div>
                </label>
              </div>

              <label className="recipe-review-field">
                <span>리뷰 내용</span>
                <textarea
                  name="content"
                  rows="5"
                  placeholder="맛, 조리 난이도, 다시 만들고 싶은 포인트를 남겨 보세요."
                  value={reviewForm.content}
                  onChange={handleReviewFieldChange}
                />
              </label>

              <label className="recipe-review-field">
                <span>리뷰 이미지</span>
                <input accept="image/*" multiple type="file" onChange={handleReviewImageChange} />
                <small>최대 3장까지 등록할 수 있어요.</small>
              </label>

              {reviewImagePreviewList.length ? (
                <div className="recipe-review-image-list">
                  {reviewImagePreviewList.map((image, index) => (
                    <article className="recipe-review-image-card" key={image.key}>
                      <img alt={`선택한 리뷰 이미지 ${index + 1}`} src={image.objectUrl} />
                      <button
                        className="btn-outline"
                        type="button"
                        onClick={() => removeSelectedImage(index)}
                      >
                        제거
                      </button>
                    </article>
                  ))}
                </div>
              ) : existingReviewImages.length ? (
                <div className="recipe-review-image-list">
                  {existingReviewImages.map((image, index) => (
                    <article
                      className="recipe-review-image-card"
                      key={image.reviewImageNo || index}
                    >
                      <img
                        alt={`기존 리뷰 이미지 ${index + 1}`}
                        src={resolveReviewImageUrl(image.imageUrl)}
                      />
                    </article>
                  ))}
                </div>
              ) : null}

              {reviewErrorMessage ? <p className="recipe-review-error">{reviewErrorMessage}</p> : null}

              <div className="recipe-review-form__actions">
                <button className="btn-outline" type="button" onClick={closeReviewEditor}>
                  취소
                </button>
                <button className="btn" disabled={reviewSubmitting} type="submit">
                  {reviewSubmitting
                    ? '저장 중...'
                    : reviewEditorMode === 'edit'
                    ? '리뷰 수정'
                    : '리뷰 등록'}
                </button>
              </div>
            </form>
          </article>
        ) : null}

        {reviewList.length ? (
          <div className="recipe-review-list">
            {reviewList.map((review) => {
              const isMine = Number(review?.userNo) === Number(authUser?.userNo);
              const imageList = Array.isArray(review?.imageList) ? review.imageList : [];

              return (
                <article className="recipe-review-card" key={review.reviewNo}>
                  <div className="recipe-review-card__head">
                    <div>
                      <strong>{review.nickname || '오늘의농부 회원'}</strong>
                      <div className="recipe-review-card__meta">
                        <span>{renderStars(review.rating)}</span>
                        <span>·</span>
                        <span>{formatReviewTimestamp(review)}</span>
                      </div>
                    </div>

                    {isMine ? (
                      <div className="recipe-review-card__actions">
                        <span className="recipe-review-card__mine">내 리뷰</span>
                        <button
                          className="btn-outline"
                          type="button"
                          onClick={() => startEditReview(review)}
                        >
                          수정
                        </button>
                        <button
                          className="btn-outline"
                          disabled={deletingReviewNo === review.reviewNo}
                          type="button"
                          onClick={() => removeReview(review.reviewNo)}
                        >
                          {deletingReviewNo === review.reviewNo ? '삭제 중...' : '삭제'}
                        </button>
                      </div>
                    ) : null}
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
            extraClassName="recipe-review-empty"
            icon="💬"
            title="아직 등록된 리뷰가 없어요"
            description="첫 리뷰를 남기고 평점과 사진으로 경험을 공유해보세요."
            action={
              !myReview && isLoggedIn ? (
                <button className="btn" type="button" onClick={startCreateReview}>
                  첫 리뷰 작성
                </button>
              ) : null
            }
          />
        )}
      </section>

      {recipeCartModalOpen ? (
        <div
          className="recipe-cart-modal"
          role="presentation"
          onClick={closeRecipeCartModal}
        >
          <div
            className="recipe-cart-modal__card"
            role="dialog"
            aria-modal="true"
            aria-label="장바구니에 담을 상품 확인"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="recipe-cart-modal__head">
              <div className="recipe-cart-modal__title">
                <span className="recipe-kicker">RECIPE CART</span>
                <h2>담을 상품을 확인해보세요</h2>
              </div>
              <button
                className="recipe-cart-modal__close"
                type="button"
                onClick={closeRecipeCartModal}
              >
                닫기
              </button>
            </div>

            <div className="recipe-cart-modal__body">
              {recipeCartDraft.filter((item) => item.included).length ? (
                <div className="recipe-cart-modal__selected">
                  <div className="recipe-cart-modal__section-head">
                    <strong>장바구니에 담을 품목</strong>
                  </div>

                  <div className="recipe-cart-modal__list">
                    {recipeCartDraft
                      .filter((item) => item.included)
                      .map((item) => {
                        const selectedProduct = getSelectedRecipeCartProduct(item);
                        if (!selectedProduct) {
                          return null;
                        }

                        const salePrice = toNumber(selectedProduct.salePrice, 0);
                        const averagePrice = toNumber(selectedProduct.avgPrice, salePrice);
                        const savingAmount = Math.max(averagePrice - salePrice, 0);
                        const stockQty = Math.max(toNumber(selectedProduct.stockQty, 0), 1);

                        return (
                          <article className="recipe-cart-modal__item" key={item.ingredientKey}>
                            <button
                              className="recipe-cart-modal__remove"
                              type="button"
                              onClick={() => handleRecipeCartToggleItem(item.ingredientKey, false)}
                            >
                              삭제
                            </button>

                            <div className="recipe-cart-modal__item-head">
                              <div className="recipe-cart-modal__thumb" aria-hidden="true">
                                {getRecipeCartProductImageUrl(selectedProduct) ? (
                                  <SafeImage
                                    alt=""
                                    className="recipe-cart-modal__thumb-image"
                                    fallback={<span>{getProductSymbol(selectedProduct)}</span>}
                                    src={getRecipeCartProductImageUrl(selectedProduct)}
                                  />
                                ) : (
                                  <span>{getProductSymbol(selectedProduct)}</span>
                                )}
                              </div>
                              <div className="recipe-cart-modal__item-copy">
                                <strong>{selectedProduct.productName}</strong>
                                <div className="recipe-cart-modal__specs">
                                  <span>
                                    레시피 필요량 <strong>{item.ingredientAmount}</strong>
                                  </span>
                                  <span>
                                    상품 규격 <strong>{formatProductSpecification(selectedProduct)}</strong>
                                  </span>
                                  <span className="recipe-cart-modal__cart-badge">
                                    장바구니 보유 <strong>{getCartQuantity(cartQuantityMap, selectedProduct.productNo)}개</strong>
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="recipe-cart-modal__meta">
                              <span>
                                현재가 {formatCurrency(salePrice)} · 평균가 대비 {formatCurrency(savingAmount)} 절약
                              </span>
                              <span>재고 {toNumber(selectedProduct.stockQty, 0)}개</span>
                            </div>

                            <div className="recipe-cart-modal__controls">
                              <div className="recipe-cart-modal__quantity-block">
                                <span>추가 수량</span>
                                <div className="recipe-cart-modal__quantity">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleRecipeCartQuantityChange(
                                        item.ingredientKey,
                                        item.quantity - 1
                                      )
                                    }
                                    disabled={item.quantity <= 1}
                                  >
                                    -
                                  </button>
                                  <strong>{item.quantity}</strong>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleRecipeCartQuantityChange(
                                        item.ingredientKey,
                                        Math.min(item.quantity + 1, stockQty)
                                      )
                                    }
                                    disabled={item.quantity >= stockQty}
                                  >
                                    +
                                  </button>
                                </div>
                              </div>

                              <div className="recipe-cart-modal__actions">
                                {item.candidateProducts.length > 1 ? (
                                  <button
                                    className="btn-outline recipe-cart-modal__sub-action"
                                    type="button"
                                    onClick={() => handleRecipeCartCycleProduct(item.ingredientKey)}
                                  >
                                    품목 변경
                                  </button>
                                ) : null}
                                <button
                                  className="btn-outline recipe-cart-modal__sub-action"
                                  type="button"
                                  onClick={() => openProductDetail(selectedProduct.productNo)}
                                >
                                  상품 보기
                                </button>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                  </div>
                </div>
              ) : (
                <RecipeStateCard
                  extraClassName="recipe-cart-modal__empty"
                  icon="🧺"
                  title="담을 상품을 먼저 골라주세요"
                  description="레시피에서 품목을 고르면 여기에서 바로 담을 수 있어요."
                />
              )}

              <div className="recipe-cart-modal__sidebar">
                <div className="recipe-cart-modal__summary">
                  <div className="recipe-cart-modal__summary-item">
                    <span>담을 품목</span>
                    <strong>{recipeCartDraft.filter((item) => item.included).length}개</strong>
                  </div>
                  <div className="recipe-cart-modal__summary-item">
                    <span>총 구매 수량</span>
                    <strong>
                      {recipeCartDraft
                        .filter((item) => item.included)
                        .reduce((sum, item) => sum + Number(item.quantity || 0), 0)}개
                    </strong>
                  </div>
                  <div className="recipe-cart-modal__summary-item">
                    <span>총 할인 금액</span>
                    <strong>
                      {formatCurrency(
                        recipeCartDraft
                          .filter((item) => item.included)
                          .reduce((sum, item) => {
                            const selectedProduct = getSelectedRecipeCartProduct(item);
                            const salePrice = toNumber(selectedProduct?.salePrice, 0);
                            const averagePrice = toNumber(selectedProduct?.avgPrice, salePrice);
                            return sum + Math.max(averagePrice - salePrice, 0) * item.quantity;
                          }, 0)
                      )}
                    </strong>
                  </div>
                </div>

                <div className="recipe-cart-modal__available">
                  <div className="recipe-cart-modal__section-head">
                    <strong>추가 가능한 품목</strong>
                  </div>

                  {recipeCartDraft.some((item) => !item.included) ? (
                    <div className="recipe-cart-modal__available-list">
                      {recipeCartDraft
                        .filter((item) => !item.included)
                        .map((item) => {
                          const selectedProduct = getSelectedRecipeCartProduct(item);
                          if (!selectedProduct) {
                            return null;
                          }

                          return (
                            <button
                              className="recipe-cart-modal__available-item"
                              key={item.ingredientKey}
                              type="button"
                              onClick={() => handleRecipeCartToggleItem(item.ingredientKey, true)}
                            >
                              <strong>{selectedProduct.productName}</strong>
                              <span>
                                레시피 필요량 {item.ingredientAmount} · 상품 규격 {formatProductSpecification(selectedProduct)}
                              </span>
                              <small>지금 추가</small>
                            </button>
                          );
                        })}
                    </div>
                  ) : (
                    <div className="recipe-cart-modal__available-empty">
                      <strong>추가 가능한 품목이 없습니다</strong>
                      <span>현재 선택 가능한 품목은 모두 담겨 있어요.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          <div className="recipe-cart-modal__foot">
            <button className="btn-outline" type="button" onClick={closeRecipeCartModal}>
                취소
              </button>
              <button
                className="btn"
                type="button"
                disabled={!recipeCartDraft.some((item) => item.included)}
                onClick={handleConfirmRecipeCart}
              >
                장바구니 담기
              </button>
          </div>
          </div>
        </div>
      ) : null}

      {selectedStep ? (
        <div className="recipe-step-modal" role="presentation" onClick={() => setSelectedStep(null)}>
          <div
            className="recipe-step-modal__card"
            role="dialog"
            aria-modal="true"
            aria-label={`${recipe.recipeName} ${selectedStep.stepSeq}단계 사진 보기`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="recipe-step-modal__head">
              <div className="recipe-step-modal__title">
                <span className="recipe-kicker">
                  {formatStepLabel(String(selectedStep.stepSeq).padStart(2, '0'))}
                </span>
              </div>
              <button
                className="recipe-step-modal__close"
                type="button"
                onClick={() => setSelectedStep(null)}
              >
                닫기
              </button>
            </div>

            <div className="recipe-step-modal__body">
              <div className="recipe-step-modal__image">
                <img
                  alt={`${recipe.recipeName} ${selectedStep.stepSeq}단계`}
                  src={resolveApiImageUrl(selectedStep.primaryImageUrl)}
                />
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

function IngredientTrendMiniChart({ rows }) {
  const valueList = Array.isArray(rows)
    ? rows
        .map((row) => Number(row?.avgPrice || row?.value || 0))
        .filter((value) => Number.isFinite(value) && value > 0)
    : [];

  if (!valueList.length) {
    return <div className="recipe-ingredient-hover-empty">최근 시세 데이터가 아직 없어요.</div>;
  }

  const minValue = Math.min(...valueList);
  const maxValue = Math.max(...valueList);
  const range = maxValue - minValue || 1;
  const width = 220;
  const height = 72;

  const points = valueList
    .map((value, index) => {
      const x = (index / Math.max(valueList.length - 1, 1)) * width;
      const y = height - ((value - minValue) / range) * (height - 14) - 7;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="recipe-ingredient-hover-chart">
      <svg
        aria-hidden="true"
        className="recipe-ingredient-hover-chart__svg"
        viewBox={`0 0 ${width} ${height}`}
      >
        <polyline
          fill="none"
          points={points}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3"
        />
      </svg>
      <div className="recipe-ingredient-hover-chart__meta">
        <span>{formatCurrency(minValue)}</span>
        <span>{formatCurrency(valueList[valueList.length - 1])}</span>
      </div>
    </div>
  );
}

function buildRecipeCartDraft(groupedIngredients, cartQuantityMap = new Map()) {
  const draft = [];

  (Array.isArray(groupedIngredients) ? groupedIngredients : []).forEach((section) => {
    (Array.isArray(section?.items) ? section.items : []).forEach((item) => {
      const candidateProducts = dedupeProducts(Array.isArray(item?.matchedProducts) ? item.matchedProducts : [])
        .filter((product) => toNumber(product?.stockQty, 0) > 0)
        .slice(0, 2);

      if (!item?.isPurchasable || !candidateProducts.length) {
        return;
      }

      const existingProductIndex = candidateProducts.findIndex(
        (product) => getCartQuantity(cartQuantityMap, product?.productNo) > 0
      );
      const selectedProductIndex = existingProductIndex >= 0 ? existingProductIndex : 0;

      draft.push({
        candidateProducts,
        included: true,
        ingredientAmount: item.amount || '적당량',
        ingredientKey: item.key,
        ingredientName: item.name,
        quantity: clampRecipeCartQuantity(1, candidateProducts[selectedProductIndex]),
        selectedProductIndex,
      });
    });
  });

  return draft;
}

function getSelectedRecipeCartProduct(item) {
  const candidateProducts = Array.isArray(item?.candidateProducts) ? item.candidateProducts : [];
  if (!candidateProducts.length) {
    return null;
  }

  const nextIndex = Math.max(0, Math.min(Number(item?.selectedProductIndex || 0), candidateProducts.length - 1));
  return candidateProducts[nextIndex] || candidateProducts[0] || null;
}

function getCartQuantity(cartQuantityMap, productNo) {
  const normalizedProductNo = Number(productNo);
  if (!Number.isFinite(normalizedProductNo) || normalizedProductNo <= 0) {
    return 0;
  }

  if (cartQuantityMap instanceof Map) {
    return Number(cartQuantityMap.get(normalizedProductNo) || 0);
  }

  return 0;
}

function buildCartQuantityMap(cartItems) {
  const map = new Map();

  (Array.isArray(cartItems) ? cartItems : []).forEach(({ product, quantity }) => {
    const productNo = Number(product?.productNo);
    if (!Number.isFinite(productNo) || productNo <= 0) {
      return;
    }

    map.set(productNo, Number(quantity || 0));
  });

  return map;
}

function clampRecipeCartQuantity(quantity, product) {
  const stockQty = Math.max(toNumber(product?.stockQty, 0), 1);
  const normalized = Math.max(Number(quantity) || 1, 1);
  return Math.min(normalized, stockQty);
}

function getProductSymbol(product) {
  const displaySymbol = String(product?.display?.symbol || '').trim();
  if (displaySymbol) {
    return displaySymbol;
  }

  const name = stripIngredientText(product?.productName);
  if (!name) {
    return '상품';
  }

  return name.slice(0, 2);
}

function getRecipeCartProductImageUrl(product) {
  const mainImage =
    product?.mainImage ||
    product?.images?.find((image) => image?.isMain === 'Y') ||
    product?.images?.[0] ||
    null;

  const directUrl = mainImage?.imageUrl || product?.mainImageUrl || product?.imageUrl || '';
  if (directUrl) {
    return resolveApiImageUrl(directUrl);
  }

  const imageNo = mainImage?.imageNo || product?.mainImageNo || product?.imageNo || '';
  if (imageNo) {
    return resolveApiImageUrl(`/api/image/product/${imageNo}`);
  }

  return '';
}

function formatProductSpecification(product) {
  const packageWeight = stripIngredientText(product?.packageWeight);
  const unit = stripIngredientText(product?.unit);
  const joined = `${packageWeight}${unit}`.trim();
  return joined || '규격 확인';
}

function dedupeProducts(productList) {
  const map = new Map();

  (Array.isArray(productList) ? productList : []).forEach((product) => {
    const productNo = Number(product?.productNo);
    const key = Number.isFinite(productNo) ? productNo : product?.productName;
    if (!key || map.has(key)) {
      return;
    }
    map.set(key, product);
  });

  return Array.from(map.values());
}

function groupIngredients(ingredientList, scale, matchedProductMap = new Map()) {
  const groups = new Map([
    ['기본 재료', []],
    ['소스', []],
    ['토핑', []],
  ]);

  (Array.isArray(ingredientList) ? ingredientList : []).forEach((ingredient, index) => {
    const key = getIngredientKey(ingredient, index);
    const matchedProducts = matchedProductMap.get(key) || [];
    const item = {
      amount: getDisplayIngredientAmount(ingredient, scale),
      isPurchasable: matchedProducts.length > 0,
      key,
      matchedProducts,
      name: getDisplayIngredientName(ingredient),
    };
    groups.get(resolveIngredientGroup(item.name)).push(item);
  });

  return Array.from(groups.entries())
    .filter(([, items]) => items.length)
    .map(([title, items]) => ({ title, items }));
}

function buildMatchedProductMap(ingredientList, productList) {
  const matchedMap = new Map();
  const safeProductList = Array.isArray(productList) ? productList : [];

  (Array.isArray(ingredientList) ? ingredientList : []).forEach((ingredient, index) => {
    const ingredientName = getDisplayIngredientName(ingredient);
    const normalizedIngredient = normalizeIngredientToken(ingredientName);

    if (!normalizedIngredient) {
      return;
    }

    const matchedProducts = safeProductList
      .map((product) => ({
        ...product,
        __matchScore: calculateIngredientMatchScore(
          normalizeIngredientToken(product?.productName),
          normalizedIngredient
        ),
      }))
      .filter((product) => product.__matchScore > 0)
      .sort((left, right) => {
        if (right.__matchScore !== left.__matchScore) {
          return right.__matchScore - left.__matchScore;
        }
        return toNumber(left.salePrice, 0) - toNumber(right.salePrice, 0);
      })
      .slice(0, 2)
      .map(({ __matchScore, ...product }) => product);

    if (matchedProducts.length) {
      matchedMap.set(getIngredientKey(ingredient, index), matchedProducts);
    }
  });

  return matchedMap;
}

function getIngredientKey(ingredient, index) {
  const name = getDisplayIngredientName(ingredient);
  return ingredient?.ingredientNo || `${name}-${index}`;
}

function getDisplayIngredientName(ingredient) {
  return stripIngredientText(ingredient?.ingredientName) || '재료';
}

function getDisplayIngredientAmount(ingredient, scale) {
  return scaleAmount(
    stripIngredientText(ingredient?.amount) ||
      extractAmount(ingredient?.ingredientName) ||
      '적당량',
    scale
  );
}

function resolveIngredientGroup(name) {
  const normalized = String(name || '').toLowerCase();
  const sauceKeywords = ['소스', '드레싱', '마요', '양념', '간장', '케첩', '머스터드'];
  const toppingKeywords = ['치즈', '견과', '과일', '버터', '크림', '토핑', '시럽'];

  if (sauceKeywords.some((keyword) => normalized.includes(keyword))) {
    return '소스';
  }
  if (toppingKeywords.some((keyword) => normalized.includes(keyword))) {
    return '토핑';
  }
  return '기본 재료';
}

function normalizeIngredientToken(value) {
  if (!value) {
    return '';
  }

  return String(value)
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/[^a-z0-9가-힣\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function calculateIngredientMatchScore(productName, ingredientToken) {
  if (!productName || !ingredientToken) {
    return 0;
  }

  const normalizedProduct = String(productName).trim();
  const normalizedIngredient = String(ingredientToken).trim();
  const compactProduct = normalizedProduct.replace(/\s+/g, '');
  const compactIngredient = normalizedIngredient.replace(/\s+/g, '');

  if (normalizedProduct === normalizedIngredient || compactProduct === compactIngredient) {
    return 100;
  }

  if (compactProduct.length < 2 || compactIngredient.length < 2) {
    return 0;
  }

  if (compactProduct.includes(compactIngredient)) {
    return 80 + Math.min(compactIngredient.length, 10);
  }

  if (compactIngredient.includes(compactProduct)) {
    return 60 + Math.min(compactProduct.length, 10);
  }

  const ingredientTokens = normalizedIngredient.split(' ').filter((token) => token.length >= 2);
  const productTokens = normalizedProduct.split(' ').filter((token) => token.length >= 2);

  return ingredientTokens.reduce((score, token) => {
    if (compactProduct.includes(token) || productTokens.includes(token)) {
      return score + 10;
    }
    return score;
  }, 0);
}

function stripIngredientText(value) {
  return String(value || '')
    .replace(/\r?\n/g, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/[()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[,:·/-]+/, '')
    .replace(/[,:·/-]+$/, '')
    .trim();
}

function extractAmount(value) {
  const matched = String(value || '').match(/\(([^()]*)\)/);
  return matched ? stripIngredientText(matched[1]) : '';
}

function scaleAmount(value, scale) {
  if (!value || scale === 1) {
    return value;
  }

  return value.replace(
    /(\d+\s+\d+\s*\/\s*\d+|\d+\s*\/\s*\d+|\d+(?:\.\d+)?)/g,
    (token) => {
      const numericValue = parseFraction(token);
      if (numericValue == null) {
        return token;
      }
      const scaled = Math.round(numericValue * scale * 100) / 100;
      return Number.isInteger(scaled) ? String(scaled) : String(scaled).replace(/\.0$/, '');
    }
  );
}

function parseFraction(token) {
  const normalized = String(token || '').replace(/\s+/g, ' ').trim();

  if (normalized.includes(' ')) {
    const [whole, fraction] = normalized.split(/\s+/, 2);
    const wholeNumber = Number(whole);
    const fractionNumber = parseFraction(fraction);
    return Number.isFinite(wholeNumber) && fractionNumber != null
      ? wholeNumber + fractionNumber
      : null;
  }

  if (normalized.includes('/')) {
    const [numerator, denominator] = normalized.split('/');
    const top = Number(numerator);
    const bottom = Number(denominator);
    return Number.isFinite(top) && Number.isFinite(bottom) && bottom !== 0
      ? top / bottom
      : null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function inferServingText(ingredientCount) {
  if (ingredientCount >= 12) return '3~4명분';
  if (ingredientCount >= 7) return '2~3명분';
  return '1~2명분';
}

function inferStorageGuide(recipe) {
  const text = `${recipe?.recipeName || ''} ${recipe?.description || ''}`.toLowerCase();
  if (text.includes('냉장') || text.includes('무침')) return '냉장 보관 · 빠른 섭취 권장';
  if (text.includes('구이') || text.includes('찜') || text.includes('스프')) {
    return '냉장 보관 · 1~2일 내 섭취 권장';
  }
  if (text.includes('국') || text.includes('볶음')) return '냉장 보관 · 2일 내 섭취 권장';
  return '냉장 보관 · 2~3일 내 섭취 권장';
}

function inferToolGuide(stepList) {
  const text = (Array.isArray(stepList) ? stepList : [])
    .map((step) => step?.description || '')
    .join(' ')
    .toLowerCase();

  if (text.includes('믹서') || text.includes('블렌더')) return '믹서 또는 블렌더';
  if (text.includes('팬')) return '팬';
  if (text.includes('솥') || text.includes('냄비')) return '냄비, 기본 조리도구';
  return '냄비, 팬, 기본 조리도구';
}

function inferAllergenGuide(ingredientList) {
  const combinedText = (Array.isArray(ingredientList) ? ingredientList : [])
    .map((ingredient) => ingredient?.ingredientName || '')
    .join(' ')
    .toLowerCase();

  const allergenList = [];
  if (combinedText.includes('우유') || combinedText.includes('치즈') || combinedText.includes('버터')) {
    allergenList.push('유제품');
  }
  if (combinedText.includes('계란')) allergenList.push('달걀');
  if (combinedText.includes('대두') || combinedText.includes('콩')) {
    allergenList.push('대두');
  }
  if (combinedText.includes('땅콩') || combinedText.includes('견과') || combinedText.includes('호두')) {
    allergenList.push('견과류');
  }

  return allergenList.length ? allergenList.join(', ') : '알레르기 정보 없음';
}

function normalizeStepDescription(description) {
  const normalized = stripIngredientText(description);
  if (!normalized) {
    return '조리 설명이 아직 등록되지 않았어요.';
  }

  return normalized
    .replace(/^\s*\d+\s*[.)-]?\s*/, '')
    .replace(/^\s*step\s*\d+\s*[.)-]?\s*/i, '')
    .replace(/^\s*\d+\s*단계\s*/g, '')
    .trim();
}

// eslint-disable-next-line no-unused-vars
function buildStepTitle(stepSeq) {
  return `STEP ${stepSeq}`;
}

function renderStars(rating) {
  const safeRating = Math.max(1, Math.min(5, Number(rating || 5)));
  return `${'★'.repeat(safeRating)}${'☆'.repeat(5 - safeRating)}`;
}

function summarize(value) {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return '설명이 아직 등록되지 않았어요.';
  }
  return normalized.length <= 150 ? normalized : `${normalized.slice(0, 150)}...`;
}

function formatCurrency(value) {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(toNumber(value, 0));
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
  if (name.includes('국') || name.includes('스프') || name.includes('찌개')) return '🍲';
  if (name.includes('무침') || name.includes('샐러드')) return '🥗';
  if (name.includes('볶음') || name.includes('구이')) return '🍳';
  if (name.includes('디저트') || name.includes('간식')) return '🍰';
  return '🍽️';
}

function resolveApiImageUrl(imageUrl) {
  if (!imageUrl) {
    return '';
  }
  if (/^https?:\/\//i.test(imageUrl)) {
    return imageUrl;
  }

  const explicitBaseUrl = (process.env.REACT_APP_API_BASE_URL || '')
    .trim()
    .replace(/\/+$/, '');

  if (explicitBaseUrl) {
    return `${explicitBaseUrl}${imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`}`;
  }

  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/backend')) {
    return imageUrl.startsWith('/backend/')
      ? imageUrl
      : `/backend${imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`}`;
  }

  return imageUrl;
}

function resolveReviewImageUrl(imageUrl) {
  const resolvedUrl = resolveApiImageUrl(imageUrl);
  if (!resolvedUrl) {
    return '';
  }
  if (/^https?:\/\//i.test(resolvedUrl)) {
    return resolvedUrl;
  }
  if (resolvedUrl.startsWith('/api/')) {
    return `/backend${resolvedUrl}`;
  }
  return resolvedUrl;
}

function normalizeMiniTrendRows(trendRows) {
  return (Array.isArray(trendRows) ? trendRows : [])
    .map((row) => ({
      avgPrice: Number(row?.avgPrice || 0),
      snapshotDate: row?.snapshotDate || row?.date || '',
    }))
    .filter((row) => Number.isFinite(row.avgPrice) && row.avgPrice > 0)
    .slice(-30);
}

function formatReviewDate(value) {
  if (!value) {
    return '방금 전';
  }

  const date = parseReviewDateValue(value);
  if (!date) {
    return String(value);
  }

  return `${String(date.getFullYear()).slice(-2)}/${padReviewDate(
    date.getMonth() + 1
  )}/${padReviewDate(date.getDate())} ${padReviewDate(date.getHours())}:${padReviewDate(
    date.getMinutes()
  )}`;
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
        Number(value.hour ?? 0),
        Number(value.minute ?? 0),
        Number(value.second ?? 0)
      );
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function padReviewDate(value) {
  return String(value).padStart(2, '0');
}
