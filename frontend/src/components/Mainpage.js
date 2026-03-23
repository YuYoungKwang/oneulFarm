import React, { useEffect, useState } from "react";
import { fetchMainPage } from "../api/mainApi";
import { fetchPriceTrendFromApi } from "../api/priceAnalysisApi";
import HeroSlider from "./HeroSlider";
import PriceTrendChart from "./price/PriceTrendChart";
import "../styles/mainPage.css";
import "../styles/priceAnalysis.css";

const CATEGORY_CHIPS = [
  "전체",
  "제철 추천",
  "과일",
  "채소",
  "곡물",
  "버섯",
  "할인 상품",
];

const API_BASE_PREFIXES = buildApiBasePrefixes(
  process.env.REACT_APP_API_BASE_URL || ""
);

const EMPTY_MAIN_DATA = {
  products: [],
  insights: [],
  chart: [],
  recipes: [],
};

function buildApiBasePrefixes(explicitBaseUrl) {
  const normalizedBaseUrl = normalizeBaseUrl(explicitBaseUrl);
  if (normalizedBaseUrl) {
    return [normalizedBaseUrl];
  }

  return ["", "/backend"];
}

function normalizeBaseUrl(value) {
  const trimmedValue = String(value || "").trim();
  if (!trimmedValue) {
    return "";
  }

  return trimmedValue.replace(/\/+$/, "");
}

function toNumber(value, fallback = 0) {
  const nextValue = Number(value);
  return Number.isFinite(nextValue) ? nextValue : fallback;
}

function formatCurrency(value) {
  return `${toNumber(value).toLocaleString("ko-KR")}원`;
}

function formatRate(value) {
  const rate = toNumber(value);
  const sign = rate > 0 ? "+" : "";
  return `${sign}${rate.toFixed(1)}%`;
}

function formatChartDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return `${date.getMonth() + 1}.${date.getDate()}`;
}

function buildTrendPoints(chartData) {
  return (Array.isArray(chartData) ? chartData : [])
    .map((item) => ({
      date: item?.snapshotDate,
      label: formatChartDate(item?.snapshotDate),
      value: toNumber(item?.avgPrice),
    }))
    .filter((item) => item.date && Number.isFinite(item.value));
}

function normalizeTrendRows(rows) {
  return (Array.isArray(rows) ? rows : [])
    .map((row) => ({
      date: row?.snapshotDate,
      label: formatChartDate(row?.snapshotDate),
      value: toNumber(row?.avgPrice),
    }))
    .filter((row) => row.date && Number.isFinite(row.value));
}

function getDiscountRate(product) {
  const salePrice = toNumber(product?.salePrice);
  const avgPrice = toNumber(product?.avgPrice, salePrice);

  if (avgPrice <= 0 || salePrice <= 0 || salePrice >= avgPrice) {
    return 0;
  }

  return ((avgPrice - salePrice) / avgPrice) * 100;
}

function getInsightLabel(product) {
  if (!product) {
    return "";
  }

  if (product.badgeType === "UNDER_AVG") {
    return "평균가 이하";
  }

  return `등락률 ${formatRate(product.changeRate)}`;
}

function getProductImageSources(product) {
  const mainImage = Array.isArray(product?.images)
    ? product.images.find((image) => image?.isMain === "Y") || product.images[0]
    : null;

  if (mainImage?.imageNo) {
    return API_BASE_PREFIXES.map(
      (basePrefix) => `${basePrefix}/api/image/product/${mainImage.imageNo}`
    );
  }

  if (product?.imageNo) {
    return API_BASE_PREFIXES.map(
      (basePrefix) => `${basePrefix}/api/image/product/${product.imageNo}`
    );
  }

  if (product?.imageUrl) {
    return [product.imageUrl];
  }

  return [];
}

function handleImageError(event) {
  const nextSource = event.currentTarget.dataset.fallbackSrc;
  if (!nextSource || event.currentTarget.src === nextSource) {
    return;
  }

  event.currentTarget.src = nextSource;
  event.currentTarget.removeAttribute("data-fallback-src");
}

function getRecipeIngredientPreview(recipe) {
  if (!Array.isArray(recipe?.ingredientList) || recipe.ingredientList.length === 0) {
    return "재료 정보가 없습니다.";
  }

  return recipe.ingredientList
    .slice(0, 3)
    .map((ingredient) => ingredient.ingredientName)
    .filter(Boolean)
    .join(", ");
}

function filterProducts(products, category) {
  if (category === "전체") {
    return products;
  }

  if (category === "할인 상품") {
    return [...products]
      .filter((product) => {
        const salePrice = toNumber(product?.salePrice);
        const avgPrice = toNumber(product?.avgPrice, salePrice);
        return avgPrice > 0 && salePrice < avgPrice;
      })
      .sort(
        (leftProduct, rightProduct) =>
          getDiscountRate(rightProduct) - getDiscountRate(leftProduct)
      );
  }

  return products.filter((product) => {
    const source = `${product?.productName || ""} ${product?.categoryName || ""}`;
    const isSeasonal = product?.isSeasonal === "Y";

    if (category === "과일") {
      return /과일|사과|배|감귤|딸기|포도|복숭아|바나나|오렌지/.test(source);
    }

    if (category === "채소") {
      return /채소|양파|대파|오이|토마토|감자|시금치|배추|무|상추|깻잎/.test(source);
    }

    if (category === "버섯") {
      return /버섯/.test(source);
    }

    if (category === "곡물") {
      return /쌀|보리|콩|잡곡|곡물/.test(source);
    }

    if (category === "제철 추천") {
      return isSeasonal;
    }

    return true;
  });
}

function MainPage() {
  const [mainData, setMainData] = useState(EMPTY_MAIN_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [selectedInsightKey, setSelectedInsightKey] = useState("");
  const [trendState, setTrendState] = useState({
    error: "",
    loading: false,
    rows: [],
  });

  useEffect(() => {
    let isMounted = true;

    async function loadMainPage() {
      try {
        const data = await fetchMainPage();
        if (!isMounted) {
          return;
        }

        setMainData({
          products: Array.isArray(data?.products) ? data.products : [],
          insights: Array.isArray(data?.insights) ? data.insights : [],
          chart: Array.isArray(data?.chart) ? data.chart : [],
          recipes: Array.isArray(data?.recipes) ? data.recipes : [],
        });
        setErrorMessage("");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(error.message || "메인 데이터를 불러오지 못했습니다.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadMainPage();

    return () => {
      isMounted = false;
    };
  }, []);

  const { products, insights, chart, recipes } = mainData;

  useEffect(() => {
    if (!insights.length) {
      setSelectedInsightKey("");
      return;
    }

    const hasSelectedInsight = insights.some(
      (insight) => String(insight?.productNo || "") === selectedInsightKey
    );

    if (!hasSelectedInsight) {
      setSelectedInsightKey(String(insights[0]?.productNo || ""));
    }
  }, [insights, selectedInsightKey]);

  const selectedInsight =
    insights.find((insight) => String(insight?.productNo || "") === selectedInsightKey) ||
    insights[0] ||
    null;

  useEffect(() => {
    if (!selectedInsight?.itemCode) {
      setTrendState({
        error: "",
        loading: false,
        rows: [],
      });
      return;
    }

    let cancelled = false;
    const abortController = new AbortController();

    async function loadTrend() {
      setTrendState({
        error: "",
        loading: true,
        rows: [],
      });

      try {
        const payload = await fetchPriceTrendFromApi({
          days: 365,
          itemCode: selectedInsight.itemCode,
          marketType: selectedInsight.marketType || "RETAIL",
          signal: abortController.signal,
        });

        if (cancelled) {
          return;
        }

        setTrendState({
          error: "",
          loading: false,
          rows: normalizeTrendRows(payload?.trend || payload || []),
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        setTrendState({
          error: error?.message || "시세 추이를 불러오지 못했습니다.",
          loading: false,
          rows: [],
        });
      }
    }

    loadTrend();

    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [selectedInsight]);

  const filteredProducts = filterProducts(products, selectedCategory);
  const hasFiltered = filteredProducts.length > 0;
  const displayProducts = hasFiltered ? filteredProducts : products;
  const trendPoints = trendState.rows.length ? trendState.rows : buildTrendPoints(chart);
  const featuredInsight = selectedInsight || insights[0] || products[0] || null;
  const featuredRecipe = recipes[0] || null;
  const chartHeadline =
    selectedInsight?.itemName ||
    chart[chart.length - 1]?.itemName ||
    featuredInsight?.itemName ||
    "대표 품목";

  return (
    <div className="page-shell">
      <main className="container">
        <HeroSlider />

        <div className="chip-row">
          {CATEGORY_CHIPS.map((chip) => (
            <button
              className={`chip ${selectedCategory === chip ? "active" : ""}`}
              key={chip}
              onClick={() => setSelectedCategory(chip)}
              type="button"
            >
              {chip}
            </button>
          ))}
        </div>

        {errorMessage ? <div className="section-error">{errorMessage}</div> : null}

        <section className="section">
          <div className="section-head">
            <div>
              <div className="section-title">추천 농산물</div>
              <div className="section-sub">상품과 시세 데이터를 기반으로 추천합니다.</div>
            </div>
            <a href="#/products">전체 보기</a>
          </div>

          {!isLoading && !hasFiltered && selectedCategory !== "전체" && products.length > 0 ? (
            <div className="section-sub" style={{ marginBottom: "10px" }}>
              선택한 카테고리 상품이 없어 전체 추천 상품을 보여줍니다.
            </div>
          ) : null}

          <div className="product-grid">
            {displayProducts.map((product) => {
              const imageSources = getProductImageSources(product);

              return (
                <a
                  className="product-card"
                  href={`#/products/${product.productNo}`}
                  key={product.productNo}
                >
                  <div className="product-media">
                    {imageSources.length > 0 ? (
                      <img
                        src={imageSources[0]}
                        data-fallback-src={imageSources[1] || ""}
                        onError={handleImageError}
                        alt={product.productName}
                      />
                    ) : (
                      <span>{product.productName?.slice(0, 1) || "?"}</span>
                    )}
                  </div>
                  <div className="product-name">{product.productName}</div>
                  <div className="section-sub">
                    평균가 {formatCurrency(product.avgPrice || product.salePrice)}
                  </div>
                  <div className="price">{formatCurrency(product.salePrice)}</div>
                  {getDiscountRate(product) > 0 ? (
                    <div className="discount">
                      {getDiscountRate(product).toFixed(1)}% 할인
                    </div>
                  ) : null}
                </a>
              );
            })}
          </div>

          {!isLoading && products.length === 0 ? (
            <div className="section-empty">추천 상품 데이터가 없습니다.</div>
          ) : null}
        </section>

        <div className="banner-row">
          <article className="info-banner yellow">
            <div>
              <div className="banner-title">오늘의 시세 인사이트</div>
              <div className="banner-strong">
                {featuredInsight ? featuredInsight.productName : "데이터 준비 중"}
              </div>
              <div className="section-sub">
                {featuredInsight
                  ? `${getInsightLabel(featuredInsight)} · 절감률 ${formatRate(
                      featuredInsight.savingRate
                    )}`
                  : "시세 데이터가 준비되면 표시됩니다."}
              </div>
            </div>
            <div className="banner-illustration">📈</div>
          </article>

          <article className="info-banner green">
            <div>
              <div className="banner-title">오늘의 추천 레시피</div>
              <div className="banner-strong">
                {featuredRecipe ? (
                  <a href={`#/recipes/${featuredRecipe.recipeNo}`}>
                    {featuredRecipe.recipeName}
                  </a>
                ) : (
                  "추천 레시피 준비 중"
                )}
              </div>
              <div className="section-sub">
                {featuredRecipe?.description || "레시피 데이터를 기반으로 추천합니다."}
              </div>
              {featuredRecipe ? (
                <div className="section-sub">
                  재료: {getRecipeIngredientPreview(featuredRecipe)}
                </div>
              ) : null}
            </div>
            <div className="banner-illustration">🍳</div>
          </article>
        </div>

        <section className="section grid-2">
          <article className="card">
            <div className="card-title">시세 그래프</div>
            <div className="card-sub">{chartHeadline} 최근 시세 추이</div>

            <div className="chart-shell">
              {trendState.loading ? (
                <div className="section-sub">선택한 인사이트 기준 시세 추이를 불러오는 중입니다.</div>
              ) : trendState.error ? (
                <div className="section-error">{trendState.error}</div>
              ) : trendPoints.length ? (
                <PriceTrendChart
                  points={trendPoints}
                  productLabel={chartHeadline}
                  subtitle="오른쪽 시세 인사이트 항목을 선택하면 해당 품목의 차트로 바뀝니다."
                  title="가격 추세 차트"
                />
              ) : (
                <div className="section-empty">시세 그래프 데이터가 없습니다.</div>
              )}
            </div>
          </article>

          <article className="card">
            <div className="card-title">시세 인사이트</div>
            <div className="insight-list">
              {insights.map((product) => {
                const isActive =
                  String(product?.productNo || "") === String(selectedInsight?.productNo || "");

                return (
                  <button
                    className={`insight-item ${isActive ? "is-active" : ""}`}
                    key={product.productNo}
                    type="button"
                    onClick={() => setSelectedInsightKey(String(product.productNo))}
                  >
                    <strong>{product.productName}</strong>
                    <span>{getInsightLabel(product)}</span>
                  </button>
                );
              })}
              {!isLoading && insights.length === 0 ? (
                <div className="section-empty">시세 인사이트 데이터가 없습니다.</div>
              ) : null}
            </div>
          </article>
        </section>

        <section className="section grid-2">
          <article className="card">
            <div className="card-title">오늘 추천 상품</div>
            {featuredInsight ? (
              <>
                <div className="stat-value">{featuredInsight.productName}</div>
                <div className="section-sub">
                  판매가 {formatCurrency(featuredInsight.salePrice)} / 평균가{" "}
                  {formatCurrency(featuredInsight.avgPrice || featuredInsight.salePrice)}
                </div>
              </>
            ) : (
              <div className="section-empty">대표 상품 데이터가 없습니다.</div>
            )}
          </article>

          <article className="card">
            <div className="card-title">레시피 추천</div>

            <div className="mini-recipes">
              {recipes.map((recipe) => (
                <a
                  className="mini-recipe"
                  href={`#/recipes/${recipe.recipeNo}`}
                  key={recipe.recipeNo}
                >
                  <h4>{recipe.recipeName}</h4>
                  <p>{recipe.cookTime || "조리시간 정보 없음"}</p>
                  <p>재료: {getRecipeIngredientPreview(recipe)}</p>
                </a>
              ))}
            </div>

            {!isLoading && recipes.length === 0 ? (
              <div className="section-empty">추천 레시피 데이터가 없습니다.</div>
            ) : null}
          </article>
        </section>
      </main>
    </div>
  );
}

export default MainPage;
