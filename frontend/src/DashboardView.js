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

function InfoTooltip({ text }) {
  return (
    <span className="dashboard-tooltip" tabIndex="0" aria-label={text}>
      <span className="dashboard-tooltip__trigger">i</span>
      <span className="dashboard-tooltip__content" role="tooltip">
        {text}
      </span>
    </span>
  );
}

function renderProductLink(item, className = 'dashboard-product-link') {
  if (!item?.productNo) {
    return <strong>{item?.productName}</strong>;
  }

  return (
    <a href={`#/products/${item.productNo}`} className={className}>
      {item.productName}
    </a>
  );
}

function AnimatedValue({ value = 0, formatter = (currentValue) => String(currentValue) }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const targetValue = Math.max(0, Number(value || 0));

    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
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

  return <span>{formatter(displayValue)}</span>;
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
  const bestSavingMonth = monthlySavings.reduce((best, current) => {
    if (!best || Number(current.savedAmount || 0) > Number(best.savedAmount || 0)) {
      return current;
    }
    return best;
  }, null);
  const averageMonthlySaving = monthlySavings.length
    ? monthlySavings.reduce((sum, item) => sum + Number(item.savedAmount || 0), 0) / monthlySavings.length
    : 0;
  const latestSavingDelta = monthlySavings.length >= 2
    ? Number(monthlySavings[monthlySavings.length - 1].savedAmount || 0) -
      Number(monthlySavings[monthlySavings.length - 2].savedAmount || 0)
    : 0;
  const latestSavingDeltaLabel = latestSavingDelta > 0
    ? `+${formatPrice(latestSavingDelta)}`
    : latestSavingDelta < 0
      ? `-${formatPrice(Math.abs(latestSavingDelta))}`
      : formatPrice(0);

  return (
    <>
      <section className="page-head page-head--dashboard">
        <div>
          <h1>대시보드</h1>
          <p>절약 흐름과 소비 패턴을 한눈에 확인할 수 있도록 핵심 지표를 다시 정리했습니다.</p>
        </div>
      </section>

      <section className="dashboard-hero">
        <article className="card dashboard-hero-card dashboard-hero-card--saving">
          <div className="dashboard-panel-head">
            <div>
              <h2 className="dashboard-panel-title">절약 현황</h2>
              <p className="dashboard-panel-copy">시장 평균가와 비교해 얼마나 아꼈는지 가장 먼저 보여줍니다.</p>
            </div>
          </div>

          <div className="dashboard-savings-grid">
            <article className="dashboard-savings-tile dashboard-savings-tile--primary">
              <div className="dashboard-title-row">
                <div className="stat-label">누적 절약 금액</div>
                <InfoTooltip text="서비스를 이용하면서 시장 평균가 대비 얼마나 절약했는지 누적 기준으로 보여줍니다." />
              </div>
              <div className="stat-value stat-value--saving">
                {summaryLoading ? (
                  '...'
                ) : (
                  <AnimatedValue
                    value={summary.totalSavedAmount}
                    formatter={(currentValue) => formatPrice(Math.round(currentValue))}
                  />
                )}
              </div>
              <p className="dashboard-savings-copy">서비스 이용 전체 기준</p>
            </article>

            <article className="dashboard-savings-tile dashboard-savings-tile--secondary">
              <div className="dashboard-title-row">
                <div className="stat-label">이번 달 절약 금액</div>
                <InfoTooltip text="이번 달 주문에서 절약한 금액만 따로 모아 보여줍니다." />
              </div>
              <div className="stat-value stat-value--saving">
                {summaryLoading ? (
                  '...'
                ) : (
                  <AnimatedValue
                    value={summary.monthlySavedAmount}
                    formatter={(currentValue) => formatPrice(Math.round(currentValue))}
                  />
                )}
              </div>
              <p className="dashboard-savings-copy">이번 달 주문 기준</p>
            </article>
          </div>
        </article>

        <article className="card dashboard-hero-card dashboard-hero-card--summary">
          <div className="dashboard-panel-head">
            <div>
              <h2 className="dashboard-panel-title">구매 요약</h2>
              <p className="dashboard-panel-copy">구매 규모와 절약률을 한 묶음으로 확인할 수 있습니다.</p>
            </div>
          </div>

          <div className="dashboard-summary-list">
            <div className="dashboard-summary-item">
              <div className="dashboard-title-row">
                <span className="dashboard-summary-item__label">총 구매 횟수</span>
                <InfoTooltip text="완료된 주문과 진행 중인 주문을 모두 포함한 전체 주문 수입니다." />
              </div>
              <strong className="dashboard-summary-item__value">
                {summaryLoading ? '...' : totalOrderCount}
              </strong>
            </div>

            <div className="dashboard-summary-item">
              <div className="dashboard-title-row">
                <span className="dashboard-summary-item__label">총 구매 금액</span>
                <InfoTooltip text="실제 결제한 금액을 기준으로 지금까지의 누적 구매 규모를 보여줍니다." />
              </div>
              <strong className="dashboard-summary-item__value">
                {summaryLoading ? '...' : totalPurchaseAmount}
              </strong>
            </div>

            <div className="dashboard-summary-item dashboard-summary-item--accent">
              <div className="dashboard-title-row">
                <span className="dashboard-summary-item__label">평균 절약률</span>
                <InfoTooltip text="주문 금액 기준으로 평균 어느 정도 비율만큼 시장가 대비 절약하고 있는지 보여줍니다." />
              </div>
              <strong className="dashboard-summary-item__value">
                {dashboardLoading ? '...' : averageSavingRate}
              </strong>
            </div>
          </div>
        </article>
      </section>

      {dashboardError && (
        <article className="card feedback-card feedback-card--error">{dashboardError}</article>
      )}

      <section className="dashboard-main-grid">
        <article className="card dashboard-panel dashboard-panel--chart">
          <div className="dashboard-panel-head">
            <div className="dashboard-title-row">
              <h2 className="dashboard-panel-title">월별 절약 흐름</h2>
              <InfoTooltip text="최근 몇 개월의 절약 금액을 월별로 비교해 절약 흐름이 어떻게 달라졌는지 보여줍니다." />
            </div>
            <p className="dashboard-panel-copy">최근 주문에서 절약 효과가 얼마나 꾸준했는지 흐름으로 확인해 보세요.</p>
          </div>

          <div className="chart-shell">
            {dashboardLoading ? (
              <div className="feedback-card">차트 데이터를 불러오는 중입니다.</div>
            ) : monthlySavings.length === 0 ? (
              <div className="feedback-card">월별 절약 데이터가 없습니다.</div>
            ) : (
              <div className="bar-chart">
                {monthlySavings.map((item, index) => (
                  <div key={item.yearMonth} className="bar-chart__item">
                    <div className="bar-chart__track">
                      <div
                        className="bar-chart__fill"
                        style={{
                          height: getScaledHeight(item.savedAmount, monthlySavings, 'savedAmount'),
                          animationDelay: `${100 + index * 120}ms`,
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
          {!dashboardLoading && monthlySavings.length > 0 && (
            <div className="dashboard-summary-strip">
              <div className="dashboard-summary-strip__item">
                <span className="dashboard-summary-strip__label">최고 절약 월</span>
                <strong className="dashboard-summary-strip__value">
                  {bestSavingMonth ? formatMonthLabel(bestSavingMonth.yearMonth) : '-'}
                </strong>
                <span className="dashboard-summary-strip__meta">
                  {bestSavingMonth ? formatPrice(bestSavingMonth.savedAmount) : '-'}
                </span>
              </div>
              <div className="dashboard-summary-strip__item">
                <span className="dashboard-summary-strip__label">월평균 절약</span>
                <strong className="dashboard-summary-strip__value">
                  {formatPrice(Math.round(averageMonthlySaving))}
                </strong>
                <span className="dashboard-summary-strip__meta">월별 평균 기준</span>
              </div>
              <div className="dashboard-summary-strip__item">
                <span className="dashboard-summary-strip__label">최근 증감</span>
                <strong className="dashboard-summary-strip__value">
                  {latestSavingDeltaLabel}
                </strong>
                <span className="dashboard-summary-strip__meta">직전 월 대비</span>
              </div>
            </div>
          )}
        </article>

        <div className="dashboard-side-stack">
          <article className="card dashboard-panel dashboard-panel--focus">
            <div className="dashboard-panel-head">
              <div className="dashboard-title-row">
                <h2 className="dashboard-panel-title">최다 구매 품목</h2>
                <InfoTooltip text="자주 구매한 품목을 통해 어떤 상품군에 소비가 집중되는지 확인할 수 있습니다." />
              </div>
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
                        {renderProductLink(item)}
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

          <article className="card dashboard-panel">
            <div className="dashboard-panel-head">
              <div className="dashboard-title-row">
                <h2 className="dashboard-panel-title">최근 구매 상품</h2>
                <InfoTooltip text="최근에 구매한 상품과 결제 금액을 함께 보여 줘서 최근 소비 흐름을 빠르게 확인할 수 있습니다." />
              </div>
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
                        {renderProductLink(item)}
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
        </div>
      </section>

      <section className="section">
        <article className="card dashboard-panel dashboard-panel--analysis">
          <div className="dashboard-panel-head">
            <div className="dashboard-title-row">
              <h2 className="dashboard-panel-title">품목별 절약 분석</h2>
              <InfoTooltip text="어떤 품목에서 절약 효과가 컸는지 비교해 다음 구매 때 눈여겨볼 품목을 빠르게 찾을 수 있습니다." />
            </div>
            <p className="dashboard-panel-copy">절약 금액이 큰 품목부터 비교해 다음 장보기 우선순위를 정할 수 있습니다.</p>
          </div>

          {dashboardLoading ? (
            <div className="feedback-card">분석 데이터를 불러오는 중입니다.</div>
          ) : productSavings.length === 0 ? (
            <div className="feedback-card">품목별 절약 데이터가 없습니다.</div>
          ) : (
            <div className="compare-bars">
              {productSavings.map((item, index) => (
                <div key={item.productName} className="compare-item">
                  {renderProductLink(item)}
                  <div className="bar">
                    <span
                      style={{
                        width: getScaledWidth(item.savedAmount, productSavings, 'savedAmount'),
                        background: 'var(--green)',
                        animationDelay: `${140 + index * 100}ms`,
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
    </>
  );
}

export default DashboardView;
