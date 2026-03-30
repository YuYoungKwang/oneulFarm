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
  NOT_STARTED: '배송 준비',
  WAYBILL_ASSIGNED: '송장 등록',
  PICKED_UP: '집하 완료',
  IN_TRANSIT: '배송 중',
  DELIVERED: '배송 완료',
};

const CANCEL_STATUS_LABELS = {
  NONE: '취소 없음',
  CANCEL_REQUESTED: '취소 요청',
  CANCEL_ACCEPTED: '취소 완료',
  CANCEL_REJECTED: '취소 거절',
};

function resolveOrderStatusLabel(detail) {
  const status = detail?.normalizedOrderStatus || detail?.orderStatus;
  return ORDER_STATUS_LABELS[status] || status || '-';
}

function resolveDeliveryStatusLabel(detail) {
  if (detail?.cancelStatus === 'CANCEL_ACCEPTED') {
    return '';
  }

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

function resolveOrderHistoryStatusLabel(status) {
  switch (status) {
    case 'CREATED':
      return '주문 생성';
    case 'PAID':
    case 'PAYMENT_COMPLETED':
      return '결제 완료';
    case 'ORDER_ACCEPTED':
      return '주문 접수';
    case 'ORDER_REJECTED':
      return '주문 거절';
    case 'SHIPPING':
      return '배송 중';
    case 'COMPLETED':
      return '배송 완료';
    case 'CANCELED':
      return '주문 취소';
    default:
      return status || '-';
  }
}

function resolveOrderHistoryActorLabel(actor) {
  switch (actor) {
    case 'SYSTEM':
      return '시스템';
    case 'ADMIN':
      return '운영자';
    case 'CARRIER':
      return '배송사';
    default:
      return actor || '-';
  }
}

// eslint-disable-next-line no-unused-vars
function resolveOrderHistoryTitle(history) {
  const reason = history?.changeReason || '';
  if (reason.includes('송장번호')) return '송장 등록';
  if (reason.includes('집하')) return '집하 완료';
  if (reason.includes('배송사로 인계')) return '배송 인계';
  if (reason.includes('취소 요청을 수락')) return '취소 요청 수락';
  if (reason.includes('취소 요청을 거절')) return '취소 요청 거절';
  if (reason.includes('주문을 거절')) return '주문 거절';
  return resolveOrderHistoryStatusLabel(history?.nextOrderStatus);
}

// eslint-disable-next-line no-unused-vars
function resolveOrderHistoryCopy(history) {
  const actorLabel = resolveOrderHistoryActorLabel(history?.changedByType);
  const reason = history?.changeReason;
  if (reason) {
    return `${actorLabel} · ${reason}`;
  }
  return actorLabel;
}

function resolveCancelHistoryTitle(history) {
  switch (history?.cancelStatus) {
    case 'CANCEL_REQUESTED':
      return '취소 요청';
    case 'CANCEL_ACCEPTED':
      return '취소 수락';
    case 'CANCEL_REJECTED':
      return '취소 거절';
    default:
      return history?.cancelStatus || '-';
  }
}

function resolveCancelHistoryCopy(history) {
  if (!history) {
    return '';
  }

  if (history.cancelStatus === 'CANCEL_REQUESTED') {
    return history.requestReason
      ? `고객 · ${history.requestReason}`
      : '고객이 취소를 요청했습니다.';
  }

  if (history.cancelStatus === 'CANCEL_ACCEPTED') {
    return history.decisionReason
      ? `운영자 · ${history.decisionReason}`
      : '운영자가 취소 요청을 수락했습니다.';
  }

  if (history.cancelStatus === 'CANCEL_REJECTED') {
    return history.decisionReason
      ? `운영자 · ${history.decisionReason}`
      : '운영자가 취소 요청을 거절했습니다.';
  }

  return '';
}

function resolveTrackingHistoryTitle(history) {
  switch (history?.trackingStatus) {
    case 'WAYBILL_ASSIGNED':
      return '송장 등록';
    case 'PICKED_UP':
      return '집하 완료';
    case 'IN_TRANSIT':
      return '배송 중';
    case 'DELIVERED':
      return '배송 완료';
    default:
      return history?.trackingStatus || '-';
  }
}

function resolveTrackingHistoryCopy(history) {
  if (!history) {
    return '';
  }

  if (history.trackingMessage) {
    return history.trackingNo
      ? `${history.trackingMessage} · 송장 ${history.trackingNo}`
      : history.trackingMessage;
  }

  return history.trackingNo ? `송장 ${history.trackingNo}` : '';
}

function findTrackingHistoryTime(detail, trackingStatus) {
  const histories = Array.isArray(detail?.trackingHistories) ? detail.trackingHistories : [];
  for (let index = histories.length - 1; index >= 0; index -= 1) {
    if (histories[index]?.trackingStatus === trackingStatus) {
      return histories[index]?.recordedAt || null;
    }
  }
  return null;
}

function findLatestTrackingLocation(detail) {
  const histories = Array.isArray(detail?.trackingHistories) ? detail.trackingHistories : [];
  for (let index = histories.length - 1; index >= 0; index -= 1) {
    const location = [histories[index]?.locationName, histories[index]?.locationAddress].filter(Boolean).join(' · ');
    if (location) {
      return location;
    }
  }
  return '';
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
      value: findTrackingHistoryTime(detail, 'WAYBILL_ASSIGNED') || detail?.waybillAssignedAt,
      active:
        Boolean(detail?.trackingNo) ||
        deliveryStatus === 'WAYBILL_ASSIGNED' ||
        deliveryStatus === 'PICKED_UP' ||
        deliveryStatus === 'IN_TRANSIT' ||
        deliveryStatus === 'DELIVERED',
    },
    {
      key: 'pickup',
      label: '집하 완료',
      value: findTrackingHistoryTime(detail, 'PICKED_UP') || detail?.pickedUpAt,
      active: deliveryStatus === 'PICKED_UP' || deliveryStatus === 'IN_TRANSIT' || deliveryStatus === 'DELIVERED',
    },
    {
      key: 'transit',
      label: '배송 중',
      value: findTrackingHistoryTime(detail, 'IN_TRANSIT') || detail?.inTransitAt,
      active: deliveryStatus === 'IN_TRANSIT' || deliveryStatus === 'DELIVERED',
    },
    {
      key: 'delivered',
      label: '배송 완료',
      value: findTrackingHistoryTime(detail, 'DELIVERED') || detail?.deliveredAt,
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

  if (detail.cancelStatus === 'CANCEL_REQUESTED' || detail.cancelStatus === 'CANCEL_ACCEPTED') {
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

function resolveUserOrderHistoryEvent(history) {
  const reason = history?.changeReason || '';
  const nextStatus = history?.nextOrderStatus;

  if (reason.includes('송장')) {
    return {
      title: '송장 등록',
      copy: '송장번호가 등록되어 배송 준비가 진행되고 있습니다.',
    };
  }
  if (reason.includes('집하')) {
    return {
      title: '집하 완료',
      copy: '상품이 집하되어 배송이 이어지고 있습니다.',
    };
  }
  if (reason.includes('배송사') || reason.includes('인계')) {
    return {
      title: '배송 인계',
      copy: '주문이 배송 담당자에게 전달되었습니다.',
    };
  }
  if (reason.includes('취소 요청') && reason.includes('수락')) {
    return {
      title: '취소 요청 승인',
      copy: '취소 요청이 승인되어 주문이 취소 처리되었습니다.',
    };
  }
  if (reason.includes('취소 요청') && (reason.includes('거절') || reason.includes('반려'))) {
    return {
      title: '취소 요청 반려',
      copy: '취소 요청이 반려되어 주문이 계속 진행됩니다.',
    };
  }
  if (reason.includes('주문') && reason.includes('거절')) {
    return {
      title: '주문 거절',
      copy: '주문이 접수 단계에서 거절되었습니다.',
    };
  }

  switch (nextStatus) {
    case 'CREATED':
      return { title: '주문 생성', copy: '주문이 생성되었습니다.' };
    case 'PAID':
    case 'PAYMENT_COMPLETED':
      return { title: '결제 완료', copy: '결제가 완료되어 주문 확인을 기다리고 있습니다.' };
    case 'ORDER_ACCEPTED':
      return { title: '주문 확인', copy: '주문이 확인되어 배송 준비가 시작되었습니다.' };
    case 'ORDER_REJECTED':
      return { title: '주문 거절', copy: '주문이 처리 불가 상태로 거절되었습니다.' };
    case 'SHIPPING':
      return { title: '배송 중', copy: '상품이 배송 중입니다.' };
    case 'COMPLETED':
      return { title: '배송 완료', copy: '배송이 완료되었습니다.' };
    case 'CANCELED':
      return { title: '주문 취소', copy: '주문이 취소되었습니다.' };
    default:
      return { title: '상태 변경', copy: '주문 처리 상태가 변경되었습니다.' };
  }
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
  const latestTrackingLocation = findLatestTrackingLocation(detail);
  const cancelStatusLabel = resolveCancelStatusLabel(detail);
  const deliveryStatusLabel = resolveDeliveryStatusLabel(detail);
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
          {deliveryStatusLabel ? (
            <span className="customer-order-detail__status customer-order-detail__status--delivery">
              {deliveryStatusLabel}
            </span>
          ) : null}
          {cancelStatusLabel ? (
            <span className="customer-order-detail__status customer-order-detail__status--cancel">
              {cancelStatusLabel}
            </span>
          ) : null}
        </div>
      </header>

      <section className="customer-order-detail__tracking">
        <div className="customer-order-detail__section-head">
          <h3>배송 흐름</h3>
          <span className="customer-order-detail__section-copy">
            {detail.carrierName || detail.courierName || '배송사 미정'}
            {detail.trackingNo ? ` · 송장 ${detail.trackingNo}` : ''}
          </span>
        </div>
        {latestTrackingLocation ? (
          <div className="customer-order-detail__inline-status">
            <strong>현재 위치</strong>
            <span>{latestTrackingLocation}</span>
          </div>
        ) : null}
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

      {(detail.trackingHistories || []).length ? (
        <section className="customer-order-detail__history">
          <div className="customer-order-detail__section-head">
            <h3>배송 추적 이력</h3>
            <span className="customer-order-detail__section-copy">{Number(detail.trackingHistories?.length || 0)}건</span>
          </div>
          <div className="customer-order-detail__history-list">
            {(detail.trackingHistories || []).map((history) => (
              <article key={history.trackingHistoryNo} className="customer-order-detail__history-card">
                <div className="customer-order-detail__history-meta">
                  <strong>{resolveTrackingHistoryTitle(history)}</strong>
                  <span>{history.recordedAt ? formatDateTime(history.recordedAt) : '-'}</span>
                </div>
                <p className="customer-order-detail__history-copy">{resolveTrackingHistoryCopy(history)}</p>
                {history.locationName || history.locationAddress ? (
                  <p className="customer-order-detail__history-copy">
                    {[history.locationName, history.locationAddress].filter(Boolean).join(' · ')}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {showActionSection ? (
        <section className="customer-order-detail__actions">
          <div className="customer-order-detail__section-head">
            <h3>주문 처리</h3>
            {purchaseConfirmMessage ? (
              <span className="customer-order-detail__section-copy">{purchaseConfirmMessage}</span>
            ) : null}
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
            {detail.purchaseConfirmAvailable ? (
              <button
                type="button"
                className="btn customer-order-detail__action-button"
                onClick={onConfirmPurchase}
                disabled={orderActionSubmitting === 'purchase-confirm'}
              >
                {orderActionSubmitting === 'purchase-confirm' ? '구매 확정 중...' : '구매 확정'}
              </button>
            ) : null}
          </div>
          {!detail.cancelRequestAvailable ? (
            <p className="customer-order-detail__action-help">
              주문 취소는 배송 준비 전 주문만 요청할 수 있습니다.
            </p>
          ) : null}
          {orderActionError ? (
            <p className="customer-order-detail__action-error">{orderActionError}</p>
          ) : null}
        </section>
      ) : null}

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

      <section className="customer-order-detail__history">
        <div className="customer-order-detail__section-head">
          <h3>주문 처리 이력</h3>
          <span className="customer-order-detail__section-copy">{Number(detail.orderStatusHistories?.length || 0)}건</span>
        </div>
        <div className="customer-order-detail__history-list">
          {(detail.orderStatusHistories || []).map((history) => (
            <article key={history.orderStatusHistoryNo} className="customer-order-detail__history-card">
              <div className="customer-order-detail__history-meta">
                <strong>{resolveUserOrderHistoryEvent(history).title}</strong>
                <span>{formatDateTime(history.changedAt)}</span>
              </div>
              <p className="customer-order-detail__history-copy">{resolveUserOrderHistoryEvent(history).copy}</p>
            </article>
          ))}
          {!(detail.orderStatusHistories || []).length ? (
            <p className="customer-order-detail__history-copy">아직 기록된 주문 처리 이력이 없습니다.</p>
          ) : null}
        </div>
      </section>

      {(detail.cancelRequestHistories || []).length ? (
        <section className="customer-order-detail__history">
          <div className="customer-order-detail__section-head">
            <h3>취소 처리 이력</h3>
            <span className="customer-order-detail__section-copy">{Number(detail.cancelRequestHistories?.length || 0)}건</span>
          </div>
          <div className="customer-order-detail__history-list">
            {(detail.cancelRequestHistories || []).map((history) => {
              const eventTime =
                history.cancelStatus === 'CANCEL_REQUESTED'
                  ? history.requestedAt
                  : history.decidedAt || history.requestedAt;

              return (
                <article key={history.cancelRequestNo} className="customer-order-detail__history-card">
                  <div className="customer-order-detail__history-meta">
                    <strong>{resolveCancelHistoryTitle(history)}</strong>
                    <span>{eventTime ? formatDateTime(eventTime) : '-'}</span>
                  </div>
                  <p className="customer-order-detail__history-copy">{resolveCancelHistoryCopy(history)}</p>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

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
