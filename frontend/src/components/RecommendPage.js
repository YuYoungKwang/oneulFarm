import { useEffect, useState } from 'react';
import { isAuthenticated } from '../auth';
import { fetchProductsFromApi } from '../api/productApi';
import {
  fetchDashboardPatternsFromApi,
  fetchDashboardProductSavingsFromApi,
  fetchPopularSearchesFromApi,
  fetchPriceTrendFromApi,
} from '../api/recommendApi';
import '../styles/recommend.css';
import { formatCurrency, formatPercent, getSavingAmount } from './productUiUtils';
import { fetchRecipeDetail, fetchRecipeList } from './recipeApi';
import RecommendHighlightCard from './recommend/RecommendHighlightCard';
import RecommendInsightCard from './recommend/RecommendInsightCard';
import RecommendProductCard from './recommend/RecommendProductCard';
import RecommendRecipeCard from './recommend/RecommendRecipeCard';
import RecommendSearchSignalCard from './recommend/RecommendSearchSignalCard';
import RecommendSection from './recommend/RecommendSection';

const EMPTY_PATTERNS = {
  averagePurchaseUnitPrice: 0,
  averageSavingRate: 0,
  recentPurchasedProducts: [],
  topPurchasedProducts: [],
};

export default function RecommendPage({ authUser }) {
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [recommendData, setRecommendData] = useState(() => buildEmptyRecommendData());

  useEffect(() => {
    let cancelled = false;

    async function loadRecommendPage() {
      setLoading(true);
      setErrorMessage('');

      try {
        const isLoggedIn = isAuthenticated(authUser);
        const [productList, recipePayload, patterns, productSavings] = await Promise.all([
          fetchProductsFromApi(),
          fetchRecipeList({ limit: 18, sort: 'RECOMMENDED' }),
          isLoggedIn
            ? fetchDashboardPatternsFromApi(authUser).catch(() => EMPTY_PATTERNS)
            : Promise.resolve(EMPTY_PATTERNS),
          isLoggedIn
            ? fetchDashboardProductSavingsFromApi(authUser).catch(() => [])
            : Promise.resolve([]),
        ]);

        const safeProductList = Array.isArray(productList) ? productList : [];
        const safeRecipeList = Array.isArray(recipePayload?.recipeList)
          ? recipePayload.recipeList
          : [];
        const safeProductSavings = Array.isArray(productSavings) ? productSavings : [];
        const interestProductList = buildInterestProductList(
          safeProductList,
          patterns,
          safeProductSavings
        );
        const popularKeywordCandidates = buildPopularKeywordCandidates(interestProductList);

        let popularSearchData = null;
        let popularSearchError = '';

        if (popularKeywordCandidates.length) {
          try {
            popularSearchData = await fetchPopularSearchesFromApi({
              keywords: popularKeywordCandidates,
              timeUnit: 'date',
            });
          } catch (error) {
            popularSearchError =
              error.message || '네이버 데이터랩 인기 검색 정보를 가져오지 못했습니다.';
          }
        }

        const popularSearchList = Array.isArray(popularSearchData?.popularSearchList)
          ? popularSearchData.popularSearchList
          : [];
        const trendProductList = selectTrendProductList(safeProductList, interestProductList);
        const trendInsightMap = await loadTrendInsightMap(trendProductList);

        const underAverageProductList = buildUnderAverageProductList(
          safeProductList,
          patterns,
          trendInsightMap
        );
        const buyNowProductList = buildBuyNowProductList(
          safeProductList,
          interestProductList,
          trendInsightMap
        );
        const popularProductList = buildPopularProductList(
          safeProductList,
          popularSearchList,
          interestProductList
        );
        const seasonalProductList = buildSeasonalProductList(safeProductList, popularSearchList);
        const recipeRecommendationList = await loadRecipeRecommendationList(
          safeRecipeList,
          popularSearchList,
          popularKeywordCandidates,
          popularProductList
        );
        const searchSignalList = buildSearchSignalList(popularSearchList);
        const highlightList = buildHighlightList({
          buyNowProductList,
          patterns,
          popularProductList,
          recipeRecommendationList,
          underAverageProductList,
        });
        const insightCardList = buildInsightCardList({
          isLoggedIn,
          patterns,
          popularKeywordCandidates,
          popularSearchList,
          productSavings: safeProductSavings,
        });

        if (!cancelled) {
          setRecommendData({
            buyNowProductList,
            highlightList,
            insightCardList,
            patterns,
            personalizedMessage: buildPersonalizedMessage(
              patterns,
              safeProductSavings,
              isLoggedIn
            ),
            popularProductList,
            popularSearchError,
            popularSearchList,
            popularSearchScopeLabel: popularKeywordCandidates.join(', '),
            productSavings: safeProductSavings,
            recipeRecommendationList,
            searchSignalList,
            seasonalProductList,
            underAverageProductList,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error.message || '추천 데이터를 불러오지 못했습니다.');
          setRecommendData(buildEmptyRecommendData());
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadRecommendPage();

    return () => {
      cancelled = true;
    };
  }, [authUser]);

  if (loading) {
    return (
      <div className="recommend-page page-shell">
        <main className="container">
          <section className="recommend-state-card">
            <strong>추천 페이지를 준비하고 있습니다.</strong>
            <p>시세, 레시피, 구매 패턴, 검색 데이터를 모아 지금 볼 만한 상품을 계산 중입니다.</p>
          </section>
        </main>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="recommend-page page-shell">
        <main className="container">
          <section className="recommend-state-card is-error">
            <strong>추천 데이터를 불러오지 못했습니다.</strong>
            <p>{errorMessage}</p>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="recommend-page page-shell">
      <main className="container">
        <section className="recommend-hero">
          <div className="recommend-hero__copy">
            <span className="recommend-hero__eyebrow">RECOMMEND / MARKET INSIGHT</span>
            <h1>시세와 레시피, 구매 흐름을 한 번에 보는 추천 페이지</h1>
            <p>
              평균가보다 저렴한 상품, 지금 사기 좋은 상품, 인기 검색 농산물, 제철 추천,
              그리고 인기 농산물을 활용한 레시피까지 한 화면에서 확인할 수 있습니다.
            </p>

            <div className="recommend-hero__actions">
              <button type="button" onClick={() => scrollToSection('under-average')}>
                평균가 이하 상품 보기
              </button>
              <button type="button" onClick={() => scrollToSection('buy-now')}>
                지금 구매 추천 보기
              </button>
              <button type="button" onClick={() => scrollToSection('popular-search')}>
                인기 검색 보기
              </button>
            </div>
          </div>

          <aside className="recommend-hero__panel">
            <strong>이번 추천에 반영한 데이터</strong>
            <ul>
              <li>최신 시세와 평균가 비교</li>
              <li>최근 30일 가격 추이 분석</li>
              <li>사용자 구매 패턴과 절약 기록</li>
              <li>네이버 데이터랩 인기 검색 흐름</li>
              <li>레시피 재료와 수량 정보</li>
            </ul>
            <p>{recommendData.personalizedMessage}</p>
          </aside>
        </section>

        <section className="recommend-highlight-grid">
          {recommendData.highlightList.map((item) => (
            <RecommendHighlightCard
              key={item.label}
              description={item.description}
              label={item.label}
              tone={item.tone}
              value={item.value}
            />
          ))}
        </section>

        <RecommendSection
          id="under-average"
          eyebrow="PRICE / VALUE"
          title="평균가보다 저렴한 농산물"
          subtitle="최신 시장 평균가와 현재 판매가를 바로 비교해 절약 폭이 큰 상품부터 보여줍니다."
        >
          {renderProductGrid(
            recommendData.underAverageProductList,
            '현재 기준으로 평균가보다 100원 이상 저렴한 상품이 없습니다.'
          )}
        </RecommendSection>

        <RecommendSection
          id="buy-now"
          eyebrow="TREND / BUY NOW"
          title="지금 구매하기 좋은 상품"
          subtitle="최근 시세 흐름과 현재 판매가를 같이 보고, 지금 담기 좋은 상품을 추렸습니다."
        >
          {renderProductGrid(
            recommendData.buyNowProductList,
            '가격 추이를 바탕으로 추천할 상품이 아직 충분하지 않습니다.'
          )}
        </RecommendSection>

        <RecommendSection
          id="popular-search"
          eyebrow="NAVER DATALAB"
          title="인기 검색 농산물"
          subtitle={
            recommendData.popularSearchList.length
              ? `현재 판매/관심 후보(${recommendData.popularSearchScopeLabel}) 기준으로 네이버 데이터랩 검색 흐름을 반영했습니다.`
              : '네이버 데이터랩 검색 흐름 또는 내부 관심도를 기준으로 추천 상품을 구성했습니다.'
          }
        >
          {recommendData.popularSearchError ? (
            <div className="recommend-inline-alert">{recommendData.popularSearchError}</div>
          ) : null}

          {recommendData.searchSignalList.length ? (
            <div className="recommend-signal-grid">
              {recommendData.searchSignalList.map((item) => (
                <RecommendSearchSignalCard key={item.keyword} item={item} />
              ))}
            </div>
          ) : null}

          {renderProductGrid(
            recommendData.popularProductList,
            '인기 검색과 연결된 추천 상품이 아직 없습니다.'
          )}
        </RecommendSection>

        <RecommendSection
          eyebrow="SEASON / PICK"
          title="제철 추천"
          subtitle="계절성, 현재 시세 메리트, 인기 검색 흐름을 함께 고려해 지금 보기 좋은 상품을 골랐습니다."
        >
          {renderProductGrid(
            recommendData.seasonalProductList,
            '제철 추천에 표시할 상품이 아직 없습니다.'
          )}
        </RecommendSection>

        <RecommendSection
          eyebrow="RECIPE / MATCH"
          title="인기 농산물을 활용한 레시피"
          subtitle="인기 검색 농산물과 잘 맞는 레시피를 고르고, 필요한 재료와 수량 정보를 함께 보여줍니다."
        >
          {recommendData.recipeRecommendationList.length ? (
            <div className="recommend-recipe-grid">
              {recommendData.recipeRecommendationList.map((item) => (
                <RecommendRecipeCard
                  key={item.recipeNo}
                  keyword={item.keyword}
                  matchedIngredients={item.matchedIngredients}
                  onOpen={() => openRecipe(item.recipeNo)}
                  recipe={item}
                />
              ))}
            </div>
          ) : (
            <div className="recommend-section-empty">
              <strong>추천할 레시피가 아직 없습니다.</strong>
              <p>레시피 데이터가 더 쌓이면 인기 농산물과 연결된 추천을 보여드릴게요.</p>
            </div>
          )}
        </RecommendSection>

        <RecommendSection
          eyebrow="WHY / INSIGHT"
          title="추천이 만들어지는 기준"
          subtitle="이 페이지는 시세, 검색 관심도, 구매 기록, 레시피 연결성을 함께 반영해서 추천을 계산합니다."
        >
          <div className="recommend-insight-grid">
            {recommendData.insightCardList.map((item) => (
              <RecommendInsightCard
                key={item.title}
                description={item.description}
                meta={item.meta}
                title={item.title}
              />
            ))}
          </div>
        </RecommendSection>
      </main>
    </div>
  );
}

function renderProductGrid(productList, emptyMessage) {
  if (!productList.length) {
    return (
      <div className="recommend-section-empty">
        <strong>표시할 추천 상품이 없습니다.</strong>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="recommend-product-grid">
      {productList.map((item) => (
        <RecommendProductCard
          key={item.product.productNo}
          badges={item.badges}
          detail={item.detail}
          metricLabel={item.metricLabel}
          metricValue={item.metricValue}
          onOpen={() => openProduct(item.product.productNo)}
          product={item.product}
          summary={item.summary}
          typeLabel={item.typeLabel}
        />
      ))}
    </div>
  );
}

function buildEmptyRecommendData() {
  return {
    buyNowProductList: [],
    highlightList: [],
    insightCardList: [],
    patterns: EMPTY_PATTERNS,
    personalizedMessage:
      '로그인하면 최근 구매 이력과 절약 효과까지 반영한 개인화 추천을 볼 수 있습니다.',
    popularProductList: [],
    popularSearchError: '',
    popularSearchList: [],
    popularSearchScopeLabel: '',
    productSavings: [],
    recipeRecommendationList: [],
    searchSignalList: [],
    seasonalProductList: [],
    underAverageProductList: [],
  };
}

async function loadTrendInsightMap(productList) {
  const resultMap = new Map();

  await Promise.all(
    productList.map(async (product) => {
      if (!product?.priceSnapshot?.itemCode) {
        return;
      }

      try {
        const trendData = await fetchPriceTrendFromApi({
          days: 30,
          itemCode: product.priceSnapshot.itemCode,
          marketType: product.priceSnapshot.marketType || 'RETAIL',
        });

        resultMap.set(product.productNo, buildTrendInsight(trendData?.trend || [], product));
      } catch (error) {
        resultMap.set(product.productNo, buildTrendInsight([], product));
      }
    })
  );

  return resultMap;
}

function buildTrendInsight(trendList, product) {
  const valueList = Array.isArray(trendList)
    ? trendList
        .map((item) => Number(item.avgPrice || 0))
        .filter((value) => Number.isFinite(value) && value > 0)
    : [];
  const latestValue = valueList.length
    ? valueList[valueList.length - 1]
    : Number(product?.priceSnapshot?.avgPrice || 0);
  const firstValue = valueList.length ? valueList[0] : latestValue;
  const recentWindow = valueList.slice(-7);
  const recentAverage = recentWindow.length
    ? recentWindow.reduce((sum, value) => sum + value, 0) / recentWindow.length
    : latestValue;
  const peakValue = valueList.length ? Math.max(...valueList) : latestValue;
  const lowValue = valueList.length ? Math.min(...valueList) : latestValue;
  const changeRate = firstValue > 0 ? ((latestValue - firstValue) / firstValue) * 100 : 0;
  const recentDifferenceRate =
    recentAverage > 0 ? ((recentAverage - latestValue) / recentAverage) * 100 : 0;
  const isNearLowBand =
    peakValue > lowValue && latestValue <= lowValue + (peakValue - lowValue) * 0.25;

  return {
    changeRate,
    isNearLowBand,
    latestValue,
    lowValue,
    peakValue,
    recentAverage,
    recentDifferenceRate,
  };
}

function buildInterestProductList(products, patterns, productSavings) {
  return [...products]
    .filter((product) => product?.saleStatus === 'SELLING')
    .map((product) => {
      const reasons = [];
      let score =
        Number(product?.priceMatch?.savingRate || 0) * 2.4 +
        Number(product?.reviewCount || 0) * 1.8 +
        Number(product?.averageRating || 0) * 4 +
        (product?.isSeasonal === 'Y' ? 8 : 0);

      if (matchesProductNameList(product, patterns?.topPurchasedProducts || [])) {
        score += 24;
        reasons.push('자주 구매한 상품');
      }

      if (matchesProductNameList(product, patterns?.recentPurchasedProducts || [])) {
        score += 14;
        reasons.push('최근 구매 이력 반영');
      }

      if (matchesProductNameList(product, productSavings || [])) {
        score += 12;
        reasons.push('절약 효과가 큰 상품');
      }

      if (product?.priceMatch?.badgeType === 'UNDER_AVG') {
        score += 10;
        reasons.push('평균가보다 저렴함');
      }

      if (!reasons.length) {
        reasons.push('리뷰와 시세를 반영한 추천');
      }

      return {
        product,
        reasons,
        score,
      };
    })
    .sort((left, right) => right.score - left.score);
}

function buildPopularKeywordCandidates(interestProductList) {
  const keywordSet = new Set();

  interestProductList.forEach((item) => {
    if (keywordSet.size >= 5) {
      return;
    }

    const keyword = extractCoreKeyword(item?.product?.productName);
    if (keyword) {
      keywordSet.add(keyword);
    }
  });

  return Array.from(keywordSet);
}

function selectTrendProductList(products, interestProductList) {
  const selectedProductMap = new Map();
  const candidateList = [
    ...products.filter((product) => product?.priceMatch?.badgeType === 'UNDER_AVG'),
    ...interestProductList.map((item) => item.product),
  ];

  candidateList.forEach((product) => {
    if (!product?.productNo || !product?.priceSnapshot?.itemCode) {
      return;
    }

    if (selectedProductMap.size >= 6) {
      return;
    }

    selectedProductMap.set(product.productNo, product);
  });

  return Array.from(selectedProductMap.values());
}

function buildUnderAverageProductList(products, patterns, trendInsightMap) {
  return [...products]
    .filter((product) => product?.saleStatus === 'SELLING')
    .filter((product) => Number(getSavingAmount(product)) >= 100)
    .sort(
      (left, right) =>
        Number(right?.priceMatch?.savingRate || 0) - Number(left?.priceMatch?.savingRate || 0)
    )
    .slice(0, 4)
    .map((product) => {
      const trendInsight = trendInsightMap.get(product.productNo);
      const savingAmount = Number(getSavingAmount(product));

      return {
        badges: [
          `${formatPercent(product?.priceMatch?.savingRate || 0)} 절약`,
          matchesProductNameList(product, patterns?.topPurchasedProducts || [])
            ? '구매 이력 반영'
            : null,
          product?.isSeasonal === 'Y' ? '제철' : null,
        ],
        detail:
          trendInsight?.recentDifferenceRate > 0
            ? `최근 7일 평균 시세보다 ${formatPercent(trendInsight.recentDifferenceRate)} 낮은 구간입니다.`
            : '현재 판매가 기준으로 시장 평균보다 저렴합니다.',
        metricLabel: '예상 절약 금액',
        metricValue: formatCurrency(savingAmount),
        product,
        summary: `최신 평균가 ${formatCurrency(product?.priceSnapshot?.avgPrice || 0)} 대비 저렴합니다.`,
        typeLabel: 'UNDER AVG',
      };
    });
}

function buildBuyNowProductList(products, interestProductList, trendInsightMap) {
  const interestScoreMap = new Map(
    interestProductList.map((item) => [item.product.productNo, item.score])
  );

  return [...products]
    .filter((product) => product?.saleStatus === 'SELLING')
    .map((product) => {
      const trendInsight = trendInsightMap.get(product.productNo) || buildTrendInsight([], product);
      const score =
        Number(product?.priceMatch?.savingRate || 0) * 2 +
        Math.max(0, trendInsight.recentDifferenceRate) * 2 +
        (trendInsight.isNearLowBand ? 12 : 0) +
        (interestScoreMap.get(product.productNo) || 0) * 0.2;

      return {
        product,
        score,
        trendInsight,
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, 4)
    .map(({ product, trendInsight }) => ({
      badges: [
        trendInsight.isNearLowBand ? '최근 저점 구간' : '추세 반영',
        Number(product?.priceMatch?.savingRate || 0) > 0
          ? `${formatPercent(product?.priceMatch?.savingRate || 0)} 절약`
          : null,
      ],
      detail:
        trendInsight.recentDifferenceRate > 0
          ? `최근 7일 평균 시세보다 ${formatPercent(trendInsight.recentDifferenceRate)} 낮습니다.`
          : `최근 30일 변동폭 ${formatPercent(Math.abs(trendInsight.changeRate || 0))} 수준입니다.`,
      metricLabel: '30일 추세',
      metricValue: `${trendInsight.changeRate > 0 ? '+' : ''}${Math.round(
        trendInsight.changeRate
      )}%`,
      product,
      summary: trendInsight.isNearLowBand
        ? '최근 시장 가격 하단 구간에 가까워 지금 담기 좋은 편입니다.'
        : '현재 판매가와 최근 시세 흐름을 같이 보면 구매 메리트가 있습니다.',
      typeLabel: 'BUY NOW',
    }));
}

function buildPopularProductList(products, popularSearchList, interestProductList) {
  if (popularSearchList.length) {
    return popularSearchList
      .map((item) => {
        const product = findMatchingProduct(products, item.keyword);
        if (!product) {
          return null;
        }

        return {
          badges: [
            resolveTrendDirectionLabel(item.trendDirection),
            `최신 관심도 ${Math.round(Number(item.latestRatio || 0))}`,
          ],
          detail:
            Number(item.changeRatio || 0) > 0
              ? `검색 관심도가 전 기간 대비 ${Math.round(Number(item.changeRatio || 0))}p 올랐습니다.`
              : '현재 관심 흐름을 기준으로 다시 주목받는 상품입니다.',
          metricLabel: '검색 관심도',
          metricValue: String(Math.round(Number(item.latestRatio || 0))),
          product,
          summary: '네이버 데이터랩 기준 인기 검색 흐름이 반영된 추천입니다.',
          typeLabel: 'NAVER',
        };
      })
      .filter(Boolean)
      .slice(0, 4);
  }

  return interestProductList.slice(0, 4).map((item) => ({
    badges: [...item.reasons.slice(0, 2)],
    detail: '데이터랩 응답이 없을 때는 내부 관심도 기준으로 먼저 보여줍니다.',
    metricLabel: '관심도 점수',
    metricValue: String(Math.round(item.score)),
    product: item.product,
    summary: '구매 이력, 리뷰, 절약 효과를 함께 반영해 관심도가 높은 상품으로 계산했습니다.',
    typeLabel: 'INTEREST',
  }));
}

function buildSearchSignalList(popularSearchList) {
  return popularSearchList.slice(0, 5).map((item) => ({
    changeRatio: Number(item.changeRatio || 0),
    keyword: item.keyword,
    latestPeriod: item.latestPeriod,
    latestRatio: Number(item.latestRatio || 0),
    peakRatio: Number(item.peakRatio || 0),
    trendDirection: item.trendDirection,
  }));
}

function buildSeasonalProductList(products, popularSearchList) {
  const popularKeywordSet = new Set(
    popularSearchList.map((item) => normalizeMatchText(item.keyword))
  );

  return [...products]
    .filter((product) => product?.saleStatus === 'SELLING')
    .filter((product) => product?.isSeasonal === 'Y')
    .sort((left, right) => {
      const leftKeyword = normalizeMatchText(extractCoreKeyword(left.productName));
      const rightKeyword = normalizeMatchText(extractCoreKeyword(right.productName));
      const leftScore =
        (popularKeywordSet.has(leftKeyword) ? 20 : 0) +
        Number(left?.priceMatch?.savingRate || 0);
      const rightScore =
        (popularKeywordSet.has(rightKeyword) ? 20 : 0) +
        Number(right?.priceMatch?.savingRate || 0);
      return rightScore - leftScore;
    })
    .slice(0, 4)
    .map((product) => ({
      badges: [
        '제철',
        Number(product?.priceMatch?.savingRate || 0) > 0
          ? `${formatPercent(product?.priceMatch?.savingRate || 0)} 절약`
          : '지금 보기 좋음',
      ],
      detail:
        product?.priceMatch?.badgeType === 'UNDER_AVG'
          ? '제철이면서 평균가보다 저렴한 구간입니다.'
          : '제철 공급 구간이라 지금 보기 좋은 상품입니다.',
      metricLabel: '현재 판매가',
      metricValue: formatCurrency(product?.salePrice || 0),
      product,
      summary: `${product.origin || product.categoryName || '국내산'} 기준으로 준비한 제철 추천입니다.`,
      typeLabel: 'SEASON',
    }));
}

async function loadRecipeRecommendationList(
  recipeList,
  popularSearchList,
  popularKeywordCandidates,
  popularProductList
) {
  const effectiveKeywordList = popularSearchList.length
    ? popularSearchList.map((item) => item.keyword)
    : popularKeywordCandidates;
  const selectedRecipeList = selectRecipeCandidates(recipeList, effectiveKeywordList);
  const recipeDetailList = await Promise.all(
    selectedRecipeList.slice(0, 3).map(async (recipe) => {
      try {
        return await fetchRecipeDetail(recipe.recipeNo);
      } catch (error) {
        return recipe;
      }
    })
  );

  return recipeDetailList.map((recipe) => {
    const keyword = findRecipeKeyword(recipe, effectiveKeywordList);
    const matchedIngredients = buildMatchedIngredientList(
      recipe?.ingredientList || [],
      keyword,
      popularProductList
    );

    return {
      ...recipe,
      keyword,
      matchedIngredients,
    };
  });
}

function selectRecipeCandidates(recipeList, keywordList) {
  const normalizedKeywordList = keywordList
    .map((keyword) => normalizeMatchText(keyword))
    .filter(Boolean);

  return [...recipeList]
    .map((recipe) => {
      const combinedText = normalizeMatchText(
        `${recipe?.recipeName || ''} ${recipe?.description || ''}`
      );
      let matchScore = 0;

      normalizedKeywordList.forEach((keyword) => {
        if (combinedText.includes(keyword)) {
          matchScore += 10;
        }
      });

      return {
        ...recipe,
        matchScore,
      };
    })
    .sort((left, right) => right.matchScore - left.matchScore)
    .filter((recipe, index) => recipe.matchScore > 0 || index < 3);
}

function buildMatchedIngredientList(ingredientList, keyword, popularProductList) {
  const keywordText = normalizeMatchText(keyword);
  const productKeywordList = popularProductList.map((item) =>
    normalizeMatchText(extractCoreKeyword(item.product.productName))
  );

  const matchedList = ingredientList.filter((ingredient) => {
    const ingredientText = normalizeMatchText(ingredient.ingredientName);

    if (keywordText && ingredientText.includes(keywordText)) {
      return true;
    }

    return productKeywordList.some((productKeyword) => ingredientText.includes(productKeyword));
  });

  return (matchedList.length ? matchedList : ingredientList).slice(0, 4);
}

function findRecipeKeyword(recipe, keywordList) {
  const combinedText = normalizeMatchText(
    `${recipe?.recipeName || ''} ${recipe?.description || ''}`
  );

  const matchedKeyword = keywordList.find((keyword) =>
    combinedText.includes(normalizeMatchText(keyword))
  );

  return matchedKeyword || keywordList[0] || '';
}

function buildHighlightList({
  buyNowProductList,
  patterns,
  popularProductList,
  recipeRecommendationList,
  underAverageProductList,
}) {
  const topValueProduct = underAverageProductList[0];
  const topBuyNowProduct = buyNowProductList[0];
  const topPopularProduct = popularProductList[0];
  const topRecipe = recipeRecommendationList[0];
  const topPurchasedProduct = patterns?.topPurchasedProducts?.[0];

  return [
    {
      description: topValueProduct
        ? `${topValueProduct.product.productName} 기준 ${topValueProduct.metricValue} 절약 가능`
        : '평균가와 비교 가능한 상품을 우선 추천합니다.',
      label: '평균가 이하 추천',
      tone: 'green',
      value: topValueProduct ? topValueProduct.product.productName : '추천 준비 중',
    },
    {
      description: topBuyNowProduct
        ? topBuyNowProduct.detail
        : '최근 30일 시세 흐름을 기반으로 구매 타이밍을 계산합니다.',
      label: '지금 구매 추천',
      tone: 'yellow',
      value: topBuyNowProduct ? topBuyNowProduct.product.productName : '추세 계산 중',
    },
    {
      description: topPopularProduct
        ? topPopularProduct.summary
        : '네이버 데이터랩 검색 흐름을 반영합니다.',
      label: '인기 검색 농산물',
      tone: 'default',
      value: topPopularProduct ? topPopularProduct.product.productName : '인기 집계 중',
    },
    {
      description: topPurchasedProduct
        ? `최근 자주 구매한 상품은 ${topPurchasedProduct.productName}입니다.`
        : '로그인하면 구매 패턴을 반영한 추천이 더 정확해집니다.',
      label: '연결 레시피 추천',
      tone: 'green',
      value: topRecipe ? topRecipe.recipeName : '레시피 추천 준비 중',
    },
  ];
}

function buildInsightCardList({
  isLoggedIn,
  patterns,
  popularKeywordCandidates,
  popularSearchList,
  productSavings,
}) {
  const topPatternProduct = patterns?.topPurchasedProducts?.[0]?.productName;
  const topSavingProduct = productSavings?.[0]?.productName;
  const topKeyword = popularSearchList?.[0]?.keyword || popularKeywordCandidates?.[0];

  return [
    {
      title: '시세 비교',
      description: '최신 평균가와 현재 판매가를 비교해 100원 이상 저렴한 상품을 우선 보여줍니다.',
      meta: '평균가 비교 기준',
    },
    {
      title: '가격 추이',
      description: '최근 30일 추세에서 저점 구간에 가까운 상품을 구매 추천에 반영합니다.',
      meta: '30일 시세 흐름',
    },
    {
      title: '구매 패턴',
      description: isLoggedIn
        ? topPatternProduct
          ? `${topPatternProduct} 같은 자주 구매하는 품목에 가중치를 더합니다.`
          : '로그인 사용자의 최근 구매 이력을 추천 계산에 반영합니다.'
        : '로그인하면 최근 구매 이력을 기반으로 개인화 추천을 볼 수 있습니다.',
      meta: isLoggedIn ? '사용자 구매 기록 반영' : '로그인 시 강화',
    },
    {
      title: '검색 관심도',
      description: topKeyword
        ? `${topKeyword} 중심으로 네이버 데이터랩 검색 흐름을 확인합니다.`
        : '현재 판매 중인 핵심 후보 품목을 기준으로 검색 관심도를 비교합니다.',
      meta: '네이버 데이터랩 기반',
    },
    {
      title: '절약 기록',
      description: topSavingProduct
        ? `${topSavingProduct}처럼 절약 효과가 큰 상품에 추천 점수를 더합니다.`
        : '사용자 절약 패턴과 잘 맞는 상품을 우선 노출합니다.',
      meta: '마이페이지 절약 데이터',
    },
  ];
}

function buildPersonalizedMessage(patterns, productSavings, isLoggedIn) {
  if (!isLoggedIn) {
    return '로그인하면 최근 구매 이력과 절약 효과가 큰 품목까지 반영한 개인화 추천을 받을 수 있습니다.';
  }

  const topPurchasedProduct = patterns?.topPurchasedProducts?.[0]?.productName;
  const topSavingProduct = Array.isArray(productSavings) ? productSavings[0]?.productName : null;

  if (topPurchasedProduct && topSavingProduct) {
    return `최근 자주 구매한 ${topPurchasedProduct}와 절약 효과가 큰 ${topSavingProduct}를 함께 반영했습니다.`;
  }

  if (topPurchasedProduct) {
    return `최근 자주 구매한 ${topPurchasedProduct}를 기준으로 추천을 보정했습니다.`;
  }

  return '아직 충분한 구매 기록이 없어 기본 추천 기준으로 페이지를 구성했습니다.';
}

function matchesProductNameList(product, itemList) {
  const productText = normalizeMatchText(extractCoreKeyword(product?.productName));

  return itemList.some((item) => {
    const sourceValue =
      typeof item === 'string'
        ? item
        : item?.productName || item?.keyword || item?.title || '';
    const itemText = normalizeMatchText(extractCoreKeyword(sourceValue));
    return itemText && (productText.includes(itemText) || itemText.includes(productText));
  });
}

function findMatchingProduct(productList, keyword) {
  const keywordText = normalizeMatchText(keyword);

  return productList.find((product) => {
    const productKeyword = normalizeMatchText(extractCoreKeyword(product.productName));
    return productKeyword.includes(keywordText) || keywordText.includes(productKeyword);
  });
}

function extractCoreKeyword(value) {
  return String(value || '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(
      /\d+(?:\.\d+)?\s*(kg|g|ml|l|개|봉지|포기|근|상자|박스|인분|EA|ea)/gi,
      ' '
    )
    .replace(/[\\/,+]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeMatchText(value) {
  return extractCoreKeyword(value)
    .toLowerCase()
    .replace(/[\s\-_/.,]/g, '');
}

function resolveTrendDirectionLabel(direction) {
  if (direction === 'UP') {
    return '검색 상승';
  }
  if (direction === 'DOWN') {
    return '검색 안정';
  }
  return '관심 유지';
}

function openProduct(productNo) {
  window.location.hash = `#/products/${productNo}`;
}

function openRecipe(recipeNo) {
  window.location.hash = `#/recipes/${recipeNo}`;
}

function scrollToSection(sectionId) {
  const sectionElement = window.document.getElementById(sectionId);
  if (!sectionElement) {
    return;
  }

  sectionElement.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });
}
