import {
  formatOrderDateTime,
  getDeliveryStatusLabel,
  getOrderStatusMeta,
  getPaymentMethodLabel,
} from './orderUiUtils';
import { formatCurrency } from './productUiUtils';

export default function OrderCompletePage({
  onOpenOrders,
  onReturnToProducts,
  order,
}) {
  if (!order) {
    return (
      <section className="empty-state detail-empty">
        <div className="empty-icon">📄</div>
        <h1>주문 완료 정보를 찾을 수 없습니다.</h1>
        <p>주문 내역으로 이동해서 다시 확인해주세요.</p>
        <button className="btn" type="button" onClick={onOpenOrders}>
          주문 내역 보기
        </button>
      </section>
    );
  }

  const statusMeta = getOrderStatusMeta(order.orderStatus);

  return (
    <>
      <section className="page-head">
        <div>
          <span className="eyebrow">Order Complete</span>
          <h1>주문 완료!</h1>
          <p>주문이 정상적으로 접수되었습니다. 배송 상태는 주문 관리에서 확인할 수 있습니다.</p>
        </div>
        <div className="page-actions">
          <button className="btn-outline" type="button" onClick={onReturnToProducts}>
            상품 계속 보기
          </button>
        <button className="btn" type="button" onClick={onOpenOrders}>
          주문 내역 보기
        </button>
        </div>
      </section>

      <section className="order-complete-card">
        <div className="complete-hero">
          <div className="complete-icon">✓</div>
          <div>
            <div className="card-title complete-title">{order.orderId}</div>
            <div className="section-sub">
              {formatOrderDateTime(order.orderedAt)} · {statusMeta.label}
            </div>
          </div>
        </div>

        <div className="quick-grid detail-kpis">
          <article className="quick-card soft-green">
            <div className="quick-label">최종 결제 금액</div>
            <div className="quick-value">{formatCurrency(order.finalAmount)}</div>
            <div className="section-sub">배송비 포함 최종 금액</div>
          </article>
          <article className="quick-card">
            <div className="quick-label">결제 수단</div>
            <div className="quick-value">
              {getPaymentMethodLabel(order.payment.paymentMethod)}
            </div>
            <div className="section-sub">선택한 결제 방식</div>
          </article>
          <article className="quick-card soft-yellow">
            <div className="quick-label">예상 절약 금액</div>
            <div className="quick-value">
              {formatCurrency(order.totalSavedAmount)}
            </div>
            <div className="section-sub">평균 시세 대비 예상 금액</div>
          </article>
          <article className="quick-card">
            <div className="quick-label">배송 상태</div>
            <div className="quick-value">
              {getDeliveryStatusLabel(order.delivery.deliveryStatus)}
            </div>
            <div className="section-sub">주문 후 바로 확인 가능</div>
          </article>
        </div>
      </section>

      <section className="checkout-layout">
        <article className="card">
          <div className="card-title">배송 정보</div>
          <div className="summary-list">
            <div className="insight-item">
              <strong>받는 분</strong>
              <span>{order.recipientName}</span>
            </div>
            <div className="insight-item">
              <strong>연락처</strong>
              <span>{order.recipientPhone}</span>
            </div>
            <div className="insight-item">
              <strong>주소</strong>
              <span>
                [{order.zipCode}] {order.address1} {order.address2}
              </span>
            </div>
            <div className="insight-item">
              <strong>배송 메모</strong>
              <span>{order.deliveryMessage || '없음'}</span>
            </div>
          </div>
        </article>

        <aside className="checkout-summary">
          <div className="card-title">주문 상품</div>
          <div className="checkout-items">
            {order.items.map((item) => (
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
      </section>
    </>
  );
}
