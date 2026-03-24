import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import '../styles/priceAnalysis.css';
import { fetchPriceTrendFromApi } from '../api/priceAnalysisApi';
import { fetchRecipeList } from './recipeApi';
import PriceAnalysisSection from './price/PriceAnalysisSection';
import PriceAnalysisToolbar from './price/PriceAnalysisToolbar';
import PriceEmptyState from './price/PriceEmptyState';
import PriceMetricCard from './price/PriceMetricCard';
import PriceProductCard from './price/PriceProductCard';
import PriceTrendChart from './price/PriceTrendChart';

export default function PriceAnalysisPage({
  onOpenProduct,
  onOpenRecipe,
  products = [],
}) {
  const candidateList = useMemo(() => buildProductCandidates(products), [products]);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [selectedOptionKey, setSelectedOptionKey] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);
  const [trendState, setTrendState] = useState({
    error: '',
    loading: false,
    rows: [],
    source: 'empty',
    totalCount: 0,
  });
  const [recipeState, setRecipeState] = useState({
    error: '',
    loading: false,
    list: [],
  });

  useEffect(() => {
    if (!candidateList.length) {
      setSelectedOptionKey('');
      return;
    }

    const hasSelectedOption = candidateList.some(
      (candidate) => candidate.optionKey === selectedOptionKey
    );

    if (!hasSelectedOption) {
      setSelectedOptionKey(candidateList[0].optionKey);
    }
  }, [candidateList, selectedOptionKey]);

  const filteredCandidateList = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return candidateList;
    }

    return candidateList.filter((candidate) =>
      [candidate.label, candidate.productName, candidate.origin, candidate.itemName]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }, [candidateList, deferredQuery]);

  const selectedCandidate = useMemo(() => {
    return (
      candidateList.find((candidate) => candidate.optionKey === selectedOptionKey) ||
      filteredCandidateList[0] ||
      candidateList[0] ||
      null
    );
  }, [candidateList, filteredCandidateList, selectedOptionKey]);

  useEffect(() => {
    if (!selectedCandidate?.itemCode) {
      setTrendState({
        error: '',
        loading: false,
        rows: [],
        source: 'empty',
        totalCount: 0,
      });
      return;
    }

    let cancelled = false;
    const abortController = new AbortController();

    async function loadTrend() {
      setTrendState((previousState) => ({
        ...previousState,
        error: '',
        loading: true,
      }));

      try {
        const payload = await fetchPriceTrendFromApi({
          days: 365,
          itemCode: selectedCandidate.itemCode,
          marketType: selectedCandidate.marketType,
          signal: abortController.signal,
        });
        if (cancelled) {
          return;
        }

        const normalizedRows = normalizeTrendRows(payload?.trend || payload || []);
        const fallbackRows = buildFallbackTrendRows(selectedCandidate.product);

        setTrendState({
          error: '',
          loading: false,
          rows: normalizedRows.length ? normalizedRows : fallbackRows,
          source: normalizedRows.length ? 'trend' : fallbackRows.length ? 'fallback' : 'empty',
          totalCount: normalizedRows.length,
        });
      } catch (error) {
        if (!cancelled) {
          setTrendState({
            error: error?.message || '시세 추이를 불러오지 못했습니다.',
            loading: false,
            rows: [],
            source: 'empty',
            totalCount: 0,
          });
        }
      }
    }

    loadTrend();
    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [refreshToken, selectedCandidate]);

  useEffect(() => {
    if (!selectedCandidate?.keyword) {
      setRecipeState({
        error: '',
        loading: false,
        list: [],
      });
      return;
    }

    let cancelled = false;

    async function loadRecipes() {
      setRecipeState({
        error: '',
        loading: true,
        list: [],
      });

      try {
        const payload = await fetchRecipeList({
          ingredientKeyword: selectedCandidate.keyword,
          limit: 4,
        });
        if (cancelled) {
          return;
        }

        setRecipeState({
          error: '',
          loading: false,
          list: Array.isArray(payload?.recipeList) ? payload.recipeList : [],
        });
      } catch (error) {
        if (!cancelled) {
          setRecipeState({
            error: error?.message || '레시피를 불러오지 못했습니다.',
            loading: false,
            list: [],
          });
        }
      }
    }

    loadRecipes();
    return () => {
      cancelled = true;
    };
  }, [selectedCandidate]);

  const analysis = useMemo(
    () => buildAnalysisData(selectedCandidate?.product, trendState.rows),
    [selectedCandidate, trendState.rows]
  );

  const trendSummaryMessage = useMemo(() => {
    if (trendState.loading) {
      return '최신 시세 데이터를 불러오는 중입니다.';
    }

    if (trendState.error) {
      return trendState.error;
    }

    if (trendState.source === 'fallback') {
      return '과거 추이 데이터가 부족해 최신 1건 기준으로 표시 중입니다.';
    }

    if (trendState.source === 'trend') {
      return `최근 ${trendState.totalCount}건의 시세 데이터를 반영했습니다.`;
    }

    return '표시할 시세 데이터가 없습니다.';
  }, [trendState.error, trendState.loading, trendState.source, trendState.totalCount]);

  const suggestionList = useMemo(() => {
    return filteredCandidateList.slice(0, 8).map((candidate) => ({
      ...candidate,
      changeRateLabel: `변동 ${formatPercent(candidate.product?.priceSnapshot?.changeRate || 0)}`,
      currentPriceLabel: `현재 ${formatCurrency(candidate.product?.priceSnapshot?.avgPrice)}`,
      isSelected: candidate.optionKey === selectedCandidate?.optionKey,
      marketLabel: candidate.marketType === 'WHOLESALE' ? '도매' : '소매',
      valueLabel:
        Number(candidate.product?.priceMatch?.savingRate || 0) > 0
          ? `절약 ${formatPercent(candidate.product?.priceMatch?.savingRate || 0)}`
          : `판매가 ${formatCurrency(candidate.product?.salePrice)}`,
    }));
  }, [filteredCandidateList, selectedCandidate]);

  const selectedStats = useMemo(
    () => [
      {
        label: '현재 평균가',
        value: formatCurrency(analysis.currentPrice),
      },
      {
        label: '최근 변동률',
        value: formatPercent(selectedCandidate?.product?.priceSnapshot?.changeRate || 0),
      },
      {
        label: '절약률',
        value: formatPercent(selectedCandidate?.product?.priceMatch?.savingRate || 0),
      },
    ],
    [analysis.currentPrice, selectedCandidate]
  );

  const underAverageList = useMemo(() => {
    return [...candidateList]
      .filter((candidate) => Number(candidate.product?.priceMatch?.savingRate || 0) > 0)
      .sort(
        (left, right) =>
          Number(right.product?.priceMatch?.savingRate || 0) -
          Number(left.product?.priceMatch?.savingRate || 0)
      )
      .slice(0, 4);
  }, [candidateList]);

  const buyTimingList = useMemo(() => {
    return [...candidateList]
      .map((candidate) => ({
        ...candidate,
        timingScore: calculateBuyTimingScore(candidate.product),
      }))
      .filter((candidate) => candidate.timingScore > 0)
      .sort((left, right) => right.timingScore - left.timingScore)
      .slice(0, 4);
  }, [candidateList]);

  function selectCandidate(candidate, options = {}) {
    if (!candidate?.optionKey) {
      return;
    }

    setSelectedOptionKey(candidate.optionKey);

    if (options.scrollToChart) {
      window.requestAnimationFrame(() => {
        scrollToId('analysis-chart');
      });
    }
  }

  if (!candidateList.length) {
    return (
      <main className="price-analysis price-analysis-page">
        <div className="price-analysis__shell">
          <PriceEmptyState
            actionLabel="상품 페이지로 이동"
            icon="PR"
            subtitle="시세 분석은 실제 판매 중이고 시세 코드가 연결된 상품을 기준으로 제공합니다."
            title="분석 가능한 상품이 아직 없습니다."
            onAction={() => {
              window.location.hash = '#/products';
            }}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="price-analysis price-analysis-page">
      <div className="price-analysis__shell">
        <section className="price-hero">
          <div className="price-hero__summary">
            <div className="price-hero__summary-copy">
              <span className="price-eyebrow">LIVE ANALYSIS</span>
              <p className="price-hero__summary-label">현재 분석 대상</p>
              <h1>{selectedCandidate.label}</h1>
              <p className="price-hero__summary-meta">
                {selectedCandidate.productName} · {selectedCandidate.origin || '원산지 정보 없음'} ·{' '}
                {selectedCandidate.unitLabel}
              </p>
            </div>

            <div className="price-hero__summary-main">
              <div className="price-hero__summary-price">
                <span>현재 평균가</span>
                <strong>{formatCurrency(analysis.currentPrice)}</strong>
              </div>
              <div className="price-hero__summary-delta">
                <span>전주 대비</span>
                <strong className={`tone-${analysis.signal.tone}`}>
                  {formatPercent(analysis.weekChangeRate)}
                </strong>
              </div>
            </div>

            <div className="price-hero__actions">
              <button
                className="price-btn price-btn--primary"
                type="button"
                onClick={() => scrollToId('analysis-chart')}
              >
                차트 바로 보기
              </button>
              <button
                className="price-btn price-btn--ghost"
                type="button"
                onClick={() => scrollToId('recommendation-value')}
              >
                추천 상품 보기
              </button>
            </div>
          </div>

          <aside className={`price-hero__spotlight price-hero__spotlight--${analysis.signal.tone}`}>
            <span className="price-hero__spotlight-kicker">구매 판단 요약</span>
            <strong>{analysis.signal.title}</strong>
            <p>{analysis.signal.description}</p>
            <div className="price-hero__spotlight-stats">
              <div>
                <span>30일 평균 대비</span>
                <strong>{formatPercent(analysis.currentVsThirtyRate)}</strong>
              </div>
              <div>
                <span>판매가 비교</span>
                <strong>{formatCurrency(selectedCandidate.product?.salePrice)}</strong>
              </div>
            </div>
            <ul className="price-hero__spotlight-points">
              {analysis.heroPoints.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </aside>
        </section>

        <PriceAnalysisToolbar
          primaryActionLabel="현재 상품 상세 보기"
          query={query}
          selectedItemLabel={selectedCandidate.label}
          selectedMeta={`현재 선택 · ${buildSelectedMeta(selectedCandidate)}`}
          selectedStats={selectedStats}
          suggestions={suggestionList}
          onPrimaryAction={() => onOpenProduct?.(selectedCandidate.product?.productNo)}
          onQueryChange={setQuery}
          onSelectSuggestion={(candidate) => selectCandidate(candidate)}
        />

        <section className="price-metrics">
          {analysis.metricCards.map((metric) => (
            <PriceMetricCard key={metric.label} {...metric} />
          ))}
        </section>

        <section className="price-stage" id="analysis-chart">
          <article className="price-stage__chart-card">
            {!trendState.loading ? (
              <div className="price-stage__status">{trendSummaryMessage}</div>
            ) : null}

            {trendState.loading ? (
              <div className="price-stage__status">가격 추이를 불러오는 중입니다.</div>
            ) : trendState.error ? (
              <PriceEmptyState
                actionLabel="다시 시도"
                icon="CH"
                subtitle={trendState.error}
                title="차트 데이터를 가져오지 못했습니다."
                onAction={() => setRefreshToken((value) => value + 1)}
              />
            ) : !analysis.chartPoints.length ? (
              <PriceEmptyState
                actionLabel="다시 시도"
                icon="CH"
                subtitle="선택한 상품과 연결된 시세 이력이 아직 충분하지 않습니다."
                title="차트에 표시할 가격 데이터가 없습니다."
                onAction={() => setRefreshToken((value) => value + 1)}
              />
            ) : (
              <PriceTrendChart
                points={analysis.chartPoints}
                productLabel={selectedCandidate.label}
                title={`${selectedCandidate.label} 가격 추이`}
              />
            )}
          </article>

          <div className="price-stage__side">
            <article className={`price-signal-card price-signal-card--${analysis.signal.tone}`}>
              <span className="price-signal-card__kicker">추세 해석</span>
              <h3>{analysis.signal.title}</h3>
              <p>{analysis.signal.description}</p>
              <div className="price-signal-card__metrics">
                <div>
                  <span>전주 대비</span>
                  <strong>{formatPercent(analysis.weekChangeRate)}</strong>
                </div>
                <div>
                  <span>30일 평균 대비</span>
                  <strong>{formatPercent(analysis.currentVsThirtyRate)}</strong>
                </div>
              </div>
            </article>

            <article className="price-facts-card">
              <div className="price-facts-card__head">
                <span className="price-eyebrow">FACTS</span>
                <h3>기본 정보</h3>
              </div>
              <div className="price-facts-card__list">
                {analysis.factRows.map((item) => (
                  <div key={item.label}>
                    <dt>{item.label}</dt>
                    <dd>{item.value}</dd>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </section>

        <PriceAnalysisSection
          actionLabel="전체 상품 보기"
          actionTone="secondary"
          className="price-section--value"
          eyebrow="VALUE PICK"
          id="recommendation-value"
          subtitle="가격 메리트가 분명한 상품만 골라서 절약 포인트 중심으로 보여줍니다."
          title="평균가보다 저렴한 상품"
          onAction={() => {
            window.location.hash = '#/products';
          }}
        >
          <div className="price-product-grid">
            {underAverageList.map((candidate) => (
              <PriceProductCard
                key={candidate.optionKey}
                badgeLabel="평균가 이하"
                badgeTone="green"
                product={candidate.product}
                reasonDetail={buildUnderAverageReason(candidate.product)}
                reasonLabel="절약 포인트"
                variant="value"
                onOpen={() => onOpenProduct?.(candidate.product?.productNo)}
                onViewChart={() => selectCandidate(candidate, { scrollToChart: true })}
              />
            ))}
          </div>
        </PriceAnalysisSection>

        <PriceAnalysisSection
          className="price-section--timing"
          eyebrow="BUY TIMING"
          id="recommendation-timing"
          subtitle="시세 흐름과 최근 변동률을 바탕으로 지금 담기 좋은 상품을 제안합니다."
          title="지금 구매하기 좋은 상품"
        >
          <div className="price-product-grid">
            {buyTimingList.map((candidate) => (
              <PriceProductCard
                key={candidate.optionKey}
                badgeLabel="구매 추천"
                badgeTone="amber"
                product={candidate.product}
                reasonDetail={buildBuyTimingReason(candidate.product, candidate.timingScore)}
                reasonLabel="추천 사유"
                variant="timing"
                onOpen={() => onOpenProduct?.(candidate.product?.productNo)}
                onViewChart={() => selectCandidate(candidate, { scrollToChart: true })}
              />
            ))}
          </div>
        </PriceAnalysisSection>

        <PriceAnalysisSection
          actionLabel="레시피 더 보기"
          actionTone="ghost"
          className="price-section--recipe"
          eyebrow="RECIPE IDEA"
          subtitle={`${selectedCandidate.keyword}를 실제로 소비할 수 있는 레시피를 함께 확인해보세요.`}
          title="함께 보면 좋은 레시피"
          onAction={() => {
            window.location.hash = '#/recipes';
          }}
        >
          {recipeState.loading ? (
            <div className="price-stage__status">연결 레시피를 불러오는 중입니다.</div>
          ) : recipeState.list.length ? (
            <div className="price-recipe-grid">
              {recipeState.list.map((recipe) => (
                <article className="price-recipe-card" key={recipe.recipeNo}>
                  <div className="price-recipe-card__media">
                    {recipe.imageUrl ? <img alt={recipe.recipeName} src={recipe.imageUrl} /> : <span>RECIPE</span>}
                  </div>
                  <div className="price-recipe-card__body">
                    <span className="price-recipe-card__eyebrow">
                      {selectedCandidate.keyword} 활용 아이디어
                    </span>
                    <h3>{recipe.recipeName}</h3>
                    <span className="price-recipe-card__linkage">
                      지금 보고 있는 품목과 바로 연결되는 레시피입니다.
                    </span>
                    <p>{summarizeText(recipe.description)}</p>
                    <button
                      className="price-btn price-btn--ghost"
                      type="button"
                      onClick={() => onOpenRecipe?.(recipe.recipeNo)}
                    >
                      레시피 보기
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <PriceEmptyState
              actionLabel="다른 품목 보기"
              icon="RC"
              secondaryActionLabel="인기 레시피 보기"
              subtitle={
                recipeState.error ||
                '선택한 품목으로 연결된 레시피가 아직 충분하지 않습니다.'
              }
              title="추천할 레시피가 아직 없습니다."
              onAction={() => setQuery('')}
              onSecondaryAction={() => {
                window.location.hash = '#/recipes';
              }}
            />
          )}
        </PriceAnalysisSection>
      </div>
    </main>
  );
}

function buildProductCandidates(products) {
  return products
    .filter(
      (product) => product?.saleStatus === 'SELLING' && product?.priceSnapshot?.itemCode
    )
    .map((product) => {
      const snapshot = product.priceSnapshot || {};
      return {
        itemCode: snapshot.itemCode,
        itemName: snapshot.itemName || product.productName,
        keyword: sanitizeKeyword(snapshot.itemName || product.productName),
        label: snapshot.itemName || product.productName,
        marketType: snapshot.marketType || 'RETAIL',
        optionKey: `${product.productNo}:${snapshot.itemCode}`,
        origin: product.origin || '',
        product,
        productName: product.productName,
        unitLabel: formatUnit(product.packageWeight, product.unit),
      };
    })
    .sort(
      (left, right) =>
        Number(right.product?.priceMatch?.savingRate || 0) -
        Number(left.product?.priceMatch?.savingRate || 0)
    );
}

function normalizeTrendRows(rows) {
  return [...rows]
    .map((row) => ({
      avgPrice: Number(row?.avgPrice || 0),
      snapshotDate: row?.snapshotDate,
    }))
    .filter((row) => row.snapshotDate && Number.isFinite(row.avgPrice))
    .sort((left, right) => new Date(left.snapshotDate) - new Date(right.snapshotDate));
}

function buildFallbackTrendRows(product) {
  const avgPrice = Number(product?.priceSnapshot?.avgPrice || 0);
  const snapshotDate = product?.priceSnapshot?.snapshotDate;

  if (!snapshotDate || !Number.isFinite(avgPrice) || avgPrice <= 0) {
    return [];
  }

  return [
    {
      avgPrice,
      snapshotDate,
    },
  ];
}

function buildAnalysisData(product, trendRows) {
  const safeTrendRows = trendRows.length ? trendRows : buildFallbackTrendRows(product);
  const dailyPoints = safeTrendRows.map((row) => ({
    date: row.snapshotDate,
    label: formatDateLabel(row.snapshotDate),
    value: Number(row.avgPrice || 0),
  }));
  const pointValues = dailyPoints.map((point) => point.value);
  const ma7Values = movingAverage(pointValues, 7);
  const ma30Values = movingAverage(pointValues, 30);
  const currentPrice = lastNumber(pointValues);
  const previousDayPrice =
    pointValues.length > 1 ? pointValues[pointValues.length - 2] : currentPrice;
  const previousWeekPrice =
    pointValues.length > 7 ? pointValues[pointValues.length - 8] : previousDayPrice;
  const currentMa7 = lastNumber(ma7Values) || currentPrice;
  const currentMa30 = lastNumber(ma30Values) || currentPrice;
  const dailyChangeRate = calculateRate(currentPrice, previousDayPrice);
  const weekChangeRate = calculateRate(currentPrice, previousWeekPrice);
  const currentVsThirtyRate = calculateRate(currentPrice, currentMa30);
  const signal = buildSignal(currentPrice, currentMa7, currentMa30, weekChangeRate);

  return {
    chartPoints: dailyPoints,
    currentPrice,
    currentVsThirtyRate,
    factRows: [
      { label: '상품명', value: product?.productName || '-' },
      { label: '산지', value: product?.origin || '-' },
      { label: '판매 단위', value: formatUnit(product?.packageWeight, product?.unit) },
      {
        label: '최근 기준일',
        value: dailyPoints.length ? dailyPoints[dailyPoints.length - 1].label : '-',
      },
    ],
    heroPoints: [
      `7일 평균 ${formatCurrency(currentMa7)} / 30일 평균 ${formatCurrency(currentMa30)}`,
      `전주 대비 ${formatPercent(weekChangeRate)} 변동`,
      `${signal.title} 신호를 기준으로 구매 타이밍을 정리했습니다.`,
    ],
    metricCards: [
      {
        featured: true,
        hint: '시장 기준 최신 평균가',
        label: '현재 평균가',
        tone: 'green',
        value: formatCurrency(currentPrice),
      },
      {
        delta: `${formatPercent(calculateRate(currentMa7, currentMa30))} vs 30일`,
        label: '7일 평균',
        tone: 'slate',
        value: formatCurrency(currentMa7),
      },
      {
        delta: `${formatPercent(weekChangeRate)} 전주 대비`,
        label: '변동률',
        tone: signal.tone,
        value: formatPercent(dailyChangeRate),
      },
      {
        delta: `${formatPercent(currentVsThirtyRate)} 기준선 대비`,
        label: '구매 신호',
        tone: signal.tone,
        value: signal.badge,
      },
    ],
    signal,
    weekChangeRate,
  };
}

function buildSignal(currentPrice, currentMa7, currentMa30, changeRate) {
  if (currentPrice <= currentMa30 && changeRate <= 0) {
    return {
      badge: '하락 가능성',
      description:
        '현재 가격이 30일 평균보다 낮고 최근 구간도 약세라서 구매 타이밍으로 보기 좋습니다.',
      title: '구매 적기 신호',
      tone: 'green',
    };
  }

  if (currentPrice >= currentMa30 && changeRate > 0) {
    return {
      badge: '상승 가능성',
      description:
        '현재 가격이 기준선 위에 있고 최근 구간도 상승세라 추가 상승 가능성을 주의해서 봐야 합니다.',
      title: '상승 경계 신호',
      tone: 'amber',
    };
  }

  return {
    badge: '보합 흐름',
    description:
      '가격이 기준선 부근에서 움직이고 있어 재고와 체감 가격을 함께 보는 것이 좋습니다.',
    title: '관망 신호',
    tone: 'slate',
  };
}

function buildSelectedMeta(candidate) {
  return `${candidate.productName} · ${candidate.origin || '원산지 정보 없음'} · ${candidate.unitLabel}`;
}

function buildUnderAverageReason(product) {
  return `평균가 대비 ${Math.round(
    Number(product?.priceMatch?.savingRate || 0)
  )}% 저렴 · 시장 평균 ${formatCurrency(product?.priceSnapshot?.avgPrice)}`;
}

function buildBuyTimingReason(product, score) {
  const changeRate = Number(product?.priceSnapshot?.changeRate || 0);
  return `최근 변동률 ${formatPercent(changeRate)} · 구매 추천 점수 ${Math.round(score)}점`;
}

function calculateBuyTimingScore(product) {
  const savingRate = Number(product?.priceMatch?.savingRate || 0);
  const changeRate = Number(product?.priceSnapshot?.changeRate || 0);
  const seasonalBonus = product?.isSeasonal === 'Y' ? 4 : 0;
  return Math.max(savingRate / 4 + seasonalBonus - Math.max(changeRate, 0), 0);
}

function movingAverage(values, windowSize) {
  return values.map((_, index) => {
    const startIndex = Math.max(0, index - windowSize + 1);
    const slice = values.slice(startIndex, index + 1);
    return Math.round(slice.reduce((sum, value) => sum + value, 0) / slice.length);
  });
}

function lastNumber(values) {
  return values.length ? Number(values[values.length - 1] || 0) : 0;
}

function calculateRate(currentValue, previousValue) {
  const currentNumber = Number(currentValue || 0);
  const previousNumber = Number(previousValue || 0);
  if (!previousNumber) {
    return 0;
  }
  return ((currentNumber - previousNumber) / previousNumber) * 100;
}

function formatCurrency(value) {
  return `${Math.round(Number(value || 0)).toLocaleString('ko-KR')}원`;
}

function formatPercent(value) {
  const numericValue = Number(value || 0);
  const prefix = numericValue > 0 ? '+' : '';
  return `${prefix}${numericValue.toFixed(1)}%`;
}

function formatUnit(packageWeight, unit) {
  return packageWeight && unit ? `${Number(packageWeight)}${unit}` : unit || '-';
}

function formatDateLabel(value) {
  const date = new Date(value);
  return `${date.getMonth() + 1}.${date.getDate()}`;
}

function sanitizeKeyword(value) {
  return String(value || '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\[[^\]]*]/g, '')
    .trim()
    .split(/\s+/)[0];
}

function summarizeText(value) {
  const normalizedValue = String(value || '').replace(/\s+/g, ' ').trim();
  if (!normalizedValue) {
    return '재료 조합과 조리 흐름을 함께 확인해보세요.';
  }
  return normalizedValue.length > 88 ? `${normalizedValue.slice(0, 88)}...` : normalizedValue;
}

function scrollToId(id) {
  const target = document.getElementById(id);
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
