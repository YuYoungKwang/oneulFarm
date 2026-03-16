import { useDeferredValue } from 'react';
import { HeartIcon, SearchIcon } from './ProductIcons';
import {
  applyFilters,
  formatCurrency,
  formatPercent,
  getBadgeLabel,
  getBadgeTone,
  getDiscountRate,
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
  const seasonalCount = products.filter(
    (product) => product.isSeasonal === 'Y' && product.saleStatus === 'SELLING'
  ).length;
  const underAverageCount = products.filter(
    (product) => product.priceMatch.badgeType === 'UNDER_AVG'
  ).length;
  const readyForSingleCount = products.filter((product) =>
    isSingleHouseholdFriendly(product)
  ).length;

  return (
    <>
      <section className="page-head">
        <div>
          <span className="eyebrow">PRODUCT / PRODUCT_DETAIL</span>
          <h1>오늘 장보기</h1>
          <p>
            평균 시세보다 유리한 상품과 1인 가구용 소분 구성을 빠르게
            비교하세요.
          </p>
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
          <div className="section-sub">`OFT_PRODUCT_PRICE_MATCH.BADGE_TYPE` 기준</div>
        </article>
        <article className="quick-card soft-yellow">
          <div className="quick-label">평균 절약 예상</div>
          <div className="quick-value">{formatCurrency(averageSaving)}</div>
          <div className="section-sub">`OFT_PRICE_SNAPSHOT.AVG_PRICE` 비교</div>
        </article>
        <article className="quick-card">
          <div className="quick-label">제철 상품</div>
          <div className="quick-value">{seasonalCount}개</div>
          <div className="section-sub">`OFT_PRODUCT.IS_SEASONAL = 'Y'`</div>
        </article>
        <article className="quick-card">
          <div className="quick-label">1인 가구 추천</div>
          <div className="quick-value">{readyForSingleCount}개</div>
          <div className="section-sub">소분 무게와 추천 태그 기준</div>
        </article>
      </section>

      <section className="layout-sidebar">
        <aside className="sidebar-card">
          <div className="side-title">필터</div>

          <div className="side-group">
            <div className="side-title small-title">카테고리</div>
            <div className="check-list">
              <FilterButton
                active={filters.category === 'ALL'}
                label="전체"
                onClick={() => onUpdateFilter('category', 'ALL')}
              />
              {categories.map((categoryName) => (
                <FilterButton
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
            <div className="check-list">
              <FilterButton
                active={filters.priceRange === 'ALL'}
                label="전체"
                onClick={() => onUpdateFilter('priceRange', 'ALL')}
              />
              <FilterButton
                active={filters.priceRange === 'UNDER_3000'}
                label="3천원 미만"
                onClick={() => onUpdateFilter('priceRange', 'UNDER_3000')}
              />
              <FilterButton
                active={filters.priceRange === 'FROM_3000_TO_5000'}
                label="3천원~5천원"
                onClick={() =>
                  onUpdateFilter('priceRange', 'FROM_3000_TO_5000')
                }
              />
              <FilterButton
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
                label="1인가구"
                onClick={() => onToggleTag('SINGLE')}
              />
            </div>
          </div>

          <button className="btn side-cta" type="button" onClick={onResetFilters}>
            초기화
          </button>
        </aside>

        <div>
          <section className="card card-gap">
            <div className="toolbar">
              <label className="search-shell">
                <input
                  type="text"
                  placeholder="상품명, 산지, 키워드로 검색"
                  value={filters.search}
                  onChange={(event) =>
                    onUpdateFilter('search', event.target.value)
                  }
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
                  label="높은 절약순"
                  onClick={() => onUpdateFilter('sort', 'HIGH_SAVING')}
                />
                <TagChip
                  active={filters.sort === 'LATEST'}
                  label="최신순"
                  onClick={() => onUpdateFilter('sort', 'LATEST')}
                />
              </div>
            </div>
            <div className="section-sub">
              총 {filteredProducts.length}개 상품 · 직접 매입 후 소분 판매
            </div>
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
              <div className="empty-icon">🥕</div>
              <h2>조건에 맞는 상품이 없습니다.</h2>
              <p>검색어를 줄이거나 필터를 초기화해서 다시 확인해보세요.</p>
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
    <button className={`btn-chip ${active ? 'active' : ''}`} type="button" onClick={onClick}>
      {label}
    </button>
  );
}

function FilterButton({ active, label, onClick }) {
  return (
    <button className={`check ${active ? 'active' : ''}`} type="button" onClick={onClick}>
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
  return (
    <article
      className="product-card"
      style={{
        '--media-soft': product.display.softColor,
        '--media-glow': product.display.glowColor,
      }}
    >
      <div className="product-media">
        <div className="product-badge-row">
          <span className={`badge ${getBadgeTone(product)}`}>
            {getBadgeLabel(product)}
          </span>
          <button
            className={`icon-circle ${isWished ? 'active' : ''}`}
            type="button"
            aria-label="찜하기"
            onClick={() => onToggleWishlist(product.productNo)}
          >
            <HeartIcon filled={isWished} />
          </button>
        </div>
        <div className="product-symbol">{product.display.symbol}</div>
        <div className="product-media-copy">{product.origin}</div>
      </div>

      <div className="product-copy">
        <div className="product-topline">
          <span className="meta-pill">{product.categoryName}</span>
          <span className="product-stock">
            재고 {product.stockQty}
            {product.unit === 'ea' ? '개' : '팩'}
          </span>
        </div>
        <div className="product-name">{product.productName}</div>
        <div className="product-meta">
          {product.origin} · {product.packageWeight}
          {product.unit}
        </div>
        <div className="price-row">
          <div className="price">{formatCurrency(product.salePrice)}</div>
          <div className="discount-copy">
            평균 대비 {formatCurrency(getSavingAmount(product))} 절약
          </div>
        </div>
        <div className="avg">
          평균가 {formatCurrency(product.priceSnapshot.avgPrice)} ·{' '}
          {formatPercent(getDiscountRate(product))}
        </div>
      </div>

      <div className="product-foot">
        <button
          className="btn-soft"
          type="button"
          onClick={() => onAddToCart(product.productNo)}
        >
          담기 {cartQuantity > 0 ? `(${cartQuantity})` : ''}
        </button>
        <button
          className="btn-outline compact-btn"
          type="button"
          onClick={() => onOpenProduct(product.productNo)}
        >
          상세 보기
        </button>
      </div>
    </article>
  );
}
