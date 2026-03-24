import React, { useEffect, useState } from "react";
import HeroSlider from "./HeroSlider";

import { fetchMainPage } from "../api/mainApi";
import "../styles/mainPage.css";

const CATEGORY_CHIPS = [
  "전체",
  "🌿 제철",
  "🍎 과일",
  "🥬 채소",
  "🌾 곡물",
  "🍄 버섯",
  "💸 특가",
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
  const trimmedValue = value.trim();
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

function getDiscountRate(product) {
  const salePrice = toNumber(product?.salePrice);
  const avgPrice = toNumber(product?.avgPrice, salePrice);

  if (avgPrice <= 0 || salePrice <= 0 || salePrice >= avgPrice) {
    return 0;
  }

  return ((avgPrice - salePrice) / avgPrice) * 100;
}

function buildChartPoints(chartData) {
  if (!Array.isArray(chartData) || chartData.length === 0) {
    return "";
  }

  const width = 640;
  const height = 280;
  const paddingX = 70;
  const paddingY = 40;
  const values = chartData.map((item) => toNumber(item.avgPrice));
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue || 1;

  return chartData
    .map((item, index) => {
      const x = paddingX + ((width - paddingX * 2) * index) / Math.max(chartData.length - 1, 1);
      const y =
        height -
        paddingY -
        ((height - paddingY * 2) * (toNumber(item.avgPrice) - minValue)) / range;
      return `${x},${y}`;
    })
    .join(" ");
}

function applyAdminShortcutVisibility() {
  const role = localStorage.getItem("farmsenseRole") || "guest";

  document.querySelectorAll("[data-admin-shortcut]").forEach((element) => {
    if (role === "admin") {
      element.classList.remove("admin-nav-hidden");
      return;
    }

    element.classList.add("admin-nav-hidden");
  });
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

  if (!mainImage?.imageNo) {
    return [];
  }

  return API_BASE_PREFIXES.map(
    (basePrefix) => `${basePrefix}/api/image/product/${mainImage.imageNo}`
  );
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

  if (category.includes("특가")) {
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
    const name = product?.productName || "";
    const categoryName = product?.categoryName || "";
    const source = `${name} ${categoryName}`;
    const isSeasonal = product?.isSeasonal === "Y";

    if (category.includes("과일")) {
      return /사과|배|감귤|귤|딸기|포도|복숭아|바나나|오렌지/.test(source);
    }

    if (category.includes("채소")) {
      return /양파|오이|토마토|감자|시금치|배추|무|상추|당근|호박|채소/.test(source);
    }

    if (category.includes("버섯")) {
      return /버섯/.test(source);
    }

    if (category.includes("곡물")) {
      return /쌀|콩|보리|현미|옥수수|곡물/.test(source);
    }

    if (category.includes("제철")) {
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

  useEffect(() => {
    applyAdminShortcutVisibility();

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
  const filteredProducts = filterProducts(products, selectedCategory);
  const hasFiltered = filteredProducts.length > 0;
  const displayProducts = hasFiltered ? filteredProducts : products;
  const chartPoints = buildChartPoints(chart);
  const featuredInsight = insights[0] || products[0] || null;
  const featuredRecipe = recipes[0] || null;
  const chartHeadline =
    chart[chart.length - 1]?.itemName || featuredInsight?.itemName || "대표 품목";

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
              <div className="section-sub">기존 Product, Price 데이터를 재사용한 추천 상품</div>
            </div>
            <a href="#/products">전체 보기 →</a>
          </div>

          {!isLoading && !hasFiltered && selectedCategory !== "전체" && products.length > 0 ? (
            <div className="section-sub" style={{ marginBottom: "10px" }}>
              ⚠ 선택한 카테고리 상품이 없어 전체 추천 상품을 보여드립니다.
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
                      <span>{product.productName?.slice(0, 1) || "🥬"}</span>
                    )}
                  </div>
                  <div className="product-name">{product.productName}</div>
                  <div className="section-sub">
                    평균가 {formatCurrency(product.avgPrice || product.salePrice)}
                  </div>
                  <div className="price">{formatCurrency(product.salePrice)}</div>
                  {getDiscountRate(product) > 0 ? (
                    <div className="discount">{getDiscountRate(product).toFixed(1)}% ↓</div>
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
                  <a href={`#/recipes/${featuredRecipe.recipeNo}`}>{featuredRecipe.recipeName}</a>
                ) : (
                  "추천 레시피 준비 중"
                )}
              </div>
              <div className="section-sub">
                {featuredRecipe?.description || "기존 Recipe 데이터를 재사용해 노출합니다."}
              </div>
              {featuredRecipe ? (
                <div className="section-sub">
                  재료: {getRecipeIngredientPreview(featuredRecipe)}
                </div>
              ) : null}
            </div>
            <div className="banner-illustration">🍲</div>
          </article>
        </div>

        <section className="section grid-2">
          <article className="card">
            <div className="card-title">시세 그래프</div>
            <div className="card-sub">{chartHeadline} 최근 7건 평균가 추세</div>

            <div className="chart-shell">
              {chartPoints ? (
                <>
                  <svg viewBox="0 0 640 280" width="100%" height="280">
                    <polyline
                      fill="none"
                      stroke="#159a55"
                      strokeWidth="4"
                      points={chartPoints}
                    />
                  </svg>
                  <div className="chart-caption">
                    최신 평균가 {formatCurrency(chart[chart.length - 1]?.avgPrice)}
                  </div>
                </>
              ) : (
                <div className="section-empty">시세 그래프 데이터가 없습니다.</div>
              )}
            </div>
          </article>

          <article className="card">
            <div className="card-title">시세 인사이트</div>
            <div className="insight-list">
              {insights.map((product) => (
                <div className="insight-item" key={product.productNo}>
                  <strong>{product.productName}</strong>
                  <span style={{ color: "var(--green)" }}>{getInsightLabel(product)}</span>
                </div>
              ))}
              {!isLoading && insights.length === 0 ? (
                <div className="section-empty">시세 인사이트 데이터가 없습니다.</div>
              ) : null}
            </div>
          </article>
        </section>

        <section className="section grid-2">
          <article className="card">
            <div className="card-title">대표 추천 상품</div>
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
