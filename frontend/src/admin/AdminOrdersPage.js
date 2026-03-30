import { AdminEmptyState, AdminPageHeader, formatAdminCurrency, formatAdminDate, formatAdminDateParts } from './AdminUi';
import '../styles/adminOrders.css';

const ADMIN_ORDER_FILTERS = [
  { value: 'ALL', label: '전체' },
  { value: 'PAYMENT_COMPLETED', label: '결제 완료' },
  { value: 'ORDER_ACCEPTED', label: '주문 확정' },
  { value: 'PURCHASE_PENDING', label: '구매 확정 대기' },
  { value: 'PURCHASE_CONFIRMED', label: '구매 확정 완료' },
  { value: 'CANCEL_REQUESTED', label: '취소 요청' },
  { value: 'CANCEL_ACCEPTED', label: '취소 완료' },
  { value: 'CANCEL_REJECTED', label: '취소 거절' },
  { value: 'ORDER_REJECTED', label: '주문 거절' },
  { value: 'DELIVERED', label: '배송 완료' },
];

const ORDER_STATUS_LABELS = {
  PAYMENT_COMPLETED: '결제 완료',
  ORDER_ACCEPTED: '주문 확정',
  ORDER_REJECTED: '주문 거절',
  CREATED: '주문 생성',
  PAID: '결제 완료',
  SHIPPING: '주문 확정',
  COMPLETED: '주문 확정',
  CANCELED: '주문 취소',
};

const DELIVERY_STATUS_LABELS = {
  NOT_STARTED: '배송 준비',
  WAYBILL_ASSIGNED: '송장 등록',
  PICKED_UP: '집하 완료',
  IN_TRANSIT: '배송 중',
  DELIVERED: '배송 완료',
  READY: '배송 준비',
  SHIPPING: '배송 중',
};

const CANCEL_STATUS_LABELS = {
  NONE: '',
  CANCEL_REQUESTED: '취소 요청',
  CANCEL_ACCEPTED: '취소 완료',
  CANCEL_REJECTED: '취소 거절',
};

const PURCHASE_CONFIRM_LABELS = {
  PURCHASE_PENDING: '구매 확정 대기',
  PURCHASE_CONFIRMED: '구매 확정 완료',
};

function getOrderStatusLabel(order) {
  const status = order?.normalizedOrderStatus || order?.orderStatus;
  return ORDER_STATUS_LABELS[status] || status || '-';
}

function getDeliveryStatusLabel(order) {
  const status = order?.normalizedDeliveryStatus || order?.deliveryStatus;
  return DELIVERY_STATUS_LABELS[status] || status || '-';
}

function getCancelStatusLabel(order) {
  const status = order?.cancelStatus;
  if (!status || status === 'NONE') return '';
  return CANCEL_STATUS_LABELS[status] || status;
}

function getPurchaseConfirmLabel(order) {
  const status = order?.purchaseConfirmStatus;
  if (!status) return '';
  return PURCHASE_CONFIRM_LABELS[status] || status;
}

function getOrderHistoryStatusLabel(status) {
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

function getOrderHistoryActorLabel(actor) {
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
function getOrderHistoryTitle(history) {
  const reason = history?.changeReason || '';
  if (reason.includes('송장번호')) return '송장 등록';
  if (reason.includes('집하')) return '집하 완료';
  if (reason.includes('배송사로 인계')) return '배송 인계';
  if (reason.includes('취소 요청을 수락')) return '취소 요청 수락';
  if (reason.includes('취소 요청을 거절')) return '취소 요청 거절';
  if (reason.includes('주문을 거절')) return '주문 거절';
  return getOrderHistoryStatusLabel(history?.nextOrderStatus);
}

// eslint-disable-next-line no-unused-vars
function getOrderHistoryCopy(history) {
  const actorLabel = getOrderHistoryActorLabel(history?.changedByType);
  const reason = history?.changeReason;
  if (reason) {
    return `${actorLabel} · ${reason}`;
  }
  return actorLabel;
}

function getCancelHistoryTitle(history) {
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

function getCancelHistoryCopy(history) {
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

function getTrackingHistoryTitle(history) {
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

function getTrackingHistoryCopy(history) {
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

function resolveFilterStatus(order) {
  if (!order) return '';
  const cancelStatus = order.cancelStatus;
  const purchaseConfirmStatus = order.purchaseConfirmStatus;
  const normalizedOrderStatus = order.normalizedOrderStatus || order.orderStatus;
  const normalizedDeliveryStatus = order.normalizedDeliveryStatus || order.deliveryStatus;
  if (cancelStatus && cancelStatus !== 'NONE') return cancelStatus;
  if (purchaseConfirmStatus === 'PURCHASE_CONFIRMED') return 'PURCHASE_CONFIRMED';
  if (purchaseConfirmStatus === 'PURCHASE_PENDING' && normalizedDeliveryStatus === 'DELIVERED') return 'PURCHASE_PENDING';
  if (normalizedOrderStatus === 'ORDER_REJECTED') return 'ORDER_REJECTED';
  if (normalizedDeliveryStatus === 'DELIVERED') return 'DELIVERED';
  return normalizedOrderStatus || normalizedDeliveryStatus || '';
}

function getTone(status) {
  if (status === 'ORDER_REJECTED' || status === 'CANCELED' || status === 'CANCEL_REJECTED') return 'is-danger';
  if (status === 'DELIVERED' || status === 'ORDER_ACCEPTED' || status === 'CANCEL_ACCEPTED' || status === 'PURCHASE_CONFIRMED') return 'is-success';
  if (status === 'WAYBILL_ASSIGNED' || status === 'PICKED_UP' || status === 'IN_TRANSIT' || status === 'SHIPPING') return 'is-accent';
  if (status === 'CANCEL_REQUESTED' || status === 'PURCHASE_PENDING') return 'is-warn';
  return 'is-neutral';
}

function buildSummary(orders) {
  return {
    totalCount: orders.length,
    paymentCompletedCount: orders.filter((order) => (order.normalizedOrderStatus || order.orderStatus) === 'PAYMENT_COMPLETED').length,
    acceptedCount: orders.filter((order) => (order.normalizedOrderStatus || order.orderStatus) === 'ORDER_ACCEPTED').length,
    purchasePendingCount: orders.filter(
      (order) =>
        order.purchaseConfirmStatus === 'PURCHASE_PENDING' &&
        (order.normalizedDeliveryStatus || order.deliveryStatus) === 'DELIVERED'
    ).length,
    purchaseConfirmedCount: orders.filter((order) => order.purchaseConfirmStatus === 'PURCHASE_CONFIRMED').length,
    cancelRequestedCount: orders.filter((order) => order.cancelStatus === 'CANCEL_REQUESTED').length,
    deliveredCount: orders.filter((order) => (order.normalizedDeliveryStatus || order.deliveryStatus) === 'DELIVERED').length,
  };
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

function buildTimeline(detail) {
  const status = detail?.normalizedDeliveryStatus || detail?.deliveryStatus;
  return [
    { key: 'ordered', label: '주문 접수', value: detail?.orderedAt, active: true },
    {
      key: 'waybill',
      label: '송장 등록',
      value: findTrackingHistoryTime(detail, 'WAYBILL_ASSIGNED') || detail?.waybillAssignedAt,
      active: Boolean(detail?.trackingNo) || status === 'WAYBILL_ASSIGNED' || status === 'PICKED_UP' || status === 'IN_TRANSIT' || status === 'DELIVERED',
    },
    {
      key: 'pickup',
      label: '집하 완료',
      value: findTrackingHistoryTime(detail, 'PICKED_UP') || detail?.pickedUpAt || detail?.inTransitAt,
      active: status === 'PICKED_UP' || status === 'IN_TRANSIT' || status === 'DELIVERED',
    },
    {
      key: 'transit',
      label: '배송 중',
      value: findTrackingHistoryTime(detail, 'IN_TRANSIT') || detail?.inTransitAt,
      active: status === 'IN_TRANSIT' || status === 'DELIVERED',
    },
    {
      key: 'delivered',
      label: '배송 완료',
      value: findTrackingHistoryTime(detail, 'DELIVERED') || detail?.deliveredAt,
      active: status === 'DELIVERED',
    },
  ];
}

function getUserFacingOrderHistoryEvent(history) {
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

function buildUnifiedFlowEvents(detail) {
  const orderEvents = (detail?.orderStatusHistories || []).map((history) => {
    const event = getUserFacingOrderHistoryEvent(history);
    return {
      key: `order-${history.orderStatusHistoryNo || history.changedAt || 'unknown'}`,
      category: '주문',
      title: event.title,
      copy: event.copy,
      time: history.changedAt,
      location: '',
    };
  });

  const trackingEvents = (detail?.trackingHistories || []).map((history) => ({
    key: `tracking-${history.trackingHistoryNo || history.recordedAt || 'unknown'}`,
    category: '배송',
    title: getTrackingHistoryTitle(history),
    copy: getTrackingHistoryCopy(history),
    time: history.recordedAt,
    location: [history.locationName, history.locationAddress].filter(Boolean).join(' 쨌 '),
  }));

  return [...orderEvents, ...trackingEvents].sort((left, right) => {
    const leftTime = left.time ? new Date(left.time).getTime() : 0;
    const rightTime = right.time ? new Date(right.time).getTime() : 0;
    return rightTime - leftTime;
  });
}

function getTrackingStepDetails(detail, step, latestTrackingLocation) {
  const deliveryAddress = [detail?.address1, detail?.address2].filter(Boolean).join(' ') || '-';

  switch (step.key) {
    case 'ordered':
      return { status: '주문이 접수되어 확인을 기다리고 있습니다.', location: '오늘팜 주문 시스템' };
    case 'waybill':
      return { status: '송장 등록과 출고 준비가 진행된 상태입니다.', location: '오늘팜 성남 물류센터' };
    case 'pickup':
      return { status: '상품이 집하되어 배송사로 전달되었습니다.', location: '오늘팜 성남 물류센터' };
    case 'transit':
      return { status: '상품이 배송지로 이동하고 있습니다.', location: latestTrackingLocation || '택배사 허브 터미널' };
    case 'delivered':
      return { status: '상품 전달이 완료되었습니다.', location: deliveryAddress || latestTrackingLocation };
    default:
      return { status: '-', location: latestTrackingLocation || '-' };
  }
}

function AdminOrdersPage({ orders, selectedOrderNo, selectedOrderDetail, orderFilter, trackingNo, onOrderFilterChange, onSelectOrder, onTrackingChange, onDeleteOrder, onAcceptOrder, onRejectOrder, onAcceptOrderCancel, onRejectOrderCancel, onShipOrder, updating }) {
  const filteredOrders = orders.filter((order) => orderFilter === 'ALL' || resolveFilterStatus(order) === orderFilter);
  const summary = buildSummary(orders);
  const cancelStatusLabel = getCancelStatusLabel(selectedOrderDetail);
  const purchaseConfirmLabel = getPurchaseConfirmLabel(selectedOrderDetail);
  const timeline = buildTimeline(selectedOrderDetail);
  const latestTrackingLocation = findLatestTrackingLocation(selectedOrderDetail);
  const unifiedFlowEvents = buildUnifiedFlowEvents(selectedOrderDetail);
  const canDeleteOrder = Boolean(
    selectedOrderDetail &&
    (selectedOrderDetail.normalizedDeliveryStatus || selectedOrderDetail.deliveryStatus) === 'DELIVERED' &&
    (selectedOrderDetail.normalizedOrderStatus || selectedOrderDetail.orderStatus) === 'ORDER_ACCEPTED'
  );

  return (
    <div className="admin-orders-v2">
      <AdminPageHeader
        title="주문 관리"
        description="결제 이후 주문 상태와 배송 준비를 관리하는 운영 화면"
        actions={
          <>
            <button type="button" className="admin-action admin-action--soft admin-orders-v2__toolbar-button" onClick={onAcceptOrder} disabled={!selectedOrderDetail?.acceptAvailable || updating}>주문 접수</button>
            <button type="button" className="admin-action admin-action--line admin-orders-v2__toolbar-button" onClick={onRejectOrder} disabled={!selectedOrderDetail?.rejectAvailable || updating}>주문 거절</button>
            <button type="button" className="admin-action admin-action--soft admin-orders-v2__toolbar-button" onClick={onShipOrder} disabled={selectedOrderDetail?.acceptAvailable || !selectedOrderDetail?.shipAvailable || updating}>배송 인계</button>
          </>
        }
      />

      <section className="admin-orders-v2__summary-grid">
        <article className="admin-orders-v2__summary-card"><span>전체 주문</span><strong>{summary.totalCount}건</strong></article>
        <article className="admin-orders-v2__summary-card admin-orders-v2__summary-card--accent"><span>결제 완료</span><strong>{summary.paymentCompletedCount}건</strong></article>
        <article className="admin-orders-v2__summary-card admin-orders-v2__summary-card--success"><span>주문 확정</span><strong>{summary.acceptedCount}건</strong></article>
        <article className="admin-orders-v2__summary-card admin-orders-v2__summary-card--warn"><span>구매 확정 대기</span><strong>{summary.purchasePendingCount}건</strong></article>
        <article className="admin-orders-v2__summary-card admin-orders-v2__summary-card--success"><span>구매 확정 완료</span><strong>{summary.purchaseConfirmedCount}건</strong></article>
        <article className="admin-orders-v2__summary-card admin-orders-v2__summary-card--warn"><span>취소 요청</span><strong>{summary.cancelRequestedCount}건</strong></article>
        <article className="admin-orders-v2__summary-card admin-orders-v2__summary-card--success"><span>배송 완료</span><strong>{summary.deliveredCount}건</strong></article>
      </section>

      <div className="admin-orders-v2__filters">
        {ADMIN_ORDER_FILTERS.map((filter) => (
          <button key={filter.value} type="button" className={`admin-orders-v2__filter-chip ${orderFilter === filter.value ? 'is-active' : ''}`} onClick={() => onOrderFilterChange(filter.value)}>
            {filter.label}
          </button>
        ))}
      </div>

      <section className="admin-orders-v2__layout">
        <article className="admin-card admin-card--panel admin-orders-v2__list-panel">
          <div className="admin-orders-v2__panel-head"><div><h2>주문 목록</h2></div></div>
          <div className="admin-orders-v2__list">
            {filteredOrders.map((order) => {
              const cancelLabel = getCancelStatusLabel(order);
              const purchaseLabel = getPurchaseConfirmLabel(order);
              return (
                <button key={order.orderNo} type="button" className={`admin-orders-v2__list-card ${order.orderNo === selectedOrderNo ? 'is-selected' : ''}`} onClick={() => onSelectOrder(order.orderNo)}>
                  <div className="admin-orders-v2__list-top">
                    <div><strong>{order.orderId}</strong><span>{formatAdminDate(order.orderedAt)}</span></div>
                    <span className={`admin-orders-v2__status-chip ${getTone(order.normalizedOrderStatus || order.orderStatus)}`}>{getOrderStatusLabel(order)}</span>
                  </div>
                  <div className="admin-orders-v2__list-meta"><span>{order.recipientName || '-'}</span><span>{formatAdminCurrency(order.finalAmount)}</span></div>
                  <div className="admin-orders-v2__list-tags">
                    <span className={`admin-orders-v2__status-chip ${getTone(order.normalizedDeliveryStatus || order.deliveryStatus)}`}>{getDeliveryStatusLabel(order)}</span>
                    {purchaseLabel ? <span className={`admin-orders-v2__status-chip ${getTone(order.purchaseConfirmStatus)}`}>{purchaseLabel}</span> : null}
                    {cancelLabel ? <span className={`admin-orders-v2__status-chip ${getTone(order.cancelStatus)}`}>{cancelLabel}</span> : null}
                    {order.legacyStatusNeedsReview ? <span className="admin-orders-v2__status-chip is-warn">상태 검토 필요</span> : null}
                  </div>
                </button>
              );
            })}
            {!filteredOrders.length ? <AdminEmptyState title="조건에 맞는 주문이 없습니다." description="필터를 바꾸거나 전체 주문으로 다시 확인해 주세요." /> : null}
          </div>
        </article>

        <article className="admin-card admin-card--panel admin-orders-v2__detail-panel">
          {!selectedOrderDetail ? (
            <AdminEmptyState title="주문을 선택해 주세요." description="왼쪽 목록에서 주문을 고르면 상세 내용을 확인할 수 있습니다." />
          ) : (
            <div className="admin-orders-v2__detail">
              <div className="admin-orders-v2__detail-head">
                <div><h2>{selectedOrderDetail.orderId}</h2><p>{formatAdminDateParts(selectedOrderDetail.orderedAt).date}{' · '}{selectedOrderDetail.recipientName || '-'}</p></div>
                <div className="admin-orders-v2__detail-tags">
                  <span className={`admin-orders-v2__status-chip ${getTone(selectedOrderDetail.normalizedOrderStatus || selectedOrderDetail.orderStatus)}`}>{getOrderStatusLabel(selectedOrderDetail)}</span>
                  <span className={`admin-orders-v2__status-chip ${getTone(selectedOrderDetail.normalizedDeliveryStatus || selectedOrderDetail.deliveryStatus)}`}>{getDeliveryStatusLabel(selectedOrderDetail)}</span>
                  {purchaseConfirmLabel ? <span className={`admin-orders-v2__status-chip ${getTone(selectedOrderDetail.purchaseConfirmStatus)}`}>{purchaseConfirmLabel}</span> : null}
                  {cancelStatusLabel ? <span className={`admin-orders-v2__status-chip ${getTone(selectedOrderDetail.cancelStatus)}`}>{cancelStatusLabel}</span> : null}
                </div>
              </div>

              <div className="admin-orders-v2__detail-grid">
                <section className="admin-orders-v2__box">
                  <h3>고객 및 배송 정보</h3>
                  <div className="admin-orders-v2__row"><strong>수령인</strong><span>{selectedOrderDetail.recipientName || '-'}</span></div>
                  <div className="admin-orders-v2__row"><strong>연락처</strong><span>{selectedOrderDetail.recipientPhone || '-'}</span></div>
                  <div className="admin-orders-v2__row"><strong>주소</strong><span>{[selectedOrderDetail.address1, selectedOrderDetail.address2].filter(Boolean).join(' ') || '-'}</span></div>
                  <div className="admin-orders-v2__row"><strong>배송사</strong><span>{selectedOrderDetail.carrierName || selectedOrderDetail.courierName || 'oneulFarm'}</span></div>
                </section>
                <section className="admin-orders-v2__box">
                  <h3>결제 정보</h3>
                  <div className="admin-orders-v2__row"><strong>결제 수단</strong><span>{selectedOrderDetail.paymentMethod || '-'}</span></div>
                  <div className="admin-orders-v2__row"><strong>결제 상태</strong><span>{selectedOrderDetail.paymentStatus || '-'}</span></div>
                  <div className="admin-orders-v2__row"><strong>구매 확정</strong><span>{purchaseConfirmLabel || '-'}</span></div>
                  <div className="admin-orders-v2__row"><strong>구매 확정일</strong><span>{selectedOrderDetail.purchaseConfirmedAt ? formatAdminDate(selectedOrderDetail.purchaseConfirmedAt) : '-'}</span></div>
                  <div className="admin-orders-v2__row"><strong>결제 금액</strong><span>{formatAdminCurrency(selectedOrderDetail.finalAmount)}</span></div>
                  <div className="admin-orders-v2__row"><strong>절약 금액</strong><span>{formatAdminCurrency(selectedOrderDetail.totalSavedAmount)}</span></div>
                </section>
              </div>

              <div className="admin-orders-v2__compact-row">
                <section className="admin-orders-v2__box admin-orders-v2__box--compact">
                  <div className="admin-orders-v2__box-head"><h3>취소 요청 처리</h3></div>
                  <div className="admin-orders-v2__action-row">
                    <button type="button" className="admin-action admin-action--soft admin-orders-v2__action-button" onClick={onAcceptOrderCancel} disabled={!selectedOrderDetail.cancelAcceptAvailable || updating}>취소 수락</button>
                    <button type="button" className="admin-action admin-action--line admin-orders-v2__action-button" onClick={onRejectOrderCancel} disabled={!selectedOrderDetail.cancelRejectAvailable || updating}>취소 거절</button>
                  </div>
                </section>
              </div>

              <section className="admin-orders-v2__box">
                <div className="admin-orders-v2__box-head"><h3>송장 및 배송 처리</h3><span>{selectedOrderDetail.trackingNo || '송장 미등록'}</span></div>
                {latestTrackingLocation ? (
                  <div className="admin-orders-v2__row">
                    <strong>현재 위치</strong>
                    <span>{latestTrackingLocation}</span>
                  </div>
                ) : null}
                <div className="admin-orders-v2__tracking-form">
                  <button type="button" className="admin-action admin-action--soft admin-orders-v2__tracking-button" onClick={onAcceptOrder} disabled={!selectedOrderDetail.acceptAvailable || updating}>주문 접수</button>
                  <input value={trackingNo} onChange={onTrackingChange} placeholder="송장번호 입력" />
                  <button type="button" className="admin-action admin-action--soft admin-orders-v2__tracking-button" onClick={onShipOrder} disabled={selectedOrderDetail.acceptAvailable || !selectedOrderDetail.shipAvailable || updating}>배송 인계</button>
                </div>
                <div className="admin-orders-v2__timeline">
                  {timeline.map((step) => (
                    <div key={step.key} className={`admin-orders-v2__timeline-step ${step.active ? 'is-active' : ''}`}>
                      <span className="admin-orders-v2__timeline-dot" />
                      <div className="admin-orders-v2__timeline-copy">
                        {`상품상태: ${getTrackingStepDetails(selectedOrderDetail, step, latestTrackingLocation).status}`}
                      </div>
                      <div className="admin-orders-v2__timeline-copy">
                        {`담당장소: ${getTrackingStepDetails(selectedOrderDetail, step, latestTrackingLocation).location}`}
                      </div>
                      <div><strong>{step.label}</strong><span>{step.value ? formatAdminDate(step.value) : '대기 중'}</span></div>
                    </div>
                  ))}
                </div>
                {false ? (
                <div className="admin-orders-v2__history-list">
                  {timeline.map((step) => {
                    const stepDetails = getTrackingStepDetails(selectedOrderDetail, step, latestTrackingLocation);
                    return (
                      <div key={`${step.key}-detail`} className="admin-orders-v2__history-card">
                        <div className="admin-orders-v2__history-head">
                          <strong>{`단계: ${step.label}`}</strong>
                          <span>{`처리시간: ${step.value ? formatAdminDate(step.value) : '-'}`}</span>
                        </div>
                        <div className="admin-orders-v2__history-copy">{`상품상태: ${stepDetails.status}`}</div>
                        <div className="admin-orders-v2__history-copy">{`담당장소: ${stepDetails.location}`}</div>
                      </div>
                    );
                  })}
                </div>
                ) : null}
              </section>

              {false ? (
              <section className="admin-orders-v2__box">
                <div className="admin-orders-v2__box-head"><h3>주문/배송 흐름</h3><span>{unifiedFlowEvents.length || 0}건</span></div>
                <div className="admin-orders-v2__history-list">
                  {unifiedFlowEvents.map((event) => (
                    <div key={event.key} className="admin-orders-v2__history-card">
                      <div className="admin-orders-v2__history-head">
                        <strong>{`${event.category} · ${event.title}`}</strong>
                        <span>{event.time ? formatAdminDate(event.time) : '-'}</span>
                      </div>
                      <div className="admin-orders-v2__history-copy">{event.copy}</div>
                      {event.location ? (
                        <div className="admin-orders-v2__history-copy">{event.location}</div>
                      ) : null}
                    </div>
                  ))}
                  {!unifiedFlowEvents.length ? (
                    <div className="admin-orders-v2__history-copy">아직 기록된 주문/배송 흐름이 없습니다.</div>
                  ) : null}
                </div>
              </section>
              ) : null}

              {false ? (
                <section className="admin-orders-v2__box">
                  <div className="admin-orders-v2__box-head"><h3>배송 추적 이력</h3><span>{selectedOrderDetail.trackingHistories?.length || 0}건</span></div>
                  <div className="admin-orders-v2__history-list">
                    {(selectedOrderDetail.trackingHistories || []).map((history) => (
                      <div key={history.trackingHistoryNo} className="admin-orders-v2__history-card">
                      <div className="admin-orders-v2__history-head">
                        <strong>{getTrackingHistoryTitle(history)}</strong>
                        <span>{history.recordedAt ? formatAdminDate(history.recordedAt) : '-'}</span>
                      </div>
                      <div className="admin-orders-v2__history-copy">{getTrackingHistoryCopy(history)}</div>
                      {history.locationName || history.locationAddress ? (
                        <div className="admin-orders-v2__history-copy">
                          {[history.locationName, history.locationAddress].filter(Boolean).join(' · ')}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
              ) : null}

              <div className="admin-orders-v2__compact-row">
                <section className="admin-orders-v2__box admin-orders-v2__box--compact">
                  <div className="admin-orders-v2__box-head"><h3>운영 액션</h3></div>
                  <div className="admin-orders-v2__action-row">
                    <button type="button" className="admin-action admin-action--line admin-orders-v2__action-button" onClick={onRejectOrder} disabled={!selectedOrderDetail.rejectAvailable || updating}>주문 거절</button>
                    {canDeleteOrder ? <button type="button" className="admin-action admin-action--danger admin-orders-v2__action-button" onClick={() => onDeleteOrder(selectedOrderDetail)} disabled={updating}>주문 정보 삭제</button> : null}
                  </div>
                </section>
              </div>

              <section className="admin-orders-v2__box">
                <div className="admin-orders-v2__box-head"><h3>주문 상품</h3><span>{selectedOrderDetail.items?.length || 0}개</span></div>
                <div className="admin-orders-v2__item-list">
                  {(selectedOrderDetail.items || []).map((item) => (
                    <div key={item.orderItemNo} className="admin-orders-v2__item-card">
                      <div><strong>{item.productName}</strong><span>{item.quantity}개</span></div>
                      <div className="admin-orders-v2__item-meta"><span>{formatAdminCurrency(item.subtotal)}</span><span>시장 평균가 {formatAdminCurrency(item.marketAvgPrice)}</span></div>
                    </div>
                  ))}
                </div>
              </section>

              {false ? (
              <section className="admin-orders-v2__box">
                <div className="admin-orders-v2__box-head"><h3>주문 처리 이력</h3><span>{selectedOrderDetail.orderStatusHistories?.length || 0}건</span></div>
                <div className="admin-orders-v2__history-list">
                  {(selectedOrderDetail.orderStatusHistories || []).map((history) => (
                    <div key={history.orderStatusHistoryNo} className="admin-orders-v2__history-card">
                      <div className="admin-orders-v2__history-head">
                        <strong>{getUserFacingOrderHistoryEvent(history).title}</strong>
                        <span>{formatAdminDate(history.changedAt)}</span>
                      </div>
                      <div className="admin-orders-v2__history-copy">{getUserFacingOrderHistoryEvent(history).copy}</div>
                    </div>
                  ))}
                  {!(selectedOrderDetail.orderStatusHistories || []).length ? (
                    <div className="admin-orders-v2__history-copy">아직 기록된 주문 처리 이력이 없습니다.</div>
                  ) : null}
                </div>
              </section>
              ) : null}

              {(selectedOrderDetail.cancelRequestHistories || []).length ? (
                <section className="admin-orders-v2__box">
                  <div className="admin-orders-v2__box-head"><h3>취소 처리 이력</h3><span>{selectedOrderDetail.cancelRequestHistories?.length || 0}건</span></div>
                  <div className="admin-orders-v2__history-list">
                    {(selectedOrderDetail.cancelRequestHistories || []).map((history) => {
                      const eventTime =
                        history.cancelStatus === 'CANCEL_REQUESTED'
                          ? history.requestedAt
                          : history.decidedAt || history.requestedAt;

                      return (
                        <div key={history.cancelRequestNo} className="admin-orders-v2__history-card">
                          <div className="admin-orders-v2__history-head">
                            <strong>{getCancelHistoryTitle(history)}</strong>
                            <span>{eventTime ? formatAdminDate(eventTime) : '-'}</span>
                          </div>
                          <div className="admin-orders-v2__history-copy">{getCancelHistoryCopy(history)}</div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ) : null}
            </div>
          )}
        </article>
      </section>
    </div>
  );
}

export default AdminOrdersPage;
