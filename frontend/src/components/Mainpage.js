import React, { useEffect, useMemo, useState } from "react";
import { fetchMainPage } from "../api/mainApi";
import HeroSlider from "./HeroSlider";
import RecommendInsightCard from "./recommend/RecommendInsightCard";
import RecommendProductCard from "./recommend/RecommendProductCard";
import RecommendSearchSignalCard from "./recommend/RecommendSearchSignalCard";
import RecommendSection from "./recommend/RecommendSection";
import { buildEmptyRecommendData, loadRecommendData } from "./recommend/recommendData";
import "../styles/mainPage.css";
import "../styles/recommend.css";

const CATEGORY_SECTIONS = [
  {
    key: "seasonal",
    label: "제철",
    description: "지금 가장 맛있고 신선한 제철 상품입니다.",
    href: "#/products?tag=SEASONAL",
    matches(product) {
      return product?.isSeasonal === "Y";
    },
  },
  {
    key: "fruit",
    label: "과일",
    description: "간식이나 디저트로 고르기 좋은 과일입니다.",
    href: "#/products?category=과일",
    matches(product) {
      return matchesCategory(product, "과일");
    },
  },
  {
    key: "vegetable",
    label: "채소",
    description: "식탁 기본 재료가 되는 신선 채소입니다.",
    href: "#/products?category=채소",
    matches(product) {
      return matchesCategory(product, "채소");
    },
  },
  {
    key: "meat",
    label: "육류",
    description: "소고기, 돼지고기, 닭고기처럼 단백질이 필요한 식재료입니다.",
    href: "#/products?category=육류",
    matches(product) {
      return matchesCategory(product, "육류");
    },
  },
  {
    key: "dairy",
    label: "유제품",
    description: "우유, 치즈처럼 바로 쓰기 좋은 유제품입니다.",
    href: "#/products?category=유제품",
    matches(product) {
      return matchesCategory(product, "유제품");
    },
  },
  {
    key: "processed",
    label: "가공식품",
    description: "두부, 장류처럼 바로 쓰기 좋은 가공식품입니다.",
    href: "#/products?category=가공식품",
    matches(product) {
      return matchesCategory(product, "가공식품");
    },
  },
  {
    key: "egg",
    label: "달걀",
    description: "반찬과 베이킹에 두루 쓰이는 달걀 상품입니다.",
    href: "#/products?category=달걀",
    matches(product) {
      return matchesCategory(product, "달걀");
    },
  },
  {
    key: "grain",
    label: "곡물",
    description: "한 끼를 든든하게 채워주는 곡물과 잡곡입니다.",
    href: "#/products?category=곡물",
    matches(product) {
      return matchesCategory(product, "곡물");
    },
  },
  {
    key: "mushroom",
    label: "버섯",
    description: "한 끼 풍미를 더해주는 버섯류입니다.",
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

const API_BASE_PREFIXES = buildApiBasePrefixes(process.env.REACT_APP_API_BASE_URL || "");

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

function matchesCategory(product, categoryLabel) {
  const source = `${product?.productName || ""} ${product?.categoryName || ""}`;

  if (categoryLabel === "과일") {
    return /과일|사과|배(?!추)|감귤|단감|홍시|곶감|감(?!자)|딸기|포도|복숭아|바나나|오렌지/i.test(
      source
    );
  }

  if (categoryLabel === "채소") {
    return /채소|양파|대파|오이|호박|감자|시금치|배추|무|상추|깻잎|열무|브로콜리|새송이|표고|느타리|팽이/i.test(source);
  }

  if (categoryLabel === "육류") {
    return /육류|소고기|쇠고기|한우|돼지|돼지고기|삼겹살|목심|갈비|안심|등심|설도|양지|닭|닭고기|육계|절단육/i.test(source);
  }

  if (categoryLabel === "유제품") {
    return /유제품|우유|치즈|버터|요거트|생크림|두유/i.test(source);
  }

  if (categoryLabel === "가공식품") {
    return /가공식품|두부|순두부|연두부|즉석밥|김치|고추장|된장|간장|콩나물|어묵|만두/i.test(source);
  }

  if (categoryLabel === "달걀") {
    return /달걀|계란|알/i.test(source);
  }

  if (categoryLabel === "곡물") {
    return /곡물|쌀|보리|현미|잡곡|콩|밀|옥수수|귀리/i.test(source);
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
        (product) => product?.productNo && !usedProductNos.has(String(product.productNo))
      ) ||
      matchedProducts[0] ||
      null;

    if (distinctProduct?.productNo) {
      usedProductNos.add(String(distinctProduct.productNo));
    }

    return {
      ...section,
      product: distinctProduct,
    };
  });
}

function buildCategoryBadge(product) {
  if (product?.isSeasonal === "Y") {
    return "제철";
  }

  if (getDiscountRate(product) > 0) {
    return "특가";
  }

  if (toNumber(product?.reviewCount) > 0) {
    return "인기";
  }

  return "추천";
}

function buildCategoryLead(product) {
  const discountRate = getDiscountRate(product);

  if (discountRate > 0) {
    return `평균가 대비 ${discountRate.toFixed(1)}% 절약`;
  }

  if (product?.isSeasonal === "Y") {
    return "지금 보기 좋은 제철 상품";
  }

  if (toNumber(product?.reviewCount) > 0) {
    return "최근 관심이 높은 대표 상품";
  }

  return "오늘 먼저 볼 대표 상품";
}

function openProduct(productNo) {
  window.location.hash = `#/products/${productNo}`;
}

function openRecipe(recipeNo) {
  window.location.hash = `#/recipes/${recipeNo}`;
}

function openHash(hash) {
  window.location.hash = hash;
}

function buildProductsHash({ search = "", sort = "", tag = "" }) {
  const searchParams = new URLSearchParams();

  if (tag) {
    searchParams.set("tag", tag);
  }

  if (search) {
    searchParams.set("search", search);
  }

  if (sort) {
    searchParams.set("sort", sort);
  }

  const queryString = searchParams.toString();
  return queryString ? `#/products?${queryString}` : "#/products";
}

function summarizeRecipeDescription(description) {
  if (!description) {
    return "레시피 소개 문구는 상세 페이지에서 확인할 수 있습니다.";
  }

  const normalizedDescription = String(description).replace(/\s+/g, " ").trim();
  if (normalizedDescription.length <= 84) {
    return normalizedDescription;
  }

  return `${normalizedDescription.slice(0, 84).trim()}...`;
}

function getRecipeSymbol(recipeName) {
  const normalizedName = String(recipeName || "").toLowerCase();

  if (
    normalizedName.includes("국") ||
    normalizedName.includes("찌개") ||
    normalizedName.includes("탕") ||
    normalizedName.includes("스프") ||
    normalizedName.includes("수프")
  ) {
    return "🍲";
  }

  if (normalizedName.includes("샐러드") || normalizedName.includes("무침")) {
    return "🥗";
  }

  if (
    normalizedName.includes("볶음") ||
    normalizedName.includes("전") ||
    normalizedName.includes("구이") ||
    normalizedName.includes("찜")
  ) {
    return "🍳";
  }

  if (normalizedName.includes("파스타") || normalizedName.includes("국수")) {
    return "🍝";
  }

  return "🍽️";
}

export default function MainPage({ authUser }) {
  const [mainData, setMainData] = useState(EMPTY_MAIN_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [recommendSummary, setRecommendSummary] = useState(() => buildEmptyRecommendData());
  const [selectedProductTab, setSelectedProductTab] = useState("recommended");

  useEffect(() => {
    let isMounted = true;

    async function loadMainData() {
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

  const products = useMemo(
    () => (Array.isArray(mainData.products) ? mainData.products : []),
    [mainData.products]
  );

  const recommendedProducts = useMemo(() => {
    const sourceProducts = recommendSummary.popularProductList.length
      ? recommendSummary.popularProductList.map((item) => item.product)
      : products;

    const uniqueProducts = sourceProducts.filter((product, index, list) => {
      return (
        product?.productNo &&
        list.findIndex((item) => item?.productNo === product.productNo) === index
      );
    });

    return sortProductsByPriority(uniqueProducts).slice(0, 8);
  }, [products, recommendSummary.popularProductList]);

  const categoryCards = useMemo(
    () => pickDistinctCategoryProducts(products).filter((section) => section.product),
    [products]
  );

  const heroSlides = useMemo(() => {
    const seasonalProduct =
      sortProductsByPriority(products.filter((product) => product?.isSeasonal === "Y"))[0] ||
      recommendedProducts[0] ||
      null;
    const discountProduct =
      [...recommendedProducts]
        .sort((left, right) => getDiscountRate(right) - getDiscountRate(left))
        .find((product) => getDiscountRate(product) > 0) ||
      recommendedProducts[1] ||
      null;
    const recipeHero = recommendSummary.recipeRecommendationList[0] || null;

    return [
      {
        key: "seasonal",
        eyebrow: "Today Suggestion",
        title: "지금 사기 좋은 제철 상품",
        desc: "오늘 장보기에서 먼저 챙기면 좋은 제철 상품을 바로 보고 상품 페이지로 이어집니다.",
        primaryLabel: "제철 상품 보기",
        primaryHref: "#/products?tag=SEASONAL",
        secondaryLabel: "추천 상품 보기",
        secondaryHref: "#main-shopping-picks",
        imageUrl: getProductImageSources(seasonalProduct)[0] || "",
      },
      {
        key: "sale",
        eyebrow: "Price Advantage",
        title: "평균가보다 저렴한 특가 상품",
        desc: "평균가 대비 메리트가 큰 상품을 먼저 보여주고 절약 포인트를 바로 확인하게 합니다.",
        primaryLabel: "특가 상품 보기",
        primaryHref: "#/products?tag=UNDER_AVG",
        secondaryLabel: "지금 사면 아끼는 상품",
        secondaryHref: "#main-shopping-picks",
        imageUrl: getProductImageSources(discountProduct)[0] || "",
      },
      {
        key: "recipe",
        eyebrow: "Recipe Match",
        title: "인기 품목 기반 추천 레시피",
        desc: "오늘 많이 보는 품목과 연결된 레시피를 바로 보고 식탁 아이디어까지 이어집니다.",
        primaryLabel: "레시피 보러가기",
        primaryHref: "#/recipes",
        secondaryLabel: "추천 레시피 보기",
        secondaryHref: "#main-recommended-recipes",
        imageUrl: recipeHero?.imageUrl || "",
      },
    ];
  }, [products, recommendedProducts, recommendSummary.recipeRecommendationList]);

  const quickEntryCards = useMemo(() => {
    const underAverageLead = recommendSummary.underAverageProductList[0] || null;
    const buyNowLead = recommendSummary.buyNowProductList[0] || null;
    const popularLead = recommendSummary.popularProductList[0] || null;

    return [
      {
        key: "under-average",
        href: buildProductsHash({ tag: "UNDER_AVG", sort: "HIGH_SAVING" }),
        eyebrow: "평균가 이하 추천",
        title: "지금 사기 좋아요",
        meta: underAverageLead?.product?.productName || "절약 폭이 큰 대표 상품",
        badge: underAverageLead?.badges?.[0] || "특가",
      },
      {
        key: "buy-now",
        href: buildProductsHash({
          search: buyNowLead?.product?.productName || "",
          sort: "RECOMMENDED",
        }),
        eyebrow: "지금 구매 추천",
        title: "가격 괜찮은 시점이에요",
        meta: buyNowLead?.product?.productName || "가격 흐름이 좋은 대표 상품",
        badge: buyNowLead?.badges?.[0] || "타이밍",
      },
      {
        key: "popular-search",
        href: buildProductsHash({
          search:
            recommendSummary.popularSearchList[0]?.keyword ||
            popularLead?.product?.productName ||
            "",
          sort: "RECOMMENDED",
        }),
        eyebrow: "인기 검색 품목",
        title: recommendSummary.popularSearchList.length
          ? `${recommendSummary.popularSearchList[0].keyword} 관심도가 오르고 있어요`
          : "지금 많이 찾는 품목을 먼저 확인하세요",
        meta: popularLead?.product?.productName || "검색 흐름과 연결된 대표 상품",
        badge: popularLead?.badges?.[0] || "인기",
      },
    ];
  }, [
    recommendSummary.buyNowProductList,
    recommendSummary.popularProductList,
    recommendSummary.popularSearchList,
    recommendSummary.underAverageProductList,
  ]);

  const tabbedProductGroups = useMemo(
    () => ({
      recommended: {
        title: "오늘 사기 좋은 타이밍",
        subtitle: "추천 흐름을 반영해 오늘 장보기에서 먼저 보면 좋은 상품을 골랐습니다.",
        items: recommendedProducts.map((product) => ({
          product,
          badges: [buildCategoryBadge(product)],
          detail: buildCategoryLead(product),
          metricLabel: "평균가 비교",
          metricValue:
            getDiscountRate(product) > 0
              ? `${getDiscountRate(product).toFixed(1)}% 절약`
              : "대표 추천",
          summary: `${product?.categoryName || "품목"} 대표 상품으로 먼저 보기 좋습니다.`,
          typeLabel: "추천",
        })),
      },
      popular: {
        title: "지금 많이 찾는 품목",
        subtitle: "검색 흐름과 현재 판매 후보를 함께 반영해 관심이 높은 상품을 골랐습니다.",
        items: recommendSummary.popularProductList,
      },
      seasonal: {
        title: "오늘 사기 좋은 제철 상품",
        subtitle: "계절성과 현재 시세 메리트를 함께 고려해 지금 보기 좋은 제철 상품을 추렸습니다.",
        items: recommendSummary.seasonalProductList,
      },
      value: {
        title: "지금 사면 아끼는 상품",
        subtitle: "최신 시장 평균가와 현재 판매가를 비교해 절약 폭이 큰 상품부터 보여줍니다.",
        items: recommendSummary.underAverageProductList,
      },
    }),
    [
      recommendSummary.popularProductList,
      recommendSummary.seasonalProductList,
      recommendSummary.underAverageProductList,
      recommendedProducts,
    ]
  );

  const activeProductGroup =
    tabbedProductGroups[selectedProductTab] || tabbedProductGroups.recommended;

  return (
    <div className="page-shell">
      <main className="container">
        <HeroSlider slides={heroSlides} />

        <section className="section recommend-page main-recommend-bridge">
          <RecommendSection
            eyebrow="TODAY / FLOW"
            title="오늘의 장보기 흐름"
            subtitle="오늘 왜 이 상품을 먼저 봐야 하는지부터 카테고리별 대표 제안까지 한 번에 정리했습니다."
          >
            <div className="main-quick-entry-grid">
              {quickEntryCards.map((card) => (
                <button
                  key={card.key}
                  className="main-quick-entry-card"
                  type="button"
                  onClick={() => openHash(card.href)}
                >
                  <span className="main-quick-entry-card__eyebrow">{card.eyebrow}</span>
                  <strong>{card.title}</strong>
                  <p>{card.meta}</p>
                  <div className="main-quick-entry-card__meta">
                    <span className="main-quick-entry-card__badge">{card.badge}</span>
                    <span className="main-quick-entry-card__action">보러가기</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="section-head">
              <div>
                <div className="section-title">카테고리별 대표 제안</div>
                <div className="section-sub">
                  카테고리명보다 오늘 먼저 볼 대표 상품과 가격 메리트를 중심으로 보여줍니다.
                </div>
              </div>
              <a className="section-link section-link--products" href="#/products">
                상품 전체 보기
              </a>
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
                      <div className="category-card__topline">
                        <span className="category-card__badge">
                          {buildCategoryBadge(categoryCard.product)}
                        </span>
                        <span>{buildCategoryLead(categoryCard.product)}</span>
                      </div>
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
          </RecommendSection>

          <RecommendSection
            id="main-shopping-picks"
            eyebrow="SHOPPING / PICKS"
            title={activeProductGroup.title}
            subtitle={activeProductGroup.subtitle}
          >
            <div className="main-product-tabs" role="tablist" aria-label="상품 추천 분류">
              <button
                type="button"
                role="tab"
                className={
                  selectedProductTab === "recommended"
                    ? "main-product-tab is-active"
                    : "main-product-tab"
                }
                aria-selected={selectedProductTab === "recommended"}
                onClick={() => setSelectedProductTab("recommended")}
              >
                추천상품
              </button>
              <button
                type="button"
                role="tab"
                className={
                  selectedProductTab === "popular"
                    ? "main-product-tab is-active"
                    : "main-product-tab"
                }
                aria-selected={selectedProductTab === "popular"}
                onClick={() => setSelectedProductTab("popular")}
              >
                인기상품
              </button>
              <button
                type="button"
                role="tab"
                className={
                  selectedProductTab === "seasonal"
                    ? "main-product-tab is-active"
                    : "main-product-tab"
                }
                aria-selected={selectedProductTab === "seasonal"}
                onClick={() => setSelectedProductTab("seasonal")}
              >
                제철상품
              </button>
              <button
                type="button"
                role="tab"
                className={
                  selectedProductTab === "value"
                    ? "main-product-tab is-active"
                    : "main-product-tab"
                }
                aria-selected={selectedProductTab === "value"}
                onClick={() => setSelectedProductTab("value")}
              >
                특가상품
              </button>
            </div>

            {activeProductGroup.items.length ? (
              <div className="recommend-product-grid is-compact">
                {activeProductGroup.items.map((item) => (
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
            ) : (
              <div className="recommend-section-empty">
                <strong>추천할 상품이 아직 없습니다.</strong>
                <p>연결 가능한 상품 데이터가 더 모이면 여기에서 바로 보여드립니다.</p>
              </div>
            )}
          </RecommendSection>

          <RecommendSection
            id="main-recommended-recipes"
            eyebrow="RECIPE / MATCH"
            title="이 품목, 이렇게 먹어보세요"
            subtitle="인기 품목과 연결되는 레시피를 카드로 묶어 바로 볼 수 있게 구성했습니다."
            actionLabel="레시피 전체 보기"
            actionType="ghost"
            onAction={() => openHash("#/recipes")}
          >
            {recommendSummary.recipeRecommendationList.length ? (
              <div className="recipe-list-grid recipe-list-grid--compact main-recipe-grid">
                {recommendSummary.recipeRecommendationList.slice(0, 3).map((item) => (
                  <article className="recipe-list-card recipe-list-card--compact" key={item.recipeNo}>
                    <div className="recipe-list-card__visual">
                      <button
                        className="recipe-list-card__media recipe-list-card__media--compact"
                        type="button"
                        onClick={() => openRecipe(item.recipeNo)}
                      >
                        {item.imageUrl ? (
                          <img alt={item.recipeName} src={item.imageUrl} />
                        ) : (
                          <div className="recipe-list-card__fallback recipe-list-card__fallback--compact">
                            {getRecipeSymbol(item.recipeName)}
                          </div>
                        )}
                      </button>

                      <div className="recipe-list-card__badge-row">
                        {item.keyword ? <span className="recipe-pill">{item.keyword}</span> : null}
                        {item.matchedIngredients?.length ? (
                          <span className="recipe-badge recipe-badge--green">
                            재료 {item.matchedIngredients.length}개 연결
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="recipe-list-card__body">
                      <div className="recipe-list-card__head">
                        <button
                          className="recipe-list-card__title recipe-list-card__title--compact"
                          type="button"
                          onClick={() => openRecipe(item.recipeNo)}
                        >
                          {item.recipeName}
                        </button>
                        <p className="recipe-list-card__summary recipe-list-card__summary--compact">
                          {summarizeRecipeDescription(item.description)}
                        </p>
                      </div>

                      <div className="recipe-list-card__foot recipe-list-card__foot--compact">
                        <button
                          className="btn recipe-list-card__action recipe-list-card__action--compact"
                          type="button"
                          onClick={() => openRecipe(item.recipeNo)}
                        >
                          상세 보기
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="recommend-section-empty">
                <strong>추천할 레시피가 아직 없습니다.</strong>
                <p>레시피 데이터가 더 모이면 인기 품목과 연결된 추천을 보여드릴게요.</p>
              </div>
            )}
          </RecommendSection>

          <RecommendSection
            eyebrow="SIGNAL / WHY"
            title="추천을 뒷받침하는 정보"
            subtitle="검색 관심도와 추천 근거 카드는 페이지 하단에서 가볍게 확인할 수 있게 정리했습니다."
          >
            {recommendSummary.popularSearchError ? (
              <div className="recommend-inline-alert">{recommendSummary.popularSearchError}</div>
            ) : null}

            {recommendSummary.searchSignalList.length ? (
              <div className="recommend-signal-grid">
                {recommendSummary.searchSignalList.map((item) => (
                  <RecommendSearchSignalCard key={item.keyword} item={item} />
                ))}
              </div>
            ) : null}

            <div className="recommend-insight-grid">
              {recommendSummary.insightCardList.map((item) => (
                <RecommendInsightCard
                  key={item.title}
                  description={item.description}
                  meta={item.meta}
                  title={item.title}
                />
              ))}
            </div>
          </RecommendSection>
        </section>

        {!isLoading && errorMessage ? <div className="section-error">{errorMessage}</div> : null}
      </main>
    </div>
  );
}

