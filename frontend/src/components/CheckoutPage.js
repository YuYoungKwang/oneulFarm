import { useState } from 'react';
import { formatCurrency, getSavingAmount } from './productUiUtils';
import { getPaymentMethodLabel } from './orderUiUtils';

const initialCheckoutForm = {
  recipientName: '\uD5C8\uB96D',
  recipientPhone: '010-1234-5678',
  zipCode: '06236',
  address1: '\uC11C\uC6B8 \uAC15\uB0A8\uAD6C \uD14C\uD5E4\uB780\uB85C 123',
  address2: '8\uCE35 oneulFarm',
  deliveryMessage: '\uBB38 \uC55E\uC5D0 \uB193\uC544\uC8FC\uC138\uC694',
  paymentMethod: 'CARD',
};

export default function CheckoutPage({
  cartItems,
  onBackToCart,
  onSubmitOrder,
  tossConfig,
}) {
  const [checkoutForm, setCheckoutForm] = useState(initialCheckoutForm);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalAmount = cartItems.reduce(
    (sum, item) => sum + item.product.salePrice * item.quantity,
    0
  );
  const totalSaving = cartItems.reduce(
    (sum, item) => sum + getSavingAmount(item.product) * item.quantity,
    0
  );

  function updateField(key, value) {
    setCheckoutForm((previousForm) => ({
      ...previousForm,
      [key]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (
      !checkoutForm.recipientName.trim() ||
      !checkoutForm.recipientPhone.trim() ||
      !checkoutForm.zipCode.trim() ||
      !checkoutForm.address1.trim()
    ) {
      setError(
        '\uBC1B\uB294 \uBD84, \uC5F0\uB77D\uCC98, \uC6B0\uD3B8\uBC88\uD638, \uAE30\uBCF8 \uC8FC\uC18C\uB97C \uC785\uB825\uD574 \uC8FC\uC138\uC694.'
      );
      return;
    }

    setError('');

    try {
      setIsSubmitting(true);
      await onSubmitOrder(checkoutForm);
    } catch (submitError) {
      setError(
        submitError?.message ||
          '\uC8FC\uBB38 \uB610\uB294 \uACB0\uC81C \uC694\uCCAD\uC744 \uCC98\uB9AC\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!cartItems.length) {
    return (
      <section className="empty-state detail-empty">
        <div className="empty-icon">Cart</div>
        <h1>{'\uC8FC\uBB38\uD560 \uC0C1\uD488\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.'}</h1>
        <p>
          {
            '\uC7A5\uBC14\uAD6C\uB2C8\uC5D0 \uC0C1\uD488\uC744 \uBA3C\uC800 \uB2F4\uC740 \uB4A4 \uC8FC\uBB38\uC11C\uB97C \uC791\uC131\uD574 \uC8FC\uC138\uC694.'
          }
        </p>
        <button className="btn" type="button" onClick={onBackToCart}>
          {'\uC7A5\uBC14\uAD6C\uB2C8\uB85C \uC774\uB3D9'}
        </button>
      </section>
    );
  }

  return (
    <>
      <section className="page-head">
        <div>
          <span className="eyebrow">OFT_ORDERS / OFT_ORDER_ITEM / OFT_PAYMENT</span>
          <h1>{'\uC8FC\uBB38\uC11C \uC791\uC131'}</h1>
          <p>
            {
              '\uBC30\uC1A1 \uC815\uBCF4\uB97C \uC785\uB825\uD558\uACE0 \uACB0\uC81C \uC218\uB2E8\uC744 \uC120\uD0DD\uD55C \uB4A4 \uC8FC\uBB38\uC744 \uC0DD\uC131\uD569\uB2C8\uB2E4.'
            }
          </p>
        </div>
        <div className="page-actions">
          <button className="btn-outline" type="button" onClick={onBackToCart}>
            {'\uC7A5\uBC14\uAD6C\uB2C8\uB85C \uB3CC\uC544\uAC00\uAE30'}
          </button>
        </div>
      </section>

      <section className="quick-grid">
        <article className="quick-card soft-green">
          <div className="quick-label">{'\uC8FC\uBB38 \uC0C1\uD488 \uC218'}</div>
          <div className="quick-value">{cartItems.length}{'\uAC74'}</div>
          <div className="section-sub">`OFT_ORDER_ITEM` {'\uC0DD\uC131 \uC608\uC815'}</div>
        </article>
        <article className="quick-card">
          <div className="quick-label">{'\uCD1D \uC0C1\uD488 \uAE08\uC561'}</div>
          <div className="quick-value">{formatCurrency(totalAmount)}</div>
          <div className="section-sub">{'\uBC30\uC1A1\uBE44 0\uC6D0 \uAE30\uC900'}</div>
        </article>
        <article className="quick-card soft-yellow">
          <div className="quick-label">{'\uC608\uC0C1 \uC808\uC57D \uAE08\uC561'}</div>
          <div className="quick-value">{formatCurrency(totalSaving)}</div>
          <div className="section-sub">{'\uACF5\uACF5 \uD3C9\uADE0\uAC00 \uBE44\uAD50'}</div>
        </article>
        <article className="quick-card">
          <div className="quick-label">{'\uACB0\uC81C \uC218\uB2E8'}</div>
          <div className="quick-value">
            {getPaymentMethodLabel(checkoutForm.paymentMethod)}
          </div>
          <div className="section-sub">`OFT_PAYMENT.PAYMENT_METHOD`</div>
        </article>
      </section>

      <section className="checkout-layout">
        <form className="checkout-form card" onSubmit={handleSubmit}>
          <div className="card-title">{'\uBC30\uC1A1 \uC815\uBCF4 \uC785\uB825'}</div>
          <div className="card-sub">
            {
              '`OFT_ORDERS` \uBC30\uC1A1\uC9C0 \uCEEC\uB7FC \uAE30\uC900\uC73C\uB85C \uD544\uC694\uD55C \uC785\uB825 \uD56D\uBAA9\uC744 \uAD6C\uC131\uD588\uC2B5\uB2C8\uB2E4.'
            }
          </div>

          <div className="form-grid">
            <label className="field">
              <span>{'\uBC1B\uB294 \uBD84'}</span>
              <input
                value={checkoutForm.recipientName}
                onChange={(event) =>
                  updateField('recipientName', event.target.value)
                }
              />
            </label>
            <label className="field">
              <span>{'\uC5F0\uB77D\uCC98'}</span>
              <input
                value={checkoutForm.recipientPhone}
                onChange={(event) =>
                  updateField('recipientPhone', event.target.value)
                }
              />
            </label>
            <label className="field field-sm">
              <span>{'\uC6B0\uD3B8\uBC88\uD638'}</span>
              <input
                value={checkoutForm.zipCode}
                onChange={(event) => updateField('zipCode', event.target.value)}
              />
            </label>
            <label className="field field-full">
              <span>{'\uAE30\uBCF8 \uC8FC\uC18C'}</span>
              <input
                value={checkoutForm.address1}
                onChange={(event) => updateField('address1', event.target.value)}
              />
            </label>
            <label className="field field-full">
              <span>{'\uC0C1\uC138 \uC8FC\uC18C'}</span>
              <input
                value={checkoutForm.address2}
                onChange={(event) => updateField('address2', event.target.value)}
              />
            </label>
            <label className="field field-full">
              <span>{'\uBC30\uC1A1 \uBA54\uBAA8'}</span>
              <input
                value={checkoutForm.deliveryMessage}
                onChange={(event) =>
                  updateField('deliveryMessage', event.target.value)
                }
              />
            </label>
          </div>

          <div className="card-title checkout-subtitle">{'\uACB0\uC81C \uAE30\uB2A5'}</div>
          <div className="payment-methods">
            {['CARD', 'BANK', 'EASY_PAY'].map((method) => (
              <button
                key={method}
                className={`payment-chip ${
                  checkoutForm.paymentMethod === method ? 'active' : ''
                }`}
                type="button"
                onClick={() => updateField('paymentMethod', method)}
              >
                {getPaymentMethodLabel(method)}
              </button>
            ))}
          </div>

          <div
            className={`toss-status-card ${
              tossConfig?.ready ? 'ready' : 'pending'
            }`}
          >
            <div className="toss-status-head">
              <strong>Toss Payments</strong>
              <span>
                {tossConfig?.ready
                  ? '\uC5F0\uB3D9 \uC900\uBE44 \uC644\uB8CC'
                  : 'API \uD0A4 \uBBF8\uC124\uC815'}
              </span>
            </div>
            <p className="section-sub">
              {tossConfig?.ready
                ? '\uCE74\uB4DC, \uACC4\uC88C\uC774\uCCB4, \uAC04\uD3B8\uACB0\uC81C \uC120\uD0DD \uC2DC Toss \uACB0\uC81C\uCC3D\uC73C\uB85C \uC774\uB3D9\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.'
                : 'backend api.properties\uC5D0 clientKey\uC640 secretKey\uB97C \uCD94\uAC00\uD558\uBA74 \uC2E4\uC81C \uC2B9\uC778 \uD750\uB984\uC73C\uB85C \uC5F0\uACB0\uB429\uB2C8\uB2E4.'}
            </p>
          </div>

          {error ? <div className="form-error">{error}</div> : null}

          <div className="summary-actions">
            <button className="btn" type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? '\uCC98\uB9AC \uC911...'
                : '\uACB0\uC81C\uD558\uACE0 \uC8FC\uBB38 \uC0DD\uC131'}
            </button>
            <button className="btn-outline" type="button" onClick={onBackToCart}>
              {'\uB2E4\uC2DC \uC7A5\uBC14\uAD6C\uB2C8 \uBCF4\uAE30'}
            </button>
          </div>
        </form>

        <aside className="checkout-summary">
          <div className="card-title">{'\uC8FC\uBB38 \uC0C1\uD488 \uD655\uC778'}</div>
          <div className="checkout-items">
            {cartItems.map(({ product, quantity }) => (
              <div className="checkout-item" key={product.productNo}>
                <div className="checkout-item-head">
                  <strong>{product.productName}</strong>
                  <span>{formatCurrency(product.salePrice * quantity)}</span>
                </div>
                <div className="section-sub">
                  {'\uC218\uB7C9'} {quantity}
                  {'\uAC1C \u00B7 \uB2E8\uAC00'} {formatCurrency(product.salePrice)}
                  {' \u00B7 \uD3C9\uADE0\uAC00 '} {formatCurrency(product.priceSnapshot.avgPrice)}
                </div>
              </div>
            ))}
          </div>
          <div className="summary-list">
            <div className="insight-item">
              <strong>{'\uC0C1\uD488 \uAE08\uC561'}</strong>
              <span>{formatCurrency(totalAmount)}</span>
            </div>
            <div className="insight-item">
              <strong>{'\uBC30\uC1A1\uBE44'}</strong>
              <span>{formatCurrency(0)}</span>
            </div>
            <div className="insight-item">
              <strong>{'\uC608\uC0C1 \uC808\uC57D \uAE08\uC561'}</strong>
              <span>{formatCurrency(totalSaving)}</span>
            </div>
          </div>
          <div className="summary-total">
            <span>{'\uCD5C\uC885 \uACB0\uC81C \uAE08\uC561'}</span>
            <strong>{formatCurrency(totalAmount)}</strong>
          </div>
        </aside>
      </section>
    </>
  );
}
