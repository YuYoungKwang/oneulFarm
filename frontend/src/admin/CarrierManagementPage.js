import { AdminEmptyState, AdminPageHeader, formatAdminCurrency, formatAdminDate } from './AdminUi';
import '../styles/carrierManagement.css';

const DELIVERY_FILTERS = [
  { value: 'ALL', label: '전체' },
  { value: 'NOT_STARTED', label: '배송 준비' },
  { value: 'WAYBILL_ASSIGNED', label: '송장 등록' },
  { value: 'PICKED_UP', label: '집하 완료' },
  { value: 'IN_TRANSIT', label: '배송 중' },
  { value: 'DELIVERED', label: '배송 완료' },
];

const DELIVERY_STATUS_LABELS = {
  NOT_STARTED: '배송 준비',
  WAYBILL_ASSIGNED: '송장 등록',
  PICKED_UP: '집하 완료',
  IN_TRANSIT: '배송 중',
  DELIVERED: '배송 완료',
  READY: '배송 준비',
  SHIPPING: '배송 중',
};

function getDeliveryStatusLabel(order) {
  const status = order?.normalizedDeliveryStatus || order?.deliveryStatus;
  return DELIVERY_STATUS_LABELS[status] || status || '-';
}

function getDeliveryStatusKey(order) {
  return order?.normalizedDeliveryStatus || order?.deliveryStatus || '';
}

function getTone(status) {
  if (status === 'DELIVERED') return 'is-success';
  if (status === 'WAYBILL_ASSIGNED' || status === 'PICKED_UP' || status === 'IN_TRANSIT' || status === 'SHIPPING') {
    return 'is-accent';
  }
  return 'is-neutral';
}

function buildSummary(orders) {
  return {
    totalCount: orders.length,
    waitingCount: orders.filter((order) => getDeliveryStatusKey(order) === 'NOT_STARTED').length,
    waybillCount: orders.filter((order) => getDeliveryStatusKey(order) === 'WAYBILL_ASSIGNED').length,
    pickedUpCount: orders.filter((order) => getDeliveryStatusKey(order) === 'PICKED_UP').length,
    inTransitCount: orders.filter((order) => {
      const status = getDeliveryStatusKey(order);
      return status === 'IN_TRANSIT' || status === 'SHIPPING';
    }).length,
    deliveredCount: orders.filter((order) => getDeliveryStatusKey(order) === 'DELIVERED').length,
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
  const status = getDeliveryStatusKey(detail);
  return [
    { key: 'ordered', label: '주문 접수', value: detail?.orderedAt, active: true },
    {
      key: 'waybill',
      label: '송장 등록',
      value: findTrackingHistoryTime(detail, 'WAYBILL_ASSIGNED') || detail?.waybillAssignedAt,
      active:
        Boolean(detail?.trackingNo) ||
        status === 'WAYBILL_ASSIGNED' ||
        status === 'PICKED_UP' ||
        status === 'IN_TRANSIT' ||
        status === 'DELIVERED',
    },
    {
      key: 'pickup',
      label: '집하 완료',
      value: findTrackingHistoryTime(detail, 'PICKED_UP') || detail?.pickedUpAt,
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

function buildDeliveryStageSummary(detail) {
  const status = getDeliveryStatusKey(detail);
  if (status === 'DELIVERED') {
    return { title: '배송 완료', description: '고객에게 상품 전달이 끝난 상태입니다.' };
  }
  if (status === 'IN_TRANSIT') {
    return { title: '배송 중', description: '집하가 끝났고 고객 배송지로 이동 중입니다.' };
  }
  if (status === 'PICKED_UP') {
    return { title: '집하 완료', description: '상품을 접수했고 본격 배송 이동 전 단계입니다.' };
  }
  if (status === 'WAYBILL_ASSIGNED') {
    return { title: '송장 등록', description: '송장번호가 발급되어 집하 처리만 남아 있습니다.' };
  }
  return { title: '배송 준비', description: '아직 송장번호가 없고 배송 접수 전 단계입니다.' };
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

function CarrierManagementPage({
  orders,
  selectedOrderNo,
  selectedOrderDetail,
  orderFilter,
  trackingNo,
  onOrderFilterChange,
  onSelectOrder,
  onTrackingChange,
  onAssignWaybill,
  onPickupOrder,
  onTransitOrder,
  onDeliverOrder,
  updating,
}) {
  const filteredOrders = orders.filter((order) => orderFilter === 'ALL' || getDeliveryStatusKey(order) === orderFilter);
  const summary = buildSummary(orders);
  const timeline = buildTimeline(selectedOrderDetail);
  const stageSummary = buildDeliveryStageSummary(selectedOrderDetail);
  const latestTrackingLocation = findLatestTrackingLocation(selectedOrderDetail);
  const unifiedFlowEvents = buildUnifiedFlowEvents(selectedOrderDetail);

  return (
    <div className="carrier-management-page">
      <AdminPageHeader
        title="배송 관리"
        description="배송사 관점에서 송장 등록, 집하 처리, 배송 완료를 관리하는 화면"
        actions={
          <>
            <button
              type="button"
              className="admin-action admin-action--line carrier-management__toolbar-button"
              onClick={onAssignWaybill}
              disabled={!selectedOrderDetail?.waybillAssignable || updating}
            >
              송장 등록
            </button>
            <button
              type="button"
              className="admin-action admin-action--soft carrier-management__toolbar-button"
              onClick={onPickupOrder}
              disabled={(!selectedOrderDetail?.pickupAvailable && !selectedOrderDetail?.shipAvailable) || updating}
            >
              집하 처리
            </button>
            <button
              type="button"
              className="admin-action admin-action--soft carrier-management__toolbar-button"
              onClick={onTransitOrder}
              disabled={!selectedOrderDetail?.transitAvailable || updating}
            >
              배송 중
            </button>
            <button
              type="button"
              className="admin-action admin-action--primary carrier-management__toolbar-button"
              onClick={onDeliverOrder}
              disabled={!selectedOrderDetail?.deliverAvailable || updating}
            >
              배송 완료
            </button>
          </>
        }
      />

      <section className="carrier-management__summary-grid">
        <article className="carrier-management__summary-card">
          <span>전체 배송</span>
          <strong>{summary.totalCount}건</strong>
        </article>
        <article className="carrier-management__summary-card">
          <span>배송 준비</span>
          <strong>{summary.waitingCount}건</strong>
        </article>
        <article className="carrier-management__summary-card carrier-management__summary-card--accent">
          <span>송장 등록</span>
          <strong>{summary.waybillCount}건</strong>
        </article>
        <article className="carrier-management__summary-card carrier-management__summary-card--accent">
          <span>집하 완료</span>
          <strong>{summary.pickedUpCount}건</strong>
        </article>
        <article className="carrier-management__summary-card carrier-management__summary-card--accent">
          <span>배송 중</span>
          <strong>{summary.inTransitCount}건</strong>
        </article>
        <article className="carrier-management__summary-card carrier-management__summary-card--success">
          <span>배송 완료</span>
          <strong>{summary.deliveredCount}건</strong>
        </article>
      </section>

      <div className="carrier-management__filters">
        {DELIVERY_FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            className={`carrier-management__filter-chip ${orderFilter === filter.value ? 'is-active' : ''}`}
            onClick={() => onOrderFilterChange(filter.value)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <section className="carrier-management__layout">
        <article className="admin-card admin-card--panel carrier-management__list-panel">
          <div className="carrier-management__panel-head">
            <div>
              <h2>배송 대상 주문</h2>
              <p>배송을 처리할 주문을 고른 뒤 송장과 상태를 관리합니다.</p>
            </div>
          </div>
          <div className="carrier-management__list">
            {filteredOrders.map((order) => (
              <button
                key={order.orderNo}
                type="button"
                className={`carrier-management__list-card ${order.orderNo === selectedOrderNo ? 'is-selected' : ''}`}
                onClick={() => onSelectOrder(order.orderNo)}
              >
                <div className="carrier-management__list-top">
                  <div>
                    <strong>{order.orderId}</strong>
                    <span>{formatAdminDate(order.orderedAt)}</span>
                  </div>
                  <span className={`carrier-management__status-chip ${getTone(getDeliveryStatusKey(order))}`}>
                    {getDeliveryStatusLabel(order)}
                  </span>
                </div>
                <div className="carrier-management__list-meta">
                  <span>{order.recipientName || '-'}</span>
                  <span>{order.trackingNo || '송장 미등록'}</span>
                </div>
              </button>
            ))}
            {!filteredOrders.length ? (
              <AdminEmptyState title="처리할 배송이 없습니다." description="필터를 바꾸거나 다른 주문 상태를 확인해 주세요." />
            ) : null}
          </div>
        </article>

        <article className="admin-card admin-card--panel carrier-management__detail-panel">
          {!selectedOrderDetail ? (
            <AdminEmptyState title="주문을 선택해 주세요." description="왼쪽 목록에서 주문을 고르면 배송 흐름과 송장 처리를 볼 수 있습니다." />
          ) : (
            <div className="carrier-management__detail">
              <div className="carrier-management__detail-head">
                <div>
                  <h2>{selectedOrderDetail.orderId}</h2>
                  <p>
                    {selectedOrderDetail.recipientName || '-'}
                    {' · '}
                    {formatAdminCurrency(selectedOrderDetail.finalAmount)}
                  </p>
                </div>
                <span className={`carrier-management__status-chip ${getTone(getDeliveryStatusKey(selectedOrderDetail))}`}>
                  {getDeliveryStatusLabel(selectedOrderDetail)}
                </span>
              </div>

              <div className="carrier-management__detail-grid">
                <section className="carrier-management__box">
                  <h3>배송 기본 정보</h3>
                  <div className="carrier-management__row">
                    <strong>배송사</strong>
                    <span>{selectedOrderDetail.carrierName || selectedOrderDetail.courierName || 'oneulFarm 배송'}</span>
                  </div>
                  <div className="carrier-management__row">
                    <strong>송장번호</strong>
                    <span>{selectedOrderDetail.trackingNo || '미등록'}</span>
                  </div>
                  <div className="carrier-management__row">
                    <strong>수령인</strong>
                    <span>{selectedOrderDetail.recipientName || '-'}</span>
                  </div>
                  <div className="carrier-management__row">
                    <strong>연락처</strong>
                    <span>{selectedOrderDetail.recipientPhone || '-'}</span>
                  </div>
                  {latestTrackingLocation ? (
                    <div className="carrier-management__row">
                      <strong>현재 위치</strong>
                      <span>{latestTrackingLocation}</span>
                    </div>
                  ) : null}
                </section>
                <section className="carrier-management__box">
                  <h3>배송지</h3>
                  <div className="carrier-management__address">
                    {[selectedOrderDetail.zipCode, selectedOrderDetail.address1, selectedOrderDetail.address2]
                      .filter(Boolean)
                      .join(' ') || '-'}
                  </div>
                </section>
              </div>

              <section className="carrier-management__box">
                <div className="carrier-management__box-head">
                  <h3>송장 관리</h3>
                  <span>송장 등록 후 집하, 배송 중, 배송 완료 처리가 가능합니다.</span>
                </div>
                <div className="carrier-management__tracking-form">
                  <input value={trackingNo} onChange={onTrackingChange} placeholder="송장번호 입력 또는 자동 생성" />
                  <button
                    type="button"
                    className="admin-action admin-action--line carrier-management__tracking-button"
                    onClick={onAssignWaybill}
                    disabled={!selectedOrderDetail.waybillAssignable || updating}
                  >
                    송장 등록
                  </button>
                </div>
              </section>

              <section className="carrier-management__box">
                <div className="carrier-management__box-head">
                  <h3>배송 추적 흐름</h3>
                  <span>배송사가 조작한 상태만 단계별로 보여줍니다.</span>
                </div>
                <div className="carrier-management__timeline-summary">
                  <strong>{stageSummary.title}</strong>
                  <p>{stageSummary.description}</p>
                </div>
                <div className="carrier-management__timeline">
                  {timeline.map((step) => (
                    <div key={step.key} className={`carrier-management__timeline-step ${step.active ? 'is-active' : ''}`}>
                      <span className="carrier-management__timeline-dot" />
                      <div className="carrier-management__timeline-copy">
                        {`상품상태: ${getTrackingStepDetails(selectedOrderDetail, step, latestTrackingLocation).status}`}
                      </div>
                      <div className="carrier-management__timeline-copy">
                        {`담당장소: ${getTrackingStepDetails(selectedOrderDetail, step, latestTrackingLocation).location}`}
                      </div>
                      <div>
                        <strong>{step.label}</strong>
                        <span>{step.value ? formatAdminDate(step.value) : '대기 중'}</span>
                      </div>
                    </div>
                  ))}
                </div>
                {false ? (
                <div className="carrier-management__history-list">
                  {timeline.map((step) => {
                    const stepDetails = getTrackingStepDetails(selectedOrderDetail, step, latestTrackingLocation);
                    return (
                      <div key={`${step.key}-detail`} className="carrier-management__history-card">
                        <div className="carrier-management__history-head">
                          <strong>{`단계: ${step.label}`}</strong>
                          <span>{`처리시간: ${step.value ? formatAdminDate(step.value) : '-'}`}</span>
                        </div>
                        <div className="carrier-management__history-copy">{`상품상태: ${stepDetails.status}`}</div>
                        <div className="carrier-management__history-copy">{`담당장소: ${stepDetails.location}`}</div>
                      </div>
                    );
                  })}
                </div>
                ) : null}
              </section>

              {false ? (
              <section className="carrier-management__box">
                <div className="carrier-management__box-head">
                  <h3>주문/배송 흐름</h3>
                  <span>{unifiedFlowEvents.length || 0}건</span>
                </div>
                <div className="carrier-management__history-list">
                  {unifiedFlowEvents.map((event) => (
                    <div key={event.key} className="carrier-management__history-card">
                      <div className="carrier-management__history-head">
                        <strong>{`${event.category} · ${event.title}`}</strong>
                        <span>{event.time ? formatAdminDate(event.time) : '-'}</span>
                      </div>
                      <div className="carrier-management__history-copy">{event.copy}</div>
                      {event.location ? (
                        <div className="carrier-management__history-copy">{event.location}</div>
                      ) : null}
                    </div>
                  ))}
                  {!unifiedFlowEvents.length ? (
                    <div className="carrier-management__history-copy">아직 기록된 주문/배송 흐름이 없습니다.</div>
                  ) : null}
                </div>
              </section>
              ) : null}

              {false ? (
                <section className="carrier-management__box">
                  <div className="carrier-management__box-head">
                    <h3>배송 추적 이력</h3>
                    <span>{selectedOrderDetail.trackingHistories?.length || 0}건</span>
                  </div>
                  <div className="carrier-management__history-list">
                    {(selectedOrderDetail.trackingHistories || []).map((history) => (
                      <div key={history.trackingHistoryNo} className="carrier-management__history-card">
                      <div className="carrier-management__history-head">
                        <strong>{getTrackingHistoryTitle(history)}</strong>
                        <span>{history.recordedAt ? formatAdminDate(history.recordedAt) : '-'}</span>
                      </div>
                      <div className="carrier-management__history-copy">{getTrackingHistoryCopy(history)}</div>
                      {history.locationName || history.locationAddress ? (
                        <div className="carrier-management__history-copy">
                          {[history.locationName, history.locationAddress].filter(Boolean).join(' · ')}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
              ) : null}

              <section className="carrier-management__box">
                <div className="carrier-management__box-head">
                  <h3>배송 액션</h3>
                  <span>송장 등록 후 집하, 배송 중, 배송 완료 순서로 진행합니다.</span>
                </div>
                <div className="carrier-management__action-row">
                  <button
                    type="button"
                    className="admin-action admin-action--line carrier-management__action-button"
                    onClick={onAssignWaybill}
                    disabled={!selectedOrderDetail.waybillAssignable || updating}
                  >
                    송장 등록
                  </button>
                  <button
                    type="button"
                    className="admin-action admin-action--soft carrier-management__action-button"
                    onClick={onPickupOrder}
                    disabled={(!selectedOrderDetail.pickupAvailable && !selectedOrderDetail.shipAvailable) || updating}
                  >
                    집하 처리
                  </button>
                  <button
                    type="button"
                    className="admin-action admin-action--soft carrier-management__action-button"
                    onClick={onTransitOrder}
                    disabled={!selectedOrderDetail.transitAvailable || updating}
                  >
                    배송 중
                  </button>
                  <button
                    type="button"
                    className="admin-action admin-action--primary carrier-management__action-button"
                    onClick={onDeliverOrder}
                    disabled={!selectedOrderDetail.deliverAvailable || updating}
                  >
                    배송 완료
                  </button>
                </div>
              </section>

              {false ? (
              <section className="carrier-management__box">
                <div className="carrier-management__box-head">
                  <h3>주문 처리 이력</h3>
                  <span>{selectedOrderDetail.orderStatusHistories?.length || 0}건</span>
                </div>
                <div className="carrier-management__history-list">
                  {(selectedOrderDetail.orderStatusHistories || []).map((history) => (
                    <div key={history.orderStatusHistoryNo} className="carrier-management__history-card">
                      <div className="carrier-management__history-head">
                        <strong>{getUserFacingOrderHistoryEvent(history).title}</strong>
                        <span>{formatAdminDate(history.changedAt)}</span>
                      </div>
                      <div className="carrier-management__history-copy">{getUserFacingOrderHistoryEvent(history).copy}</div>
                    </div>
                  ))}
                  {!(selectedOrderDetail.orderStatusHistories || []).length ? (
                    <div className="carrier-management__history-copy">아직 기록된 주문 처리 이력이 없습니다.</div>
                  ) : null}
                </div>
              </section>
              ) : null}

              {(selectedOrderDetail.cancelRequestHistories || []).length ? (
                <section className="carrier-management__box">
                  <div className="carrier-management__box-head">
                    <h3>취소 처리 이력</h3>
                    <span>{selectedOrderDetail.cancelRequestHistories?.length || 0}건</span>
                  </div>
                  <div className="carrier-management__history-list">
                    {(selectedOrderDetail.cancelRequestHistories || []).map((history) => {
                      const eventTime =
                        history.cancelStatus === 'CANCEL_REQUESTED'
                          ? history.requestedAt
                          : history.decidedAt || history.requestedAt;

                      return (
                        <div key={history.cancelRequestNo} className="carrier-management__history-card">
                          <div className="carrier-management__history-head">
                            <strong>{getCancelHistoryTitle(history)}</strong>
                            <span>{eventTime ? formatAdminDate(eventTime) : '-'}</span>
                          </div>
                          <div className="carrier-management__history-copy">{getCancelHistoryCopy(history)}</div>
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

export default CarrierManagementPage;
