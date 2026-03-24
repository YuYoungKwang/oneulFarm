import {
  formatDate,
  formatPrice,
  getDeliveryBadgeClass,
  getDeliveryLabel,
  getOrderStats,
} from './appUtils';
import OrderDetailPanel from './OrderDetailPanel';
import InlineInfoTip from './components/InlineInfoTip';

function getOrderImageSrc(imageNo) {
  return imageNo ? `/backend/api/image/product/${imageNo}` : '';
}

function OrdersView({
  orders,
  ordersLoading,
  ordersError,
  orderFilters,
  selectedOrderNo,
  orderDetail,
  detailLoading,
  detailError,
  onOrderFilterChange,
  onOrderFilterSubmit,
  onOrderFilterReset,
  onSelectOrder,
  onStartCreateReview,
}) {
  const stats = getOrderStats(orders);

  return (
    <>
      <section className="page-head">
        <div>
          <div className="page-title-row">
            <h1>주문관리</h1>
            <InlineInfoTip content="배송 상태와 기간으로 주문을 찾고, 필요한 주문만 열어서 상세 내용을 확인할 수 있습니다." />
          </div>
        </div>
      </section>

      <section className="section">
        <article className="card order-filter-bar">
          <div className="section-head">
            <div>
              <div className="section-title-row">
                <div className="section-title">주문 조회 조건</div>
                <InlineInfoTip content="배송 상태와 기간을 선택하면 원하는 주문만 빠르게 볼 수 있습니다." />
              </div>
            </div>
          </div>

          <form className="order-filter-form" onSubmit={onOrderFilterSubmit}>
            <div className="order-filter-grid">
              <label className="form-field">
                <span>배송 상태</span>
                <select name="deliveryStatus" value={orderFilters.deliveryStatus} onChange={onOrderFilterChange}>
                  <option value="ALL">전체</option>
                  <option value="READY">배송 준비</option>
                  <option value="SHIPPING">배송 중</option>
                  <option value="DELIVERED">배송 완료</option>
                </select>
              </label>
              <label className="form-field">
                <span>시작일</span>
                <input type="date" name="dateFrom" value={orderFilters.dateFrom} onChange={onOrderFilterChange} />
              </label>
              <label className="form-field">
                <span>종료일</span>
                <input type="date" name="dateTo" value={orderFilters.dateTo} onChange={onOrderFilterChange} />
              </label>
            </div>
            <div className="order-filter-actions">
              <button type="button" className="btn-outline" onClick={onOrderFilterReset}>초기화</button>
              <button type="submit" className="btn">조회</button>
            </div>
          </form>
        </article>
      </section>

      <div className="quick-grid">
        <article className="quick-card">
          <div className="quick-label">조회 결과</div>
          <div className="quick-value">{stats.totalCount}건</div>
        </article>
        <article className="quick-card soft-yellow">
          <div className="quick-label">배송 중</div>
          <div className="quick-value">{stats.shippingCount}건</div>
        </article>
        <article className="quick-card soft-green">
          <div className="quick-label">배송 완료</div>
          <div className="quick-value">{stats.deliveredCount}건</div>
        </article>
        <article className="quick-card quick-card--saving">
          <div className="quick-label">절약 금액 합계</div>
          <div className="quick-value quick-value--saving">{formatPrice(stats.totalSavedAmount)}</div>
        </article>
      </div>

      {ordersLoading && <article className="card feedback-card">주문 목록을 불러오는 중입니다.</article>}
      {!ordersLoading && ordersError && (
        <article className="card feedback-card feedback-card--error">{ordersError}</article>
      )}
      {!ordersLoading && !ordersError && orders.length === 0 && (
        <article className="card feedback-card">조건에 맞는 주문이 없습니다.</article>
      )}

      {!ordersLoading && !ordersError && orders.length > 0 && (
        <section className="order-list">
          {orders.map((order) => {
            const isSelected = selectedOrderNo === order.orderNo;
            const previewImageNos = Array.isArray(order.previewImageNos) ? order.previewImageNos : [];

            return (
              <div key={order.orderNo} className="order-list-entry">
                <article className={`order-card ${isSelected ? 'is-selected' : ''}`}>
                  <div className="order-top">
                    <div>
                      <div className="card-title order-title">주문번호 {order.orderId}</div>
                      <div className="section-sub">{formatDate(order.orderedAt)}</div>
                    </div>
                    <span className={`status-pill ${getDeliveryBadgeClass(order.deliveryStatus)}`}>
                      {getDeliveryLabel(order.deliveryStatus)}
                    </span>
                  </div>

                  {previewImageNos.length > 0 && (
                    <div className="order-preview-strip" aria-label="구매 상품 대표 이미지">
                      {previewImageNos.map((imageNo, index) => (
                        <img
                          key={`${order.orderNo}-${imageNo}-${index}`}
                          className="order-preview-thumb"
                          src={getOrderImageSrc(imageNo)}
                          alt={order.displayProductName || '주문 상품'}
                        />
                      ))}
                      {Number(order.itemCount || 0) > previewImageNos.length && (
                        <span className="order-preview-more">
                          +{Number(order.itemCount || 0) - previewImageNos.length}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="order-summary-grid">
                    <div className="order-summary-item">
                      <strong>대표 상품</strong>
                      <span>{order.displayProductName}</span>
                    </div>
                    <div className="order-summary-item">
                      <strong>상품 수</strong>
                      <span>{order.itemCount}건</span>
                    </div>
                    <div className="order-summary-item">
                      <strong>최종 결제 금액</strong>
                      <span>{formatPrice(order.finalAmount)}</span>
                    </div>
                    <div className="order-summary-item order-summary-item--saving">
                      <strong>총 절약 금액</strong>
                      <span>{formatPrice(order.totalSavedAmount)}</span>
                    </div>
                  </div>

                  <div className="help-row">
                    <span>{order.orderStatus} · {getDeliveryLabel(order.deliveryStatus)}</span>
                    <button type="button" className="btn-outline" onClick={() => onSelectOrder(order.orderNo)}>
                      {isSelected ? '상세 닫기' : '주문 상세 보기'}
                    </button>
                  </div>
                </article>

                {isSelected && (
                  <OrderDetailPanel
                    detail={orderDetail}
                    loading={detailLoading}
                    error={detailError}
                    onStartCreateReview={onStartCreateReview}
                  />
                )}
              </div>
            );
          })}
        </section>
      )}
    </>
  );
}

export default OrdersView;
