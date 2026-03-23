import { useDeferredValue } from 'react';
import { HeartIcon, SearchIcon } from './ProductIcons';
import SafeImage from './SafeImage';
import {
  applyFilters,
  formatCurrency,
  formatPercent,
  getSavingAmount,
  isSingleHouseholdFriendly,
} from './productUiUtils';

export default function ProductListPage({
  cart,
  categories,
  filters,
  onAddToCart,
  onOpenProduct,
  onResetFilters,
  onToggleTag,
  onToggleWishlist,
  onUpdateFilter,
  products,
  wishlist,
}) {
  const deferredSearch = useDeferredValue(filters.search);
  const filteredProducts = applyFilters(products, filters, deferredSearch);
  const averageSaving = filteredProducts.length
    ? Math.round(
        filteredProducts.reduce(
          (sum, product) => sum + getSavingAmount(product),
          0
        ) / filteredProducts.length
      )
    : 0;
  const sellingProducts = products.filter((product) => product.saleStatus === 'SELLING');
  const seasonalCount = sellingProducts.filter(
    (product) => product.isSeasonal === 'Y'
  ).length;
  const underAverageCount = sellingProducts.filter(
    (product) => product.priceMatch.badgeType === 'UNDER_AVG'
  ).length;
  const readyForSingleCount = sellingProducts.filter((product) =>
    isSingleHouseholdFriendly(product)
  ).length;

  return (
    <>
      <section className="page-head">
        <div>
          <span className="eyebrow">Products</span>
          <h1>오늘의 상품 보기</h1>
          <p>지금 담기 좋은 상품을 비교하고, 원하는 조건으로 빠르게 골라보세요.</p>
        </div>

        <div className="page-actions">
          <TagChip
            active={filters.tags.includes('UNDER_AVG')}
            label="평균가 이하"
            onClick={() => onToggleTag('UNDER_AVG')}
          />
          <TagChip
            active={filters.tags.includes('SEASONAL')}
            label="제철"
            onClick={() => onToggleTag('SEASONAL')}
          />
          <TagChip
            active={filters.tags.includes('SINGLE')}
            label="1인 가구 추천"
            onClick={() => onToggleTag('SINGLE')}
          />
        </div>
      </section>

      <section className="quick-grid">
        <article className="quick-card soft-green">
          <div className="quick-label">평균가 이하 상품</div>
          <div className="quick-value">{underAverageCount}개</div>
          <div className="section-sub">가격 메리트가 좋은 상품</div>
        </article>
        <article className="quick-card soft-yellow">
          <div className="quick-label">평균 절약 예상</div>
          <div className="quick-value">{formatCurrency(averageSaving)}</div>
          <div className="section-sub">상품 1개 기준 절약 예상 금액</div>
        </article>
        <article className="quick-card">
          <div className="quick-label">제철 상품</div>
          <div className="quick-value">{seasonalCount}개</div>
          <div className="section-sub">지금 먹기 좋은 제철 상품</div>
        </article>
        <article className="quick-card">
          <div className="quick-label">1인 가구 추천</div>
          <div className="quick-value">{readyForSingleCount}개</div>
          <div className="section-sub">소분 구매에 맞는 구성</div>
        </article>
      </section>

      <section className="layout-sidebar">
        <aside className="sidebar-card">
          <div className="side-title">필터</div>

          <div className="side-group">
            <div className="side-title small-title">카테고리</div>
            <div className="filter-option-list">
              <FilterOptionButton
                active={filters.category === 'ALL'}
                label="전체"
                onClick={() => onUpdateFilter('category', 'ALL')}
              />
              {categories.map((categoryName) => (
                <FilterOptionButton
                  key={categoryName}
                  active={filters.category === categoryName}
                  label={categoryName}
                  onClick={() => onUpdateFilter('category', categoryName)}
                />
              ))}
            </div>
          </div>

          <div className="side-group">
            <div className="side-title small-title">가격 조건</div>
            <div className="filter-option-list">
              <FilterOptionButton
                active={filters.priceRange === 'ALL'}
                label="전체"
                onClick={() => onUpdateFilter('priceRange', 'ALL')}
              />
              <FilterOptionButton
                active={filters.priceRange === 'UNDER_3000'}
                label="3천원 미만"
                onClick={() => onUpdateFilter('priceRange', 'UNDER_3000')}
              />
              <FilterOptionButton
                active={filters.priceRange === 'FROM_3000_TO_5000'}
                label="3천원~5천원"
                onClick={() => onUpdateFilter('priceRange', 'FROM_3000_TO_5000')}
              />
              <FilterOptionButton
                active={filters.priceRange === 'OVER_5000'}
                label="5천원 이상"
                onClick={() => onUpdateFilter('priceRange', 'OVER_5000')}
              />
            </div>
          </div>

          <div className="side-group">
            <div className="side-title small-title">추천 태그</div>
            <div className="filter-row">
              <TagChip
                active={filters.tags.includes('UNDER_AVG')}
                label="평균가 이하"
                onClick={() => onToggleTag('UNDER_AVG')}
              />
              <TagChip
                active={filters.tags.includes('SEASONAL')}
                label="제철"
                onClick={() => onToggleTag('SEASONAL')}
              />
              <TagChip
                active={filters.tags.includes('SINGLE')}
                label="1인 가구 추천"
                onClick={() => onToggleTag('SINGLE')}
              />
            </div>
          </div>

          <button className="btn side-cta" type="button" onClick={onResetFilters}>
            필터 초기화
          </button>
        </aside>

        <div>
          <section className="card card-gap">
            <div className="toolbar">
              <label className="search-shell">
                <input
                  type="text"
                  placeholder="상품명, 원산지, 설명으로 검색"
                  value={filters.search}
                  onChange={(event) => onUpdateFilter('search', event.target.value)}
                />
                <SearchIcon />
              </label>

              <div className="chips">
                <TagChip
                  active={filters.sort === 'RECOMMENDED'}
                  label="추천순"
                  onClick={() => onUpdateFilter('sort', 'RECOMMENDED')}
                />
                <TagChip
                  active={filters.sort === 'LOW_PRICE'}
                  label="낮은 가격순"
                  onClick={() => onUpdateFilter('sort', 'LOW_PRICE')}
                />
                <TagChip
                  active={filters.sort === 'HIGH_SAVING'}
                  label="절약 높은 순"
                  onClick={() => onUpdateFilter('sort', 'HIGH_SAVING')}
                />
                <TagChip
                  active={filters.sort === 'LATEST'}
                  label="최신순"
                  onClick={() => onUpdateFilter('sort', 'LATEST')}
                />
              </div>
            </div>

            <div className="section-sub">총 {filteredProducts.length}개 상품을 보고 있어요.</div>
          </section>

          {filteredProducts.length ? (
            <div className="product-grid">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.productNo}
                  cartQuantity={cart[product.productNo] || 0}
                  isWished={wishlist.includes(product.productNo)}
                  onAddToCart={onAddToCart}
                  onOpenProduct={onOpenProduct}
                  onToggleWishlist={onToggleWishlist}
                  product={product}
                />
              ))}
            </div>
          ) : (
            <section className="empty-state">
              <div className="empty-icon">NO</div>
              <h2>조건에 맞는 상품이 없습니다.</h2>
              <p>검색어나 필터를 조금 바꿔서 다시 찾아보세요.</p>
              <button className="btn" type="button" onClick={onResetFilters}>
                필터 초기화
              </button>
            </section>
          )}
        </div>
      </section>
    </>
  );
}

function TagChip({ active, label, onClick }) {
  return (
    <button
      className={`btn-chip ${active ? 'active' : ''}`}
      type="button"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function FilterOptionButton({ active, label, onClick }) {
  return (
    <button
      className={`filter-option ${active ? 'active' : ''}`}
      type="button"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function ProductCard({
  cartQuantity,
  isWished,
  onAddToCart,
  onOpenProduct,
  onToggleWishlist,
  product,
}) {
  const isSoldOut = product.stockQty <= 0 || product.saleStatus !== 'SELLING';
  const isCartFull = cartQuantity >= product.stockQty && product.stockQty > 0;
  const mainImage = product.mainImage || product.images?.[0] || null;
  const hasImage = Boolean(mainImage?.imageUrl);

  return (
    <article
      className="product-card"
      style={{
        '--media-soft': product.display.softColor,
        '--media-glow': product.display.glowColor,
      }}
    >
      <div className={`product-media ${hasImage ? 'has-image' : ''}`}>
        {hasImage ? (
          <SafeImage
            alt={product.productName}
            className="product-media-image"
            fallback={<div className="product-symbol">{product.display.symbol}</div>}
            src={mainImage.imageUrl}
          />
        ) : null}

        <div className="product-badge-row">
          <button
            aria-label={isWished ? '찜 해제' : '찜하기'}
            className={`icon-circle ${isWished ? 'active' : ''}`}
            type="button"
            onClick={() => onToggleWishlist(product.productNo)}
          >
            <HeartIcon filled={isWished} />
          </button>
        </div>

        {!hasImage ? <div className="product-symbol">{product.display.symbol}</div> : null}
      </div>

      <div className="product-copy">
        <div className="product-topline">
          <span className="meta-pill">{product.categoryName}</span>
          <span className="product-stock">재고 {product.stockQty}개</span>
        </div>

        <button
          className="product-name-button"
          type="button"
          onClick={() => onOpenProduct(product.productNo)}
        >
          <h2 className="product-name">{product.productName}</h2>
        </button>

        <div className="product-meta">
          {product.origin} · {product.packageWeight}
          {product.unit}
        </div>

        <div className="price-row">
          <div className="price">{formatCurrency(product.salePrice)}</div>
          <div className="discount-copy">
            평균가 대비 {formatCurrency(getSavingAmount(product))} ·{' '}
            {formatPercent(product.priceMatch.savingRate)} 절약
          </div>
        </div>

        <div className="avg">평균가 {formatCurrency(product.priceSnapshot.avgPrice)}</div>

        <div className="product-foot">
          <button
            className="btn-outline"
            type="button"
            onClick={() => onOpenProduct(product.productNo)}
          >
            상세 보기
          </button>
          <button
            className="btn"
            type="button"
            onClick={() => onAddToCart(product.productNo, 1)}
            disabled={isSoldOut || isCartFull}
          >
            {isSoldOut ? '품절' : isCartFull ? '재고 한도 도달' : '장바구니 담기'}
          </button>
        </div>
      </div>
    </article>
  );
}
