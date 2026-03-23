import React, { useEffect, useMemo, useRef, useState } from "react";
import { fetchMainPage } from "../api/mainApi";
import { fetchPriceTrendFromApi } from "../api/priceAnalysisApi";
import HeroSlider from "./HeroSlider";
import { SearchIcon } from "./ProductIcons";
import PriceTrendChart from "./price/PriceTrendChart";
import { fetchRecipeDetail, fetchRecipeList } from "./recipeApi";
import "../styles/mainPage.css";
import "../styles/priceAnalysis.css";

const CATEGORY_SECTIONS = [
  {
    key: "seasonal",
    label: "제철 추천",
    description: "지금 가장 맛있고 신선한 제철 농산물",
    href: "#/products?tag=SEASONAL",
    matches(product) {
      return product?.isSeasonal === "Y";
    },
  },
  {
    key: "fruit",
    label: "과일",
    description: "가볍게 고르기 좋은 달콤한 과일",
    href: "#/products?category=과일",
    matches(product) {
      return matchesCategory(product, "과일");
    },
  },
  {
    key: "vegetable",
    label: "채소",
    description: "식탁 기본 재료가 되는 신선 채소",
    href: "#/products?category=채소",
    matches(product) {
      return matchesCategory(product, "채소");
    },
  },
  {
    key: "grain",
    label: "곡물",
    description: "든든하게 채우기 좋은 곡물과 잡곡",
    href: "#/products?category=곡물",
    matches(product) {
      return matchesCategory(product, "곡물");
    },
  },
  {
    key: "mushroom",
    label: "버섯",
    description: "한 끼 풍미를 더해주는 버섯류",
    href: "#/products?category=버섯",
    matches(product) {
      return matchesCategory(product, "버섯");
    },
  },
];

const EMPTY_MAIN_DATA = {
  products: [],
  insights: [],
  chart: [],
  recipes: [],
};

const API_BASE_PREFIXES = buildApiBasePrefixes(
  process.env.REACT_APP_API_BASE_URL || ""
);

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

function matchesCategory(product, categoryLabel) {
  const source = `${product?.productName || ""} ${product?.categoryName || ""}`;

  if (categoryLabel === "과일") {
    return /과일|사과|배|감귤|감|딸기|포도|복숭아|바나나|오렌지/i.test(source);
  }

  if (categoryLabel === "채소") {
    return /채소|양파|대파|오이|호박|감자|시금치|배추|무|상추|깻잎/i.test(source);
  }

  if (categoryLabel === "곡물") {
    return /곡물|쌀|보리|콩|현미|잡곡/i.test(source);
  }

  if (categoryLabel === "버섯") {
    return /버섯|새송이|표고|느타리|팽이/i.test(source);
  }

  return false;
}

function containsKeyword(value, keyword) {
  return String(value || "").includes(keyword);
}

function sortProductsByPriority(products) {
  return [...products].sort((left, right) => {
    const seasonalGap = Number(right?.isSeasonal === "Y") - Number(left?.isSeasonal === "Y");
    if (seasonalGap !== 0) {
      return seasonalGap;
    }

    const featuredGap = toNumber(right?.featuredScore) - toNumber(left?.featuredScore);
    if (featuredGap !== 0) {
      return featuredGap;
    }

    return toNumber(right?.reviewCount) - toNumber(left?.reviewCount);
  });
}

function getDiscountRate(product) {
  const salePrice = toNumber(product?.salePrice);
  const avgPrice = toNumber(product?.avgPrice, salePrice);

  if (avgPrice <= 0 || salePrice <= 0 || salePrice >= avgPrice) {
    return 0;
  }

  return ((avgPrice - salePrice) / avgPrice) * 100;
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

function hasDisplayImage(product) {
  return getProductImageSources(product).length > 0;
}

function handleImageError(event) {
  const nextSource = event.currentTarget.dataset.fallbackSrc;
  if (!nextSource || event.currentTarget.src === nextSource) {
    return;
  }

  event.currentTarget.src = nextSource;
  event.currentTarget.removeAttribute("data-fallback-src");
}

function pickDistinctCategoryProducts(products) {
  const usedProductNos = new Set();

  return CATEGORY_SECTIONS.map((section) => {
    let matchedProducts = sortProductsByPriority(
      products.filter((product) => section.matches(product))
    );

    if (section.key === "mushroom") {
      const kingOysterProducts = matchedProducts.filter((product) =>
        containsKeyword(product?.productName, "새송이")
      );
      const mushroomProducts = matchedProducts.filter(
        (product) =>
          containsKeyword(product?.categoryName, "버섯") ||
          containsKeyword(product?.productName, "버섯")
      );

      matchedProducts = [
        ...kingOysterProducts,
        ...mushroomProducts.filter(
          (product) => !containsKeyword(product?.productName, "새송이")
        ),
        ...matchedProducts.filter(
          (product) =>
            !containsKeyword(product?.productName, "새송이") &&
            !containsKeyword(product?.categoryName, "버섯") &&
            !containsKeyword(product?.productName, "버섯")
        ),
      ];
    }

    matchedProducts = [
      ...matchedProducts.filter(hasDisplayImage),
      ...matchedProducts.filter((product) => !hasDisplayImage(product)),
    ];

    const distinctProduct =
      matchedProducts.find(
        (product) =>
          product?.productNo && !usedProductNos.has(String(product.productNo))
      ) || matchedProducts[0] || null;

    if (distinctProduct?.productNo) {
      usedProductNos.add(String(distinctProduct.productNo));
    }

    return {
      ...section,
      product: distinctProduct,
    };
  });
}

function extractCoreKeyword(value) {
  return String(value || "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\d+(?:\.\d+)?\s*(kg|g|ml|l|개|봉|팩|EA|ea)/gi, " ")
    .replace(/[\\/,+]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")[0];
}

function normalizeMatchText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[\s\-_/.,]/g, "");
}

function buildPopularProduceKeywords(insights, products) {
  const keywordSet = new Set();
  const sourceList = [
    ...(Array.isArray(insights) ? insights : []),
    ...(Array.isArray(products) ? products : []),
  ];

  sourceList.forEach((item) => {
    if (keywordSet.size >= 6) {
      return;
    }

    const keyword = extractCoreKeyword(item?.itemName || item?.productName);
    if (keyword) {
      keywordSet.add(keyword);
    }
  });

  return Array.from(keywordSet);
}

function selectRecipeCandidates(recipeList, keywordList) {
  const normalizedKeywordList = keywordList
    .map((keyword) => normalizeMatchText(keyword))
    .filter(Boolean);

  return [...recipeList]
    .map((recipe) => {
      const combinedText = normalizeMatchText(
        `${recipe?.recipeName || ""} ${recipe?.description || ""}`
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
    .filter((recipe, index) => recipe.matchScore > 0 || index < 2);
}

function buildMatchedIngredientList(ingredientList, keyword) {
  const keywordText = normalizeMatchText(keyword);
  return ingredientList
    .filter((ingredient) =>
      normalizeMatchText(ingredient?.ingredientName).includes(keywordText)
    )
    .slice(0, 4);
}

function findRecipeKeyword(recipe, keywordList) {
  const combinedText = normalizeMatchText(
    `${recipe?.recipeName || ""} ${recipe?.description || ""}`
  );

  const matchedKeyword = keywordList.find((keyword) =>
    combinedText.includes(normalizeMatchText(keyword))
  );

  return matchedKeyword || keywordList[0] || "";
}

function getRecipeIngredientPreview(recipe) {
  if (!Array.isArray(recipe?.ingredientList) || recipe.ingredientList.length === 0) {
    return "재료 정보를 준비 중입니다.";
  }

  return recipe.ingredientList
    .slice(0, 3)
    .map((ingredient) => ingredient.ingredientName)
    .filter(Boolean)
    .join(", ");
}

function MainPage() {
  const [mainData, setMainData] = useState(EMPTY_MAIN_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedInsightKey, setSelectedInsightKey] = useState("");
  const [trendState, setTrendState] = useState({
    error: "",
    loading: false,
    rows: [],
  });
  const [recipeRecommendationState, setRecipeRecommendationState] = useState({
    error: "",
    loading: false,
    list: [],
  });
  const recommendedProductsRef = useRef(null);

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

        setErrorMessage(error?.message || "메인 데이터를 불러오지 못했습니다.");
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

  const products = useMemo(
    () => (Array.isArray(mainData.products) ? mainData.products : []),
    [mainData.products]
  );
  const insights = useMemo(
    () => (Array.isArray(mainData.insights) ? mainData.insights : []),
    [mainData.insights]
  );
  const chart = useMemo(
    () => (Array.isArray(mainData.chart) ? mainData.chart : []),
    [mainData.chart]
  );

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

  const recommendedProducts = useMemo(() => {
    const insightProducts = insights.filter(Boolean);
    const combinedProducts = [...insightProducts, ...products];
    const uniqueProducts = combinedProducts.filter((product, index, list) => {
      return (
        product?.productNo &&
        list.findIndex((item) => item?.productNo === product.productNo) === index
      );
    });

    return sortProductsByPriority(uniqueProducts).slice(0, 8);
  }, [insights, products]);

  const categoryCards = useMemo(
    () => pickDistinctCategoryProducts(products).filter((section) => section.product),
    [products]
  );

  useEffect(() => {
    const keywordList = buildPopularProduceKeywords(insights, recommendedProducts);

    if (!keywordList.length) {
      setRecipeRecommendationState({
        error: "",
        loading: false,
        list: [],
      });
      return;
    }

    let cancelled = false;

    async function loadRecipeRecommendations() {
      setRecipeRecommendationState({
        error: "",
        loading: true,
        list: [],
      });

      try {
        const recipePayload = await fetchRecipeList({
          limit: 18,
          sort: "RECOMMENDED",
        });
        const recipeList = Array.isArray(recipePayload?.recipeList)
          ? recipePayload.recipeList
          : [];
        const selectedRecipeList = selectRecipeCandidates(recipeList, keywordList);
        const recipeDetailList = await Promise.all(
          selectedRecipeList.slice(0, 2).map(async (recipe) => {
            try {
              return await fetchRecipeDetail(recipe.recipeNo);
            } catch (error) {
              return recipe;
            }
          })
        );

        if (cancelled) {
          return;
        }

        setRecipeRecommendationState({
          error: "",
          loading: false,
          list: recipeDetailList.map((recipe) => {
            const keyword = findRecipeKeyword(recipe, keywordList);
            return {
              ...recipe,
              keyword,
              matchedIngredients: buildMatchedIngredientList(
                recipe?.ingredientList || [],
                keyword
              ),
            };
          }),
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        setRecipeRecommendationState({
          error: error?.message || "추천 레시피를 불러오지 못했습니다.",
          loading: false,
          list: [],
        });
      }
    }

    loadRecipeRecommendations();

    return () => {
      cancelled = true;
    };
  }, [insights, recommendedProducts]);

  const heroSlides = useMemo(() => {
    const seasonalProduct =
      sortProductsByPriority(products.filter((product) => product?.isSeasonal === "Y"))[0] ||
      recommendedProducts[0] ||
      null;
    const discountProduct =
      [...recommendedProducts]
        .sort((left, right) => getDiscountRate(right) - getDiscountRate(left))
        .find((product) => getDiscountRate(product) > 0) || recommendedProducts[1] || null;
    const recipeHero = recipeRecommendationState.list[0] || null;

    return [
      {
        key: "seasonal",
        eyebrow: "Seasonal Pick",
        title: "제철추천",
        desc: "지금 가장 신선한 제철 상품을 먼저 보고 바로 상품 페이지로 이어집니다.",
        primaryLabel: "제철 상품 보기",
        primaryHref: "#/products?tag=SEASONAL",
        secondaryLabel: "오늘 추천상품",
        secondaryHref: "#main-recommended-products",
        imageUrl: getProductImageSources(seasonalProduct)[0] || "",
      },
      {
        key: "sale",
        eyebrow: "Special Price",
        title: "특가 할인상품",
        desc: "가격 메리트가 큰 상품을 먼저 보여주고 평균가 대비 이점을 바로 확인하게 합니다.",
        primaryLabel: "특가 상품 보기",
        primaryHref: "#/products?tag=UNDER_AVG",
        secondaryLabel: "상품 전체 보기",
        secondaryHref: "#/products",
        imageUrl: getProductImageSources(discountProduct)[0] || "",
      },
      {
        key: "recipe",
        eyebrow: "Recipe Match",
        title: "인기 추천레시피",
        desc: "메인에서 추천 중인 인기 레시피 사진을 바로 보여주고 레시피 페이지로 연결합니다.",
        primaryLabel: "레시피 보러가기",
        primaryHref: "#/recipes",
        secondaryLabel: "추천 레시피",
        secondaryHref: "#main-recommended-recipes",
        imageUrl: recipeHero?.imageUrl || "",
      },
    ];
  }, [products, recommendedProducts, recipeRecommendationState.list]);

  const trendPoints = trendState.rows.length ? trendState.rows : buildTrendPoints(chart);
  const chartHeadline =
    selectedInsight?.itemName ||
    selectedInsight?.productName ||
    chart[chart.length - 1]?.itemName ||
    "대표 품목";

  function scrollRecommendedProducts(direction) {
    if (!recommendedProductsRef.current) {
      return;
    }

    const railElement = recommendedProductsRef.current;
    const cardElement = railElement.querySelector(".spotlight-card");
    if (!cardElement) {
      return;
    }

    const cardWidth = cardElement.getBoundingClientRect().width + 18;
    railElement.scrollBy({
      left: cardWidth * direction,
      behavior: "smooth",
    });
  }

  useEffect(() => {
    if (!recommendedProductsRef.current || recommendedProducts.length <= 1) {
      return undefined;
    }

    const railElement = recommendedProductsRef.current;

    const interval = window.setInterval(() => {
      const cardElement = railElement.querySelector(".spotlight-card");
      if (!cardElement) {
        return;
      }

      const cardWidth = cardElement.getBoundingClientRect().width + 18;
      const maxScrollLeft = railElement.scrollWidth - railElement.clientWidth;
      const nextScrollLeft = railElement.scrollLeft + cardWidth;

      railElement.scrollTo({
        left: nextScrollLeft >= maxScrollLeft - 4 ? 0 : nextScrollLeft,
        behavior: "smooth",
      });
    }, 3200);

    return () => {
      window.clearInterval(interval);
    };
  }, [recommendedProducts]);

  return (
    <div className="page-shell">
      <main className="container">
        <HeroSlider slides={heroSlides} />

        <section className="section">
          <div className="section-head">
            <div>
              <div className="section-title">오늘 주목할 농산물</div>
              <div className="section-sub">
                카테고리별 대표 상품을 먼저 보고 원하는 묶음으로 바로 이동할 수 있습니다.
              </div>
            </div>
            <a href="#/products">상품 전체 보기</a>
          </div>

          <div className="category-card-grid">
            {categoryCards.map((categoryCard) => {
              const imageSources = getProductImageSources(categoryCard.product);

              return (
                <a className="category-card" href={categoryCard.href} key={categoryCard.key}>
                  <div className="category-card__copy">
                    <span className="category-card__eyebrow">{categoryCard.label}</span>
                    <strong>
                      {categoryCard.product?.productName || `${categoryCard.label} 상품 보기`}
                    </strong>
                    <p>{categoryCard.description}</p>
                  </div>

                  <div className="category-card__media">
                    {imageSources.length ? (
                      <img
                        src={imageSources[0]}
                        data-fallback-src={imageSources[1] || ""}
                        onError={handleImageError}
                        alt={categoryCard.product?.productName || categoryCard.label}
                      />
                    ) : (
                      <span>{categoryCard.label.slice(0, 2)}</span>
                    )}
                  </div>
                </a>
              );
            })}
          </div>

          <div className="subsection-head" id="main-recommended-products">
            <div>
              <div className="subsection-title">오늘 추천상품</div>
              <div className="section-sub">
                이미지부터 빠르게 보고 필요한 가격 정보는 바로 아래에서 확인할 수 있습니다.
              </div>
            </div>

            <div className="spotlight-controls" aria-label="추천상품 이동">
              <button type="button" onClick={() => scrollRecommendedProducts(-1)}>
                ‹
              </button>
              <button type="button" onClick={() => scrollRecommendedProducts(1)}>
                ›
              </button>
            </div>
          </div>

          <div className="spotlight-rail" ref={recommendedProductsRef}>
            {recommendedProducts.map((product) => {
              const imageSources = getProductImageSources(product);

              return (
                <a
                  className="spotlight-card"
                  href={`#/products/${product.productNo}`}
                  key={product.productNo}
                >
                  <div className="spotlight-card__media">
                    {imageSources.length ? (
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

                  <div className="spotlight-card__body">
                    <div className="spotlight-card__category">
                      {product.categoryName || "농산물"}
                    </div>
                    <div className="spotlight-card__name">{product.productName}</div>
                    <div className="spotlight-card__price">{formatCurrency(product.salePrice)}</div>
                    <div className="spotlight-card__meta">
                      평균가 {formatCurrency(product.avgPrice || product.salePrice)}
                    </div>
                    {getDiscountRate(product) > 0 ? (
                      <div className="spotlight-card__saving">
                        평균가 대비 {getDiscountRate(product).toFixed(1)}% 절약
                      </div>
                    ) : null}
                  </div>
                </a>
              );
            })}
          </div>

          {!isLoading && recommendedProducts.length === 0 ? (
            <div className="section-empty">주목할 농산물 데이터가 없습니다.</div>
          ) : null}
        </section>

        <section className="section" id="main-recommended-recipes">
          <div className="section-head">
            <div>
              <div className="section-title">인기 농산물로 만드는 추천 레시피</div>
              <div className="section-sub">
                메인에서 눈에 띄는 농산물과 연결되는 레시피만 카드로 묶어 보여줍니다.
              </div>
            </div>
            <a href="#/recipes">레시피 전체 보기</a>
          </div>

          <div className="recipe-card-grid">
            {recipeRecommendationState.list.map((recipe) => (
              <a className="recipe-card" href={`#/recipes/${recipe.recipeNo}`} key={recipe.recipeNo}>
                <div className="recipe-card__media">
                  {recipe.imageUrl ? (
                    <img alt={recipe.recipeName} src={recipe.imageUrl} />
                  ) : (
                    <span>{recipe.recipeName?.slice(0, 1) || "R"}</span>
                  )}
                </div>

                <div className="recipe-card__body">
                  <span className="recipe-card__eyebrow">
                    {recipe.keyword ? `${recipe.keyword} 활용 레시피` : "추천 레시피"}
                  </span>
                  <strong>{recipe.recipeName}</strong>
                  <p>
                    {recipe.matchedIngredients?.length
                      ? recipe.matchedIngredients
                          .map((ingredient) => ingredient.ingredientName)
                          .filter(Boolean)
                          .join(", ")
                      : getRecipeIngredientPreview(recipe)}
                  </p>
                </div>
              </a>
            ))}
          </div>

          {recipeRecommendationState.loading ? (
            <div className="section-sub">추천 레시피를 불러오는 중입니다.</div>
          ) : recipeRecommendationState.error ? (
            <div className="section-error">{recipeRecommendationState.error}</div>
          ) : !isLoading && recipeRecommendationState.list.length === 0 ? (
            <div className="section-empty">추천 레시피 데이터가 없습니다.</div>
          ) : null}
        </section>

        <section className="section market-overview">
          <div className="section-head market-overview__head">
            <div>
              <div className="section-title">시장 한눈에 보기</div>
              <div className="section-sub">
                대표 품목의 가격 추세와 시세 인사이트를 함께 보면서 흐름을 빠르게 확인합니다.
              </div>
            </div>
            <a href="#/price-analysis">시세분석 전체 보기</a>
          </div>

          <div className="grid-2 market-overview__grid">
            <article className="card">
              <div className="card-title">시세 그래프</div>
              <div className="card-sub">{chartHeadline} 최근 가격 추이</div>

              <div className="chart-shell">
                {trendState.loading ? (
                  <div className="section-sub">선택한 품목의 시세 추이를 불러오는 중입니다.</div>
                ) : trendState.error ? (
                  <div className="section-error">{trendState.error}</div>
                ) : trendPoints.length ? (
                  <PriceTrendChart
                    points={trendPoints}
                    productLabel={chartHeadline}
                    subtitle="오른쪽 시세 인사이트 품목을 선택하면 차트가 해당 품목 기준으로 바뀝니다."
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
                  const imageSources = getProductImageSources(product);

                  return (
                    <button
                      className={`insight-item ${isActive ? "is-active" : ""}`}
                      key={product.productNo}
                      type="button"
                      onClick={() => setSelectedInsightKey(String(product.productNo))}
                    >
                      <span className="insight-item__icon" aria-hidden="true">
                        <SearchIcon />
                      </span>
                      <strong className="insight-item__name">{product.productName}</strong>
                      <span className="insight-item__thumb">
                        {imageSources.length ? (
                          <img
                            src={imageSources[0]}
                            data-fallback-src={imageSources[1] || ""}
                            onError={handleImageError}
                            alt={product.productName}
                          />
                        ) : (
                          product.productName?.slice(0, 1) || "?"
                        )}
                      </span>
                    </button>
                  );
                })}

                {!isLoading && insights.length === 0 ? (
                  <div className="section-empty">시세 인사이트 데이터가 없습니다.</div>
                ) : null}
              </div>
            </article>
          </div>
        </section>

        {errorMessage ? <div className="section-error">{errorMessage}</div> : null}
      </main>
    </div>
  );
}

export default MainPage;
