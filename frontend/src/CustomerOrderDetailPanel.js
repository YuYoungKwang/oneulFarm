import { formatDate, formatDateTime, formatPrice } from './appUtils';

function getOrderItemImageSrc(imageNo) {
  return imageNo ? `/backend/api/image/product/${imageNo}` : '';
}

const ORDER_STATUS_LABELS = {
  PAYMENT_COMPLETED: '결제 완료',
  ORDER_ACCEPTED: '주문 확정',
  ORDER_REJECTED: '주문 거절',
};

const DELIVERY_STATUS_LABELS = {
  NOT_STARTED: '배송 준비 전',
  WAYBILL_ASSIGNED: '송장 등록',
  PICKED_UP: '집하 완료',
  IN_TRANSIT: '배송 중',
  DELIVERED: '배송 완료',
};

const CANCEL_STATUS_LABELS = {
  NONE: '취소 없음',
  CANCEL_REQUESTED: '취소 요청',
  CANCEL_ACCEPTED: '취소 승인',
  CANCEL_REJECTED: '취소 거절',
};

function resolveOrderStatusLabel(detail) {
  const status = detail?.normalizedOrderStatus || detail?.orderStatus;
  return ORDER_STATUS_LABELS[status] || status || '-';
}

function resolveDeliveryStatusLabel(detail) {
  const status = detail?.normalizedDeliveryStatus || detail?.deliveryStatus;
  return DELIVERY_STATUS_LABELS[status] || status || '-';
}

function resolveCancelStatusLabel(detail) {
  const status = detail?.cancelStatus;
  if (!status || status === 'NONE') {
    return '';
  }
  return CANCEL_STATUS_LABELS[status] || status;
}

function buildTrackingSteps(detail) {
  const deliveryStatus = detail?.normalizedDeliveryStatus || detail?.deliveryStatus;

  return [
    {
      key: 'ordered',
      label: '주문 접수',
      value: detail?.orderedAt,
      active: true,
    },
    {
      key: 'waybill',
      label: '송장 등록',
      value: detail?.waybillAssignedAt,
      active: Boolean(detail?.trackingNo) || deliveryStatus === 'WAYBILL_ASSIGNED' || deliveryStatus === 'PICKED_UP' || deliveryStatus === 'IN_TRANSIT' || deliveryStatus === 'DELIVERED',
    },
    {
      key: 'transit',
      label: '배송 중',
      value: detail?.inTransitAt,
      active: deliveryStatus === 'PICKED_UP' || deliveryStatus === 'IN_TRANSIT' || deliveryStatus === 'DELIVERED',
    },
    {
      key: 'delivered',
      label: '배송 완료',
      value: detail?.deliveredAt,
      active: deliveryStatus === 'DELIVERED',
    },
  ];
}

function addDays(value, days) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setDate(date.getDate() + days);
  return date;
}

function resolvePurchaseConfirmMessage(detail) {
  if (!detail) {
    return '';
  }

  if (detail.purchaseConfirmStatus === 'PURCHASE_CONFIRMED') {
    return detail.purchaseConfirmedAt
      ? `구매 확정일 ${formatDate(detail.purchaseConfirmedAt)}`
      : '구매 확정이 완료된 주문입니다.';
  }

  if ((detail.normalizedDeliveryStatus || detail.deliveryStatus) !== 'DELIVERED') {
    return '';
  }

  const autoConfirmAt = addDays(detail.deliveredAt, 7);
  if (autoConfirmAt) {
    return `배송 완료 후 7일 뒤인 ${formatDate(autoConfirmAt)}에 자동으로 구매 확정됩니다.`;
  }

  return '배송 완료 후 7일이 지나면 자동으로 구매 확정됩니다.';
}

function CustomerOrderDetailPanel({
  detail,
  loading,
  error,
  onStartCreateReview,
  onRequestOrderCancel,
  onConfirmPurchase,
  orderActionSubmitting,
  orderActionError,
}) {
  if (loading) {
    return <article className="customer-order-detail customer-order-detail--feedback">주문 상세를 불러오는 중입니다.</article>;
  }

  if (error) {
    return (
      <article className="customer-order-detail customer-order-detail--feedback customer-order-detail--error">
        {error}
      </article>
    );
  }

  if (!detail) {
    return (
      <article className="customer-order-detail customer-order-detail--feedback">
        왼쪽에서 주문을 선택하면 배송 흐름과 상품 정보를 한 번에 확인할 수 있습니다.
      </article>
    );
  }

  const trackingSteps = buildTrackingSteps(detail);
  const cancelStatusLabel = resolveCancelStatusLabel(detail);
  const purchaseConfirmMessage = resolvePurchaseConfirmMessage(detail);
  const showActionSection =
    Boolean(detail) ||
    detail.cancelRequestAvailable ||
    detail.purchaseConfirmAvailable ||
    Boolean(purchaseConfirmMessage) ||
    Boolean(orderActionError);

  return (
    <article className="customer-order-detail">
      <header className="customer-order-detail__head">
        <div>
          <p className="customer-order-detail__eyebrow">주문 상세</p>
          <h2 className="customer-order-detail__title">{detail.orderId}</h2>
          <p className="customer-order-detail__sub">{formatDateTime(detail.orderedAt)}</p>
        </div>
        <div className="customer-order-detail__status-group">
          <span className="customer-order-detail__status customer-order-detail__status--order">
            {resolveOrderStatusLabel(detail)}
          </span>
          <span className="customer-order-detail__status customer-order-detail__status--delivery">
            {resolveDeliveryStatusLabel(detail)}
          </span>
          {cancelStatusLabel && (
            <span className="customer-order-detail__status customer-order-detail__status--cancel">
              {cancelStatusLabel}
            </span>
          )}
        </div>
      </header>

      <section className="customer-order-detail__tracking">
        <div className="customer-order-detail__section-head">
          <h3>배송 흐름</h3>
          <span className="customer-order-detail__section-copy">
            {detail.carrierName || detail.courierName || '배송사 미지정'}
            {detail.trackingNo ? ` · 송장 ${detail.trackingNo}` : ''}
          </span>
        </div>
        <div className="customer-order-detail__timeline">
          {trackingSteps.map((step) => (
            <div
              key={step.key}
              className={`customer-order-detail__timeline-step ${step.active ? 'is-active' : ''}`}
            >
              <span className="customer-order-detail__timeline-dot" />
              <div className="customer-order-detail__timeline-body">
                <strong>{step.label}</strong>
                <span>{step.value ? formatDateTime(step.value) : '아직 업데이트되지 않았습니다.'}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {showActionSection && (
        <section className="customer-order-detail__actions">
          <div className="customer-order-detail__section-head">
            <h3>주문 처리</h3>
            {purchaseConfirmMessage && (
              <span className="customer-order-detail__section-copy">
                {purchaseConfirmMessage}
              </span>
            )}
          </div>
            <div className="customer-order-detail__action-buttons">
                <button
                  type="button"
                  className="btn-outline customer-order-detail__action-button"
                  onClick={onRequestOrderCancel}
                  disabled={!detail.cancelRequestAvailable || orderActionSubmitting === 'cancel'}
                >
                  {orderActionSubmitting === 'cancel' ? '취소 요청 중...' : '취소 요청'}
                </button>
              {detail.purchaseConfirmAvailable && (
                <button
                  type="button"
                  className="btn customer-order-detail__action-button"
                  onClick={onConfirmPurchase}
                  disabled={orderActionSubmitting === 'purchase-confirm'}
                >
                  {orderActionSubmitting === 'purchase-confirm' ? '구매 확정 중...' : '구매 확정'}
                </button>
              )}
            </div>
          {!detail.cancelRequestAvailable && (
            <p className="customer-order-detail__action-help">
              주문 취소는 배송 준비 전 주문만 요청할 수 있습니다.
            </p>
          )}
          {orderActionError && (
            <p className="customer-order-detail__action-error">{orderActionError}</p>
          )}
        </section>
      )}

      <div className="customer-order-detail__grid">
        <section className="customer-order-detail__panel">
          <h3>주문 정보</h3>
          <div className="customer-order-detail__rows">
            <div className="customer-order-detail__row">
              <strong>주문번호</strong>
              <span>{detail.orderId}</span>
            </div>
            <div className="customer-order-detail__row">
              <strong>주문일시</strong>
              <span>{formatDateTime(detail.orderedAt)}</span>
            </div>
            <div className="customer-order-detail__row">
              <strong>결제수단</strong>
              <span>{detail.paymentMethod || '-'}</span>
            </div>
            <div className="customer-order-detail__row">
              <strong>결제상태</strong>
              <span>{detail.paymentStatus || '-'}</span>
            </div>
          </div>
        </section>

        <section className="customer-order-detail__panel">
          <h3>배송지 정보</h3>
          <div className="customer-order-detail__rows">
            <div className="customer-order-detail__row">
              <strong>수령인</strong>
              <span>{detail.recipientName || '-'}</span>
            </div>
            <div className="customer-order-detail__row">
              <strong>연락처</strong>
              <span>{detail.recipientPhone || '-'}</span>
            </div>
            <div className="customer-order-detail__row">
              <strong>주소</strong>
              <span>{[detail.zipCode, detail.address1, detail.address2].filter(Boolean).join(' ') || '-'}</span>
            </div>
            <div className="customer-order-detail__row">
              <strong>배송사</strong>
              <span>{detail.carrierName || detail.courierName || '-'}</span>
            </div>
          </div>
        </section>

        <section className="customer-order-detail__panel customer-order-detail__panel--amount">
          <h3>결제 금액</h3>
          <div className="customer-order-detail__rows">
            <div className="customer-order-detail__row">
              <strong>상품 금액</strong>
              <span>{formatPrice(detail.totalAmount)}</span>
            </div>
            <div className="customer-order-detail__row">
              <strong>할인 금액</strong>
              <span>{formatPrice(detail.discountAmount)}</span>
            </div>
            <div className="customer-order-detail__row">
              <strong>배송비</strong>
              <span>{formatPrice(detail.deliveryFee)}</span>
            </div>
            <div className="customer-order-detail__row customer-order-detail__row--strong">
              <strong>최종 결제 금액</strong>
              <span>{formatPrice(detail.finalAmount)}</span>
            </div>
            <div className="customer-order-detail__row customer-order-detail__row--saving">
              <strong>총 절약 금액</strong>
              <span>{formatPrice(detail.totalSavedAmount)}</span>
            </div>
          </div>
        </section>

      </div>

      <section className="customer-order-detail__items">
        <div className="customer-order-detail__section-head">
          <h3>주문 상품</h3>
          <span className="customer-order-detail__section-copy">{Number(detail.items?.length || 0)}개</span>
        </div>
        <div className="customer-order-detail__item-list">
          {(detail.items || []).map((item) => (
            <article key={item.orderItemNo} className="customer-order-detail__item-card">
              <div className="customer-order-detail__item-media">
                {item.imageNo ? (
                  <img
                    className="customer-order-detail__item-image"
                    src={getOrderItemImageSrc(item.imageNo)}
                    alt={item.productName}
                  />
                ) : (
                  <div className="customer-order-detail__item-image customer-order-detail__item-image--placeholder">
                    상품
                  </div>
                )}
              </div>
              <div className="customer-order-detail__item-body">
                <div className="customer-order-detail__item-top">
                  <strong>{item.productName}</strong>
                  <span>{item.quantity}개</span>
                </div>
                <div className="customer-order-detail__rows">
                  <div className="customer-order-detail__row">
                    <strong>구매 단가</strong>
                    <span>{formatPrice(item.unitPrice)}</span>
                  </div>
                  <div className="customer-order-detail__row">
                    <strong>합계</strong>
                    <span>{formatPrice(item.subtotal)}</span>
                  </div>
                  <div className="customer-order-detail__row">
                    <strong>시장 평균가</strong>
                    <span>{formatPrice(item.marketAvgPrice)}</span>
                  </div>
                  <div className="customer-order-detail__row customer-order-detail__row--saving">
                    <strong>절약 금액</strong>
                    <span>{formatPrice(item.savedAmount)}</span>
                  </div>
                </div>
                <div className="customer-order-detail__item-actions">
                  {item.reviewWritable ? (
                    <button
                      type="button"
                      className="btn"
                      onClick={() => onStartCreateReview && onStartCreateReview(item, detail)}
                    >
                      리뷰 작성
                    </button>
                  ) : item.reviewExists ? (
                    <span className="customer-order-detail__item-note">리뷰 작성 완료</span>
                  ) : (
                    <span className="customer-order-detail__item-note">리뷰 작성 조건 미충족</span>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </article>
  );
}

export default CustomerOrderDetailPanel;
