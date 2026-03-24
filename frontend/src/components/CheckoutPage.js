import { useEffect, useState } from 'react';
import { buildAuthHeaders, requestAuthApi } from '../auth';
import { getPaymentMethodLabel } from './orderUiUtils';
import { formatCurrency, getSavingAmount } from './productUiUtils';
import { getPortOnePaymentOptions } from '../payment/portonePayments';

const ADDRESS_API_PATH = '/api/users/me/addresses';

const TEXT = {
  emptyTitle: '\uC8FC\uBB38\uD560 \uC0C1\uD488\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.',
  emptyDescription:
    '\uC7A5\uBC14\uAD6C\uB2C8\uC5D0 \uC0C1\uD488\uC744 \uBA3C\uC800 \uB2F4\uC740 \uB4A4 \uC8FC\uBB38\uC11C\uB97C \uC791\uC131\uD574\uC8FC\uC138\uC694.',
  moveCart: '\uC7A5\uBC14\uAD6C\uB2C8\uB85C \uC774\uB3D9',
  checkoutTitle: '\uC8FC\uBB38\uC11C \uC791\uC131',
  checkoutDescription:
    '\uBC30\uC1A1\uC9C0\uC640 \uACB0\uC81C \uC218\uB2E8\uC744 \uD655\uC778\uD558\uACE0 \uC548\uC804\uD558\uAC8C \uC8FC\uBB38\uC744 \uB9C8\uBB34\uB9AC\uD558\uC138\uC694.',
  backToCart: '\uC7A5\uBC14\uAD6C\uB2C8\uB85C \uB3CC\uC544\uAC00\uAE30',
  orderItemCount: '\uC8FC\uBB38 \uC0C1\uD488 \uC218',
  includedProducts: '\uC774\uBC88 \uACB0\uC81C\uC5D0 \uD3EC\uD568\uB41C \uC0C1\uD488 \uC885\uB958',
  totalAmount: '\uCD1D \uC0C1\uD488 \uAE08\uC561',
  zeroDeliveryFee: '\uBC30\uC1A1\uBE44 0\uC6D0 \uAE30\uC900',
  savingAmount: '\uC608\uC0C1 \uC808\uC57D \uAE08\uC561',
  savingDescription:
    '\uC2DC\uC7A5 \uD3C9\uADE0\uAC00 \uB300\uBE44 \uC608\uC0C1 \uC808\uC57D \uAE08\uC561',
  paymentMethod: '\uACB0\uC81C \uC218\uB2E8',
  paymentMethodDescription: '\uC6D0\uD558\uB294 \uBC29\uC2DD\uC73C\uB85C \uC120\uD0DD \uAC00\uB2A5',
  shippingInfo: '\uBC30\uC1A1 \uC815\uBCF4 \uC785\uB825',
  shippingInfoHelp:
    '\uAE30\uBCF8 \uBC30\uC1A1\uC9C0\uAC00 \uC788\uC73C\uBA74 \uC790\uB3D9\uC73C\uB85C \uCC44\uC6CC\uC9C0\uACE0, \uD544\uC694\uD558\uBA74 \uC8FC\uBB38 \uC804\uC5D0 \uC218\uC815\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.',
  loadingAddress:
    '\uAE30\uBCF8 \uBC30\uC1A1\uC9C0\uB97C \uBD88\uB7EC\uC624\uB294 \uC911\uC785\uB2C8\uB2E4.',
  missingAddress:
    '\uAE30\uBCF8 \uBC30\uC1A1\uC9C0\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4. \uAE30\uBCF8 \uC8FC\uC18C\uC9C0\uB97C \uB4F1\uB85D\uD55C \uB4A4 \uB2E4\uC2DC \uC8FC\uBB38\uD574\uC8FC\uC138\uC694.',
  recipientName: '\uBC1B\uB294 \uBD84',
  recipientPhone: '\uC5F0\uB77D\uCC98',
  zipCode: '\uC6B0\uD3B8\uBC88\uD638',
  address1: '\uAE30\uBCF8 \uC8FC\uC18C',
  address2: '\uC0C1\uC138 \uC8FC\uC18C',
  deliveryMessage: '\uBC30\uC1A1 \uBA54\uBAA8',
  paymentGuide: '\uACB0\uC81C \uC548\uB0B4',
  paymentReady: '\uAC00\uB2A5',
  paymentPending: '\uAC04\uD3B8 \uACB0\uC81C \uC900\uBE44 \uC911',
  paymentReadyDescription:
    '\uBC84\uD2BC\uC744 \uB204\uB974\uBA74 \uD3EC\uD2B8\uC6D0 \uACB0\uC81C\uCC3D\uC73C\uB85C \uC774\uB3D9\uD55C \uB4A4 \uC2B9\uC778 \uD655\uC778 \uD6C4 \uC8FC\uBB38\uC774 \uC644\uB8CC\uB429\uB2C8\uB2E4.',
  paymentPendingDescription:
    '\uD3EC\uD2B8\uC6D0 \uD14C\uC2A4\uD2B8 \uD0A4\uB97C \uC124\uC815\uD558\uBA74 \uACB0\uC81C\uCC3D\uC744 \uD1B5\uD574 \uC8FC\uBB38\uC744 \uC9C4\uD589\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.',
  submitWhileLoading: '\uCC98\uB9AC \uC911...',
  submitPay: '\uACB0\uC81C\uD558\uAE30',
  submitOrder: '\uC8FC\uBB38 \uC644\uB8CC\uD558\uAE30',
  addressSetup: '\uAE30\uBCF8 \uC8FC\uC18C\uC9C0 \uB4F1\uB85D\uD558\uAE30',
  viewCartAgain: '\uC7A5\uBC14\uAD6C\uB2C8 \uB2E4\uC2DC \uBCF4\uAE30',
  orderSummary: '\uC8FC\uBB38 \uC0C1\uD488 \uD655\uC778',
  quantity: '\uC218\uB7C9',
  eachPrice: '\uAC1C\uB2F9',
  avgPrice: '\uD3C9\uADE0\uAC00',
  productAmount: '\uC0C1\uD488 \uAE08\uC561',
  deliveryFee: '\uBC30\uC1A1\uBE44',
  finalAmount: '\uCD5C\uC885 \uACB0\uC81C \uAE08\uC561',
  defaultAddressFirst:
    '\uAE30\uBCF8 \uBC30\uC1A1\uC9C0\uB97C \uBA3C\uC800 \uB4F1\uB85D\uD574\uC8FC\uC138\uC694.',
  requiredFields:
    '\uBC1B\uB294 \uBD84, \uC5F0\uB77D\uCC98, \uC6B0\uD3B8\uBC88\uD638, \uAE30\uBCF8 \uC8FC\uC18C\uB97C \uC785\uB825\uD574\uC8FC\uC138\uC694.',
  defaultAddressLoadError:
    '\uAE30\uBCF8 \uBC30\uC1A1\uC9C0\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.',
  orderSubmitError: '\uC8FC\uBB38\uC744 \uC644\uB8CC\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.',
};

const initialCheckoutForm = {
  recipientName: '',
  recipientPhone: '',
  zipCode: '',
  address1: '',
  address2: '',
  deliveryMessage: '',
  paymentMethod: 'CARD',
  paymentProvider: '',
};

function mapAddressToCheckoutForm(address, paymentMethod = 'CARD', paymentProvider = '') {
  return {
    recipientName: address?.recipientName || '',
    recipientPhone: address?.recipientPhone || '',
    zipCode: address?.zipCode || '',
    address1: address?.address1 || '',
    address2: address?.address2 || '',
    deliveryMessage: address?.deliveryMessage || '',
    paymentMethod,
    paymentProvider,
  };
}

function buildFallbackPaymentOptions() {
  return [
    { method: 'CARD', provider: '', label: '\uCE74\uB4DC \uACB0\uC81C' },
    { method: 'BANK', provider: '', label: '\uAC00\uC0C1\uACC4\uC88C' },
    { method: 'EASY_PAY', provider: '', label: '\uAC04\uD3B8\uACB0\uC81C' },
  ];
}

function getAvailablePaymentOptions(paymentConfig) {
  const options = getPortOnePaymentOptions(paymentConfig);
  return options.length ? options : buildFallbackPaymentOptions();
}

function findSelectedPaymentOption(checkoutForm, paymentOptions) {
  const normalizedProvider = (checkoutForm?.paymentProvider || '').trim().toUpperCase();

  return (
    paymentOptions.find(
      (option) =>
        option.method === checkoutForm?.paymentMethod &&
        ((option.provider || '').trim().toUpperCase() === normalizedProvider)
    ) ||
    paymentOptions.find((option) => option.method === checkoutForm?.paymentMethod) ||
    paymentOptions[0] ||
    null
  );
}

export default function CheckoutPage({
  cartItems,
  onBackToCart,
  onOpenAddressSetup,
  onSubmitOrder,
  paymentConfig,
}) {
  const [checkoutForm, setCheckoutForm] = useState(initialCheckoutForm);
  const [defaultAddress, setDefaultAddress] = useState(null);
  const [addressStatus, setAddressStatus] = useState('loading');
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
  const isPortOneEnabled = Boolean(paymentConfig?.ready);
  const paymentOptions = getAvailablePaymentOptions(paymentConfig);
  const selectedPaymentOption = findSelectedPaymentOption(checkoutForm, paymentOptions);
  const paymentModeLabel =
    paymentConfig?.mode === 'TEST'
      ? '\uD3EC\uD2B8\uC6D0 \uD14C\uC2A4\uD2B8 \uACB0\uC81C'
      : '\uD3EC\uD2B8\uC6D0 \uACB0\uC81C';
  const submitButtonLabel = isSubmitting
    ? TEXT.submitWhileLoading
    : isPortOneEnabled
      ? TEXT.submitPay
      : TEXT.submitOrder;

  useEffect(() => {
    let cancelled = false;

    async function loadDefaultAddress() {
      try {
        setAddressStatus('loading');
        setError('');

        const payload = await requestAuthApi(
          ADDRESS_API_PATH,
          {
            headers: buildAuthHeaders(),
          },
          TEXT.defaultAddressLoadError
        );

        if (cancelled) {
          return;
        }

        const addresses = Array.isArray(payload.data) ? payload.data : [];
        const nextDefaultAddress =
          addresses.find((address) => address.isDefault === 'Y') || null;

        if (!nextDefaultAddress) {
          setDefaultAddress(null);
          setAddressStatus('missing');
          setError(TEXT.defaultAddressFirst);
          onOpenAddressSetup?.();
          return;
        }

        setDefaultAddress(nextDefaultAddress);
        setCheckoutForm((previousForm) =>
          mapAddressToCheckoutForm(
            nextDefaultAddress,
            previousForm.paymentMethod,
            previousForm.paymentProvider
          )
        );
        setAddressStatus('ready');
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        setDefaultAddress(null);
        setAddressStatus('error');
        setError(loadError?.message || TEXT.defaultAddressLoadError);
      }
    }

    loadDefaultAddress();

    return () => {
      cancelled = true;
    };
  }, [onOpenAddressSetup]);

  useEffect(() => {
    if (!paymentOptions.length) {
      return;
    }

    const nextOption = findSelectedPaymentOption(checkoutForm, paymentOptions);
    if (!nextOption) {
      return;
    }

    if (
      checkoutForm.paymentMethod === nextOption.method &&
      (checkoutForm.paymentProvider || '') === (nextOption.provider || '')
    ) {
      return;
    }

    setCheckoutForm((previousForm) => ({
      ...previousForm,
      paymentMethod: nextOption.method,
      paymentProvider: nextOption.provider || '',
    }));
  }, [checkoutForm, paymentOptions]);

  function updateField(key, value) {
    setCheckoutForm((previousForm) => ({
      ...previousForm,
      [key]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (addressStatus !== 'ready' || !defaultAddress) {
      setError(TEXT.defaultAddressFirst);
      onOpenAddressSetup?.();
      return;
    }

    if (
      !checkoutForm.recipientName.trim() ||
      !checkoutForm.recipientPhone.trim() ||
      !checkoutForm.zipCode.trim() ||
      !checkoutForm.address1.trim()
    ) {
      setError(TEXT.requiredFields);
      return;
    }

    setError('');

    try {
      setIsSubmitting(true);
      await onSubmitOrder(checkoutForm);
    } catch (submitError) {
      setError(submitError?.message || TEXT.orderSubmitError);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!cartItems.length) {
    return (
      <section className="empty-state detail-empty">
        <div className="empty-icon">ORDER</div>
        <h1>{TEXT.emptyTitle}</h1>
        <p>{TEXT.emptyDescription}</p>
        <button className="btn" type="button" onClick={onBackToCart}>
          {TEXT.moveCart}
        </button>
      </section>
    );
  }

  return (
    <>
      <section className="page-head">
        <div>
          <span className="eyebrow">Checkout</span>
          <h1>{TEXT.checkoutTitle}</h1>
          <p>{TEXT.checkoutDescription}</p>
        </div>
        <div className="page-actions">
          <button className="btn-outline" type="button" onClick={onBackToCart}>
            {TEXT.backToCart}
          </button>
        </div>
      </section>

      <section className="quick-grid">
        <article className="quick-card soft-green">
          <div className="quick-label">{TEXT.orderItemCount}</div>
          <div className="quick-value">{cartItems.length}건</div>
          <div className="section-sub">{TEXT.includedProducts}</div>
        </article>
        <article className="quick-card">
          <div className="quick-label">{TEXT.totalAmount}</div>
          <div className="quick-value">{formatCurrency(totalAmount)}</div>
          <div className="section-sub">{TEXT.zeroDeliveryFee}</div>
        </article>
        <article className="quick-card soft-yellow">
          <div className="quick-label">{TEXT.savingAmount}</div>
          <div className="quick-value">{formatCurrency(totalSaving)}</div>
          <div className="section-sub">{TEXT.savingDescription}</div>
        </article>
        <article className="quick-card">
          <div className="quick-label">{TEXT.paymentMethod}</div>
          <div className="quick-value">
            {selectedPaymentOption?.label ||
              getPaymentMethodLabel(
                checkoutForm.paymentMethod,
                checkoutForm.paymentProvider
              )}
          </div>
          <div className="section-sub">{TEXT.paymentMethodDescription}</div>
        </article>
      </section>

      <section className="checkout-layout">
        <form className="checkout-form card" onSubmit={handleSubmit}>
          <div className="card-title">{TEXT.shippingInfo}</div>
          <div className="card-sub">{TEXT.shippingInfoHelp}</div>

          {addressStatus === 'loading' ? (
            <div className="section-sub">{TEXT.loadingAddress}</div>
          ) : null}

          {addressStatus === 'missing' ? (
            <div className="form-error">{TEXT.missingAddress}</div>
          ) : null}

          <div className="form-grid">
            <label className="field">
              <span>{TEXT.recipientName}</span>
              <input
                value={checkoutForm.recipientName}
                onChange={(event) =>
                  updateField('recipientName', event.target.value)
                }
              />
            </label>
            <label className="field">
              <span>{TEXT.recipientPhone}</span>
              <input
                value={checkoutForm.recipientPhone}
                onChange={(event) =>
                  updateField('recipientPhone', event.target.value)
                }
              />
            </label>
            <label className="field field-sm">
              <span>{TEXT.zipCode}</span>
              <input
                value={checkoutForm.zipCode}
                onChange={(event) => updateField('zipCode', event.target.value)}
              />
            </label>
            <label className="field field-full">
              <span>{TEXT.address1}</span>
              <input
                value={checkoutForm.address1}
                onChange={(event) => updateField('address1', event.target.value)}
              />
            </label>
            <label className="field field-full">
              <span>{TEXT.address2}</span>
              <input
                value={checkoutForm.address2}
                onChange={(event) => updateField('address2', event.target.value)}
              />
            </label>
            <label className="field field-full">
              <span>{TEXT.deliveryMessage}</span>
              <input
                value={checkoutForm.deliveryMessage}
                onChange={(event) =>
                  updateField('deliveryMessage', event.target.value)
                }
              />
            </label>
          </div>

          <div className="card-title checkout-subtitle">{TEXT.paymentMethod}</div>
          <div className="payment-methods">
            {paymentOptions.map((option) => (
              <button
                key={`${option.method}-${option.provider || 'default'}`}
                className={`payment-chip ${
                  checkoutForm.paymentMethod === option.method &&
                  (checkoutForm.paymentProvider || '') === (option.provider || '')
                    ? 'active'
                    : ''
                }`}
                type="button"
                onClick={() =>
                  setCheckoutForm((previousForm) => ({
                    ...previousForm,
                    paymentMethod: option.method,
                    paymentProvider: option.provider || '',
                  }))
                }
              >
                {option.label}
              </button>
            ))}
          </div>

          <div
            className={`toss-status-card ${
              isPortOneEnabled ? 'ready' : 'pending'
            }`}
          >
            <div className="toss-status-head">
              <strong>{TEXT.paymentGuide}</strong>
              <span>
                {isPortOneEnabled
                  ? `${paymentModeLabel} ${TEXT.paymentReady}`
                  : TEXT.paymentPending}
              </span>
            </div>
            <p className="section-sub">
              {isPortOneEnabled
                ? TEXT.paymentReadyDescription
                : TEXT.paymentPendingDescription}
            </p>
          </div>

          {error ? <div className="form-error">{error}</div> : null}

          <div className="summary-actions">
            <button
              className="btn"
              type="submit"
              disabled={isSubmitting || addressStatus !== 'ready'}
            >
              {submitButtonLabel}
            </button>
            {addressStatus !== 'ready' ? (
              <button
                className="btn-outline"
                type="button"
                onClick={onOpenAddressSetup}
              >
                {TEXT.addressSetup}
              </button>
            ) : null}
            <button className="btn-outline" type="button" onClick={onBackToCart}>
              {TEXT.viewCartAgain}
            </button>
          </div>
        </form>

        <aside className="checkout-summary">
          <div className="card-title">{TEXT.orderSummary}</div>
          <div className="checkout-items">
            {cartItems.map(({ product, quantity }) => (
              <div className="checkout-item" key={product.productNo}>
                <div className="checkout-item-head">
                  <strong>{product.productName}</strong>
                  <span>{formatCurrency(product.salePrice * quantity)}</span>
                </div>
                <div className="section-sub">
                  {TEXT.quantity} {quantity}개 · {TEXT.eachPrice}{' '}
                  {formatCurrency(product.salePrice)} · {TEXT.avgPrice}{' '}
                  {formatCurrency(product.priceSnapshot.avgPrice)}
                </div>
              </div>
            ))}
          </div>
          <div className="summary-list">
            <div className="insight-item">
              <strong>{TEXT.productAmount}</strong>
              <span>{formatCurrency(totalAmount)}</span>
            </div>
            <div className="insight-item">
              <strong>{TEXT.deliveryFee}</strong>
              <span>{formatCurrency(0)}</span>
            </div>
            <div className="insight-item">
              <strong>{TEXT.savingAmount}</strong>
              <span>{formatCurrency(totalSaving)}</span>
            </div>
          </div>
          <div className="summary-total">
            <span>{TEXT.finalAmount}</span>
            <strong>{formatCurrency(totalAmount)}</strong>
          </div>
        </aside>
      </section>
    </>
  );
}
