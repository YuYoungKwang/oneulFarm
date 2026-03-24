import {
  formatOrderDateTime,
  getDeliveryStatusLabel,
  getOrderStatusMeta,
  getPaymentMethodLabel,
} from './orderUiUtils';
import { formatCurrency } from './productUiUtils';

export default function OrdersPage({
  onReturnToProducts,
  onSelectOrder,
  orders,
  selectedOrderId,
}) {
  const filteredOrders = orders;
  const selectedOrder =
    filteredOrders.find((order) => order.orderId === selectedOrderId) ||
    filteredOrders[0] ||
    null;

  const paidCount = orders.filter((order) => order.orderStatus === 'PAID').length;
  const shippingCount = orders.filter((order) => order.orderStatus === 'SHIPPING').length;
  const completedCount = orders.filter((order) => order.orderStatus === 'COMPLETED').length;
  const monthlyAmount = orders.reduce(
    (sum, order) => sum + Number(order.finalAmount || 0),
    0
  );

  function handleSelectOrder(orderId) {
    if (typeof onSelectOrder === 'function') {
      onSelectOrder(orderId);
    }
  }

  function handleKeyDown(event, orderId) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSelectOrder(orderId);
    }
  }

  if (!orders.length) {
    return (
      <section className="empty-state detail-empty">
        <div className="empty-icon">📦</div>
        <h1>주문 내역이 없습니다.</h1>
        <p>상품을 주문하면 이 화면에서 배송 상태를 확인할 수 있습니다.</p>
        <button className="btn" type="button" onClick={onReturnToProducts}>
          상품 보러 가기
        </button>
      </section>
    );
  }

  return (
    <>
      <section className="page-head">
        <div>
          <span className="eyebrow">Orders</span>
          <h1>주문 내역</h1>
          <p>주문 상태와 배송 현황을 확인할 수 있습니다.</p>
        </div>
      </section>

      <section className="quick-grid">
        <article className="quick-card">
          <div className="quick-label">총 주문</div>
          <div className="quick-value">{orders.length}건</div>
          <div className="section-sub">전체 주문 수</div>
        </article>
        <article className="quick-card soft-yellow">
          <div className="quick-label">결제 완료</div>
          <div className="quick-value">{paidCount}건</div>
          <div className="section-sub">출고 준비 중</div>
        </article>
        <article className="quick-card soft-green">
          <div className="quick-label">배송중</div>
          <div className="quick-value">{shippingCount}건</div>
          <div className="section-sub">이동 중인 주문</div>
        </article>
        <article className="quick-card">
          <div className="quick-label">주문 완료</div>
          <div className="quick-value">{completedCount}건</div>
          <div className="section-sub">{formatCurrency(monthlyAmount)} 누적</div>
        </article>
      </section>

      <section className="orders-layout">
        <div className="orders-list">
          {filteredOrders.map((order) => {
            const statusMeta = getOrderStatusMeta(order.orderStatus);
            const isSelected = selectedOrder?.orderId === order.orderId;

            return (
              <article
                key={order.orderId}
                className={`order-card ${isSelected ? 'active' : ''} is-selectable`}
                onClick={() => handleSelectOrder(order.orderId)}
                onKeyDown={(event) => handleKeyDown(event, order.orderId)}
                role="button"
                tabIndex={0}
              >
                <div className="order-card-head">
                  <div>
                    <div className="card-title order-card-title">{order.orderId}</div>
                    <div className="section-sub">
                      {formatOrderDateTime(order.orderedAt)} · {order.items.length}개 상품
                    </div>
                  </div>
                  <span className={`status-pill ${statusMeta.tone}`}>{statusMeta.label}</span>
                </div>

                <div className="order-card-items">
                  {order.items.map((item) => (
                    <div className="order-row" key={item.orderItemNo}>
                      <span>{item.productName}</span>
                      <span>
                        {item.quantity}개 · {formatCurrency(item.subtotal)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="section-sub order-card-hint">
                  {isSelected
                    ? '선택된 주문입니다.'
                    : '카드를 누르면 주문 상세를 볼 수 있습니다.'}
                </div>
              </article>
            );
          })}
        </div>

        {selectedOrder ? (
          <aside className="orders-summary">
            <div className="card-title">주문 상세</div>
            <div className="summary-list">
              <div className="insight-item">
                <strong>주문번호</strong>
                <span>{selectedOrder.orderId}</span>
              </div>
              <div className="insight-item">
                <strong>주문 상태</strong>
                <span>{getOrderStatusMeta(selectedOrder.orderStatus).label}</span>
              </div>
              <div className="insight-item">
                <strong>결제 수단</strong>
                <span>
                  {getPaymentMethodLabel(
                    selectedOrder.payment.paymentMethod,
                    selectedOrder.payment.paymentProvider
                  )}
                </span>
              </div>
              <div className="insight-item">
                <strong>결제 금액</strong>
                <span>{formatCurrency(selectedOrder.finalAmount)}</span>
              </div>
              <div className="insight-item">
                <strong>배송 상태</strong>
                <span>{getDeliveryStatusLabel(selectedOrder.delivery.deliveryStatus)}</span>
              </div>
              <div className="insight-item">
                <strong>배송지</strong>
                <span>
                  {selectedOrder.address1} {selectedOrder.address2}
                </span>
              </div>
            </div>

            <div className="card-title orders-subtitle">주문 상품</div>
            <div className="checkout-items">
              {selectedOrder.items.map((item) => (
                <div className="checkout-item" key={item.orderItemNo}>
                  <div className="checkout-item-head">
                    <strong>{item.productName}</strong>
                    <span>{formatCurrency(item.subtotal)}</span>
                  </div>
                  <div className="section-sub">
                    수량 {item.quantity}개 · 절약 {formatCurrency(item.savedAmount)}
                  </div>
                </div>
              ))}
            </div>
          </aside>
        ) : null}
      </section>
    </>
  );
}
