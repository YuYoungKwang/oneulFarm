import { useEffect, useState } from 'react';
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
  onToggleWishlist,
  product,
}) {
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    setQuantity(1);
    setSelectedImageIndex(0);
  }, [product.productNo]);

  const selectedImage = product.images[selectedImageIndex] || product.images[0];
  const comparisonMax = Math.max(
    product.priceSnapshot.maxPrice,
    product.priceSnapshot.avgPrice,
    product.salePrice
  );
  const totalPrice = product.salePrice * quantity;
  const expectedSaving = getSavingAmount(product) * quantity;
  const averageRating = (
    product.reviews.reduce((sum, review) => sum + review.rating, 0) /
    product.reviews.length
  ).toFixed(1);

  return (
    <>
      <section className="page-head">
        <div>
          <span className="eyebrow">PRODUCT DETAIL</span>
          <h1>{product.productName}</h1>
          <p>
            상품 정보, 시세 비교, 관련 레시피를 한 화면에서 확인할 수 있도록
            구성했습니다.
          </p>
        </div>
        <div className="page-actions">
          <button className="btn-outline" type="button" onClick={onBack}>
            목록으로
          </button>
          <button
            className={`btn-chip ${isWished ? 'active' : ''}`}
            type="button"
            onClick={() => onToggleWishlist(product.productNo)}
          >
            {isWished ? '찜 완료' : '찜하기'}
          </button>
        </div>
      </section>

      <section className="detail-layout">
        <article
          className="gallery-card"
          style={{
            '--media-soft': product.display.softColor,
            '--media-glow': product.display.glowColor,
          }}
        >
          <div className="gallery-main">
            <div className="gallery-main-symbol">{selectedImage.symbol}</div>
            <div className="gallery-copy">
              <div className="gallery-label">{selectedImage.label}</div>
              <div className="gallery-note">{selectedImage.note}</div>
            </div>
          </div>
          <div className="thumb-row">
            {product.images.map((image, index) => (
              <button
                key={image.imageNo}
                className={`thumb ${index === selectedImageIndex ? 'active' : ''}`}
                type="button"
                onClick={() => setSelectedImageIndex(index)}
              >
                <span>{image.symbol}</span>
                <small>{image.label}</small>
              </button>
            ))}
          </div>
        </article>

        <article className="purchase-card">
          <span className="eyebrow">평균가 이하 상품</span>
          <h2 className="detail-title">{product.productName}</h2>
          <p className="muted-copy">
            {product.origin} · 직접 매입 · 소분 판매 ·{' '}
            {product.recommendedFor.join(' · ')}
          </p>
          <div className="price-large">{formatCurrency(product.salePrice)}</div>
          <div className="avg">
            평균가 {formatCurrency(product.priceSnapshot.avgPrice)} · 약{' '}
            {formatPercent(product.priceMatch.savingRate)} 절약
          </div>
          <div className="meta-row">
            {product.recommendedFor.map((tag) => (
              <span className="meta-pill" key={tag}>
                {tag}
              </span>
            ))}
          </div>
          <div className="qty-row">
            <div className="qty">
              <button
                type="button"
                onClick={() => setQuantity((prevQuantity) => Math.max(1, prevQuantity - 1))}
              >
                -
              </button>
              <span>{quantity}</span>
              <button
                type="button"
                onClick={() =>
                  setQuantity((prevQuantity) =>
                    Math.min(product.stockQty, prevQuantity + 1)
                  )
                }
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
            >
              장바구니 담기
            </button>
            <button
              className="btn-outline"
              type="button"
              onClick={() => onToggleWishlist(product.productNo)}
            >
              {isWished ? '찜 해제' : '찜하기'}
            </button>
          </div>
          <div className="notice">
            주문 시점 평균가는 `OFT_ORDER_ITEM.MARKET_AVG_PRICE`로 저장되고,
            절약 금액은 대시보드 집계에 바로 사용할 수 있습니다.
          </div>
          <div className="detail-inline-meta">
            <span>현재 장바구니 수량 {cartQuantity}개</span>
            <span>{product.deliveryInfo}</span>
          </div>
        </article>
      </section>

      <section className="quick-grid detail-kpis">
        <article className="quick-card soft-green">
          <div className="quick-label">시세 스냅샷 기준일</div>
          <div className="quick-value">
            {dateFormatter.format(new Date(product.priceSnapshot.snapshotDate))}
          </div>
          <div className="section-sub">{product.priceSnapshot.sourceName}</div>
        </article>
        <article className="quick-card">
          <div className="quick-label">최저가 구간</div>
          <div className="quick-value">
            {formatCurrency(product.priceSnapshot.minPrice)}
          </div>
          <div className="section-sub">당일 최저 수집값</div>
        </article>
        <article className="quick-card">
          <div className="quick-label">변동률</div>
          <div className="quick-value">
            {product.priceSnapshot.changeRate > 0 ? '+' : ''}
            {product.priceSnapshot.changeRate}%
          </div>
          <div className="section-sub">최근 스냅샷 대비</div>
        </article>
        <article className="quick-card soft-yellow">
          <div className="quick-label">리뷰 평점</div>
          <div className="quick-value">{averageRating}</div>
          <div className="section-sub">리뷰 {product.reviews.length}건</div>
        </article>
      </section>

      <section className="grid-2 section">
        <article className="tab-card">
          <div className="tab-row">
            <span className="tab active">상세정보</span>
            <span className="tab">상품 기준</span>
            <span className="tab">보관 안내</span>
          </div>
          <div className="card-title">상품 정보</div>
          <div className="card-sub">
            `OFT_PRODUCT`, `OFT_PRODUCT_IMAGE` 기준으로 상품 상세 정보를 배치했습니다.
          </div>
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
              <strong>포장 메모</strong>
              <span>{product.purchaseNote}</span>
            </div>
          </div>
        </article>

        <article className="tab-card">
          <div className="card-title">시세 비교</div>
          <div className="card-sub">
            `OFT_PRICE_SNAPSHOT`, `OFT_PRODUCT_PRICE_MATCH` 기준 수치입니다.
          </div>
          <div className="compare-bars">
            <CompareBar
              label="평균가"
              value={product.priceSnapshot.avgPrice}
              width={(product.priceSnapshot.avgPrice / comparisonMax) * 100}
              tone="neutral"
            />
            <CompareBar
              label="판매가"
              value={product.salePrice}
              width={(product.salePrice / comparisonMax) * 100}
              tone="primary"
            />
            <CompareBar
              label="최저가"
              value={product.priceSnapshot.minPrice}
              width={(product.priceSnapshot.minPrice / comparisonMax) * 100}
              tone="accent"
            />
          </div>
        </article>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <div className="section-title">이 재료로 만들 수 있는 레시피</div>
            <div className="section-sub">
              `OFT_PRODUCT_RECIPE_MAP` 기준 추천 레시피 예시
            </div>
          </div>
          <button className="section-link" type="button">
            레시피 보기
          </button>
        </div>
        <div className="recipe-grid">
          {product.recipes.map((recipe) => (
            <article className="recipe-card" key={recipe.recipeNo}>
              <div className="recipe-thumb">{recipe.symbol}</div>
              <h3>{recipe.recipeName}</h3>
              <div className="meta-row">
                <span className="meta-pill">{recipe.cookTime}</span>
                <span className="meta-pill">{recipe.difficulty}</span>
                <span className="meta-pill">
                  매칭 {Math.round(recipe.matchScore)}점
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <article className="review-card">
          <div className="section-head">
            <div>
              <div className="section-title">리뷰 미리보기</div>
              <div className="section-sub">
                `OFT_REVIEW` 기준 최근 상품 리뷰를 노출하는 영역입니다.
              </div>
            </div>
          </div>
          <div className="review-list">
            {product.reviews.map((review) => (
              <div className="review-row" key={review.reviewNo}>
                <div className="review-head">
                  <strong>{review.author}</strong>
                  <span className="review-stars">
                    {'★'.repeat(review.rating)}
                  </span>
                </div>
                <p>{review.content}</p>
                <span className="section-sub">{review.createdAt}</span>
              </div>
            ))}
          </div>
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
