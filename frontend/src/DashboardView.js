import {
  formatDate,
  formatMonthLabel,
  formatPrice,
  getScaledHeight,
  getScaledWidth,
} from './appUtils';

function DashboardView({
  onMoveToMypage,
  summary = {},
  summaryLoading = false,
  monthlySavings = [],
  productSavings = [],
  patterns = {
    averagePurchaseUnitPrice: 0,
    averageSavingRate: 0,
    topPurchasedProducts: [],
    recentPurchasedProducts: [],
  },
  dashboardLoading = false,
  dashboardError = '',
}) {
  const totalSavedAmount = formatPrice(summary.totalSavedAmount);
  const monthlySavedAmount = formatPrice(summary.monthlySavedAmount);
  const totalOrderCount = `${Number(summary.totalOrderCount || 0)}건`;
  const totalPurchaseAmount = formatPrice(summary.totalPurchaseAmount);
  const averagePurchaseUnitPrice = formatPrice(patterns.averagePurchaseUnitPrice);
  const averageSavingRate = `${Number(patterns.averageSavingRate || 0).toLocaleString('ko-KR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;

  return (
    <>
      <section className="page-head">
        <div>
          <h1>대시보드</h1>
          <p>절약 금액과 소비 패턴을 한 화면에서 확인하는 개인 대시보드입니다.</p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn-outline" onClick={onMoveToMypage}>
            마이페이지로 이동
          </button>
        </div>
      </section>

      <div className="stats-grid">
        <article className="stat-card stat-card--saving">
          <div className="stat-label">누적 절약 금액</div>
          <div className="stat-value stat-value--saving">{summaryLoading ? '...' : totalSavedAmount}</div>
          <div className="section-sub">주문 시점 기준 누적 합계</div>
        </article>
        <article className="stat-card stat-card--saving">
          <div className="stat-label">이번 달 절약 금액</div>
          <div className="stat-value stat-value--saving">{summaryLoading ? '...' : monthlySavedAmount}</div>
          <div className="section-sub">이번 달에 아낀 금액</div>
        </article>
        <article className="stat-card">
          <div className="stat-label">총 구매 횟수</div>
          <div className="stat-value">{summaryLoading ? '...' : totalOrderCount}</div>
          <div className="section-sub">완료 및 진행 주문 포함</div>
        </article>
        <article className="stat-card">
          <div className="stat-label">총 구매 금액</div>
          <div className="stat-value">{summaryLoading ? '...' : totalPurchaseAmount}</div>
          <div className="section-sub">최종 결제 금액 합계</div>
        </article>
      </div>

      {dashboardError && (
        <article className="card feedback-card feedback-card--error">{dashboardError}</article>
      )}

      <section className="section grid-2">
        <article className="card">
          <div className="card-title">월별 절약 금액</div>
          <div className="card-sub">월별 절약 흐름을 막대 차트로 보여줍니다.</div>
          <div className="chart-shell">
            {dashboardLoading ? (
              <div className="feedback-card">차트 데이터를 불러오는 중입니다.</div>
            ) : monthlySavings.length === 0 ? (
              <div className="feedback-card">월별 절약 데이터가 없습니다.</div>
            ) : (
              <div className="bar-chart">
                {monthlySavings.map((item) => (
                  <div key={item.yearMonth} className="bar-chart__item">
                    <div className="bar-chart__track">
                      <div
                        className="bar-chart__fill"
                        style={{ height: getScaledHeight(item.savedAmount, monthlySavings, 'savedAmount') }}
                      />
                    </div>
                    <strong>{formatPrice(item.savedAmount)}</strong>
                    <span>{formatMonthLabel(item.yearMonth)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </article>

        <article className="card">
          <div className="card-title">품목별 절약 분석</div>
          <div className="card-sub">어떤 품목에서 절약 효과가 큰지 비교합니다.</div>
          {dashboardLoading ? (
            <div className="feedback-card">분석 데이터를 불러오는 중입니다.</div>
          ) : productSavings.length === 0 ? (
            <div className="feedback-card">품목별 절약 데이터가 없습니다.</div>
          ) : (
            <div className="compare-bars">
              {productSavings.map((item) => (
                <div key={item.productName} className="compare-item">
                  <strong>{item.productName}</strong>
                  <div className="bar">
                    <span
                      style={{
                        width: getScaledWidth(item.savedAmount, productSavings, 'savedAmount'),
                        background: 'var(--green)',
                      }}
                    />
                  </div>
                  <span>{formatPrice(item.savedAmount)}</span>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>

      <section className="section grid-2 dashboard-bottom">
        <div className="stack">
          <article className="card">
            <div className="card-title">평균 구매 단가</div>
            <div className="stat-value">{dashboardLoading ? '...' : averagePurchaseUnitPrice}</div>
            <div className="section-sub">주문상품 기준 평균 구매 단가</div>
          </article>
          <article className="card">
            <div className="card-title">절약률</div>
            <div className="stat-value">{dashboardLoading ? '...' : averageSavingRate}</div>
            <div className="section-sub">금액 기준 가중 평균 절약률</div>
          </article>
        </div>

        <div className="stack">
          <article className="card">
            <div className="card-title">최다 구매 품목</div>
            {dashboardLoading ? (
              <div className="feedback-card">최다 구매 품목을 불러오는 중입니다.</div>
            ) : patterns.topPurchasedProducts.length === 0 ? (
              <div className="feedback-card">구매 품목 데이터가 없습니다.</div>
            ) : (
              <div className="insight-list">
                {patterns.topPurchasedProducts.map((item) => (
                  <div key={item.productName} className="insight-item">
                    <strong>{item.productName}</strong>
                    <span>{item.totalQuantity}개 · {formatPrice(item.savedAmount)} 절약</span>
                  </div>
                ))}
              </div>
            )}
          </article>
          <article className="card">
            <div className="card-title">최근 구매 상품</div>
            {dashboardLoading ? (
              <div className="feedback-card">최근 구매 상품을 불러오는 중입니다.</div>
            ) : patterns.recentPurchasedProducts.length === 0 ? (
              <div className="feedback-card">최근 구매 상품이 없습니다.</div>
            ) : (
              <div className="insight-list">
                {patterns.recentPurchasedProducts.map((item, index) => (
                  <div key={`${item.productName}-${item.orderedAt}-${index}`} className="insight-item">
                    <strong>{item.productName}</strong>
                    <span>{formatDate(item.orderedAt)} · {item.quantity}개 · {formatPrice(item.subtotal)}</span>
                  </div>
                ))}
              </div>
            )}
          </article>
        </div>
      </section>
    </>
  );
}

export default DashboardView;
