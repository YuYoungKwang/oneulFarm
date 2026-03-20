import React, { useEffect, useState } from "react";
import HeroSlider from "./HeroSlider";

import { fetchMainPage } from "../api/mainApi";
import "../styles/mainPage.css";

const CATEGORY_CHIPS = ["🌿 제철", "🍎 과일", "🥬 채소", "🌾 곡물", "🍄 버섯", "💸 특가"];
const EMPTY_MAIN_DATA = {
  products: [],
  insights: [],
  chart: [],
  recipes: [],
};

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

function MainPage() {
  const [mainData, setMainData] = useState(EMPTY_MAIN_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

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
  const chartPoints = buildChartPoints(chart);
  const featuredInsight = insights[0] || products[0] || null;
  const featuredRecipe = recipes[0] || null;
  const chartHeadline = chart[chart.length - 1]?.itemName || featuredInsight?.itemName || "대표 품목";

  return (
    <div className="page-shell">
      <main className="container">
        <HeroSlider />

        <div className="chip-row">
          {CATEGORY_CHIPS.map((chip) => (
            <div className="chip" key={chip}>
              {chip}
            </div>
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

          <div className="product-grid">
            {products.map((product) => (
              <article className="product-card" key={product.productNo}>
                <div className="product-media">
                  <span>{product.productName?.slice(0, 1) || "🥬"}</span>
                </div>
                <div className="product-name">{product.productName}</div>
                <div className="section-sub">
                  평균가 {formatCurrency(product.avgPrice || product.salePrice)}
                </div>
                <div className="price">{formatCurrency(product.salePrice)}</div>
              </article>
            ))}
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
                {featuredRecipe ? featuredRecipe.recipeName : "추천 레시피 준비 중"}
              </div>
              <div className="section-sub">
                {featuredRecipe?.description || "기존 Recipe 데이터를 재사용해 노출합니다."}
              </div>
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
                <article className="mini-recipe" key={recipe.recipeNo}>
                  <h4>{recipe.recipeName}</h4>
                  <p>{recipe.cookTime || "조리시간 정보 없음"}</p>
                </article>
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
