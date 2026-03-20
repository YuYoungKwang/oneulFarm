import { useState } from 'react';
import { formatCurrency, getSavingAmount } from './productUiUtils';
import { getPaymentMethodLabel } from './orderUiUtils';

const initialCheckoutForm = {
  recipientName: '허륜',
  recipientPhone: '010-1234-5678',
  zipCode: '06236',
  address1: '서울 강남구 테헤란로 123',
  address2: '8층 oneulFarm',
  deliveryMessage: '문 앞에 놓아주세요',
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
      setError('받는 분, 연락처, 우편번호, 기본 주소를 입력해주세요.');
      return;
    }

    setError('');

    try {
      setIsSubmitting(true);
      await onSubmitOrder(checkoutForm);
    } catch (submitError) {
      setError(submitError?.message || '주문을 완료하지 못했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!cartItems.length) {
    return (
      <section className="empty-state detail-empty">
        <div className="empty-icon">🧾</div>
        <h1>주문할 상품이 없습니다.</h1>
        <p>장바구니에 상품을 먼저 담은 뒤 주문서를 작성해주세요.</p>
        <button className="btn" type="button" onClick={onBackToCart}>
          장바구니로 이동
        </button>
      </section>
    );
  }

  return (
    <>
      <section className="page-head">
        <div>
          <span className="eyebrow">Checkout</span>
          <h1>주문서 작성</h1>
          <p>배송 정보를 입력하고 결제 수단을 선택한 뒤 주문을 완료합니다.</p>
        </div>
        <div className="page-actions">
          <button className="btn-outline" type="button" onClick={onBackToCart}>
            장바구니로 돌아가기
          </button>
        </div>
      </section>

      <section className="quick-grid">
        <article className="quick-card soft-green">
          <div className="quick-label">주문 상품 수</div>
          <div className="quick-value">{cartItems.length}건</div>
          <div className="section-sub">지금 결제할 상품 종류</div>
        </article>
        <article className="quick-card">
          <div className="quick-label">총 상품 금액</div>
          <div className="quick-value">{formatCurrency(totalAmount)}</div>
          <div className="section-sub">배송비 0원 기준</div>
        </article>
        <article className="quick-card soft-yellow">
          <div className="quick-label">예상 절약 금액</div>
          <div className="quick-value">{formatCurrency(totalSaving)}</div>
          <div className="section-sub">평균 시세 대비 예상 금액</div>
        </article>
        <article className="quick-card">
          <div className="quick-label">결제 수단</div>
          <div className="quick-value">
            {getPaymentMethodLabel(checkoutForm.paymentMethod)}
          </div>
          <div className="section-sub">원하는 방식으로 선택 가능</div>
        </article>
      </section>

      <section className="checkout-layout">
        <form className="checkout-form card" onSubmit={handleSubmit}>
          <div className="card-title">배송 정보 입력</div>
          <div className="card-sub">
            주문 완료 후 이 주소로 상품이 배송됩니다.
          </div>

          <div className="form-grid">
            <label className="field">
              <span>받는 분</span>
              <input
                value={checkoutForm.recipientName}
                onChange={(event) =>
                  updateField('recipientName', event.target.value)
                }
              />
            </label>
            <label className="field">
              <span>연락처</span>
              <input
                value={checkoutForm.recipientPhone}
                onChange={(event) =>
                  updateField('recipientPhone', event.target.value)
                }
              />
            </label>
            <label className="field field-sm">
              <span>우편번호</span>
              <input
                value={checkoutForm.zipCode}
                onChange={(event) => updateField('zipCode', event.target.value)}
              />
            </label>
            <label className="field field-full">
              <span>기본 주소</span>
              <input
                value={checkoutForm.address1}
                onChange={(event) => updateField('address1', event.target.value)}
              />
            </label>
            <label className="field field-full">
              <span>상세 주소</span>
              <input
                value={checkoutForm.address2}
                onChange={(event) => updateField('address2', event.target.value)}
              />
            </label>
            <label className="field field-full">
              <span>배송 메모</span>
              <input
                value={checkoutForm.deliveryMessage}
                onChange={(event) =>
                  updateField('deliveryMessage', event.target.value)
                }
              />
            </label>
          </div>

          <div className="card-title checkout-subtitle">결제 수단</div>
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
              <strong>결제 안내</strong>
              <span>
                {tossConfig?.ready ? '연동 준비 완료' : '간편 결제 준비 중'}
              </span>
            </div>
            <p className="section-sub">
              지금은 주문 완료 흐름을 우선 제공하고 있습니다. 실제 결제 연동은
              이후 단계에서 자연스럽게 이어질 수 있도록 준비해두었습니다.
            </p>
          </div>

          {error ? <div className="form-error">{error}</div> : null}

          <div className="summary-actions">
            <button className="btn" type="submit" disabled={isSubmitting}>
              {isSubmitting ? '처리 중...' : '주문 완료하기'}
            </button>
            <button className="btn-outline" type="button" onClick={onBackToCart}>
              장바구니 다시 보기
            </button>
          </div>
        </form>

        <aside className="checkout-summary">
          <div className="card-title">주문 상품 확인</div>
          <div className="checkout-items">
            {cartItems.map(({ product, quantity }) => (
              <div className="checkout-item" key={product.productNo}>
                <div className="checkout-item-head">
                  <strong>{product.productName}</strong>
                  <span>{formatCurrency(product.salePrice * quantity)}</span>
                </div>
                <div className="section-sub">
                  수량 {quantity}개 · 단가 {formatCurrency(product.salePrice)} ·
                  평균가 {formatCurrency(product.priceSnapshot.avgPrice)}
                </div>
              </div>
            ))}
          </div>
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
            <span>최종 결제 금액</span>
            <strong>{formatCurrency(totalAmount)}</strong>
          </div>
        </aside>
      </section>
    </>
  );
}
