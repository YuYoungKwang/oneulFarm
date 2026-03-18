import { useState } from 'react';
import {
  formatOrderDateTime,
  getDeliveryStatusLabel,
  getOrderStatusMeta,
  getPaymentMethodLabel,
} from './orderUiUtils';
import { formatCurrency } from './productUiUtils';

export default function OrdersPage({
  onAdvanceStatus,
  onOpenOrder,
  onReturnToProducts,
  orders,
  selectedOrderId,
}) {
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filteredOrders = orders.filter((order) =>
    statusFilter === 'ALL' ? true : order.orderStatus === statusFilter
  );
  const selectedOrder =
    filteredOrders.find((order) => order.orderId === selectedOrderId) ||
    filteredOrders[0] ||
    null;

  const paidCount = orders.filter((order) => order.orderStatus === 'PAID').length;
  const shippingCount = orders.filter(
    (order) => order.orderStatus === 'SHIPPING'
  ).length;
  const completedCount = orders.filter(
    (order) => order.orderStatus === 'COMPLETED'
  ).length;
  const monthlyAmount = orders.reduce(
    (sum, order) => sum + order.finalAmount,
    0
  );

  if (!orders.length) {
    return (
      <section className="empty-state detail-empty">
        <div className="empty-icon">🗂️</div>
        <h1>주문 내역이 없습니다.</h1>
        <p>상품을 주문하면 이 화면에서 상태를 확인하고 관리할 수 있습니다.</p>
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
          <span className="eyebrow">OFT_ORDERS / OFT_DELIVERY / OFT_PAYMENT</span>
          <h1>주문 상태 관리</h1>
          <p>생성한 주문의 상태와 배송 진행 상황을 확인하고 다음 단계로 변경할 수 있습니다.</p>
        </div>
        <div className="page-actions">
          <FilterChip
            active={statusFilter === 'ALL'}
            label="전체"
            onClick={() => setStatusFilter('ALL')}
          />
          <FilterChip
            active={statusFilter === 'PAID'}
            label="결제 완료"
            onClick={() => setStatusFilter('PAID')}
          />
          <FilterChip
            active={statusFilter === 'SHIPPING'}
            label="배송중"
            onClick={() => setStatusFilter('SHIPPING')}
          />
          <FilterChip
            active={statusFilter === 'COMPLETED'}
            label="주문 완료"
            onClick={() => setStatusFilter('COMPLETED')}
          />
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
          <div className="section-sub">`OFT_ORDERS.ORDER_STATUS = 'PAID'`</div>
        </article>
        <article className="quick-card soft-green">
          <div className="quick-label">배송중</div>
          <div className="quick-value">{shippingCount}건</div>
          <div className="section-sub">출고 진행 중</div>
        </article>
        <article className="quick-card">
          <div className="quick-label">완료 주문</div>
          <div className="quick-value">{completedCount}건</div>
          <div className="section-sub">{formatCurrency(monthlyAmount)} 누적</div>
        </article>
      </section>

      <section className="orders-layout">
        <div className="orders-list">
          {filteredOrders.map((order) => {
            const statusMeta = getOrderStatusMeta(order.orderStatus);

            return (
              <article
                key={order.orderId}
                className={`order-card ${
                  selectedOrder?.orderId === order.orderId ? 'active' : ''
                }`}
              >
                <div className="order-card-head">
                  <div>
                    <div className="card-title order-card-title">{order.orderId}</div>
                    <div className="section-sub">
                      {formatOrderDateTime(order.orderedAt)} · {order.items.length}개
                      상품
                    </div>
                  </div>
                  <span className={`status-pill ${statusMeta.tone}`}>
                    {statusMeta.label}
                  </span>
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

                <div className="order-actions">
                  <button
                    className="btn-outline compact-btn"
                    type="button"
                    onClick={() => onOpenOrder(order.orderId)}
                  >
                    상세 보기
                  </button>
                  {order.orderStatus === 'PAID' || order.orderStatus === 'SHIPPING' ? (
                    <button
                      className="btn compact-btn"
                      type="button"
                      onClick={() => onAdvanceStatus(order.orderId)}
                    >
                      {order.orderStatus === 'PAID' ? '배송 시작' : '배송 완료'}
                    </button>
                  ) : null}
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
                  {getPaymentMethodLabel(selectedOrder.payment.paymentMethod)}
                </span>
              </div>
              <div className="insight-item">
                <strong>결제 금액</strong>
                <span>{formatCurrency(selectedOrder.finalAmount)}</span>
              </div>
              <div className="insight-item">
                <strong>배송 상태</strong>
                <span>
                  {getDeliveryStatusLabel(selectedOrder.delivery.deliveryStatus)}
                </span>
              </div>
              <div className="insight-item">
                <strong>배송지</strong>
                <span>
                  {selectedOrder.address1} {selectedOrder.address2}
                </span>
              </div>
            </div>

            <div className="card-title orders-subtitle">주문 품목</div>
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

            <div className="notice cart-notice">
              현재 주문 상태 전환은 프론트 목업입니다. 이후 Spring API를 연결하면
              `OFT_ORDERS`, `OFT_DELIVERY`, `OFT_PAYMENT` 업데이트와 바로
              연결할 수 있습니다.
            </div>
          </aside>
        ) : null}
      </section>
    </>
  );
}

function FilterChip({ active, label, onClick }) {
  return (
    <button
      className={`btn-chip ${active ? 'active' : ''}`}
      type="button"
      onClick={onClick}
    >
      {label}
    </button>
  );
}
