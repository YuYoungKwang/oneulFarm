import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import '../styles/priceAnalysis.css';
import { fetchPriceTrendFromApi } from '../api/priceAnalysisApi';
import { fetchRecipeList } from './recipeApi';
import BestBuyProductsSection from './price/BestBuyProductsSection';
import PriceEmptyState from './price/PriceEmptyState';
import PriceInsightSection from './price/PriceInsightSection';
import RecipeRecommendationSection from './price/RecipeRecommendationSection';
import SimilarProductsSection from './price/SimilarProductsSection';

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

    if (!candidateList.some((candidate) => candidate.optionKey === selectedOptionKey)) {
      setSelectedOptionKey(candidateList[0].optionKey);
    }
  }, [candidateList, selectedOptionKey]);

  const filteredCandidateList = useMemo(() => {
    const normalizedQuery = compactText(deferredQuery);
    if (!normalizedQuery) {
      return candidateList;
    }

    return candidateList.filter((candidate) =>
      compactText(
        [
          candidate.displayName,
          candidate.productName,
          candidate.origin,
          candidate.itemName,
          candidate.categoryName,
        ].join(' ')
      ).includes(normalizedQuery)
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
    const abortController =
      typeof AbortController !== 'undefined' ? new AbortController() : null;

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
          signal: abortController?.signal,
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
        if (cancelled) {
          return;
        }

        setTrendState({
          error: error?.message || '시세 추이를 불러오지 못했습니다.',
          loading: false,
          rows: [],
          source: 'empty',
          totalCount: 0,
        });
      }
    }

    loadTrend();

    return () => {
      cancelled = true;
      abortController?.abort();
    };
  }, [refreshToken, selectedCandidate]);

  useEffect(() => {
    if (!selectedCandidate?.recipeKeyword) {
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
          ingredientKeyword: selectedCandidate.recipeKeyword,
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
        if (cancelled) {
          return;
        }

        setRecipeState({
          error: error?.message || '추천 레시피를 불러오지 못했습니다.',
          loading: false,
          list: [],
        });
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

  const rankingList = useMemo(() => {
    return filteredCandidateList
      .slice()
      .sort((left, right) => {
        const leftSaving = toNumber(left.product?.priceMatch?.savingRate, 0);
        const rightSaving = toNumber(right.product?.priceMatch?.savingRate, 0);
        if (rightSaving !== leftSaving) {
          return rightSaving - leftSaving;
        }

        const leftGap = toNumber(left.product?.priceMatch?.priceGap, 0);
        const rightGap = toNumber(right.product?.priceMatch?.priceGap, 0);
        return rightGap - leftGap;
      })
      .slice(0, 8)
      .map((candidate, index) => ({
        ...candidate,
        currentPriceLabel: formatCurrency(
          candidate.product?.priceMatch?.comparedPrice ||
            candidate.product?.priceSnapshot?.avgPrice
        ),
        changeRateLabel: formatPercent(candidate.product?.priceSnapshot?.changeRate || 0),
        savingRateLabel: formatPercent(candidate.product?.priceMatch?.savingRate || 0),
        isSelected: candidate.optionKey === selectedCandidate?.optionKey,
        rank: index + 1,
      }));
  }, [filteredCandidateList, selectedCandidate]);

  const similarProducts = useMemo(
    () => buildSimilarCandidates(selectedCandidate, candidateList),
    [candidateList, selectedCandidate]
  );

  const bestBuyProducts = useMemo(
    () => buildBestBuyCandidates(candidateList, selectedCandidate),
    [candidateList, selectedCandidate]
  );

  const insightSubtitle = useMemo(() => {
    if (trendState.loading) {
      return '최근 시세 흐름을 불러오는 중입니다.';
    }

    if (trendState.error) {
      return trendState.error;
    }

    if (trendState.source === 'fallback') {
      return '과거 추이가 부족해 최신 스냅샷 기준으로 요약하고 있습니다.';
    }

    if (trendState.source === 'trend') {
      return `최근 ${trendState.totalCount}건의 시세 데이터를 바탕으로 판단 근거를 정리했습니다.`;
    }

    return '표시할 시세 추이 데이터가 없습니다.';
  }, [trendState.error, trendState.loading, trendState.source, trendState.totalCount]);

  function handleSelectCandidate(candidate) {
    if (!candidate?.optionKey) {
      return;
    }

    setSelectedOptionKey(candidate.optionKey);
  }

  function openAllProducts() {
    if (typeof window !== 'undefined') {
      window.location.hash = '#/products';
    }
  }

  function openAllRecipes() {
    if (typeof window !== 'undefined') {
      window.location.hash = '#/recipes';
    }
  }

  if (!candidateList.length) {
    return (
      <main className="price-analysis-page">
        <div className="price-analysis__shell">
          <PriceEmptyState
            actionLabel="상품 보러가기"
            icon="PR"
            subtitle="판매 중이면서 시세 코드가 연결된 상품이 있어야 가격 분석을 시작할 수 있습니다."
            title="지금 분석 가능한 상품이 아직 없습니다."
            onAction={openAllProducts}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="price-analysis-page">
      <div className="price-analysis__shell">
        <PriceInsightSection
          chartPoints={analysis.chartPoints}
          compareCards={analysis.compareCards}
          currentPrice={analysis.currentPrice}
          dailyChangeRate={analysis.dailyChangeRate}
          error={trendState.error}
          loading={trendState.loading}
          productMeta={buildSelectedMeta(selectedCandidate)}
          productName={selectedCandidate?.displayName}
          query={query}
          rankingList={rankingList}
          recentTrendSummary={analysis.recentTrendSummary}
          status={analysis.status}
          subtitle={insightSubtitle}
          title={`${selectedCandidate?.displayName || '선택 상품'} 오늘의 가격 판단`}
          weeklySummary={analysis.weeklySummary}
          onOpenProduct={() => onOpenProduct?.(selectedCandidate?.product?.productNo)}
          onQueryChange={setQuery}
          onRetry={() => setRefreshToken((value) => value + 1)}
          onSelectRanking={handleSelectCandidate}
        />

        <SimilarProductsSection
          className="price-section--compact"
          items={similarProducts}
          onCompare={handleSelectCandidate}
          onOpenAll={openAllProducts}
        />

        <BestBuyProductsSection
          className="price-section--compact"
          items={bestBuyProducts}
          onOpenAll={openAllProducts}
          onOpenProduct={(productNo) => onOpenProduct?.(productNo)}
        />

        <RecipeRecommendationSection
          className="price-section--compact"
          error={recipeState.error}
          items={recipeState.list}
          keyword={selectedCandidate?.recipeKeyword}
          loading={recipeState.loading}
          onOpenAll={openAllRecipes}
          onOpenRecipe={(recipeNo) => onOpenRecipe?.(recipeNo)}
          onReset={() => setQuery('')}
        />
      </div>
    </main>
  );
}

function buildProductCandidates(products) {
  const candidateMap = new Map();

  products
    .filter(
      (product) => product?.saleStatus === 'SELLING' && product?.priceSnapshot?.itemCode
    )
    .forEach((product) => {
      const snapshot = product.priceSnapshot || {};
      const optionKey = `${product.productNo}:${snapshot.itemCode}`;

      if (candidateMap.has(optionKey)) {
        return;
      }

      const primaryName = extractPrimaryKeyword(snapshot.itemName || product.productName || '');

      candidateMap.set(optionKey, {
        categoryName: product?.categoryName || '',
        displayName: primaryName || sanitizeKeyword(product.productName) || '분석 상품',
        focusScore: calculateFocusScore(product),
        itemCode: snapshot.itemCode,
        itemName: snapshot.itemName || product.productName || '',
        marketType: snapshot.marketType || 'RETAIL',
        optionKey,
        origin: product.origin || '',
        product,
        productName: product.productName || primaryName,
        recipeKeyword: primaryName,
        unitLabel: formatUnit(product.packageWeight, product.unit),
      });
    });

  return [...candidateMap.values()].sort((left, right) => right.focusScore - left.focusScore);
}

function normalizeTrendRows(rows) {
  return [...rows]
    .map((row) => ({
      avgPrice: toNumber(row?.avgPrice, 0),
      snapshotDate: row?.snapshotDate,
    }))
    .filter((row) => row.snapshotDate && Number.isFinite(row.avgPrice))
    .sort((left, right) => new Date(left.snapshotDate) - new Date(right.snapshotDate));
}

function buildFallbackTrendRows(product) {
  const snapshotDate = product?.priceSnapshot?.snapshotDate;
  const avgPrice = toNumber(
    product?.priceMatch?.comparedPrice || product?.priceSnapshot?.avgPrice,
    0
  );

  if (!snapshotDate || avgPrice <= 0) {
    return [];
  }

  return [{ avgPrice, snapshotDate }];
}

function buildAnalysisData(product, trendRows) {
  const conversionRatio = resolveComparablePriceRatio(product);
  const fallbackRows = buildFallbackTrendRows(product);
  const safeRows = trendRows.length ? trendRows : fallbackRows;
  const chartPoints = safeRows.map((row) => ({
    date: row.snapshotDate,
    label: formatInsightDate(row.snapshotDate),
    value: toNumber(row.avgPrice, 0) * conversionRatio,
  }));
  const values = chartPoints.map((point) => point.value);
  const currentPrice =
    lastNumber(values) ||
    toNumber(product?.priceMatch?.comparedPrice || product?.priceSnapshot?.avgPrice, 0);
  const previousPrice = values.length > 1 ? values[values.length - 2] : currentPrice;
  const previousWeekPrice = values.length > 7 ? values[values.length - 8] : previousPrice;
  const ma7Values = movingAverage(values, 7);
  const ma30Values = movingAverage(values, 30);
  const currentMa7 = lastNumber(ma7Values) || currentPrice;
  const currentMa30 = lastNumber(ma30Values) || currentPrice;
  const dailyChangeRate = calculateRate(currentPrice, previousPrice);
  const weeklyChangeRate = calculateRate(currentPrice, previousWeekPrice);
  const currentVsThirtyRate = calculateRate(currentPrice, currentMa30);
  const highestPrice = values.length ? Math.max(...values) : currentPrice;
  const lowestPrice = values.length ? Math.min(...values) : currentPrice;
  const salePrice = toNumber(product?.salePrice, 0);
  const savingRate = toNumber(product?.priceMatch?.savingRate, 0);
  const savingGap = toNumber(product?.priceMatch?.priceGap, 0);
  const status = buildMarketStatus({
    currentPrice,
    currentVsThirtyRate,
    dailyChangeRate,
    salePrice,
    savingGap,
    savingRate,
    weeklyChangeRate,
  });

  return {
    chartPoints,
    compareCards: [
      {
        label: '30일 평균 대비',
        value: formatPercent(currentVsThirtyRate),
        caption: currentVsThirtyRate <= 0 ? '평균보다 낮은 구간' : '평균보다 높은 구간',
      },
      {
        label: '최근 7일 평균',
        value: formatCurrency(currentMa7),
        caption: '단기 흐름 기준선',
      },
      {
        label: '최근 범위',
        value: `${formatCurrency(lowestPrice)} - ${formatCurrency(highestPrice)}`,
        caption: '최근 관찰 구간',
      },
    ],
    currentPrice,
    dailyChangeRate,
    recentTrendSummary: buildRecentTrendSummary(dailyChangeRate, weeklyChangeRate),
    status,
    weeklySummary: `최근 7일 평균은 ${formatCurrency(currentMa7)}이고, 전주 대비 ${formatPercent(
      weeklyChangeRate
    )} 움직였습니다.`,
  };
}

function buildMarketStatus({
  currentPrice,
  currentVsThirtyRate,
  dailyChangeRate,
  salePrice,
  savingGap,
  savingRate,
  weeklyChangeRate,
}) {
  if ((currentVsThirtyRate <= -3 || savingRate >= 5) && weeklyChangeRate <= 1) {
    return {
      badge: '구매 적기',
      description:
        '평균선보다 낮은 가격에 머물고 있고 급격한 반등 신호가 약해, 오늘 비교 구매를 시작하기 좋은 구간입니다.',
      shortReason: '평균선 아래에서 가격 메리트가 유지되고 있는',
      tone: 'best',
    };
  }

  if (currentVsThirtyRate >= 3 && weeklyChangeRate >= 2) {
    return {
      badge: '상승 경계',
      description:
        '가격이 평균선 위로 올라와 있고 최근 흐름도 강한 편이라, 급하게 사기보다 대체재와 함께 비교하는 편이 좋습니다.',
      shortReason: '평균선 위에서 상승 압력이 느껴지는',
      tone: 'warning',
    };
  }

  if (Math.abs(currentVsThirtyRate) <= 2 && Math.abs(weeklyChangeRate) <= 2) {
    return {
      badge: '안정 구간',
      description:
        '평균선 근처에서 큰 흔들림 없이 움직이고 있어, 다른 품목과 함께 비교 판단하기 좋은 상태입니다.',
      shortReason: '평균선 근처에서 비교적 안정적으로 움직이는',
      tone: 'stable',
    };
  }

  return {
    badge: '관찰 필요',
    description:
      '방향성은 있지만 확신이 필요한 구간입니다. 차트와 대체재를 함께 보면서 오늘의 우선순위를 정하는 편이 좋습니다.',
    shortReason: '추세와 가격 메리트를 함께 봐야 하는',
    tone: 'watch',
  };
}

function buildSelectedMeta(candidate) {
  if (!candidate) {
    return '';
  }

  return [candidate.origin || '원산지 정보 없음', candidate.unitLabel]
    .filter(Boolean)
    .join(' · ');
}

function buildSimilarCandidates(selectedCandidate, candidateList) {
  if (!selectedCandidate) {
    return [];
  }

  return candidateList
    .filter((candidate) => candidate.optionKey !== selectedCandidate.optionKey)
    .map((candidate) => ({
      ...candidate,
      reason: buildSimilarityReason(selectedCandidate, candidate),
      similarityScore: calculateSimilarityScore(selectedCandidate, candidate),
    }))
    .filter((candidate) => candidate.similarityScore >= 25)
    .sort((left, right) => right.similarityScore - left.similarityScore)
    .slice(0, 4);
}

function buildBestBuyCandidates(candidateList, selectedCandidate) {
  return candidateList
    .filter((candidate) => candidate.optionKey !== selectedCandidate?.optionKey)
    .map((candidate) => ({
      ...candidate,
      bestBuyScore: calculateBestBuyScore(candidate.product),
      reason: buildBestBuyReason(candidate.product),
      reasonLabel:
        toNumber(candidate.product?.priceMatch?.savingRate, 0) > 0
          ? '가격 메리트'
          : '타이밍 후보',
    }))
    .filter((candidate) => candidate.bestBuyScore > 0)
    .sort((left, right) => right.bestBuyScore - left.bestBuyScore)
    .slice(0, 4);
}

function calculateFocusScore(product) {
  const savingRate = toNumber(product?.priceMatch?.savingRate, 0);
  const changeRate = toNumber(product?.priceSnapshot?.changeRate, 0);
  const seasonalBonus = product?.isSeasonal === 'Y' ? 4 : 0;

  return savingRate * 2 + Math.max(changeRate, 0) * 0.6 + seasonalBonus;
}

function calculateSimilarityScore(selectedCandidate, candidate) {
  const selectedProduct = selectedCandidate.product || {};
  const candidateProduct = candidate.product || {};
  let score = 0;

  if (selectedProduct.categoryName && selectedProduct.categoryName === candidateProduct.categoryName) {
    score += 35;
  }

  if (selectedProduct.unit && selectedProduct.unit === candidateProduct.unit) {
    score += 20;
  }

  if (
    selectedProduct.packageWeight &&
    candidateProduct.packageWeight &&
    Math.abs(toNumber(selectedProduct.packageWeight, 0) - toNumber(candidateProduct.packageWeight, 0)) <=
      0.5
  ) {
    score += 15;
  }

  const selectedPrice = toNumber(selectedProduct?.priceSnapshot?.avgPrice, 0);
  const candidatePrice = toNumber(candidateProduct?.priceSnapshot?.avgPrice, 0);
  if (selectedPrice > 0 && candidatePrice > 0) {
    const gapRate = Math.abs(selectedPrice - candidatePrice) / selectedPrice;
    if (gapRate <= 0.15) {
      score += 20;
    } else if (gapRate <= 0.3) {
      score += 10;
    }
  }

  return score;
}

function buildSimilarityReason(selectedCandidate, candidate) {
  const reasons = [];

  if (selectedCandidate.product?.categoryName === candidate.product?.categoryName) {
    reasons.push('같은 카테고리');
  }

  if (selectedCandidate.product?.unit === candidate.product?.unit) {
    reasons.push('판매 단위 유사');
  }

  if (!reasons.length) {
    reasons.push('대체 비교 가능');
  }

  return `${reasons.join(' · ')} 흐름이라 함께 비교해보기 좋습니다.`;
}

function calculateBestBuyScore(product) {
  const savingRate = toNumber(product?.priceMatch?.savingRate, 0);
  const changeRate = toNumber(product?.priceSnapshot?.changeRate, 0);
  const priceGap = toNumber(product?.priceMatch?.priceGap, 0);

  return savingRate * 2 + Math.max(-changeRate, 0) * 1.5 + priceGap / 300;
}

function buildBestBuyReason(product) {
  const savingRate = toNumber(product?.priceMatch?.savingRate, 0);
  const changeRate = toNumber(product?.priceSnapshot?.changeRate, 0);

  if (savingRate > 0 && changeRate <= 0) {
    return `평균가보다 ${Math.round(savingRate)}% 낮고 최근 흐름도 진정돼 있어 바로 비교 구매하기 좋습니다.`;
  }

  if (savingRate > 0) {
    return `현재가가 평균가보다 ${Math.round(savingRate)}% 낮아 가격 메리트가 뚜렷합니다.`;
  }

  return `최근 변동률 ${formatPercent(changeRate)} 기준으로 지금 타이밍을 지켜볼 가치가 있습니다.`;
}

function extractPrimaryKeyword(value) {
  const cleanedValue = sanitizeKeyword(value)
    .replace(/[|,]/g, ' ')
    .trim();

  if (!cleanedValue) {
    return '';
  }

  const firstSegment = cleanedValue.split('/')[0].trim();
  const firstToken = firstSegment.split(/\s+/).filter(Boolean)[0];
  return firstToken || firstSegment;
}

function resolveComparablePriceRatio(product) {
  const comparedPrice = toNumber(product?.priceMatch?.comparedPrice, 0);
  const snapshotAveragePrice = toNumber(product?.priceSnapshot?.avgPrice, 0);

  if (comparedPrice > 0 && snapshotAveragePrice > 0) {
    return comparedPrice / snapshotAveragePrice;
  }

  return 1;
}

function buildRecentTrendSummary(dailyChangeRate, weeklyChangeRate) {
  if (weeklyChangeRate >= 3) {
    return `최근 일주일 기준 ${formatPercent(weeklyChangeRate)} 상승 흐름입니다.`;
  }

  if (weeklyChangeRate <= -3) {
    return `최근 일주일 기준 ${formatPercent(weeklyChangeRate)} 하락 흐름입니다.`;
  }

  if (dailyChangeRate > 0) {
    return '오늘은 단기 반등 신호가 보입니다.';
  }

  if (dailyChangeRate < 0) {
    return '오늘은 가격이 조금 눌린 상태입니다.';
  }

  return '최근 흐름은 비교적 안정적입니다.';
}

function movingAverage(values, windowSize) {
  if (!values.length) {
    return [];
  }

  return values.map((_, index) => {
    const startIndex = Math.max(0, index - windowSize + 1);
    const slice = values.slice(startIndex, index + 1);
    return slice.reduce((sum, value) => sum + value, 0) / slice.length;
  });
}

function calculateRate(currentValue, previousValue) {
  const currentNumber = toNumber(currentValue, 0);
  const previousNumber = toNumber(previousValue, 0);

  if (!previousNumber) {
    return 0;
  }

  return ((currentNumber - previousNumber) / previousNumber) * 100;
}

function lastNumber(values) {
  return values.length ? toNumber(values[values.length - 1], 0) : 0;
}

function formatCurrency(value) {
  return `${Math.round(toNumber(value, 0)).toLocaleString('ko-KR')}원`;
}

function formatPercent(value) {
  const numericValue = toNumber(value, 0);
  const prefix = numericValue > 0 ? '+' : '';
  return `${prefix}${numericValue.toFixed(1)}%`;
}

function formatUnit(packageWeight, unit) {
  if (packageWeight && unit) {
    return `${packageWeight}${unit}`;
  }
  return unit || '-';
}

function formatInsightDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return `${date.getMonth() + 1}.${date.getDate()}`;
}

function sanitizeKeyword(value) {
  return String(value || '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function compactText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .trim();
}

function toNumber(value, fallbackValue = 0) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallbackValue;
}
