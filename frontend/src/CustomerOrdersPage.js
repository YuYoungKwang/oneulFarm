import { useEffect, useRef } from 'react';
import { formatDate, formatPrice } from './appUtils';
import InlineInfoTip from './components/InlineInfoTip';
import CustomerOrderDetailPanel from './CustomerOrderDetailPanel';
import './styles/customerOrders.css';

function getOrderImageSrc(imageNo) {
  return imageNo ? `/backend/api/image/product/${imageNo}` : '';
}

const DELIVERY_FILTER_OPTIONS = [
  { value: 'ALL', label: '전체' },
  { value: 'READY', label: '배송 준비' },
  { value: 'SHIPPING', label: '배송 중' },
  { value: 'DELIVERED', label: '배송 완료' },
  { value: 'PURCHASE_PENDING', label: '구매 확정 대기' },
  { value: 'PURCHASE_CONFIRMED', label: '구매 확정 완료' },
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
  if (order?.cancelStatus === 'CANCEL_ACCEPTED') {
    return '';
  }

  const status = order?.normalizedDeliveryStatus || order?.deliveryStatus;
  return DELIVERY_STATUS_LABELS[status] || status || '-';
}

function getCancelStatusLabel(order) {
  const status = order?.cancelStatus;
  if (!status || status === 'NONE') {
    return '';
  }
  return CANCEL_STATUS_LABELS[status] || status;
}

function getPurchaseConfirmLabel(order) {
  if (order?.cancelStatus === 'CANCEL_REQUESTED' || order?.cancelStatus === 'CANCEL_ACCEPTED') {
    return '';
  }
  const status = order?.purchaseConfirmStatus;
  if (!status) {
    return '';
  }
  return PURCHASE_CONFIRM_LABELS[status] || status;
}

function getOrderStatusTone(order) {
  const status = order?.normalizedOrderStatus || order?.orderStatus;
  if (status === 'ORDER_REJECTED' || status === 'CANCELED') {
    return 'is-danger';
  }
  if (status === 'ORDER_ACCEPTED' || status === 'COMPLETED' || status === 'SHIPPING') {
    return 'is-success';
  }
  return 'is-neutral';
}

function getDeliveryStatusTone(order) {
  const status = order?.normalizedDeliveryStatus || order?.deliveryStatus;
  if (status === 'DELIVERED') {
    return 'is-success';
  }
  if (status === 'IN_TRANSIT' || status === 'PICKED_UP' || status === 'SHIPPING') {
    return 'is-accent';
  }
  return 'is-neutral';
}

function getPurchaseConfirmTone(order) {
  const status = order?.purchaseConfirmStatus;
  if (status === 'PURCHASE_CONFIRMED') {
    return 'is-success';
  }
  if (status === 'PURCHASE_PENDING') {
    return 'is-warn';
  }
  return 'is-neutral';
}

function matchesAppliedFilter(order, filterValue) {
  if (!filterValue || filterValue === 'ALL') {
    return true;
  }

  if (filterValue === 'PURCHASE_PENDING') {
    return (
      order?.cancelStatus !== 'CANCEL_ACCEPTED' &&
      order?.purchaseConfirmStatus === 'PURCHASE_PENDING' &&
      (order?.normalizedDeliveryStatus || order?.deliveryStatus) === 'DELIVERED'
    );
  }

  if (filterValue === 'PURCHASE_CONFIRMED') {
    return order?.cancelStatus !== 'CANCEL_ACCEPTED' && order?.purchaseConfirmStatus === 'PURCHASE_CONFIRMED';
  }

  return true;
}

function buildSummary(orders) {
  return {
    totalCount: orders.length,
    activeCount: orders.filter((order) =>
      order?.cancelStatus !== 'CANCEL_ACCEPTED' &&
      ['WAYBILL_ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'READY', 'SHIPPING'].includes(
        order?.normalizedDeliveryStatus || order?.deliveryStatus
      )
    ).length,
    deliveredCount: orders.filter(
      (order) => order?.cancelStatus !== 'CANCEL_ACCEPTED'
    ).filter(
      (order) => (order?.normalizedDeliveryStatus || order?.deliveryStatus) === 'DELIVERED'
    ).length,
    purchasePendingCount: orders.filter(
      (order) =>
        order?.cancelStatus !== 'CANCEL_ACCEPTED' &&
        order?.purchaseConfirmStatus === 'PURCHASE_PENDING' &&
        (order?.normalizedDeliveryStatus || order?.deliveryStatus) === 'DELIVERED'
    ).length,
    purchaseConfirmedCount: orders.filter(
      (order) =>
        order?.cancelStatus !== 'CANCEL_ACCEPTED' &&
        order?.purchaseConfirmStatus === 'PURCHASE_CONFIRMED'
    ).length,
    attentionCount: orders.filter(
      (order) =>
        order?.cancelRequestAvailable || order?.purchaseConfirmAvailable || order?.legacyStatusNeedsReview
    ).length,
    totalSavedAmount: orders.reduce(
      (sum, order) => sum + (order?.cancelStatus === 'CANCEL_ACCEPTED' ? 0 : Number(order?.totalSavedAmount || 0)),
      0
    ),
  };
}

function formatSavedAmount(value) {
  return formatPrice(Math.floor(Number(value || 0)));
}

function getSavedAmountInfoContent(value) {
  return `표시값은 소수점 이하는 버림 처리됩니다. 실제 금액: ${formatPrice(Number(value || 0))}`;
}

function CustomerOrdersPage({
  orders,
  ordersLoading,
  ordersError,
  orderFilters,
  appliedOrderFilters,
  selectedOrderNo,
  orderDetail,
  detailLoading,
  detailError,
  onOrderFilterChange,
  onOrderFilterSubmit,
  onOrderFilterReset,
  onSelectOrder,
  onStartCreateReview,
  onRequestOrderCancel,
  onConfirmPurchase,
  orderActionSubmitting,
  orderActionError,
}) {
  const summary = buildSummary(orders);
  const filteredOrders = orders.filter((order) => matchesAppliedFilter(order, appliedOrderFilters?.deliveryStatus));
  const detailColumnRef = useRef(null);

  useEffect(() => {
    if (!selectedOrderNo || !detailColumnRef.current) {
      return;
    }

    const detailElement = detailColumnRef.current;
    const detailRect = detailElement.getBoundingClientRect();
    const isDesktop = window.innerWidth >= 1180;
    const shouldScroll =
      !isDesktop ||
      detailRect.top < 88 ||
      detailRect.bottom > window.innerHeight;

    if (shouldScroll) {
      detailElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  }, [selectedOrderNo]);

  return (
    <div className="customer-orders-page">
      <section className="customer-orders__hero">
        <div>
          <div className="customer-orders__title-row">
            <h1>내 주문</h1>
            <InlineInfoTip content="결제 이후 배송 준비, 송장 등록, 배송 완료 흐름을 한 화면에서 확인할 수 있도록 주문 내역을 정리했습니다." />
          </div>
          <p className="customer-orders__hero-copy">
            최근 주문 상태와 배송 흐름을 한눈에 확인하고, 필요한 주문은 바로 상세로 들어갈 수 있습니다.
          </p>
        </div>
      </section>

      <section className="customer-orders__summary-grid">
        <article className="customer-orders__summary-card">
          <span className="customer-orders__summary-label">전체 주문</span>
          <strong className="customer-orders__summary-value">{summary.totalCount}건</strong>
        </article>
        <article className="customer-orders__summary-card customer-orders__summary-card--accent">
          <span className="customer-orders__summary-label">진행 중 배송</span>
          <strong className="customer-orders__summary-value">{summary.activeCount}건</strong>
        </article>
        <article className="customer-orders__summary-card customer-orders__summary-card--success">
          <span className="customer-orders__summary-label">배송 완료</span>
          <strong className="customer-orders__summary-value">{summary.deliveredCount}건</strong>
        </article>
        <article className="customer-orders__summary-card customer-orders__summary-card--warn">
          <span className="customer-orders__summary-label">구매 확정 대기</span>
          <strong className="customer-orders__summary-value">{summary.purchasePendingCount}건</strong>
        </article>
        <article className="customer-orders__summary-card customer-orders__summary-card--success">
          <span className="customer-orders__summary-label">구매 확정 완료</span>
          <strong className="customer-orders__summary-value">{summary.purchaseConfirmedCount}건</strong>
        </article>
        <article className="customer-orders__summary-card customer-orders__summary-card--saving">
          <span className="customer-orders__summary-label">
            총 절약 금액
            <InlineInfoTip content={getSavedAmountInfoContent(summary.totalSavedAmount)} />
          </span>
          <strong className="customer-orders__summary-value">{formatSavedAmount(summary.totalSavedAmount)}</strong>
        </article>
      </section>

      <section className="customer-orders__filter-card">
        <div className="customer-orders__section-head">
          <div className="customer-orders__section-title-row">
            <h2>주문 조회 조건</h2>
            <InlineInfoTip content="배송 상태와 기간 기준으로 원하는 주문만 빠르게 확인할 수 있습니다." />
          </div>
          <span className="customer-orders__section-copy">조건에 맞는 주문만 빠르게 추려서 볼 수 있습니다.</span>
        </div>

        <form className="customer-orders__filter-form" onSubmit={onOrderFilterSubmit}>
          <div className="customer-orders__filter-grid">
            <label className="customer-orders__field">
              <span>배송 상태</span>
              <select name="deliveryStatus" value={orderFilters.deliveryStatus} onChange={onOrderFilterChange}>
                {DELIVERY_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="customer-orders__field">
              <span>시작일</span>
              <input type="date" name="dateFrom" value={orderFilters.dateFrom} onChange={onOrderFilterChange} />
            </label>
            <label className="customer-orders__field">
              <span>종료일</span>
              <input type="date" name="dateTo" value={orderFilters.dateTo} onChange={onOrderFilterChange} />
            </label>
          </div>
          <div className="customer-orders__filter-actions">
            <button type="button" className="btn-outline" onClick={onOrderFilterReset}>
              초기화
            </button>
            <button type="submit" className="btn">
              조회
            </button>
          </div>
        </form>
      </section>

      <section className="customer-orders__layout">
        <div className="customer-orders__list-column">
          <div className="customer-orders__list-head">
            <div>
              <h2>주문 목록</h2>
              <p>주의가 필요한 주문 {summary.attentionCount}건</p>
            </div>
          </div>

          {ordersLoading && (
            <article className="customer-orders__feedback-card">주문 목록을 불러오는 중입니다.</article>
          )}

          {!ordersLoading && ordersError && (
            <article className="customer-orders__feedback-card customer-orders__feedback-card--error">
              {ordersError}
            </article>
          )}

          {!ordersLoading && !ordersError && filteredOrders.length === 0 && (
            <article className="customer-orders__feedback-card">조건에 맞는 주문이 없습니다.</article>
          )}

          {!ordersLoading && !ordersError && filteredOrders.length > 0 && (
            <div className="customer-orders__list">
              {filteredOrders.map((order) => {
                const isSelected = selectedOrderNo === order.orderNo;
                const cancelStatusLabel = getCancelStatusLabel(order);
                const purchaseConfirmLabel = getPurchaseConfirmLabel(order);
                const deliveryStatusLabel = getDeliveryStatusLabel(order);
                const previewImageNos = Array.isArray(order.previewImageNos) ? order.previewImageNos : [];

                return (
                  <article
                    key={order.orderNo}
                    className={`customer-orders__card ${isSelected ? 'is-selected' : ''}`}
                  >
                    <div className="customer-orders__card-top">
                      <div>
                        <p className="customer-orders__card-eyebrow">{formatDate(order.orderedAt)}</p>
                        <h3 className="customer-orders__card-title">{order.orderId}</h3>
                      </div>
                      <button
                        type="button"
                        className="btn-outline customer-orders__detail-button"
                        onClick={() => onSelectOrder(order.orderNo)}
                      >
                        {isSelected ? '상세 닫기' : '상세 보기'}
                      </button>
                    </div>

                    <div className="customer-orders__status-row">
                      <span className={`customer-orders__status-chip ${getOrderStatusTone(order)}`}>
                        {getOrderStatusLabel(order)}
                      </span>
                      {deliveryStatusLabel ? (
                        <span className={`customer-orders__status-chip ${getDeliveryStatusTone(order)}`}>
                          {deliveryStatusLabel}
                        </span>
                      ) : null}
                      {purchaseConfirmLabel ? (
                        <span className={`customer-orders__status-chip ${getPurchaseConfirmTone(order)}`}>
                          {purchaseConfirmLabel}
                        </span>
                      ) : null}
                      {cancelStatusLabel ? (
                        <span className="customer-orders__status-chip is-danger-soft">{cancelStatusLabel}</span>
                      ) : null}
                      {order.legacyStatusNeedsReview ? (
                        <span className="customer-orders__status-chip is-warn">상태 검토 필요</span>
                      ) : null}
                    </div>

                    {previewImageNos.length > 0 && (
                      <div className="customer-orders__preview-strip">
                        {previewImageNos.map((imageNo, index) => (
                          <img
                            key={`${order.orderNo}-${imageNo}-${index}`}
                            className="customer-orders__preview-thumb"
                            src={getOrderImageSrc(imageNo)}
                            alt={order.displayProductName || '주문 상품'}
                          />
                        ))}
                      </div>
                    )}

                    <div className="customer-orders__card-grid">
                      <div className="customer-orders__meta-block">
                        <span className="customer-orders__meta-label">대표 상품</span>
                        <strong>{order.displayProductName || '-'}</strong>
                      </div>
                      <div className="customer-orders__meta-block">
                        <span className="customer-orders__meta-label">상품 수</span>
                        <strong>{order.itemCount || 0}개</strong>
                      </div>
                      <div className="customer-orders__meta-block">
                        <span className="customer-orders__meta-label">결제 금액</span>
                        <strong>{formatPrice(order.finalAmount)}</strong>
                      </div>
                      <div className="customer-orders__meta-block">
                        <span className="customer-orders__meta-label">
                          절약 금액
                          <InlineInfoTip content={getSavedAmountInfoContent(order.totalSavedAmount)} />
                        </span>
                        <strong className="is-saving">{formatSavedAmount(order.totalSavedAmount)}</strong>
                      </div>
                    </div>

                    <div className="customer-orders__card-bottom">
                      <div className="customer-orders__ship-meta">
                        <span>{order.carrierName || order.courierName || '배송사 미정'}</span>
                        <span>{order.trackingNo || '송장 미등록'}</span>
                      </div>
                      <div className="customer-orders__card-side">
                        <div className="customer-orders__flag-row">
                          {order.trackingAvailable && order.cancelStatus !== 'CANCEL_ACCEPTED' ? (
                            <span className="customer-orders__flag">배송 조회 가능</span>
                          ) : null}
                        </div>
                        <div className="customer-orders__quick-actions">
                          <button
                            type="button"
                            className="btn-outline customer-orders__quick-action"
                            onClick={() => onRequestOrderCancel(order.orderNo)}
                            disabled={!order.cancelRequestAvailable || orderActionSubmitting === 'cancel'}
                          >
                            취소 요청
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <div ref={detailColumnRef} className="customer-orders__detail-column">
          <CustomerOrderDetailPanel
            detail={orderDetail}
            loading={detailLoading}
            error={detailError}
            onStartCreateReview={onStartCreateReview}
            onRequestOrderCancel={onRequestOrderCancel}
            onConfirmPurchase={onConfirmPurchase}
            orderActionSubmitting={orderActionSubmitting}
            orderActionError={orderActionError}
          />
        </div>
      </section>
    </div>
  );
}

export default CustomerOrdersPage;
