import { formatCurrency, getSavingAmount } from './productUiUtils';
import SafeImage from './SafeImage';

export default function CartPage({
  cartGroups = [],
  cartItems = [],
  onClearCart,
  onOpenProduct,
  onProceedToCheckout,
  onRemoveItem,
  onReturnToProducts,
  onUpdateQuantity,
}) {
  const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = cartItems.reduce(
    (sum, item) => sum + item.product.salePrice * item.quantity,
    0
  );
  const totalSaving = cartItems.reduce(
    (sum, item) => sum + Number(item.savedAmount || getSavingAmount(item.product) * item.quantity),
    0
  );

  if (!cartItems.length) {
    return (
      <section className="empty-state detail-empty">
        <div className="empty-icon">CART</div>
        <h1>장바구니가 비어 있습니다.</h1>
        <p>원하는 상품을 담은 뒤 주문서를 작성해보세요.</p>
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
          <p>레시피 묶음과 개별 담기를 함께 확인하고 바로 주문할 수 있어요.</p>
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
          <div className="quick-label">담긴 묶음</div>
          <div className="quick-value">{cartGroups.length}개</div>
          <div className="section-sub">레시피 묶음과 개별 담기 기준</div>
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
          {cartGroups.map((group) => (
            <article key={group.cartGroupNo} className="cart-card cart-card--group">
              <div className="cart-group-head">
                <div>
                  <div className="meta-row">
                    <span
                      className={`meta-pill ${
                        group.groupType === 'RECIPE'
                          ? 'meta-pill--recipe'
                          : 'meta-pill--product'
                      }`}
                    >
                      {group.groupType === 'RECIPE' ? '레시피 묶음' : '개별 담기'}
                    </span>
                  </div>
                  <div className="card-title cart-group-title">{group.displayName}</div>
                  <div className="section-sub">
                    품목 {group.items.length}개 · 총 수량 {group.totalQuantity}개 · 예상 절약{' '}
                    {formatCurrency(group.totalSavedAmount)}
                  </div>
                </div>
              </div>

              <div className="cart-group-items">
                {group.items.map((item) => {
                  const product = item.product;
                  const mainImage =
                    product.mainImage ||
                    product.images?.find((image) => image.isMain === 'Y') ||
                    product.images?.[0] ||
                    null;
                  const hasImage = Boolean(mainImage?.imageUrl);
                  const isMaxQuantity = item.quantity >= Number(product.stockQty || 0);

                  return (
                    <div className="cart-group-item" key={item.cartItemNo}>
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
                              {product.origin || '원산지 정보 없음'} · {product.packageWeight}
                              {product.unit} · 남은 재고 {product.stockQty}개
                            </div>
                          </div>
                          <button
                            className="text-action danger"
                            type="button"
                            aria-label={`${product.productName} 삭제`}
                            onClick={() => onRemoveItem(item.cartItemNo)}
                          >
                            삭제
                          </button>
                        </div>

                        <div className="cart-controls">
                          <div className="qty-inline">
                            <button
                              type="button"
                              aria-label={`${product.productName} 수량 감소`}
                              onClick={() => onUpdateQuantity(item.cartItemNo, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                            >
                              -
                            </button>
                            <span>{item.quantity}</span>
                            <button
                              type="button"
                              aria-label={`${product.productName} 수량 증가`}
                              onClick={() => onUpdateQuantity(item.cartItemNo, item.quantity + 1)}
                              disabled={isMaxQuantity}
                            >
                              +
                            </button>
                          </div>

                          <div className="cart-price-meta">
                            <div className="section-sub">상품 금액</div>
                            <strong>{formatCurrency(product.salePrice * item.quantity)}</strong>
                          </div>

                          <div className="cart-price-meta">
                            <div className="section-sub">예상 절약</div>
                            <strong>{formatCurrency(getSavingAmount(product) * item.quantity)}</strong>
                          </div>

                          <button
                            className="btn-outline compact-btn"
                            type="button"
                            onClick={() => onOpenProduct(product.productNo)}
                          >
                            상품 보기
                          </button>
                        </div>

                        {isMaxQuantity ? (
                          <div className="section-sub">현재 재고 한도까지 담겨 있습니다.</div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
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
            <span>최종 예상 금액</span>
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
