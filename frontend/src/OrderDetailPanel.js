import {
  formatDateTime,
  formatPrice,
  getDeliveryBadgeClass,
  getDeliveryLabel,
} from './appUtils';

function getOrderItemImageSrc(imageNo) {
  return imageNo ? `/backend/api/image/product/${imageNo}` : '';
}

function OrderDetailPanel({ detail, loading, error }) {
  if (loading) {
    return <article className="card feedback-card">주문 상세를 불러오는 중입니다.</article>;
  }

  if (error) {
    return <article className="card feedback-card feedback-card--error">{error}</article>;
  }

  if (!detail) {
    return <article className="card feedback-card">주문 카드를 선택하면 상세 정보를 볼 수 있습니다.</article>;
  }

  return (
    <article className="card detail-shell">
      <div className="section-head">
        <div>
          <div className="section-title">주문 상세</div>
          <div className="section-sub">
            {detail.orderId} · {formatDateTime(detail.orderedAt)}
          </div>
        </div>
        <span className={`status-pill ${getDeliveryBadgeClass(detail.deliveryStatus)}`}>
          {getDeliveryLabel(detail.deliveryStatus)}
        </span>
      </div>

      <div className="detail-grid">
        <section className="detail-block">
          <h3>주문 정보</h3>
          <div className="detail-row"><strong>주문번호</strong><span>{detail.orderId}</span></div>
          <div className="detail-row"><strong>주문일시</strong><span>{formatDateTime(detail.orderedAt)}</span></div>
          <div className="detail-row"><strong>주문상태</strong><span>{detail.orderStatus || '-'}</span></div>
        </section>

        <section className="detail-block">
          <h3>배송 정보</h3>
          <div className="detail-row"><strong>수령인</strong><span>{detail.recipientName || '-'}</span></div>
          <div className="detail-row"><strong>연락처</strong><span>{detail.recipientPhone || '-'}</span></div>
          <div className="detail-row">
            <strong>주소</strong>
            <span>{[detail.zipCode, detail.address1, detail.address2].filter(Boolean).join(' ') || '-'}</span>
          </div>
          <div className="detail-row"><strong>택배사</strong><span>{detail.courierName || '-'}</span></div>
          <div className="detail-row"><strong>송장번호</strong><span>{detail.trackingNo || '-'}</span></div>
        </section>

        <section className="detail-block">
          <h3>결제 정보</h3>
          <div className="detail-row"><strong>결제수단</strong><span>{detail.paymentMethod || '-'}</span></div>
          <div className="detail-row"><strong>결제상태</strong><span>{detail.paymentStatus || '-'}</span></div>
          <div className="detail-row"><strong>결제일시</strong><span>{formatDateTime(detail.paidAt)}</span></div>
          <div className="detail-row"><strong>결제금액</strong><span>{formatPrice(detail.paidAmount)}</span></div>
        </section>

        <section className="detail-block detail-block--saving">
          <h3>금액 요약</h3>
          <div className="detail-row"><strong>총 상품 금액</strong><span>{formatPrice(detail.totalAmount)}</span></div>
          <div className="detail-row"><strong>할인 금액</strong><span>{formatPrice(detail.discountAmount)}</span></div>
          <div className="detail-row"><strong>배송비</strong><span>{formatPrice(detail.deliveryFee)}</span></div>
          <div className="detail-row"><strong>최종 결제 금액</strong><span>{formatPrice(detail.finalAmount)}</span></div>
          <div className="detail-row detail-row--accent"><strong>총 절약 금액</strong><span>{formatPrice(detail.totalSavedAmount)}</span></div>
        </section>
      </div>

      <section className="detail-items">
        <h3>주문 상품</h3>
        <div className="detail-item-list">
          {(detail.items || []).map((item) => (
            <article key={item.orderItemNo} className="detail-item-card">
              <div className="detail-item-layout">
                <div className="detail-item-media">
                  {item.imageNo ? (
                    <img
                      className="detail-item-thumb"
                      src={getOrderItemImageSrc(item.imageNo)}
                      alt={item.productName}
                    />
                  ) : (
                    <div className="detail-item-thumb detail-item-thumb--placeholder">상품</div>
                  )}
                </div>
                <div className="detail-item-body">
                  <div className="detail-item-top">
                    <strong>{item.productName}</strong>
                    <span>{item.quantity}개</span>
                  </div>
                  <div className="detail-row"><strong>구매 단가</strong><span>{formatPrice(item.unitPrice)}</span></div>
                  <div className="detail-row"><strong>소계</strong><span>{formatPrice(item.subtotal)}</span></div>
                  <div className="detail-row"><strong>시장 평균가</strong><span>{formatPrice(item.marketAvgPrice)}</span></div>
                  <div className="detail-row detail-row--saving"><strong>절약 금액</strong><span>{formatPrice(item.savedAmount)}</span></div>
                  <div className="detail-row"><strong>절약률</strong><span>{Number(item.savingRate || 0).toFixed(2)}%</span></div>
                  <div className="detail-actions">
                    {item.reviewWritable && <button type="button" className="btn">리뷰 작성</button>}
                    {!item.reviewWritable && item.reviewExists && <button type="button" className="btn-outline">리뷰 보기</button>}
                    {!item.reviewWritable && !item.reviewExists && (
                      <span className="detail-hint">리뷰 작성 조건 미충족</span>
                    )}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </article>
  );
}

export default OrderDetailPanel;
