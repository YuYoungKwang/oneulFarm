import {
  AdminEmptyState,
  AdminPageHeader,
  formatAdminCurrency,
  formatAdminDate,
} from './AdminUi';
import '../styles/carrierManagement.css';

const DELIVERY_FILTERS = [
  { value: 'ALL', label: '전체' },
  { value: 'NOT_STARTED', label: '배송 준비 전' },
  { value: 'WAYBILL_ASSIGNED', label: '송장 등록' },
  { value: 'IN_TRANSIT', label: '배송 중' },
  { value: 'DELIVERED', label: '배송 완료' },
];

const DELIVERY_STATUS_LABELS = {
  NOT_STARTED: '배송 준비 전',
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
  if (status === 'DELIVERED') {
    return 'is-success';
  }
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
    inTransitCount: orders.filter((order) => {
      const status = getDeliveryStatusKey(order);
      return status === 'IN_TRANSIT' || status === 'PICKED_UP' || status === 'SHIPPING';
    }).length,
    deliveredCount: orders.filter((order) => getDeliveryStatusKey(order) === 'DELIVERED').length,
  };
}

function buildTimeline(detail) {
  const status = getDeliveryStatusKey(detail);

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
      active: Boolean(detail?.trackingNo) || status === 'WAYBILL_ASSIGNED' || status === 'PICKED_UP' || status === 'IN_TRANSIT' || status === 'DELIVERED',
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
  onDeliverOrder,
  updating,
}) {
  const filteredOrders = orders.filter((order) => {
    if (orderFilter === 'ALL') {
      return true;
    }
    return getDeliveryStatusKey(order) === orderFilter;
  });
  const summary = buildSummary(orders);
  const timeline = buildTimeline(selectedOrderDetail);

  return (
    <div className="carrier-management-page">
      <AdminPageHeader
        title="배송 관리"
        description="배송사 관점에서 송장 등록, 집하 처리, 배송 완료를 조작할 수 있는 전용 화면"
        actions={(
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
              disabled={((!selectedOrderDetail?.pickupAvailable && !selectedOrderDetail?.shipAvailable) || updating)}
            >
              집하 처리
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
        )}
      />

      <section className="carrier-management__summary-grid">
        <article className="carrier-management__summary-card">
          <span>전체 배송</span>
          <strong>{summary.totalCount}건</strong>
        </article>
        <article className="carrier-management__summary-card">
          <span>배송 준비 전</span>
          <strong>{summary.waitingCount}건</strong>
        </article>
        <article className="carrier-management__summary-card carrier-management__summary-card--accent">
          <span>송장 등록</span>
          <strong>{summary.waybillCount}건</strong>
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
              <p>배송사가 처리할 주문을 선택해 송장과 상태를 관리합니다.</p>
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
              <AdminEmptyState
                title="처리할 배송이 없습니다."
                description="필터를 바꾸거나 다른 주문 상태를 확인해 주세요."
              />
            ) : null}
          </div>
        </article>

        <article className="admin-card admin-card--panel carrier-management__detail-panel">
          {!selectedOrderDetail ? (
            <AdminEmptyState
              title="주문을 선택해주세요."
              description="왼쪽 목록에서 주문을 고르면 배송 흐름과 송장 처리 영역이 열립니다."
            />
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
                  <div className="carrier-management__row"><strong>배송사</strong><span>{selectedOrderDetail.carrierName || selectedOrderDetail.courierName || 'oneulFarm 택배'}</span></div>
                  <div className="carrier-management__row"><strong>송장번호</strong><span>{selectedOrderDetail.trackingNo || '미등록'}</span></div>
                  <div className="carrier-management__row"><strong>수령인</strong><span>{selectedOrderDetail.recipientName || '-'}</span></div>
                  <div className="carrier-management__row"><strong>연락처</strong><span>{selectedOrderDetail.recipientPhone || '-'}</span></div>
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
                  <span>송장 등록 전까지는 배송 시작이 막혀 있습니다.</span>
                </div>
                <div className="carrier-management__tracking-form">
                  <input
                    value={trackingNo}
                    onChange={onTrackingChange}
                    placeholder="송장번호 입력 또는 자동 생성"
                  />
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
                  <span>배송사가 조작하는 상태만 단계별로 보여줍니다.</span>
                </div>
                <div className="carrier-management__timeline">
                  {timeline.map((step) => (
                    <div
                      key={step.key}
                      className={`carrier-management__timeline-step ${step.active ? 'is-active' : ''}`}
                    >
                      <span className="carrier-management__timeline-dot" />
                      <div>
                        <strong>{step.label}</strong>
                        <span>{step.value ? formatAdminDate(step.value) : '대기 중'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="carrier-management__box">
                <div className="carrier-management__box-head">
                  <h3>배송 액션</h3>
                  <span>송장 등록 → 집하 처리 → 배송 완료 순서로 진행합니다.</span>
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
                    disabled={((!selectedOrderDetail.pickupAvailable && !selectedOrderDetail.shipAvailable) || updating)}
                  >
                    집하 처리
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
            </div>
          )}
        </article>
      </section>
    </div>
  );
}

export default CarrierManagementPage;
