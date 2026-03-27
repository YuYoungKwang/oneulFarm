import {
  AdminEmptyState,
  AdminPageHeader,
  formatAdminCurrency,
  formatAdminDate,
  formatAdminDateParts,
} from './AdminUi';
import '../styles/adminOrders.css';

const ADMIN_ORDER_FILTERS = [
  { value: 'ALL', label: '전체' },
  { value: 'PAYMENT_COMPLETED', label: '결제 완료' },
  { value: 'ORDER_ACCEPTED', label: '주문 확정' },
  { value: 'CANCEL_REQUESTED', label: '취소 요청' },
  { value: 'CANCEL_ACCEPTED', label: '취소 완료' },
  { value: 'CANCEL_REJECTED', label: '취소 거절' },
  { value: 'ORDER_REJECTED', label: '주문 거절' },
  { value: 'DELIVERED', label: '배송 완료' },
];

const ADMIN_CANCEL_STATUS_LABELS = {
  NONE: '',
  CANCEL_REQUESTED: '취소 요청',
  CANCEL_ACCEPTED: '취소 완료',
  CANCEL_REJECTED: '취소 거절',
};

// eslint-disable-next-line no-unused-vars
const ORDER_FILTERS = [
  { value: 'ALL', label: '전체' },
  { value: 'PAYMENT_COMPLETED', label: '결제 완료' },
  { value: 'ORDER_ACCEPTED', label: '주문 확정' },
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

// eslint-disable-next-line no-unused-vars
const CANCEL_STATUS_LABELS = {
  NONE: '',
  CANCEL_REQUESTED: '취소 요청',
  CANCEL_ACCEPTED: '취소 승인',
  CANCEL_REJECTED: '취소 거절',
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
  if (!status || status === 'NONE') {
    return '';
  }
  return ADMIN_CANCEL_STATUS_LABELS[status] || status;
}

function resolveFilterStatus(order) {
  if (!order) {
    return '';
  }

  const cancelStatus = order.cancelStatus;
  const normalizedOrderStatus = order.normalizedOrderStatus || order.orderStatus;
  const normalizedDeliveryStatus = order.normalizedDeliveryStatus || order.deliveryStatus;

  if (cancelStatus && cancelStatus !== 'NONE') {
    return cancelStatus;
  }

  if (normalizedOrderStatus === 'ORDER_REJECTED') {
    return 'ORDER_REJECTED';
  }

  if (normalizedDeliveryStatus === 'DELIVERED') {
    return 'DELIVERED';
  }

  return normalizedOrderStatus || normalizedDeliveryStatus || '';
}

function getTone(status) {
  if (status === 'ORDER_REJECTED' || status === 'CANCELED' || status === 'CANCEL_REJECTED') {
    return 'is-danger';
  }
  if (status === 'DELIVERED' || status === 'ORDER_ACCEPTED' || status === 'CANCEL_ACCEPTED') {
    return 'is-success';
  }
  if (
    status === 'WAYBILL_ASSIGNED' ||
    status === 'PICKED_UP' ||
    status === 'IN_TRANSIT' ||
    status === 'SHIPPING'
  ) {
    return 'is-accent';
  }
  if (status === 'CANCEL_REQUESTED') {
    return 'is-warn';
  }
  return 'is-neutral';
}

function buildSummary(orders) {
  return {
    totalCount: orders.length,
    paymentCompletedCount: orders.filter(
      (order) => (order.normalizedOrderStatus || order.orderStatus) === 'PAYMENT_COMPLETED'
    ).length,
    acceptedCount: orders.filter(
      (order) => (order.normalizedOrderStatus || order.orderStatus) === 'ORDER_ACCEPTED'
    ).length,
    cancelRequestedCount: orders.filter((order) => order.cancelStatus === 'CANCEL_REQUESTED').length,
    deliveredCount: orders.filter(
      (order) => (order.normalizedDeliveryStatus || order.deliveryStatus) === 'DELIVERED'
    ).length,
  };
}

function buildTimeline(detail) {
  const status = detail?.normalizedDeliveryStatus || detail?.deliveryStatus;

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
      value: detail?.pickedUpAt || detail?.inTransitAt,
      active: status === 'PICKED_UP' || status === 'IN_TRANSIT' || status === 'DELIVERED',
    },
    {
      key: 'delivered',
      label: '배송 완료',
      value: detail?.deliveredAt,
      active: status === 'DELIVERED',
    },
  ];
}

function AdminOrdersPage({
  orders,
  selectedOrderNo,
  selectedOrderDetail,
  orderFilter,
  trackingNo,
  onOrderFilterChange,
  onSelectOrder,
  onTrackingChange,
  onDeleteOrder,
  onRejectOrder,
  onAcceptOrderCancel,
  onRejectOrderCancel,
  onShipOrder,
  updating,
}) {
  const filteredOrders = orders.filter((order) => {
    if (orderFilter === 'ALL') {
      return true;
    }
    return resolveFilterStatus(order) === orderFilter;
  });

  const summary = buildSummary(orders);
  const cancelStatusLabel = getCancelStatusLabel(selectedOrderDetail);
  const timeline = buildTimeline(selectedOrderDetail);
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
            <button
              type="button"
              className="admin-action admin-action--line admin-orders-v2__toolbar-button"
              onClick={onRejectOrder}
              disabled={!selectedOrderDetail?.rejectAvailable || updating}
            >
              주문 거절
            </button>
            <button
              type="button"
              className="admin-action admin-action--soft admin-orders-v2__toolbar-button"
              onClick={onShipOrder}
              disabled={!selectedOrderDetail?.shipAvailable || updating}
            >
              배송 인계
            </button>
          </>
        }
      />

      <section className="admin-orders-v2__summary-grid">
        <article className="admin-orders-v2__summary-card">
          <span>전체 주문</span>
          <strong>{summary.totalCount}건</strong>
        </article>
        <article className="admin-orders-v2__summary-card admin-orders-v2__summary-card--accent">
          <span>결제 완료</span>
          <strong>{summary.paymentCompletedCount}건</strong>
        </article>
        <article className="admin-orders-v2__summary-card admin-orders-v2__summary-card--success">
          <span>주문 확정</span>
          <strong>{summary.acceptedCount}건</strong>
        </article>
        <article className="admin-orders-v2__summary-card admin-orders-v2__summary-card--warn">
          <span>취소 요청</span>
          <strong>{summary.cancelRequestedCount}건</strong>
        </article>
        <article className="admin-orders-v2__summary-card admin-orders-v2__summary-card--success">
          <span>배송 완료</span>
          <strong>{summary.deliveredCount}건</strong>
        </article>
      </section>

      <div className="admin-orders-v2__filters">
        {ADMIN_ORDER_FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            className={`admin-orders-v2__filter-chip ${orderFilter === filter.value ? 'is-active' : ''}`}
            onClick={() => onOrderFilterChange(filter.value)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <section className="admin-orders-v2__layout">
        <article className="admin-card admin-card--panel admin-orders-v2__list-panel">
          <div className="admin-orders-v2__panel-head">
            <div>
              <h2>주문 목록</h2>
            </div>
          </div>

          <div className="admin-orders-v2__list">
            {filteredOrders.map((order) => {
              const cancelLabel = getCancelStatusLabel(order);

              return (
                <button
                  key={order.orderNo}
                  type="button"
                  className={`admin-orders-v2__list-card ${
                    order.orderNo === selectedOrderNo ? 'is-selected' : ''
                  }`}
                  onClick={() => onSelectOrder(order.orderNo)}
                >
                  <div className="admin-orders-v2__list-top">
                    <div>
                      <strong>{order.orderId}</strong>
                      <span>{formatAdminDate(order.orderedAt)}</span>
                    </div>
                    <span
                      className={`admin-orders-v2__status-chip ${getTone(
                        order.normalizedOrderStatus || order.orderStatus
                      )}`}
                    >
                      {getOrderStatusLabel(order)}
                    </span>
                  </div>
                  <div className="admin-orders-v2__list-meta">
                    <span>{order.recipientName || '-'}</span>
                    <span>{formatAdminCurrency(order.finalAmount)}</span>
                  </div>
                  <div className="admin-orders-v2__list-tags">
                    <span
                      className={`admin-orders-v2__status-chip ${getTone(
                        order.normalizedDeliveryStatus || order.deliveryStatus
                      )}`}
                    >
                      {getDeliveryStatusLabel(order)}
                    </span>
                    {cancelLabel ? (
                      <span className={`admin-orders-v2__status-chip ${getTone(order.cancelStatus)}`}>
                        {cancelLabel}
                      </span>
                    ) : null}
                    {order.legacyStatusNeedsReview ? (
                      <span className="admin-orders-v2__status-chip is-warn">상태 검토 필요</span>
                    ) : null}
                  </div>
                </button>
              );
            })}

            {!filteredOrders.length ? (
              <AdminEmptyState
                title="조건에 맞는 주문이 없습니다."
                description="필터를 바꾸거나 전체 주문으로 다시 확인해 주세요."
              />
            ) : null}
          </div>
        </article>

        <article className="admin-card admin-card--panel admin-orders-v2__detail-panel">
          {!selectedOrderDetail ? (
            <AdminEmptyState
              title="주문을 선택해 주세요."
              description="왼쪽 목록에서 주문을 고르면 상세 내용을 확인할 수 있습니다."
            />
          ) : (
            <div className="admin-orders-v2__detail">
              <div className="admin-orders-v2__detail-head">
                <div>
                  <h2>{selectedOrderDetail.orderId}</h2>
                  <p>
                    {formatAdminDateParts(selectedOrderDetail.orderedAt).date}
                    {' · '}
                    {selectedOrderDetail.recipientName || '-'}
                  </p>
                </div>
                <div className="admin-orders-v2__detail-tags">
                  <span
                    className={`admin-orders-v2__status-chip ${getTone(
                      selectedOrderDetail.normalizedOrderStatus || selectedOrderDetail.orderStatus
                    )}`}
                  >
                    {getOrderStatusLabel(selectedOrderDetail)}
                  </span>
                  <span
                    className={`admin-orders-v2__status-chip ${getTone(
                      selectedOrderDetail.normalizedDeliveryStatus || selectedOrderDetail.deliveryStatus
                    )}`}
                  >
                    {getDeliveryStatusLabel(selectedOrderDetail)}
                  </span>
                  {cancelStatusLabel ? (
                    <span
                      className={`admin-orders-v2__status-chip ${getTone(selectedOrderDetail.cancelStatus)}`}
                    >
                      {cancelStatusLabel}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="admin-orders-v2__detail-grid">
                <section className="admin-orders-v2__box">
                  <h3>고객 및 배송 정보</h3>
                  <div className="admin-orders-v2__row">
                    <strong>수령인</strong>
                    <span>{selectedOrderDetail.recipientName || '-'}</span>
                  </div>
                  <div className="admin-orders-v2__row">
                    <strong>연락처</strong>
                    <span>{selectedOrderDetail.recipientPhone || '-'}</span>
                  </div>
                  <div className="admin-orders-v2__row">
                    <strong>주소</strong>
                    <span>
                      {[selectedOrderDetail.address1, selectedOrderDetail.address2].filter(Boolean).join(' ') || '-'}
                    </span>
                  </div>
                  <div className="admin-orders-v2__row">
                    <strong>배송사</strong>
                    <span>{selectedOrderDetail.carrierName || selectedOrderDetail.courierName || 'oneulFarm'}</span>
                  </div>
                </section>

                <section className="admin-orders-v2__box">
                  <h3>결제 정보</h3>
                  <div className="admin-orders-v2__row">
                    <strong>결제 수단</strong>
                    <span>{selectedOrderDetail.paymentMethod || '-'}</span>
                  </div>
                  <div className="admin-orders-v2__row">
                    <strong>결제 상태</strong>
                    <span>{selectedOrderDetail.paymentStatus || '-'}</span>
                  </div>
                  <div className="admin-orders-v2__row">
                    <strong>결제 금액</strong>
                    <span>{formatAdminCurrency(selectedOrderDetail.finalAmount)}</span>
                  </div>
                  <div className="admin-orders-v2__row">
                    <strong>절약 금액</strong>
                    <span>{formatAdminCurrency(selectedOrderDetail.totalSavedAmount)}</span>
                  </div>
                </section>
              </div>

              <div className="admin-orders-v2__compact-row">
              <section className="admin-orders-v2__box admin-orders-v2__box--compact">
                <div className="admin-orders-v2__box-head">
                  <h3>취소 요청 처리</h3>
                </div>
                <div className="admin-orders-v2__action-row">
                  <button
                    type="button"
                    className="admin-action admin-action--soft admin-orders-v2__action-button"
                    onClick={onAcceptOrderCancel}
                    disabled={!selectedOrderDetail.cancelAcceptAvailable || updating}
                  >
                    취소 수락
                  </button>
                  <button
                    type="button"
                    className="admin-action admin-action--line admin-orders-v2__action-button"
                    onClick={onRejectOrderCancel}
                    disabled={!selectedOrderDetail.cancelRejectAvailable || updating}
                  >
                    취소 거절
                  </button>
                </div>
              </section>
              </div>

              <section className="admin-orders-v2__box">
                <div className="admin-orders-v2__box-head">
                  <h3>송장 및 배송 처리</h3>
                  <span>{selectedOrderDetail.trackingNo || '송장 미등록'}</span>
                </div>
                <div className="admin-orders-v2__tracking-form">
                  <input
                    value={trackingNo}
                    onChange={onTrackingChange}
                    placeholder="송장번호 입력"
                  />
                  <button
                    type="button"
                    className="admin-action admin-action--soft admin-orders-v2__tracking-button"
                    onClick={onShipOrder}
                    disabled={!selectedOrderDetail.shipAvailable || updating}
                  >
                    송장 등록 후 배송 인계
                  </button>
                </div>
                <div className="admin-orders-v2__timeline">
                  {timeline.map((step) => (
                    <div
                      key={step.key}
                      className={`admin-orders-v2__timeline-step ${step.active ? 'is-active' : ''}`}
                    >
                      <span className="admin-orders-v2__timeline-dot" />
                      <div>
                        <strong>{step.label}</strong>
                        <span>{step.value ? formatAdminDate(step.value) : '대기 중'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <div className="admin-orders-v2__compact-row">
              <section className="admin-orders-v2__box admin-orders-v2__box--compact">
                <div className="admin-orders-v2__box-head">
                  <h3>운영 액션</h3>
                </div>
                <div className="admin-orders-v2__action-row">
                  <button
                    type="button"
                    className="admin-action admin-action--line admin-orders-v2__action-button"
                    onClick={onRejectOrder}
                    disabled={!selectedOrderDetail.rejectAvailable || updating}
                  >
                    주문 거절
                  </button>
                  {canDeleteOrder ? (
                    <button
                      type="button"
                      className="admin-action admin-action--danger admin-orders-v2__action-button"
                      onClick={() => onDeleteOrder(selectedOrderDetail)}
                      disabled={updating}
                    >
                      주문 정보 삭제
                    </button>
                  ) : null}
                </div>
              </section>
              </div>

              <section className="admin-orders-v2__box">
                <div className="admin-orders-v2__box-head">
                  <h3>주문 상품</h3>
                  <span>{selectedOrderDetail.items?.length || 0}개</span>
                </div>
                <div className="admin-orders-v2__item-list">
                  {(selectedOrderDetail.items || []).map((item) => (
                    <div key={item.orderItemNo} className="admin-orders-v2__item-card">
                      <div>
                        <strong>{item.productName}</strong>
                        <span>{item.quantity}개</span>
                      </div>
                      <div className="admin-orders-v2__item-meta">
                        <span>{formatAdminCurrency(item.subtotal)}</span>
                        <span>시장 평균 {formatAdminCurrency(item.marketAvgPrice)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </article>
      </section>
    </div>
  );
}

export default AdminOrdersPage;
