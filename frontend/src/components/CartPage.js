import { formatCurrency, getSavingAmount } from './productUiUtils';

export default function CartPage({
  cartItems,
  onClearCart,
  onDecreaseQuantity,
  onIncreaseQuantity,
  onOpenProduct,
  onRemoveItem,
  onReturnToProducts,
}) {
  const totalQuantity = cartItems.reduce(
    (sum, item) => sum + item.quantity,
    0
  );
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
        <div className="empty-icon">🛒</div>
        <h1>장바구니가 비어 있습니다.</h1>
        <p>상품 페이지에서 관심 상품을 담아보세요.</p>
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
          <span className="eyebrow">OFT_CART / OFT_CART_ITEM</span>
          <h1>장바구니</h1>
          <p>
            담은 상품을 조회하고, 수량을 수정하거나 삭제할 수 있는 화면입니다.
          </p>
        </div>
        <div className="page-actions">
          <button className="btn-outline" type="button" onClick={onReturnToProducts}>
            계속 쇼핑하기
          </button>
          <button className="btn-chip" type="button" onClick={onClearCart}>
            전체 삭제
          </button>
        </div>
      </section>

      <section className="quick-grid">
        <article className="quick-card soft-green">
          <div className="quick-label">담긴 상품 수</div>
          <div className="quick-value">{cartItems.length}개</div>
          <div className="section-sub">`OFT_CART_ITEM` 기준</div>
        </article>
        <article className="quick-card">
          <div className="quick-label">총 수량</div>
          <div className="quick-value">{totalQuantity}개</div>
          <div className="section-sub">수량 수정 즉시 반영</div>
        </article>
        <article className="quick-card soft-yellow">
          <div className="quick-label">총 상품 금액</div>
          <div className="quick-value">{formatCurrency(totalAmount)}</div>
          <div className="section-sub">배송비 제외</div>
        </article>
        <article className="quick-card">
          <div className="quick-label">예상 절약 금액</div>
          <div className="quick-value">{formatCurrency(totalSaving)}</div>
          <div className="section-sub">평균 시세 대비</div>
        </article>
      </section>

      <section className="cart-layout">
        <div className="cart-list">
          {cartItems.map(({ product, quantity }) => (
            <article
              key={product.productNo}
              className="cart-card"
              style={{
                '--media-soft': product.display.softColor,
                '--media-glow': product.display.glowColor,
              }}
            >
              <div className="cart-thumb">
                <div className="cart-thumb-symbol">{product.display.symbol}</div>
              </div>

              <div className="cart-copy">
                <div className="cart-copy-top">
                  <div>
                    <div className="card-title cart-title">{product.productName}</div>
                    <div className="section-sub">
                      {product.origin} · 재고 {product.stockQty}개 · 평균가{' '}
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
                    >
                      -
                    </button>
                    <span>{quantity}</span>
                    <button
                      type="button"
                      aria-label={`${product.productName} 수량 증가`}
                      onClick={() => onIncreaseQuantity(product.productNo)}
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
              </div>
            </article>
          ))}
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
          <div className="notice cart-notice">
            현재는 상품/장바구니 화면 범위만 구현했습니다. 주문 생성은 다음
            단계에서 `OFT_ORDERS`, `OFT_ORDER_ITEM`와 연결하면 됩니다.
          </div>
          <div className="summary-actions">
            <button className="btn" type="button">
              주문하기 준비
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
