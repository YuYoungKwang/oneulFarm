import { useEffect, useMemo, useState } from 'react';
import { SearchIcon } from '../ProductIcons';
import PriceEmptyState from './PriceEmptyState';
import PriceTrendChart from './PriceTrendChart';

function formatCurrency(value) {
  return `${Math.round(Number(value || 0)).toLocaleString('ko-KR')}원`;
}

function formatPercent(value) {
  const numericValue = Number(value || 0);
  const prefix = numericValue > 0 ? '+' : '';
  return `${prefix}${numericValue.toFixed(1)}%`;
}

function getDeltaTone(value) {
  const numericValue = Number(value || 0);
  if (numericValue > 0) {
    return 'is-up';
  }
  if (numericValue < 0) {
    return 'is-down';
  }
  return 'is-flat';
}

function getDeltaLabel(value) {
  const numericValue = Number(value || 0);
  if (numericValue > 0) {
    return `전일 대비 ${formatPercent(numericValue)} 상승`;
  }
  if (numericValue < 0) {
    return `전일 대비 ${formatPercent(numericValue)} 하락`;
  }
  return '전일 대비 변동 없음';
}

export default function PriceInsightSection({
  chartPoints = [],
  currentPrice = 0,
  dailyChangeRate = 0,
  error,
  productMeta,
  productName,
  query,
  rankingList = [],
  recentTrendSummary,
  status,
  weeklySummary,
  onOpenProduct,
  onQueryChange,
  onRetry,
  onSelectRanking,
}) {
  const deltaTone = getDeltaTone(dailyChangeRate);
  const [rankingPage, setRankingPage] = useState('top10');
  const hasNextRankingPage = rankingList.length > 10;

  useEffect(() => {
    if (rankingPage === 'next10' && !hasNextRankingPage) {
      setRankingPage('top10');
    }
  }, [hasNextRankingPage, rankingPage]);

  const visibleRankingList = useMemo(() => {
    if (rankingPage === 'next10') {
      return rankingList.slice(10, 20);
    }
    return rankingList.slice(0, 10);
  }, [rankingList, rankingPage]);

  return (
    <section className="price-section price-insight-section">
      <div className="price-insight-layout price-insight-layout--flat">
        <div className="price-insight-main">
          <div className="price-insight-hero">
            <div className="price-insight-hero__copy">
              {status?.badge ? (
                <span className={`price-status-badge tone-${status?.tone || 'stable'}`}>
                  {status.badge}
                </span>
              ) : null}
              <strong>{productName || '분석 상품'}</strong>
              {productMeta ? <p>{productMeta}</p> : null}
            </div>

            <div className="price-insight-hero__price">
              <span>오늘 평균가</span>
              <strong>{formatCurrency(currentPrice)}</strong>
              <span className={`hero-summary-card__delta ${deltaTone}`}>
                {getDeltaLabel(dailyChangeRate)}
              </span>
            </div>
          </div>

          <div className="price-insight-hero__summary">
            <p>{status?.description}</p>

            <div className="price-insight-inline-notes">
              {recentTrendSummary ? (
                <div className="price-insight-inline-note">
                  <span className="price-chip-label">최근 흐름</span>
                  <strong>{recentTrendSummary}</strong>
                </div>
              ) : null}

              {weeklySummary ? (
                <div className="price-insight-inline-note">
                  <span className="price-chip-label">7일 기준</span>
                  <strong>{weeklySummary}</strong>
                </div>
              ) : null}
            </div>

            <div className="price-insight-actions">
              <button className="price-btn price-btn--primary" type="button" onClick={onOpenProduct}>
                상품 보러가기
              </button>
              <button className="price-btn price-btn--secondary" type="button" onClick={onRetry}>
                최신 시세 다시 불러오기
              </button>
            </div>
          </div>

          <div className="price-insight-chart-shell">
            {chartPoints.length ? (
              <PriceTrendChart points={chartPoints} title={`${productName || '상품'} 가격 추이`} />
            ) : (
              <PriceEmptyState
                actionLabel="다시 시도"
                icon="TR"
                subtitle={error || '차트로 보여줄 시세 데이터가 아직 부족합니다.'}
                title="가격 추이를 불러오지 못했습니다."
                onAction={onRetry}
              />
            )}
          </div>
        </div>

        <aside className="price-insight-side">
          <div className="price-insight-side__panel">
            <div className="price-insight-side__heading">
              <span className="price-chip-label">상품 검색</span>
              <strong>할인율 순 랭킹</strong>
              <p>랭킹을 누르면 차트와 연결 상품이 바로 바뀝니다.</p>
            </div>

            <label className="price-selector__search-field price-selector__search-field--compact">
              <SearchIcon />
              <input
                placeholder="상추, 양파, 브로콜리 검색"
                type="search"
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
              />
            </label>

            {rankingList.length ? (
              <>
                <div className="price-ranking-list">
                  {visibleRankingList.map((item) => (
                    <button
                      key={item.optionKey}
                      className={`price-ranking-item ${item.isSelected ? 'is-active' : ''}`}
                      type="button"
                      onClick={() => onSelectRanking(item)}
                    >
                      <span className="price-ranking-item__rank">
                        {String(item.rank).padStart(2, '0')}
                      </span>

                      <span className="price-ranking-item__body">
                        <strong>{item.displayName}</strong>
                        <span>
                          {item.currentPriceLabel} · 변동 {item.changeRateLabel}
                        </span>
                      </span>

                      <span className="price-ranking-item__meta">
                        <strong>{item.savingRateLabel}</strong>
                        <span>할인율</span>
                      </span>
                    </button>
                  ))}
                </div>

                <div className="price-ranking-pagination" role="tablist" aria-label="랭킹 범위 전환">
                  <button
                    aria-label="랭킹 1위부터 10위 보기"
                    aria-pressed={rankingPage === 'top10'}
                    className={`price-ranking-pagination__dot ${
                      rankingPage === 'top10' ? 'is-active' : ''
                    }`}
                    type="button"
                    onClick={() => setRankingPage('top10')}
                  />
                  <button
                    aria-label="랭킹 11위부터 20위 보기"
                    aria-pressed={rankingPage === 'next10'}
                    className={`price-ranking-pagination__dot ${
                      rankingPage === 'next10' ? 'is-active' : ''
                    }`}
                    disabled={!hasNextRankingPage}
                    type="button"
                    onClick={() => setRankingPage('next10')}
                  />
                </div>
              </>
            ) : (
              <div className="price-empty-inline">검색 조건에 맞는 분석 상품이 없습니다.</div>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
