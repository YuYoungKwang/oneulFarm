import { formatCurrency, getSavingAmount } from './productUiUtils';
import SafeImage from './SafeImage';

export default function CartPage({
  cartItems,
  onClearCart,
  onDecreaseQuantity,
  onIncreaseQuantity,
  onOpenProduct,
  onProceedToCheckout,
  onRemoveItem,
  onReturnToProducts,
}) {
  const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = cartItems.reduce(
    (sum, item) => sum + item.product.salePrice * item.quantity,
    0
  );
  const totalSaving = cartItems.reduce(
    (sum, item) => sum + getSavingAmount(item.product) * item.quantity,
    0
  );

  if (!cartItems.length) {
    return (
      <section className="empty-state detail-empty">
        <div className="empty-icon">CART</div>
        <h1>장바구니가 비어 있습니다.</h1>
        <p>마음에 드는 상품을 담고 한 번에 주문해보세요.</p>
        <button className="btn" type="button" onClick={onReturnToProducts}>
          상품 보러 가기
        </button>
      </section>
    );
  }

  return (
    <>
      <section className="page-head">
        <div>
          <span className="eyebrow">Cart</span>
          <h1>장바구니</h1>
          <p>담아둔 상품을 확인하고 수량을 조절한 뒤 바로 주문할 수 있습니다.</p>
        </div>
        <div className="page-actions">
          <button className="btn-outline" type="button" onClick={onReturnToProducts}>
            쇼핑 계속하기
          </button>
          <button className="btn-chip" type="button" onClick={onClearCart}>
            전체 비우기
          </button>
        </div>
      </section>

      <section className="quick-grid">
        <article className="quick-card soft-green">
          <div className="quick-label">담은 상품 수</div>
          <div className="quick-value">{cartItems.length}개</div>
          <div className="section-sub">지금 주문 가능한 상품 종류</div>
        </article>
        <article className="quick-card">
          <div className="quick-label">총 수량</div>
          <div className="quick-value">{totalQuantity}개</div>
          <div className="section-sub">수량 변경 시 즉시 반영</div>
        </article>
        <article className="quick-card soft-yellow">
          <div className="quick-label">총 상품 금액</div>
          <div className="quick-value">{formatCurrency(totalAmount)}</div>
          <div className="section-sub">배송비 제외 기준</div>
        </article>
        <article className="quick-card">
          <div className="quick-label">예상 절약 금액</div>
          <div className="quick-value">{formatCurrency(totalSaving)}</div>
          <div className="section-sub">평균 시세 대비 예상 절약</div>
        </article>
      </section>

      <section className="cart-layout">
        <div className="cart-list">
          {cartItems.map(({ product, quantity }) => {
            const isMaxQuantity = quantity >= product.stockQty;
            const mainImage =
              product.mainImage ||
              product.images?.find((image) => image.isMain === 'Y') ||
              product.images?.[0] ||
              null;
            const hasImage = Boolean(mainImage?.imageUrl);

            return (
              <article
                key={product.productNo}
                className="cart-card"
                style={{
                  '--media-soft': product.display.softColor,
                  '--media-glow': product.display.glowColor,
                }}
              >
                <div className={`cart-thumb ${hasImage ? 'has-image' : ''}`}>
                  {hasImage ? (
                    <SafeImage
                      alt={product.productName}
                      className="cart-thumb-image"
                      fallback={<div className="cart-thumb-symbol">{product.display.symbol}</div>}
                      src={mainImage.imageUrl}
                    />
                  ) : (
                    <div className="cart-thumb-symbol">{product.display.symbol}</div>
                  )}
                </div>

                <div className="cart-copy">
                  <div className="cart-copy-top">
                    <div>
                      <div className="card-title cart-title">{product.productName}</div>
                      <div className="section-sub">
                        {product.origin} · 남은 수량 {product.stockQty}개 · 평균가{' '}
                        {formatCurrency(product.priceSnapshot.avgPrice)}
                      </div>
                    </div>
                    <button
                      className="text-action danger"
                      type="button"
                      aria-label={`${product.productName} 삭제`}
                      onClick={() => onRemoveItem(product.productNo)}
                    >
                      삭제
                    </button>
                  </div>

                  <div className="meta-row">
                    {product.recommendedFor.map((tag) => (
                      <span className="meta-pill" key={tag}>
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="cart-controls">
                    <div className="qty-inline">
                      <button
                        type="button"
                        aria-label={`${product.productName} 수량 감소`}
                        onClick={() => onDecreaseQuantity(product.productNo)}
                        disabled={quantity <= 1}
                      >
                        -
                      </button>
                      <span>{quantity}</span>
                      <button
                        type="button"
                        aria-label={`${product.productName} 수량 증가`}
                        onClick={() => onIncreaseQuantity(product.productNo)}
                        disabled={isMaxQuantity}
                      >
                        +
                      </button>
                    </div>

                    <div className="cart-price-meta">
                      <div className="section-sub">상품 금액</div>
                      <strong>{formatCurrency(product.salePrice * quantity)}</strong>
                    </div>

                    <div className="cart-price-meta">
                      <div className="section-sub">예상 절약</div>
                      <strong>{formatCurrency(getSavingAmount(product) * quantity)}</strong>
                    </div>

                    <button
                      className="btn-outline compact-btn"
                      type="button"
                      onClick={() => onOpenProduct(product.productNo)}
                    >
                      상세 보기
                    </button>
                  </div>

                  {isMaxQuantity ? (
                    <div className="section-sub">
                      현재 재고만큼만 주문할 수 있습니다.
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>

        <aside className="cart-summary">
          <div className="card-title">주문 요약</div>
          <div className="summary-list">
            <div className="insight-item">
              <strong>상품 금액</strong>
              <span>{formatCurrency(totalAmount)}</span>
            </div>
            <div className="insight-item">
              <strong>배송비</strong>
              <span>{formatCurrency(0)}</span>
            </div>
            <div className="insight-item">
              <strong>예상 절약 금액</strong>
              <span>{formatCurrency(totalSaving)}</span>
            </div>
          </div>
          <div className="summary-total">
            <span>최종 예정 금액</span>
            <strong>{formatCurrency(totalAmount)}</strong>
          </div>
          <div className="summary-actions">
            <button className="btn" type="button" onClick={onProceedToCheckout}>
              주문서 작성하기
            </button>
            <button className="btn-outline" type="button" onClick={onReturnToProducts}>
              상품 더 담기
            </button>
          </div>
        </aside>
      </section>
    </>
  );
}
