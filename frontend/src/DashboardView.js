import {
  monthlySavings,
  productSavings,
  topProducts,
  recentProducts,
} from './mockData';
import { formatPrice, getMonthlyHeight, getProductWidth } from './appUtils';

function DashboardView({ onMoveToMypage, summary, summaryLoading }) {
  const totalSavedAmount = formatPrice(summary.totalSavedAmount);
  const monthlySavedAmount = formatPrice(summary.monthlySavedAmount);
  const totalOrderCount = `${Number(summary.totalOrderCount || 0)}건`;
  const totalPurchaseAmount = formatPrice(summary.totalPurchaseAmount);

  return (
    <>
      <section className="page-head">
        <div>
          <h1>대시보드</h1>
          <p>절약 금액과 소비 패턴을 한 화면으로 정리한 개인 대시보드입니다.</p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn-outline" onClick={onMoveToMypage}>마이페이지 이동</button>
          <button type="button" className="btn">이번 달 리포트</button>
        </div>
      </section>

      <div className="stats-grid">
        <article className="stat-card">
          <div className="stat-label">누적 절약 금액</div>
          <div className="stat-value">{summaryLoading ? '...' : totalSavedAmount}</div>
          <div className="section-sub">주문 시점 기준 누적 합계</div>
        </article>
        <article className="stat-card">
          <div className="stat-label">이번 달 절약 금액</div>
          <div className="stat-value">{summaryLoading ? '...' : monthlySavedAmount}</div>
          <div className="section-sub">2026년 3월 기준</div>
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

      <section className="section grid-2">
        <article className="card">
          <div className="card-title">월별 절약 금액</div>
          <div className="card-sub">세로 막대 차트로 월별 절약 흐름을 보여줍니다.</div>
          <div className="chart-shell">
            <div className="bar-chart">
              {monthlySavings.map((item) => (
                <div key={item.month} className="bar-chart__item">
                  <div className="bar-chart__track">
                    <div className="bar-chart__fill" style={{ height: getMonthlyHeight(item.value) }} />
                  </div>
                  <strong>{formatPrice(item.value)}</strong>
                  <span>{item.month}</span>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="card">
          <div className="card-title">품목별 절약 분석</div>
          <div className="card-sub">어떤 품목에서 절약 효과가 큰지 비교합니다.</div>
          <div className="compare-bars">
            {productSavings.map((item) => (
              <div key={item.name} className="compare-item">
                <strong>{item.name}</strong>
                <div className="bar">
                  <span style={{ width: getProductWidth(item.value), background: 'var(--green)' }} />
                </div>
                <span>{formatPrice(item.value)}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="section grid-2 dashboard-bottom">
        <div className="stack">
          <article className="card">
            <div className="card-title">평균 구매 단가</div>
            <div className="stat-value">3,166원</div>
            <div className="section-sub">주문상품 기준 평균 구매 단가</div>
          </article>
          <article className="card">
            <div className="card-title">절약률</div>
            <div className="stat-value">18.07%</div>
            <div className="section-sub">금액 기준 가중 평균 절약률</div>
          </article>
        </div>

        <div className="stack">
          <article className="card">
            <div className="card-title">최다 구매 품목</div>
            <div className="insight-list">
              {topProducts.map((item) => (
                <div key={item.name} className="insight-item">
                  <strong>{item.name}</strong>
                  <span>{item.quantity} · {item.saved}</span>
                </div>
              ))}
            </div>
          </article>
          <article className="card">
            <div className="card-title">최근 구매 상품</div>
            <div className="insight-list">
              {recentProducts.map((item) => (
                <div key={item.name} className="insight-item">
                  <strong>{item.name}</strong>
                  <span>{item.orderedAt} · {item.detail}</span>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>
    </>
  );
}

export default DashboardView;
