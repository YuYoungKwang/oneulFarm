import React, { useEffect, useMemo, useState } from "react";
import { fetchMainPage } from "../api/mainApi";
import { buildProductModel } from "../api/productApi";
import HeroSlider from "./HeroSlider";
import { prioritizeMealRecipes } from "./recipeCategoryUtils";
import MainIngredientLinkCard from "./recommend/MainIngredientLinkCard";
import RecommendProductCard from "./recommend/RecommendProductCard";
import { buildEmptyRecommendData, loadRecommendData } from "./recommend/recommendData";
import { getDiscountRate } from "./productUiUtils";
import "../styles/mainPage.css";
import "../styles/recommend.css";

const API_BASE_PREFIXES = buildApiBasePrefixes(process.env.REACT_APP_API_BASE_URL || "");

function buildApiBasePrefixes(explicitBaseUrl) {
  const normalizedBaseUrl = String(explicitBaseUrl || "").trim().replace(/\/+$/, "");
  return normalizedBaseUrl ? [normalizedBaseUrl] : ["", "/backend"];
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

function normalizeProducts(rawProducts) {
  if (!Array.isArray(rawProducts)) {
    return [];
  }

  return rawProducts.map((product) => {
    if (product?.priceSnapshot && product?.priceMatch) {
      return product;
    }

    return buildProductModel(product || {});
  });
}

function openProduct(productNo) {
  window.location.hash = `#/products/${productNo}`;
}

function openRecipe(recipeNo) {
  window.location.hash = `#/recipes/${recipeNo}`;
}

export default function MainPage({ authUser }) {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [recommendSummary, setRecommendSummary] = useState(() => buildEmptyRecommendData());

  useEffect(() => {
    let isMounted = true;

    async function loadMainData() {
      try {
        const data = await fetchMainPage();
        if (!isMounted) {
          return;
        }

        setProducts(normalizeProducts(data?.products));
        setErrorMessage("");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(error?.message || "메인 데이터를 불러오지 못했습니다.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadMainData();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadSummary() {
      try {
        const data = await loadRecommendData(authUser);
        if (!cancelled) {
          setRecommendSummary(data);
        }
      } catch (error) {
        if (!cancelled) {
          setRecommendSummary(buildEmptyRecommendData());
        }
      }
    }

    loadSummary();

    return () => {
      cancelled = true;
    };
  }, [authUser]);

  const seasonalPreviewList = useMemo(
    () =>
      [...recommendSummary.seasonalProductList]
        .sort((left, right) => getDiscountRate(right.product) - getDiscountRate(left.product))
        .slice(0, 5),
    [recommendSummary.seasonalProductList]
  );

  const recipePreviewList = useMemo(
    () =>
      prioritizeMealRecipes(recommendSummary.recipeRecommendationList, 2)
        .slice(0, 4)
        .map((recipe) => ({
          product: {
            productName:
              recipe?.keyword || recipe?.matchedIngredients?.[0]?.ingredientName || "인기 메뉴",
          },
          linkedRecipes: [recipe],
          description:
            recipe?.description ||
            "많이 찾는 레시피를 먼저 소개하고 필요한 재료 이름을 카드 안에서 함께 보여줍니다.",
          recipe,
        })),
    [recommendSummary.recipeRecommendationList]
  );

  const heroSlides = useMemo(() => {
    const recipeHero = recommendSummary.recipeRecommendationList[0] || null;
    const seasonalHero = recommendSummary.seasonalProductList[0]?.product || products[0] || null;
    const seasonalImage = getProductImageSources(seasonalHero)[0] || "";

    return [
      {
        key: "recipe-main",
        eyebrow: "RECIPE & GROCERY",
        title: "인기 레시피를 보고 필요한 재료를 확인하세요",
        desc: "레시피 상세에서 판매 중인 재료를 바로 연결할 수 있어요.",
        primaryLabel: "레시피 보러가기",
        primaryHref: "#/recipes",
        secondaryLabel: "인기 레시피 보기",
        secondaryHref: "#/recipes",
        imageUrl: recipeHero?.imageUrl || seasonalImage,
      },
      {
        key: "seasonal-main",
        eyebrow: "SEASONAL RECIPE",
        title: "제철 재료로 만들 수 있는 요리를 바로 찾으세요",
        desc: "지금 활용하기 좋은 재료와 연결된 레시피를 함께 보여줍니다.",
        primaryLabel: "제철 레시피 보기",
        primaryHref: "#/recipes",
        secondaryLabel: "제철 재료 보기",
        secondaryHref: "#/products?tag=SEASONAL",
        imageUrl: seasonalImage || recipeHero?.imageUrl || "",
      },
    ];
  }, [products, recommendSummary.recipeRecommendationList, recommendSummary.seasonalProductList]);

  return (
    <div className="page-shell">
      <main className="container recommend-page">
        <HeroSlider slides={heroSlides} />

        <section className="section">
          <div className="section-head">
            <div>
              <div className="section-title">제철 재료로 바로 해먹기 좋은 요리</div>
              <div className="section-sub">
                지금 맛있고 신선한 재료를 중심으로 바로 이어볼 수 있는 상품을 먼저 보여줍니다.
              </div>
            </div>
          </div>

          {seasonalPreviewList.length ? (
            <div className="recommend-product-grid is-compact">
              {seasonalPreviewList.map((item) => (
                <RecommendProductCard
                  key={item.product.productNo}
                  badges={item.badges}
                  detail={item.detail}
                  hideSavingRate
                  metricLabel={item.metricLabel}
                  metricValue=""
                  onOpen={() => openProduct(item.product.productNo)}
                  product={item.product}
                  summary={item.summary}
                  typeLabel={item.typeLabel}
                />
              ))}
            </div>
          ) : (
            <div className="recommend-section-empty">
              <strong>제철 재료가 아직 없습니다.</strong>
              <p>계절성 데이터가 더 모이면 여기에서 보여드립니다.</p>
            </div>
          )}
        </section>

        <section className="section">
          <div className="section-head">
            <div>
              <div className="section-title">지금 인기 있는 메뉴</div>
              <div className="section-sub">
                많이 찾는 레시피를 먼저 소개하고 필요한 재료 이름을 카드 안에서 함께 보여줍니다.
              </div>
            </div>
            <a className="section-link section-link--recipes" href="#/recipes">
              레시피 전체 보기
            </a>
          </div>

          {recipePreviewList.length ? (
            <div className="main-link-card-grid">
              {recipePreviewList.map((item) => (
                <MainIngredientLinkCard
                  key={item.recipe?.recipeNo || item.recipe?.recipeName}
                  imageSources={item.recipe?.imageUrl ? [item.recipe.imageUrl] : []}
                  item={item}
                  onImageError={handleImageError}
                  onOpenRecipe={openRecipe}
                  title={item.recipe?.recipeName || "지금 인기 있는 메뉴"}
                  tone="recipe"
                />
              ))}
            </div>
          ) : (
            <div className="recommend-section-empty">
              <strong>추천할 레시피가 아직 없습니다.</strong>
              <p>레시피 데이터가 더 모이면 여기에서 보여드릴게요.</p>
            </div>
          )}
        </section>

        {!isLoading && !seasonalPreviewList.length && !recipePreviewList.length ? (
          <div className="section-empty">메인에 표시할 추천 데이터가 아직 없습니다.</div>
        ) : null}

        {errorMessage ? <div className="section-error">{errorMessage}</div> : null}

        <img
          alt=""
          aria-hidden="true"
          className="main-hidden-image-fallback"
          data-fallback-src=""
          onError={handleImageError}
        />
      </main>
    </div>
  );
}
