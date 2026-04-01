import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { CartIcon, HeartIcon, SearchIcon } from './ProductIcons';
import SafeImage from './SafeImage';
import {
  applyFilters,
  formatCurrency,
  getSavingAmount,
} from './productUiUtils';

const TEXT = {
  title: 'Products',
  searchPlaceholder:
    '\uC0C1\uD488\uBA85, \uC6D0\uC0B0\uC9C0, \uC124\uBA85\uC73C\uB85C \uAC80\uC0C9',
  sortRecommended: '\uCD94\uCC9C\uC21C',
  sortLowPrice: '\uB0AE\uC740 \uAC00\uACA9\uC21C',
  sortHighSaving: '\uC808\uC57D \uB192\uC740 \uC21C',
  sortLatest: '\uCD5C\uC2E0\uC21C',
  emptyTitle: '\uC870\uAC74\uC5D0 \uB9DE\uB294 \uC0C1\uD488\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.',
  emptyDescription:
    '\uAC80\uC0C9\uC5B4\uB97C \uBC14\uAFB8\uAC70\uB098 \uC870\uAC74\uC744 \uCD08\uAE30\uD654\uD55C \uB4A4 \uB2E4\uC2DC \uD655\uC778\uD574\uBCF4\uC138\uC694.',
  reset: '\uCD08\uAE30\uD654',
  wishlistAdd: '\uCC1C\uD558\uAE30',
  wishlistRemove: '\uCC1C \uD574\uC81C',
  stock: '\uC7AC\uACE0',
  unitCount: '\uAC1C',
  salePrice: '\uD310\uB9E4\uAC00',
  cartAction: '\uC7A5\uBC14\uAD6C\uB2C8 \uB2F4\uAE30',
  savePrefix: '\uD3C9\uADE0\uAC00 \uB300\uBE44',
  saveSuffix: '\uC808\uC57D',
  avgPrice: '\uD3C9\uADE0\uAC00',
  soldOut: '\uD488\uC808',
  cartFull: '\uC7AC\uACE0 \uD55C\uB3C4 \uB3C4\uB2EC',
  addCart: '\uC7A5\uBC14\uAD6C\uB2C8 \uB2F4\uAE30',
  prevPage: '\uC774\uC804',
  nextPage: '\uB2E4\uC74C',
};

const PRODUCTS_PER_PAGE = 15;

export default function ProductListPage({
  cart,
  filters,
  onAddToCart,
  onOpenProduct,
  onResetFilters,
  onToggleWishlist,
  onUpdateFilter,
  products,
  wishlist,
}) {
  const deferredSearch = useDeferredValue(filters.search);
  const filteredProducts = applyFilters(products, filters, deferredSearch);
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE));
  const visibleProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
    return filteredProducts.slice(startIndex, startIndex + PRODUCTS_PER_PAGE);
  }, [currentPage, filteredProducts]);

  useEffect(() => {
    setCurrentPage(1);
  }, [deferredSearch, filters.sort]);

  useEffect(() => {
    setCurrentPage((previousPage) => Math.min(previousPage, totalPages));
  }, [totalPages]);

  return (
    <>
      <section className="page-head card card-gap product-header-card">
        <div className="product-header-copy">
          <span className="eyebrow product-header-pill">{TEXT.title}</span>
        </div>

        <label className="search-shell product-search-shell">
          <input
            type="text"
            placeholder={TEXT.searchPlaceholder}
            value={filters.search}
            onChange={(event) => onUpdateFilter('search', event.target.value)}
          />
          <SearchIcon />
        </label>

        <div className="chips product-filter-chips">
          <TagChip
            active={filters.sort === 'RECOMMENDED'}
            label={TEXT.sortRecommended}
            onClick={() => onUpdateFilter('sort', 'RECOMMENDED')}
          />
          <TagChip
            active={filters.sort === 'LOW_PRICE'}
            label={TEXT.sortLowPrice}
            onClick={() => onUpdateFilter('sort', 'LOW_PRICE')}
          />
          <TagChip
            active={filters.sort === 'HIGH_SAVING'}
            label={TEXT.sortHighSaving}
            onClick={() => onUpdateFilter('sort', 'HIGH_SAVING')}
          />
          <TagChip
            active={filters.sort === 'LATEST'}
            label={TEXT.sortLatest}
            onClick={() => onUpdateFilter('sort', 'LATEST')}
          />
        </div>
      </section>

      <section>

        {filteredProducts.length ? (
          <>
            <div className="product-grid">
              {visibleProducts.map((product) => (
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

            {totalPages > 1 ? (
              <nav
                aria-label="\uC0C1\uD488 \uD398\uC774\uC9C0 \uB124\uBE44\uAC8C\uC774\uC158"
                className="product-pagination"
              >
                <button
                  className="product-pagination__nav"
                  disabled={currentPage === 1}
                  type="button"
                  onClick={() => setCurrentPage((previousPage) => Math.max(1, previousPage - 1))}
                >
                  {TEXT.prevPage}
                </button>

                <div className="product-pagination__pages">
                  {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                    <button
                      key={pageNumber}
                      className={`product-pagination__page ${
                        pageNumber === currentPage ? 'is-active' : ''
                      }`}
                      type="button"
                      onClick={() => setCurrentPage(pageNumber)}
                    >
                      {pageNumber}
                    </button>
                  ))}
                </div>

                <button
                  className="product-pagination__nav"
                  disabled={currentPage === totalPages}
                  type="button"
                  onClick={() =>
                    setCurrentPage((previousPage) => Math.min(totalPages, previousPage + 1))
                  }
                >
                  {TEXT.nextPage}
                </button>
              </nav>
            ) : null}
          </>
        ) : (
          <section className="empty-state">
            <div className="empty-icon">NO</div>
            <h2>{TEXT.emptyTitle}</h2>
            <p>{TEXT.emptyDescription}</p>
            <button className="btn" type="button" onClick={onResetFilters}>
              {TEXT.reset}
            </button>
          </section>
        )}
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
  const averagePrice =
    product?.priceSnapshot?.displayAvgPrice || product?.priceSnapshot?.avgPrice || 0;
  const savingAmount = getSavingAmount(product);

  const handleOpenProduct = () => {
    onOpenProduct(product.productNo);
  };

  const handleCardKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleOpenProduct();
    }
  };

  return (
    <article
      className="product-card product-card--interactive"
      onClick={handleOpenProduct}
      onKeyDown={handleCardKeyDown}
      role="button"
      style={{
        '--media-soft': product.display.softColor,
        '--media-glow': product.display.glowColor,
      }}
      tabIndex={0}
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
            aria-label={isWished ? TEXT.wishlistRemove : TEXT.wishlistAdd}
            className={`icon-circle ${isWished ? 'active' : ''}`}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onToggleWishlist(product.productNo);
            }}
          >
            <HeartIcon filled={isWished} />
          </button>

          <button
            aria-label={TEXT.cartAction}
            className="icon-circle product-card-cart-icon"
            disabled={isSoldOut || isCartFull}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onAddToCart(product.productNo, 1);
            }}
          >
            <CartIcon />
            {cartQuantity > 0 ? (
              <span className="product-card-cart-badge">{cartQuantity}</span>
            ) : null}
          </button>
        </div>

        {!hasImage ? <div className="product-symbol">{product.display.symbol}</div> : null}
      </div>

      <div className="product-copy">
        <div className="product-meta-block">
          <div className="product-meta-row">
            <div className="product-meta-copy">
              <div className="product-meta">
                {product.origin} / {product.packageWeight}
                {product.unit}
              </div>
              <div className="discount-copy">
                {TEXT.savePrefix} {formatCurrency(savingAmount)} {TEXT.saveSuffix}
              </div>
            </div>

            <div className="product-side-info">
              <h2 className="product-name">{product.productName}</h2>
              <span className="product-stock">
                {TEXT.stock} {product.stockQty}
                {TEXT.unitCount}
              </span>
            </div>
          </div>
        </div>

        <div className="product-price-action-row">
          <div className="product-price-compact">
            <div className="product-price-inline">
              <span className="price-label">{TEXT.avgPrice}</span>
              <div className="avg-value">{formatCurrency(averagePrice)}</div>
            </div>

            <div className="product-price-inline product-price-inline--sale">
              <span className="price-label">{TEXT.salePrice}</span>
              <div className="price">{formatCurrency(product.salePrice)}</div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
