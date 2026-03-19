import { useEffect, useState } from 'react';
import {
  formatDate,
  formatMonthLabel,
  formatPrice,
  getScaledHeight,
  getScaledWidth,
} from './appUtils';

function formatPercent(value) {
  return `${Number(value || 0).toLocaleString('ko-KR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}

function AnimatedValue({ value = 0, formatter = (currentValue) => String(currentValue) }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const targetValue = Math.max(0, Number(value || 0));

    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayValue(targetValue);
      return undefined;
    }

    let frameId;
    const startedAt = performance.now();
    const duration = 950;

    function animate(now) {
      const progress = Math.min((now - startedAt) / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(targetValue * easedProgress);

      if (progress < 1) {
        frameId = window.requestAnimationFrame(animate);
      }
    }

    setDisplayValue(0);
    frameId = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [value]);

  return (
    <span>{formatter(displayValue)}</span>
  );
}

function DashboardView({
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
  const totalOrderCount = `${Number(summary.totalOrderCount || 0)}건`;
  const totalPurchaseAmount = formatPrice(summary.totalPurchaseAmount);
  const averageSavingRate = formatPercent(patterns.averageSavingRate);

  return (
    <>
      <section className="page-head">
        <div>
          <h1>대시보드</h1>
          <p>절약 흐름과 소비 패턴을 한 화면에서 읽을 수 있도록 핵심 지표만 먼저 모아 둔 개인 대시보드입니다.</p>
        </div>
      </section>

      <div className="stats-grid dashboard-kpi-grid">
        <article className="stat-card stat-card--saving dashboard-kpi-card dashboard-kpi-card--primary">
          <div className="dashboard-kpi-eyebrow">핵심 절약 지표</div>
          <div className="stat-label">누적 절약 금액</div>
          <div className="stat-value stat-value--saving">
            {summaryLoading ? '...' : <AnimatedValue value={summary.totalSavedAmount} formatter={(currentValue) => formatPrice(Math.round(currentValue))} />}
          </div>
          <div className="dashboard-kpi-note">서비스 이용 전체 기준으로 시장 평균가 대비 아낀 금액입니다.</div>
        </article>
        <article className="stat-card stat-card--saving dashboard-kpi-card dashboard-kpi-card--primary">
          <div className="dashboard-kpi-eyebrow">이번 달 체감</div>
          <div className="stat-label">이번 달 절약 금액</div>
          <div className="stat-value stat-value--saving">
            {summaryLoading ? '...' : <AnimatedValue value={summary.monthlySavedAmount} formatter={(currentValue) => formatPrice(Math.round(currentValue))} />}
          </div>
          <div className="dashboard-kpi-note">이번 달 주문에서 바로 체감한 절약 효과를 보여줍니다.</div>
        </article>
        <article className="stat-card dashboard-kpi-card dashboard-kpi-card--secondary">
          <div className="dashboard-kpi-eyebrow dashboard-kpi-eyebrow--neutral">활동 규모</div>
          <div className="stat-label">총 구매 횟수</div>
          <div className="stat-value">{summaryLoading ? '...' : totalOrderCount}</div>
          <div className="dashboard-kpi-note">완료된 주문과 진행 중인 주문을 포함한 전체 주문 수입니다.</div>
        </article>
        <article className="stat-card dashboard-kpi-card dashboard-kpi-card--secondary">
          <div className="dashboard-kpi-eyebrow dashboard-kpi-eyebrow--neutral">누적 사용액</div>
          <div className="stat-label">총 구매 금액</div>
          <div className="stat-value">{summaryLoading ? '...' : totalPurchaseAmount}</div>
          <div className="dashboard-kpi-note">실제 결제한 금액 기준으로 누적 구매 규모를 보여줍니다.</div>
        </article>
      </div>

      {dashboardError && (
        <article className="card feedback-card feedback-card--error">{dashboardError}</article>
      )}

      <section className="section grid-2">
        <article className="card">
          <div className="dashboard-section-head">
            <div>
              <div className="dashboard-section-badge">절약 추세</div>
              <div className="card-title">월별 절약 흐름</div>
            </div>
            <div className="dashboard-section-side">최근 달별 비교</div>
          </div>
          <div className="card-sub">최근 달마다 절약 금액이 어떻게 쌓였는지 비교해, 절약 효과가 커지는 시점을 바로 읽을 수 있게 했습니다.</div>
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
                        style={{
                          height: getScaledHeight(item.savedAmount, monthlySavings, 'savedAmount'),
                          animationDelay: `${100 + monthlySavings.indexOf(item) * 120}ms`,
                        }}
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
          <div className="dashboard-section-head">
            <div>
              <div className="dashboard-section-badge dashboard-section-badge--warm">품목 비교</div>
              <div className="card-title">품목별 절약 분석</div>
            </div>
            <div className="dashboard-section-side">집중할 상품 찾기</div>
          </div>
          <div className="card-sub">어떤 품목에서 절약 효과가 컸는지 비교해서, 다음 구매 때 더 집중할 상품을 빠르게 찾을 수 있습니다.</div>
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
                        animationDelay: `${140 + productSavings.indexOf(item) * 100}ms`,
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

      <section className="section dashboard-pattern-grid">
        <article className="card dashboard-pattern-card dashboard-pattern-card--saving">
          <div className="dashboard-section-badge">패턴 요약</div>
          <div className="card-title">평균 절약률</div>
          <div className="dashboard-pattern-value">{dashboardLoading ? '...' : averageSavingRate}</div>
          <div className="dashboard-pattern-copy">
            주문 금액 기준으로 보면 평균적으로 이 정도 비율만큼 시장가 대비 절약하고 있습니다.
          </div>
        </article>

        <article className="card dashboard-pattern-card">
          <div className="dashboard-section-badge dashboard-section-badge--warm">Top 품목</div>
          <div className="card-title">최다 구매 품목</div>
          <div className="dashboard-pattern-copy">
            자주 사는 품목을 보면 어떤 상품군에 지출이 집중되는지 바로 읽을 수 있습니다.
          </div>
          {dashboardLoading ? (
            <div className="feedback-card">최다 구매 품목을 불러오는 중입니다.</div>
          ) : patterns.topPurchasedProducts.length === 0 ? (
            <div className="feedback-card">구매 품목 데이터가 없습니다.</div>
          ) : (
            <div className="dashboard-list">
              {patterns.topPurchasedProducts.map((item, index) => (
                <div key={item.productName} className="dashboard-list-item">
                  <div className="dashboard-list-item__head">
                    <div className="dashboard-list-item__title-row">
                      <span className="dashboard-rank-badge">TOP {index + 1}</span>
                      <strong>{item.productName}</strong>
                    </div>
                    <span className="dashboard-list-item__badge">{item.totalQuantity}개 구매</span>
                  </div>
                  <div className="dashboard-list-item__meta">
                    <span>누적 절약 {formatPrice(item.savedAmount)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="card dashboard-pattern-card">
          <div className="dashboard-section-badge">최근 흐름</div>
          <div className="card-title">최근 구매 상품</div>
          <div className="dashboard-pattern-copy">
            가장 최근에 구매한 상품과 금액 흐름을 함께 보여 줘서 최근 소비 패턴을 빠르게 확인할 수 있습니다.
          </div>
          {dashboardLoading ? (
            <div className="feedback-card">최근 구매 상품을 불러오는 중입니다.</div>
          ) : patterns.recentPurchasedProducts.length === 0 ? (
            <div className="feedback-card">최근 구매 상품이 없습니다.</div>
          ) : (
            <div className="dashboard-list">
              {patterns.recentPurchasedProducts.map((item, index) => (
                <div key={`${item.productName}-${item.orderedAt}-${index}`} className="dashboard-list-item">
                  <div className="dashboard-list-item__head">
                    <div className="dashboard-list-item__title-row">
                      <span className="dashboard-rank-badge dashboard-rank-badge--recent">최근 {index + 1}</span>
                      <strong>{item.productName}</strong>
                    </div>
                    <span className="dashboard-list-item__badge">{item.quantity}개</span>
                  </div>
                  <div className="dashboard-list-item__meta">
                    <span>{formatDate(item.orderedAt)}</span>
                    <span>{formatPrice(item.subtotal)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    </>
  );
}

export default DashboardView;
