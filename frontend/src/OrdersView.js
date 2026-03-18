import { formatDate, formatPrice, getDeliveryBadgeClass, getDeliveryLabel, getOrderStats } from './appUtils';
import OrderDetailPanel from './OrderDetailPanel';

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
  onMoveToMypage,
}) {
  const stats = getOrderStats(orders);

  return (
    <>
      <section className="page-head">
        <div>
          <h1>주문관리</h1>
          <p>필터와 기간 조회로 주문 흐름을 한 화면에서 관리할 수 있도록 분리한 주문 전용 페이지입니다.</p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn-outline" onClick={onMoveToMypage}>
            마이페이지로 돌아가기
          </button>
        </div>
      </section>

      <section className="section">
        <article className="card orders-hero-card">
          <div className="orders-hero-card__copy">
            <div className="card-title">주문 흐름을 더 넓게 보도록 분리했습니다.</div>
            <div className="card-sub">
              배송 상태와 기간 조건으로 빠르게 필터링하고, 필요한 주문만 펼쳐서 상세를 확인할 수 있습니다.
            </div>
          </div>
          <div className="orders-hero-card__meta">
            <span className="badge green">주문 {stats.totalCount}건</span>
            <span className="badge green">절약 {formatPrice(stats.totalSavedAmount)}</span>
          </div>
        </article>
      </section>

      <section className="section">
        <article className="card order-filter-bar">
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
          <div className="quick-label">현재 조회 결과</div>
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
        <article className="quick-card">
          <div className="quick-label">절약 금액 합계</div>
          <div className="quick-value">{formatPrice(stats.totalSavedAmount)}</div>
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

            return (
              <div key={order.orderNo} className="order-list-entry">
                <article className={`order-card ${isSelected ? 'is-selected' : ''}`}>
                  <div className="order-top">
                    <div>
                      <div className="card-title order-title">주문번호 {order.orderId}</div>
                      <div className="section-sub">{formatDate(order.orderedAt)} 주문</div>
                    </div>
                    <span className={`status-pill ${getDeliveryBadgeClass(order.deliveryStatus)}`}>
                      {getDeliveryLabel(order.deliveryStatus)}
                    </span>
                  </div>

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
                      <strong>최종 결제금액</strong>
                      <span>{formatPrice(order.finalAmount)}</span>
                    </div>
                    <div className="order-summary-item">
                      <strong>총 절약금액</strong>
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
                  <OrderDetailPanel detail={orderDetail} loading={detailLoading} error={detailError} />
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
