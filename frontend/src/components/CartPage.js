import { formatCurrency, getSavingAmount } from './productUiUtils';
import SafeImage from './SafeImage';

const TEXT = {
  recipeGroup: '\uB808\uC2DC\uD53C \uBB36\uC74C',
  defaultGroup: '\uC77C\uBC18 \uB2F4\uAE30',
  recipeGroupHint: '\uB808\uC2DC\uD53C \uC7AC\uB8CC\uB97C \uD55C \uBC88\uC5D0 \uB2F4\uC740 \uBB36\uC74C',
  defaultGroupHint: '\uAC1C\uBCC4 \uC0C1\uD488 \uAE30\uC900\uC73C\uB85C \uB2F4\uC740 \uBAA9\uB85D',
  emptyTitle: '\uC7A5\uBC14\uAD6C\uB2C8\uAC00 \uBE44\uC5B4 \uC788\uC2B5\uB2C8\uB2E4.',
  emptyDescription:
    '\uC0C1\uD488\uC774\uB098 \uB808\uC2DC\uD53C \uC7AC\uB8CC\uB97C \uBA3C\uC800 \uB2F4\uACE0 \uC8FC\uBB38\uC744 \uC9C4\uD589\uD574 \uC8FC\uC138\uC694.',
  browseProducts: '\uC0C1\uD488 \uBCF4\uB7EC \uAC00\uAE30',
  pageTitle: '\uC7A5\uBC14\uAD6C\uB2C8',
  pageDescription:
    '\uB808\uC2DC\uD53C \uB2F4\uAE30\uC640 \uC77C\uBC18 \uB2F4\uAE30\uB97C \uAD6C\uBD84\uD574\uC11C \uD655\uC778\uD558\uACE0 \uBC14\uB85C \uC8FC\uBB38\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.',
  keepShopping: '\uC1FC\uD551 \uACC4\uC18D\uD558\uAE30',
  clearAll: '\uC804\uCCB4 \uBE44\uC6B0\uAE30',
  itemKinds: '\uB2F4\uAE34 \uC0C1\uD488 \uC885\uB958',
  totalQuantity: '\uCD1D \uC218\uB7C9',
  totalAmount: '\uCD1D \uC0C1\uD488 \uAE08\uC561',
  expectedSaving: '\uC608\uC0C1 \uC808\uC57D \uAE08\uC561',
  itemKindsHint: '\uD604\uC7AC \uC7A5\uBC14\uAD6C\uB2C8\uC5D0 \uB2F4\uAE34 \uC0C1\uD488 \uC885\uB958 \uC218',
  quantityHint: '\uC218\uB7C9\uC744 \uC870\uC808\uD558\uBA74 \uC989\uC2DC \uBC18\uC601\uB429\uB2C8\uB2E4',
  amountHint: '\uBC30\uC1A1\uBE44 \uC81C\uC678 \uAE30\uC900',
  savingHint: '\uD3C9\uADE0\uAC00 \uB300\uBE44 \uC608\uC0C1 \uC808\uC57D \uAE08\uC561',
  remove: '\uC81C\uAC70',
  removeRecipeGroup: '\uB808\uC2DC\uD53C \uBB36\uC74C \uC0AD\uC81C',
  originFallback: '\uC6D0\uC0B0\uC9C0 \uC815\uBCF4 \uC5C6\uC74C',
  stockLabel: '\uC7AC\uACE0',
  averagePriceLabel: '\uD3C9\uADE0\uAC00',
  priceLabel: '\uC0C1\uD488 \uAE08\uC561',
  savingLabel: '\uC608\uC0C1 \uC808\uC57D',
  detailButton: '\uC0C1\uC138 \uBCF4\uAE30',
  maxQuantityHint: '\uD604\uC7AC \uC7AC\uACE0\uB9CC\uD07C\uB9CC \uC8FC\uBB38\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.',
  orderSummary: '\uC8FC\uBB38 \uC694\uC57D',
  deliveryFee: '\uBC30\uC1A1\uBE44',
  finalAmount: '\uCD5C\uC885 \uACB0\uC81C \uAE08\uC561',
  checkout: '\uC8FC\uBB38\uC11C \uC791\uC131\uD558\uAE30',
  addMore: '\uC0C1\uD488 \uB354 \uB2F4\uAE30',
  piece: '\uAC1C',
  dot: ' \u00B7 ',
};

function groupCartItems(cartItems) {
  const groupMap = new Map();

  (Array.isArray(cartItems) ? cartItems : []).forEach((item, index) => {
    const groupType = item?.groupType || 'PRODUCT';
    const fallbackKey = item?.product?.productNo || item?.productNo || index;
    const groupKey = item?.groupKey || `PRODUCT:${fallbackKey}`;
    const key = `${groupType}:${groupKey}`;

    if (!groupMap.has(key)) {
      groupMap.set(key, {
        key,
        cartGroupNo: item?.cartGroupNo ?? null,
        groupType,
        groupKey: item?.groupKey || '',
        groupName:
          groupType === 'RECIPE'
            ? item?.groupName || TEXT.recipeGroup
            : item?.groupName || TEXT.defaultGroup,
        recipeNo: item?.recipeNo || null,
        items: [],
      });
    }

    groupMap.get(key).items.push(item);
  });

  return Array.from(groupMap.values());
}

function getCartGroupSummary(group) {
  const items = Array.isArray(group?.items) ? group.items : [];
  const quantity = items.reduce((sum, item) => sum + Number(item?.quantity || 0), 0);
  const totalAmount = items.reduce(
    (sum, item) => sum + Number(item?.product?.salePrice || 0) * Number(item?.quantity || 0),
    0
  );

  return {
    quantity,
    totalAmount,
  };
}

function getGroupLabel(group) {
  return group?.groupType === 'RECIPE' ? TEXT.recipeGroup : TEXT.defaultGroup;
}

function getGroupTitle(group) {
  if (group?.groupType === 'RECIPE') {
    return group?.groupName || TEXT.recipeGroup;
  }

  return TEXT.defaultGroup;
}

function getGroupHint(group) {
  return group?.groupType === 'RECIPE' ? TEXT.recipeGroupHint : TEXT.defaultGroupHint;
}

function handleRemoveClick(event, item, onRemoveItem) {
  event.preventDefault();
  event.stopPropagation();

  if (typeof onRemoveItem === 'function') {
    onRemoveItem(item);
  }
}

function handleRemoveGroupClick(event, group, onRemoveGroup) {
  event.preventDefault();
  event.stopPropagation();

  if (typeof onRemoveGroup === 'function') {
    onRemoveGroup(group);
  }
}

export default function CartPage({
  cartItems,
  onClearCart,
  onDecreaseQuantity,
  onIncreaseQuantity,
  onOpenProduct,
  onProceedToCheckout,
  onRemoveGroup,
  onRemoveItem,
  onReturnToProducts,
}) {
  const safeCartItems = Array.isArray(cartItems) ? cartItems : [];
  const totalQuantity = safeCartItems.reduce((sum, item) => sum + Number(item?.quantity || 0), 0);
  const totalAmount = safeCartItems.reduce(
    (sum, item) => sum + Number(item?.product?.salePrice || 0) * Number(item?.quantity || 0),
    0
  );
  const totalSaving = safeCartItems.reduce(
    (sum, item) => sum + getSavingAmount(item?.product) * Number(item?.quantity || 0),
    0
  );
  const groupedCartItems = groupCartItems(safeCartItems);

  if (!safeCartItems.length) {
    return (
      <section className="empty-state detail-empty">
        <div className="empty-icon">CART</div>
        <h1>{TEXT.emptyTitle}</h1>
        <p>{TEXT.emptyDescription}</p>
        <button className="btn" type="button" onClick={onReturnToProducts}>
          {TEXT.browseProducts}
        </button>
      </section>
    );
  }

  return (
    <>
      <section className="page-head">
        <div>
          <span className="eyebrow">Cart</span>
          <h1>{TEXT.pageTitle}</h1>
          <p>{TEXT.pageDescription}</p>
        </div>
        <div className="page-actions">
          <button className="btn-outline" type="button" onClick={onReturnToProducts}>
            {TEXT.keepShopping}
          </button>
          <button className="btn-chip" type="button" onClick={onClearCart}>
            {TEXT.clearAll}
          </button>
        </div>
      </section>

      <section className="quick-grid">
        <article className="quick-card soft-green">
          <div className="quick-label">{TEXT.itemKinds}</div>
          <div className="quick-value">
            {safeCartItems.length}
            {TEXT.piece}
          </div>
          <div className="section-sub">{TEXT.itemKindsHint}</div>
        </article>
        <article className="quick-card">
          <div className="quick-label">{TEXT.totalQuantity}</div>
          <div className="quick-value">
            {totalQuantity}
            {TEXT.piece}
          </div>
          <div className="section-sub">{TEXT.quantityHint}</div>
        </article>
        <article className="quick-card soft-yellow">
          <div className="quick-label">{TEXT.totalAmount}</div>
          <div className="quick-value">{formatCurrency(totalAmount)}</div>
          <div className="section-sub">{TEXT.amountHint}</div>
        </article>
        <article className="quick-card">
          <div className="quick-label">{TEXT.expectedSaving}</div>
          <div className="quick-value">{formatCurrency(totalSaving)}</div>
          <div className="section-sub">{TEXT.savingHint}</div>
        </article>
      </section>

      <section className="cart-layout">
        <div className="cart-list">
          {groupedCartItems.map((group) => {
            const groupSummary = getCartGroupSummary(group);

            return (
              <section
                key={group.key}
                className={`cart-group-block ${
                  group.groupType === 'RECIPE' ? 'is-recipe' : 'is-product'
                }`.trim()}
              >
                <div className="section-head cart-group-head">
                  <div className="cart-group-copy">
                    <span
                      className={`cart-group-badge ${
                        group.groupType === 'RECIPE' ? 'is-recipe' : 'is-product'
                      }`.trim()}
                    >
                      {getGroupLabel(group)}
                    </span>
                    <div className="section-title cart-group-title">{getGroupTitle(group)}</div>
                    <small className="cart-group-summary">
                      {getGroupHint(group)}
                      {TEXT.dot}
                      재료 {group.items.length}
                      {TEXT.piece}
                      {TEXT.dot}
                      {TEXT.totalQuantity} {groupSummary.quantity}
                      {TEXT.piece}
                      {TEXT.dot}
                      {formatCurrency(groupSummary.totalAmount)}
                    </small>
                  </div>

                  {group.groupType === 'RECIPE' ? (
                    <button
                      className="text-action danger cart-group-remove"
                      type="button"
                      onClick={(event) => handleRemoveGroupClick(event, group, onRemoveGroup)}
                    >
                      {TEXT.removeRecipeGroup}
                    </button>
                  ) : null}
                </div>

                {group.items.map((item) => {
                  const product = item?.product || {};
                  const quantity = Number(item?.quantity || 0);
                  const isMaxQuantity = quantity >= Number(product?.stockQty || 0);
                  const mainImage =
                    product?.mainImage ||
                    product?.images?.find((image) => image?.isMain === 'Y') ||
                    product?.images?.[0] ||
                    null;
                  const hasImage = Boolean(mainImage?.imageUrl);
                  const displayAveragePrice =
                    product?.priceSnapshot?.displayAvgPrice ||
                    product?.priceSnapshot?.avgPrice ||
                    0;

                  return (
                    <article
                      key={item?.cartItemNo || `${group.key}-${product?.productNo || quantity}`}
                      className={`cart-card ${
                        group.groupType === 'RECIPE' ? 'cart-card--recipe' : ''
                      }`.trim()}
                      style={{
                        '--media-soft': product?.display?.softColor || '#eef8ef',
                        '--media-glow':
                          product?.display?.glowColor || 'rgba(129, 199, 132, 0.34)',
                      }}
                    >
                      <div className={`cart-thumb ${hasImage ? 'has-image' : ''}`}>
                        {hasImage ? (
                          <SafeImage
                            alt={product?.productName || '\uC0C1\uD488 \uC774\uBBF8\uC9C0'}
                            className="cart-thumb-image"
                            fallback={
                              <div className="cart-thumb-symbol">
                                {product?.display?.symbol || '\uD83E\uDD6C'}
                              </div>
                            }
                            src={mainImage.imageUrl}
                          />
                        ) : (
                          <div className="cart-thumb-symbol">
                            {product?.display?.symbol || '\uD83E\uDD6C'}
                          </div>
                        )}
                      </div>

                      <div className="cart-copy">
                        <div className="cart-copy-top">
                          <div>
                            <div className="card-title cart-title">{product?.productName}</div>
                            <div className="section-sub">
                              {product?.origin || TEXT.originFallback}
                              {TEXT.dot}
                              {TEXT.stockLabel} {product?.stockQty || 0}
                              {TEXT.piece}
                              {TEXT.dot}
                              {TEXT.averagePriceLabel} {formatCurrency(displayAveragePrice)}
                            </div>
                          </div>
                          <button
                            className="text-action danger"
                            type="button"
                            aria-label={`${product?.productName || '\uC0C1\uD488'} ${TEXT.remove}`}
                            onClick={(event) => handleRemoveClick(event, item, onRemoveItem)}
                          >
                            {TEXT.remove}
                          </button>
                        </div>

                        {Array.isArray(product?.recommendedFor) && product.recommendedFor.length ? (
                          <div className="meta-row">
                            {product.recommendedFor.map((tag) => (
                              <span className="meta-pill" key={tag}>
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : null}

                        <div className="cart-controls">
                          <div className="qty-inline">
                            <button
                              type="button"
                              aria-label={`${product?.productName || '\uC0C1\uD488'} \uC218\uB7C9 \uAC10\uC18C`}
                              onClick={() => onDecreaseQuantity(item)}
                              disabled={quantity <= 1}
                            >
                              -
                            </button>
                            <span>{quantity}</span>
                            <button
                              type="button"
                              aria-label={`${product?.productName || '\uC0C1\uD488'} \uC218\uB7C9 \uC99D\uAC00`}
                              onClick={() => onIncreaseQuantity(item)}
                              disabled={isMaxQuantity}
                            >
                              +
                            </button>
                          </div>

                          <div className="cart-price-meta">
                            <div className="section-sub">{TEXT.priceLabel}</div>
                            <strong>{formatCurrency(Number(product?.salePrice || 0) * quantity)}</strong>
                          </div>

                          <div className="cart-price-meta">
                            <div className="section-sub">{TEXT.savingLabel}</div>
                            <strong>{formatCurrency(getSavingAmount(product) * quantity)}</strong>
                          </div>

                          <button
                            className="btn-outline compact-btn"
                            type="button"
                            onClick={() => onOpenProduct(product?.productNo)}
                          >
                            {TEXT.detailButton}
                          </button>
                        </div>

                        {isMaxQuantity ? (
                          <div className="section-sub">{TEXT.maxQuantityHint}</div>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </section>
            );
          })}
        </div>

        <aside className="cart-summary">
          <div className="card-title">{TEXT.orderSummary}</div>
          <div className="summary-list">
            <div className="insight-item">
              <strong>{TEXT.totalAmount}</strong>
              <span>{formatCurrency(totalAmount)}</span>
            </div>
            <div className="insight-item">
              <strong>{TEXT.deliveryFee}</strong>
              <span>{formatCurrency(0)}</span>
            </div>
            <div className="insight-item">
              <strong>{TEXT.expectedSaving}</strong>
              <span>{formatCurrency(totalSaving)}</span>
            </div>
          </div>
          <div className="summary-total">
            <span>{TEXT.finalAmount}</span>
            <strong>{formatCurrency(totalAmount)}</strong>
          </div>
          <div className="summary-actions">
            <button className="btn" type="button" onClick={onProceedToCheckout}>
              {TEXT.checkout}
            </button>
            <button className="btn-outline" type="button" onClick={onReturnToProducts}>
              {TEXT.addMore}
            </button>
          </div>
        </aside>
      </section>
    </>
  );
}
