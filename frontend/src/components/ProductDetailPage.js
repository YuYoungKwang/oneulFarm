import { useEffect, useMemo, useState } from 'react';
import SafeImage from './SafeImage';
import { fetchRecipeList } from './recipeApi';
import {
  dateFormatter,
  formatCurrency,
  formatPercent,
  getSavingAmount,
} from './productUiUtils';

export default function ProductDetailPage({
  cartQuantity,
  isWished,
  onAddToCart,
  onBack,
  onOpenRecipe,
  onOpenRecipeList,
  onToggleWishlist,
  product,
}) {
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [relatedRecipes, setRelatedRecipes] = useState([]);
  const [relatedRecipesStatus, setRelatedRecipesStatus] = useState('idle');

  const images = product.images?.length
    ? product.images
    : [
        {
          imageNo: `${product.productNo}-placeholder`,
          imageUrl: '',
          symbol: product.display?.symbol || 'OF',
        },
      ];
  const reviews = product.reviews || [];
  const recommendedTags = product.recommendedFor || [];
  const selectedImage = images[selectedImageIndex] || images[0];
  const hasSelectedImage = Boolean(selectedImage?.imageUrl);
  const isSoldOut = Number(product.stockQty || 0) <= 0 || product.saleStatus !== 'SELLING';
  const totalPrice = Number(product.salePrice || 0) * quantity;
  const expectedSaving = getSavingAmount(product) * quantity;
  const averageRating = reviews.length
    ? (reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length).toFixed(1)
    : '0.0';
  const displayAvgPrice =
    Number(product.priceSnapshot?.displayAvgPrice || 0) || Number(product.priceSnapshot?.avgPrice || 0);
  const displayMinPrice =
    Number(product.priceSnapshot?.displayMinPrice || 0) || Number(product.priceSnapshot?.minPrice || 0);
  const displayMaxPrice =
    Number(product.priceSnapshot?.displayMaxPrice || 0) || Number(product.priceSnapshot?.maxPrice || 0);
  const comparisonMax = Math.max(
    displayAvgPrice,
    displayMinPrice,
    displayMaxPrice,
    Number(product.salePrice || 0),
    1
  );
  const snapshotDate = new Date(product.priceSnapshot?.snapshotDate);
  const snapshotDateLabel = Number.isNaN(snapshotDate.getTime())
    ? '최근 반영'
    : dateFormatter.format(snapshotDate);
  const recipeSearchKeyword = useMemo(() => buildRecipeSearchKeyword(product), [product]);

  useEffect(() => {
    setQuantity(product.stockQty > 0 ? 1 : 0);
    setSelectedImageIndex(0);
  }, [product.productNo, product.stockQty]);

  useEffect(() => {
    let cancelled = false;

    async function loadRelatedRecipes() {
      if (!recipeSearchKeyword) {
        setRelatedRecipes([]);
        setRelatedRecipesStatus('empty');
        return;
      }

      setRelatedRecipesStatus('loading');

      try {
        const data = await fetchRecipeList({
          ingredientKeyword: recipeSearchKeyword,
          sort: 'RECOMMENDED',
          limit: 4,
        });

        if (cancelled) {
          return;
        }

        const recipeList = data?.recipeList || [];
        setRelatedRecipes(recipeList);
        setRelatedRecipesStatus(recipeList.length ? 'success' : 'empty');
      } catch (error) {
        if (!cancelled) {
          setRelatedRecipes([]);
          setRelatedRecipesStatus('error');
        }
      }
    }

    loadRelatedRecipes();

    return () => {
      cancelled = true;
    };
  }, [recipeSearchKeyword]);

  const handleOpenRecipeList = () => {
    if (onOpenRecipeList) {
      onOpenRecipeList({ ingredientKeyword: recipeSearchKeyword });
      return;
    }

    if (recipeSearchKeyword) {
      window.location.hash = `#/recipes?ingredientKeyword=${encodeURIComponent(
        recipeSearchKeyword
      )}`;
      return;
    }

    window.location.hash = '#/recipes';
  };

  return (
    <>
      <section className="detail-layout">
        <article
          className="gallery-card"
          style={{
            '--media-soft': product.display?.softColor || '#eef5ef',
            '--media-glow': product.display?.glowColor || 'rgba(243, 200, 91, 0.24)',
          }}
        >
          <div className={`gallery-main ${hasSelectedImage ? 'has-image' : ''}`}>
            {hasSelectedImage ? (
              <SafeImage
                alt={product.productName}
                className="gallery-main-image"
                fallback={<div className="gallery-main-symbol">{selectedImage.symbol}</div>}
                src={selectedImage.imageUrl}
              />
            ) : (
              <div className="gallery-main-symbol">{selectedImage.symbol}</div>
            )}
          </div>

          {images.length > 1 ? (
            <div className="thumb-row">
              {images.map((image, index) => (
                <button
                  key={image.imageNo || `${product.productNo}-${index}`}
                  aria-label={`${product.productName} 이미지 ${index + 1}`}
                  className={`thumb ${index === selectedImageIndex ? 'active' : ''}`}
                  type="button"
                  onClick={() => setSelectedImageIndex(index)}
                >
                  {image.imageUrl ? (
                    <SafeImage
                      alt=""
                      className="thumb-image"
                      fallback={<span>{image.symbol}</span>}
                      src={image.imageUrl}
                    />
                  ) : (
                    <span>{image.symbol}</span>
                  )}
                </button>
              ))}
            </div>
          ) : null}
        </article>

        <article className="purchase-card">
          <div className="purchase-card__top">
            <span className="eyebrow">오늘 추천 상품</span>
            <div className="purchase-card__quick-actions">
              <button className="btn-outline compact-btn" type="button" onClick={onBack}>
                목록으로
              </button>
              <button
                className={`btn-chip compact-btn ${isWished ? 'active' : ''}`}
                type="button"
                onClick={() => onToggleWishlist(product.productNo)}
              >
                {isWished ? '찜 완료' : '찜하기'}
              </button>
            </div>
          </div>
          <h2 className="detail-title">{product.productName}</h2>
          <p className="muted-copy">
            {product.origin} · {product.packageWeight}
            {product.unit} · {recommendedTags.join(' · ')}
          </p>

          <div className="price-large">{formatCurrency(product.salePrice)}</div>
          <div className="avg">
            평균가 {formatCurrency(displayAvgPrice)} ·{' '}
            {formatPercent(product.priceMatch?.savingRate)} 절약
          </div>

          <div className="meta-row">
            {recommendedTags.map((tag) => (
              <span className="meta-pill" key={tag}>
                {tag}
              </span>
            ))}
          </div>

          <div className="qty-row">
            <div className="qty">
              <button
                type="button"
                onClick={() =>
                  setQuantity((currentQuantity) =>
                    isSoldOut ? 0 : Math.max(1, currentQuantity - 1)
                  )
                }
                disabled={isSoldOut || quantity <= 1}
              >
                -
              </button>
              <span>{quantity}</span>
              <button
                type="button"
                onClick={() =>
                  setQuantity((currentQuantity) =>
                    Math.min(Number(product.stockQty || 0), currentQuantity + 1)
                  )
                }
                disabled={isSoldOut || quantity >= Number(product.stockQty || 0)}
              >
                +
              </button>
            </div>
            <span className="muted-copy">남은 수량 {product.stockQty}개</span>
          </div>

          <div className="detail-price-breakdown">
            <div className="insight-item">
              <strong>총 상품 금액</strong>
              <span>{formatCurrency(totalPrice)}</span>
            </div>
            <div className="insight-item">
              <strong>예상 절약 금액</strong>
              <span>{formatCurrency(expectedSaving)}</span>
            </div>
          </div>

          <div className="hero-actions">
            <button
              className="btn"
              type="button"
              onClick={() => onAddToCart(product.productNo, quantity)}
              disabled={isSoldOut || quantity < 1}
            >
              {isSoldOut ? '품절' : '장바구니 담기'}
            </button>
          </div>

          <div className="notice">오후 2시 이전 주문 시 당일 출고 기준으로 준비해드려요.</div>

          <div className="detail-inline-meta">
            <span>현재 장바구니 수량 {cartQuantity}개</span>
            <span>{product.deliveryInfo}</span>
          </div>
        </article>
      </section>

      <section className="section detail-recipe-section">
        <div className="section-head">
          <div>
            <div className="section-title">이 재료로 만들 수 있는 레시피</div>
            <div className="section-sub">
              {recipeSearchKeyword
                ? `"${recipeSearchKeyword}" 재료 기준으로 인기 레시피를 모아봤어요.`
                : '관련 레시피를 불러오고 있어요.'}
            </div>
          </div>
          <button className="section-link" type="button" onClick={handleOpenRecipeList}>
            레시피 더 보기
          </button>
        </div>

        {relatedRecipesStatus === 'loading' ? (
          <div className="recipe-grid">
            {Array.from({ length: 4 }).map((_, index) => (
              <article className="recipe-card recipe-card--state" key={`loading-${index}`}>
                <div className="recipe-thumb recipe-thumb--placeholder" />
                <h3>레시피를 불러오는 중입니다</h3>
                <p className="recipe-card__summary">조금만 기다리면 관련 레시피를 보여드릴게요.</p>
              </article>
            ))}
          </div>
        ) : relatedRecipesStatus === 'success' ? (
          <div className="recipe-list-grid recipe-list-grid--compact">
            {relatedRecipes.map((recipe) => (
              <article className="recipe-list-card recipe-list-card--compact" key={recipe.recipeNo}>
                <div className="recipe-list-card__visual">
                  <button
                    className="recipe-list-card__media recipe-list-card__media--compact"
                    type="button"
                    onClick={() => onOpenRecipe?.(recipe.recipeNo)}
                  >
                    {recipe.imageUrl ? (
                      <SafeImage
                        alt={recipe.recipeName}
                        fallback={
                          <div className="recipe-list-card__fallback recipe-list-card__fallback--compact">
                            {getRecipeEmoji(recipe.recipeName)}
                          </div>
                        }
                        src={recipe.imageUrl}
                      />
                    ) : (
                      <div className="recipe-list-card__fallback recipe-list-card__fallback--compact">
                        {getRecipeEmoji(recipe.recipeName)}
                      </div>
                    )}
                  </button>

                  <div className="recipe-list-card__badge-row">
                    {recipe.calories != null ? (
                      <span className="recipe-badge recipe-badge--green">
                        {Math.round(recipe.calories)} kcal
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="recipe-list-card__body">
                  <div className="recipe-list-card__head">
                    <button
                      className="recipe-list-card__title recipe-list-card__title--compact"
                      type="button"
                      onClick={() => onOpenRecipe?.(recipe.recipeNo)}
                    >
                      {recipe.recipeName}
                    </button>
                    <p className="recipe-list-card__summary recipe-list-card__summary--compact">
                      {summarizeRecipeDescription(recipe.description)}
                    </p>
                  </div>

                  <div className="recipe-list-card__meta">
                    <span className="recipe-pill">{recipe.cookTime || '조리 시간 미정'}</span>
                    <span className="recipe-pill">{recipe.difficulty || '난이도 미정'}</span>
                  </div>

                  <div className="recipe-list-card__foot recipe-list-card__foot--compact">
                    <button
                      className="btn recipe-list-card__action recipe-list-card__action--compact"
                      type="button"
                      onClick={() => onOpenRecipe?.(recipe.recipeNo)}
                    >
                      레시피 보기
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : relatedRecipesStatus === 'error' ? (
          <article className="recipe-card recipe-card--state">
            <div className="recipe-thumb recipe-thumb--placeholder">!</div>
            <h3>관련 레시피를 불러오지 못했어요</h3>
            <p className="recipe-card__summary">
              레시피 더 보기에서 전체 목록을 직접 확인해 주세요.
            </p>
          </article>
        ) : (
          <article className="recipe-card recipe-card--state">
            <div className="recipe-thumb recipe-thumb--placeholder">-</div>
            <h3>연결된 레시피가 아직 없어요</h3>
            <p className="recipe-card__summary">
              레시피 더 보기로 이동하면 해당 재료로 바로 검색해드릴게요.
            </p>
          </article>
        )}
      </section>

      <section className="quick-grid detail-kpis">
        <article className="quick-card soft-green">
          <div className="quick-label">시세 반영일</div>
          <div className="quick-value">{snapshotDateLabel}</div>
          <div className="section-sub">
            {formatMarketSource(product.priceSnapshot?.sourceName)}
          </div>
        </article>
        <article className="quick-card">
          <div className="quick-label">평균 시세</div>
          <div className="quick-value">{formatCurrency(displayAvgPrice)}</div>
          <div className="section-sub">최근 공개 시세 기준</div>
        </article>
        <article className="quick-card">
          <div className="quick-label">시세 변동</div>
          <div className="quick-value">
            {Number(product.priceSnapshot?.changeRate || 0) > 0 ? '+' : ''}
            {product.priceSnapshot?.changeRate || 0}%
          </div>
          <div className="section-sub">최근 시세 변화</div>
        </article>
        <article className="quick-card soft-yellow">
          <div className="quick-label">리뷰 평점</div>
          <div className="quick-value">{averageRating}</div>
          <div className="section-sub">리뷰 {reviews.length}건</div>
        </article>
      </section>

      <section className="grid-2 section">
        <article className="tab-card">
          <div className="tab-row">
            <span className="tab active">상세 정보</span>
            <span className="tab">상품 특징</span>
            <span className="tab">보관 안내</span>
          </div>
          <div className="card-title">상품 정보</div>
          <div className="card-sub">상품 설명과 기본 정보를 한눈에 확인할 수 있어요.</div>
          <div className="product-description">{product.description}</div>
          <div className="insight-list">
            <div className="insight-item">
              <strong>원산지</strong>
              <span>{product.origin}</span>
            </div>
            <div className="insight-item">
              <strong>판매 단위</strong>
              <span>
                {product.packageWeight}
                {product.unit}
              </span>
            </div>
            <div className="insight-item">
              <strong>보관 방법</strong>
              <span>{product.storageMethod}</span>
            </div>
            <div className="insight-item">
              <strong>구매 메모</strong>
              <span>{product.purchaseNote}</span>
            </div>
          </div>
        </article>

        <article className="tab-card">
          <div className="card-title">가격 비교</div>
          <div className="card-sub">판매가와 평균 시세를 보기 쉽게 비교해두었어요.</div>
          <div className="compare-bars">
            <CompareBar
              label="평균가"
              tone="neutral"
              value={displayAvgPrice}
              width={(displayAvgPrice / comparisonMax) * 100}
            />
            <CompareBar
              label="판매가"
              tone="primary"
              value={product.salePrice}
              width={(Number(product.salePrice || 0) / comparisonMax) * 100}
            />
            <CompareBar
              label="최저가"
              tone="accent"
              value={displayMinPrice}
              width={(displayMinPrice / comparisonMax) * 100}
            />
          </div>
        </article>
      </section>

      <section className="section">
        <article className="review-card">
          <div className="section-head">
            <div>
              <div className="section-title">리뷰</div>
              <div className="section-sub">실제 구매 후기를 바로 확인할 수 있어요.</div>
            </div>
          </div>

          {reviews.length ? (
            <div className="review-list">
              {reviews.map((review) => (
                <div className="review-row" key={review.reviewNo}>
                  <div className="review-head">
                    <strong>{review.author}</strong>
                    <span className="review-stars">
                      {'★'.repeat(Math.max(0, Number(review.rating || 0)))}
                    </span>
                  </div>
                  <p>{review.content}</p>
                  <span className="section-sub">{formatReviewDate(review.createdAt)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="review-empty">
              <div className="section-sub">아직 등록된 리뷰가 없습니다.</div>
            </div>
          )}
        </article>
      </section>
    </>
  );
}

function CompareBar({ label, tone, value, width }) {
  return (
    <div className="compare-item">
      <strong>{label}</strong>
      <div className="bar">
        <span className={`bar-fill ${tone}`} style={{ width: `${width}%` }} />
      </div>
      <span>{formatCurrency(value)}</span>
    </div>
  );
}

function buildRecipeSearchKeyword(product) {
  const candidateNames = [product?.productName, product?.priceSnapshot?.itemName];

  for (const candidate of candidateNames) {
    const normalizedValue = normalizeIngredientKeyword(candidate);
    if (normalizedValue) {
      return normalizedValue;
    }
  }

  return '';
}

function normalizeIngredientKeyword(value) {
  if (!value) {
    return '';
  }

  const normalizedValue = String(value)
    .replace(/\([^)]*\)/g, ' ')
    .replace(
      /\s+\d+(?:[.,]\d+)?\s*(kg|g|ml|l|개|포기|봉|봉지|팩|단|망|알|송이|박스|병|장)$/i,
      ''
    )
    .replace(/\s+/g, ' ')
    .trim();

  return normalizedValue || String(value).trim();
}

function summarizeRecipeDescription(description) {
  if (!description) {
    return '이 재료로 간단하게 만들 수 있는 레시피입니다.';
  }

  const normalizedDescription = String(description).replace(/\s+/g, ' ').trim();
  if (normalizedDescription.length <= 64) {
    return normalizedDescription;
  }

  return `${normalizedDescription.slice(0, 64).trim()}...`;
}

function getRecipeEmoji(recipeName) {
  const normalizedName = String(recipeName || '').toLowerCase();

  if (
    normalizedName.includes('국') ||
    normalizedName.includes('찌개') ||
    normalizedName.includes('탕') ||
    normalizedName.includes('수프')
  ) {
    return '🍲';
  }
  if (normalizedName.includes('샐러드') || normalizedName.includes('무침')) {
    return '🥗';
  }
  if (
    normalizedName.includes('볶음') ||
    normalizedName.includes('전') ||
    normalizedName.includes('덮밥')
  ) {
    return '🍳';
  }
  if (normalizedName.includes('파스타') || normalizedName.includes('국수')) {
    return '🍝';
  }

  return '🥘';
}

function formatReviewDate(value) {
  if (!value) {
    return '작성일 정보 없음';
  }

  const reviewDate = parseReviewDateValue(value);
  if (!reviewDate) {
    return String(value);
  }

  return reviewDate.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function parseReviewDateValue(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (Array.isArray(value)) {
    const [year, month, day, hour = 0, minute = 0, second = 0] = value;
    const parsedDate = new Date(
      Number(year),
      Number(month || 1) - 1,
      Number(day || 1),
      Number(hour),
      Number(minute),
      Number(second)
    );

    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
  }

  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function formatMarketSource(value) {
  const normalizedValue = String(value || '').trim();

  if (!normalizedValue) {
    return 'KAMIS';
  }

  if (normalizedValue.includes('KAMIS')) {
    return 'KAMIS';
  }

  return normalizedValue;
}
