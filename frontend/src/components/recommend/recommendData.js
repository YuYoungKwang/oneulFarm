import {
  buildProductImageSources,
  buildProductModel,
  fetchProductsFromApi,
} from "../../api/productApi";
import { fetchMainRecommendations } from "../../api/mainApi";

function toNumber(value, fallback = 0) {
  const nextValue = Number(value);
  return Number.isFinite(nextValue) ? nextValue : fallback;
}

function buildProductImageList(product) {
  if (product?.imageNo) {
    return [
      {
        imageNo: product.imageNo,
        imageUrl: product.imageUrl || "",
        isMain: "Y",
      },
    ];
  }

  if (product?.imageUrl) {
    return [
      {
        imageNo: null,
        imageUrl: product.imageUrl,
        isMain: "Y",
      },
    ];
  }

  return [];
}

function normalizeImageUrl(value) {
  const normalizedValue = String(value || "").trim();
  if (!normalizedValue) {
    return "";
  }

  if (
    normalizedValue.startsWith("http://") ||
    normalizedValue.startsWith("https://") ||
    normalizedValue.startsWith("data:")
  ) {
    return normalizedValue;
  }

  if (normalizedValue.startsWith("/backend/")) {
    return normalizedValue;
  }

  if (normalizedValue.startsWith("/api/")) {
    return `/backend${normalizedValue}`;
  }

  return normalizedValue;
}

function normalizeLinkedRecipe(item) {
  if (!item?.recipeNo) {
    return null;
  }

  return {
    recipeNo: item.recipeNo,
    recipeName: item.recipeName || "",
    imageUrl: normalizeImageUrl(item.imageUrl || ""),
    matchedIngredient: item.matchedIngredient || "",
  };
}

function resolveProductImageUrl(product) {
  const apiSources = buildProductImageSources(product);
  if (apiSources[0]) {
    return apiSources[0];
  }

  if (product?.mainImage?.imageUrl) {
    return normalizeImageUrl(product.mainImage.imageUrl);
  }

  if (product?.imageUrl) {
    return normalizeImageUrl(product.imageUrl);
  }

  if (Array.isArray(product?.images) && product.images.length > 0) {
    const mainImage =
      product.images.find((image) => image?.isMain === "Y") || product.images[0];
    if (mainImage?.imageUrl) {
      return normalizeImageUrl(mainImage.imageUrl);
    }
  }

  return "";
}

function normalizeHeroSlide(item, index) {
  return {
    key: item?.key || `main-slide-${index}`,
    eyebrow: item?.eyebrow || "",
    title: item?.title || "",
    desc: item?.desc || "",
    highlights: Array.isArray(item?.highlights)
      ? item.highlights.filter(Boolean).slice(0, 3)
      : [],
    primaryLabel: item?.primaryLabel || "",
    primaryHref: item?.primaryHref || "",
    secondaryLabel: item?.secondaryLabel || "",
    secondaryHref: item?.secondaryHref || "",
    imageUrl: normalizeImageUrl(item?.imageUrl || ""),
  };
}

function buildRecipeHeroSlide(recipe, index) {
  if (!recipe?.recipeNo) {
    return null;
  }

  const ingredients = Array.isArray(recipe?.matchedIngredients)
    ? recipe.matchedIngredients.filter(Boolean).slice(0, 2)
    : [];
  const primaryIngredient = ingredients[0] || "";

  return {
    key: `recipe-slide-${recipe.recipeNo || index}`,
    eyebrow: "Recipe",
    title: recipe.recipeName || "추천 레시피",
    desc: primaryIngredient
      ? `${primaryIngredient}로 바로 이어 보기 좋은 메뉴`
      : "지금 많이 보는 레시피를 빠르게 확인해 보세요.",
    highlights: ["인기 레시피", primaryIngredient, recipe?.categoryLabel || ""].filter(Boolean),
    primaryLabel: "레시피 보기",
    primaryHref: `#/recipes/${recipe.recipeNo}`,
    secondaryLabel: "레시피 더보기",
    secondaryHref: primaryIngredient
      ? `#/recipes?ingredientKeyword=${encodeURIComponent(primaryIngredient)}`
      : "#/recipes",
    imageUrl: normalizeImageUrl(recipe?.imageUrl || ""),
  };
}

function buildMealPlanHeroSlide() {
  return {
    key: "meal-plan-slide",
    eyebrow: "Meal Plan",
    title: "AI 챗봇으로 맞춤 식단",
    desc: "조건만 입력하면 식단표와 장보기 목록까지 바로 추천해 드려요.",
    highlights: ["대화형 추천", "주간 식단표", "장보기 연결"],
    primaryLabel: "맞춤 식단 시작",
    primaryHref: "#/meal-plan",
    secondaryLabel: "레시피 둘러보기",
    secondaryHref: "#/recipes",
    imageUrl: "",
  };
}

function buildSeasonalHeroSlide(item) {
  const seasonalProduct = item?.product;
  if (!seasonalProduct?.productNo) {
    return null;
  }

  const recipeText = Array.isArray(item?.linkedRecipes)
    ? item.linkedRecipes
        .map((recipe) => recipe?.recipeName)
        .filter(Boolean)
        .slice(0, 2)
        .join(", ")
    : "";
  const savingRate = Number(seasonalProduct?.priceMatch?.savingRate || 0);

  return {
    key: `seasonal-slide-${seasonalProduct.productNo}`,
    eyebrow: "Seasonal",
    title: seasonalProduct.productName || "제철 재료",
    desc: "지금 담기 좋은 제철 상품을 빠르게 고르세요.",
    highlights: [
      "제철",
      savingRate > 0 ? `${Math.round(savingRate)}% 절약` : "",
      recipeText ? "레시피 연계" : "",
    ].filter(Boolean),
    primaryLabel: "상품 보기",
    primaryHref: `#/products/${seasonalProduct.productNo}`,
    secondaryLabel: "상품 전체 보기",
    secondaryHref: "#/products",
    imageUrl: resolveProductImageUrl(seasonalProduct),
  };
}

function buildHeroSlides({ heroSlides, seasonalProducts, popularRecipes }) {
  const firstRecipeSlide = Array.isArray(popularRecipes)
    ? buildRecipeHeroSlide(popularRecipes[0], 0)
    : null;
  const seasonalSlide = Array.isArray(seasonalProducts)
    ? buildSeasonalHeroSlide(seasonalProducts[0])
    : null;
  const fallbackSlides = Array.isArray(heroSlides)
    ? heroSlides.map(normalizeHeroSlide).filter(Boolean)
    : [];
  const nextSlides = [firstRecipeSlide, seasonalSlide, buildMealPlanHeroSlide()].filter(
    Boolean
  );

  if (nextSlides.length > 0) {
    return nextSlides;
  }

  return fallbackSlides;
}

function buildSeasonalMeta(item) {
  return {
    rank: toNumber(item?.rank, 0),
    rankKeyword: item?.rankKeyword || "",
    rankScore: toNumber(item?.rankScore, 0),
    latestRatio: toNumber(item?.latestRatio, 0),
    averageRatio: toNumber(item?.averageRatio, 0),
    changeRatio: toNumber(item?.changeRatio, 0),
    trendDirection: item?.trendDirection || "",
    summary: item?.summary || "",
    badges: Array.isArray(item?.badges) ? item.badges.filter(Boolean) : [],
    linkedRecipes: Array.isArray(item?.linkedRecipes)
      ? item.linkedRecipes.map(normalizeLinkedRecipe).filter(Boolean)
      : [],
  };
}

function normalizeSeasonalProduct(item, productCatalogMap) {
  if (!item?.product?.productNo) {
    return null;
  }

  const productNo = Number(item.product.productNo || 0);
  const catalogProduct = productCatalogMap?.get(productNo) || null;
  const salePrice = toNumber(item.product.salePrice);
  const seasonalMeta = buildSeasonalMeta(item);
  const sourceImages =
    Array.isArray(item?.product?.images) && item.product.images.length
      ? item.product.images
      : buildProductImageList(item.product);

  if (catalogProduct) {
    const mergedImages =
      Array.isArray(catalogProduct.images) && catalogProduct.images.length
        ? catalogProduct.images
        : sourceImages;
    const mainImage =
      catalogProduct.mainImage ||
      mergedImages.find((image) => image?.isMain === "Y") ||
      mergedImages[0] ||
      null;
    const comparedPrice = toNumber(
      catalogProduct?.priceSnapshot?.displayAvgPrice ||
        catalogProduct?.priceMatch?.comparedPrice ||
        item?.avgPrice,
      salePrice
    );

    return {
      ...seasonalMeta,
      detail: seasonalMeta.linkedRecipes.length
        ? seasonalMeta.linkedRecipes
            .map((recipe) => recipe.recipeName)
            .filter(Boolean)
            .join(" / ")
        : "",
      metricLabel: comparedPrice > 0 ? "평균가" : "",
      metricValue:
        comparedPrice > 0
          ? `${Math.round(comparedPrice).toLocaleString("ko-KR")}원`
          : "",
      product: {
        ...catalogProduct,
        imageNo: catalogProduct.imageNo || item?.product?.imageNo || mainImage?.imageNo || null,
        imageUrl:
          catalogProduct.imageUrl || item?.product?.imageUrl || mainImage?.imageUrl || "",
        images: mergedImages,
        mainImage,
      },
      typeLabel: "제철",
    };
  }

  const avgPrice = toNumber(item.avgPrice, salePrice);
  const savingRate =
    avgPrice > 0 && salePrice > 0 && salePrice < avgPrice
      ? ((avgPrice - salePrice) / avgPrice) * 100
      : 0;
  const normalizedProduct = buildProductModel({
    ...item.product,
    avgPrice,
    comparedPrice: avgPrice,
    savingRate,
  });
  const mainImage =
    sourceImages.find((image) => image?.isMain === "Y") ||
    sourceImages[0] ||
    normalizedProduct.mainImage ||
    null;

  return {
    ...seasonalMeta,
    detail: seasonalMeta.linkedRecipes.length
      ? seasonalMeta.linkedRecipes
          .map((recipe) => recipe.recipeName)
          .filter(Boolean)
          .join(" / ")
      : "",
    metricLabel: avgPrice > 0 ? "평균가" : "",
    metricValue: avgPrice > 0 ? `${Math.round(avgPrice).toLocaleString("ko-KR")}원` : "",
    product: {
      ...normalizedProduct,
      imageNo: item?.product?.imageNo || mainImage?.imageNo || null,
      imageUrl: item?.product?.imageUrl || mainImage?.imageUrl || "",
      images: sourceImages.length ? sourceImages : normalizedProduct.images,
      mainImage,
    },
    typeLabel: "제철",
  };
}

function normalizePopularRecipe(item) {
  if (!item?.recipeNo) {
    return null;
  }

  return {
    recipeNo: item.recipeNo,
    recipeName: item.recipeName || "",
    summary: item?.summary || "",
    categoryLabel: item?.categoryLabel || "",
    sourceKeyword: item?.sourceKeyword || "",
    datalabDriven: Boolean(item?.datalabDriven),
    matchedIngredients: Array.isArray(item?.matchedIngredients)
      ? item.matchedIngredients.filter(Boolean)
      : [],
    imageUrl: normalizeImageUrl(item?.imageUrl || ""),
  };
}

export function buildEmptyRecommendData() {
  return {
    heroSlides: [],
    seasonalProducts: [],
    rankingProducts: [],
    popularRecipes: [],
  };
}

export async function loadRecommendData() {
  const [payload, catalogProducts] = await Promise.all([
    fetchMainRecommendations(),
    fetchProductsFromApi().catch(() => []),
  ]);
  const productCatalogMap = new Map(
    (Array.isArray(catalogProducts) ? catalogProducts : []).map((product) => [
      Number(product?.productNo || 0),
      product,
    ])
  );
  const seasonalProducts = Array.isArray(payload?.seasonalProducts)
    ? payload.seasonalProducts
        .map((item) => normalizeSeasonalProduct(item, productCatalogMap))
        .filter(Boolean)
    : [];
  const rankingProducts = Array.isArray(payload?.rankingProducts)
    ? payload.rankingProducts
        .map((item) => normalizeSeasonalProduct(item, productCatalogMap))
        .filter(Boolean)
    : seasonalProducts;
  const popularRecipes = Array.isArray(payload?.popularRecipes)
    ? payload.popularRecipes.map(normalizePopularRecipe).filter(Boolean)
    : [];

  return {
    heroSlides: buildHeroSlides({
      heroSlides: payload?.heroSlides,
      seasonalProducts,
      popularRecipes,
    }),
    seasonalProducts,
    rankingProducts,
    popularRecipes,
  };
}
