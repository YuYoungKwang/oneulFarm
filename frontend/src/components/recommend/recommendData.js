import { buildProductImageSources } from "../../api/productApi";
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

function normalizeHeroSlide(item, index) {
  return {
    key: item?.key || `main-slide-${index}`,
    eyebrow: item?.eyebrow || "",
    title: item?.title || "",
    desc: item?.desc || "",
    primaryLabel: item?.primaryLabel || "",
    primaryHref: item?.primaryHref || "",
    secondaryLabel: item?.secondaryLabel || "",
    secondaryHref: item?.secondaryHref || "",
    imageUrl: item?.imageUrl || "",
  };
}

function buildRecipeHeroSlide(recipe, index) {
  if (!recipe?.recipeNo) {
    return null;
  }

  const ingredientText = Array.isArray(recipe?.matchedIngredients)
    ? recipe.matchedIngredients.filter(Boolean).slice(0, 2).join(", ")
    : "";

  return {
    key: `recipe-slide-${recipe.recipeNo || index}`,
    eyebrow: index === 0 ? "Popular Recipe" : "Recipe Match",
    title: recipe.recipeName || "추천 레시피",
    desc:
      recipe?.summary ||
      (ingredientText
        ? `${ingredientText} 재료를 활용한 레시피를 바로 확인해보세요.`
        : "지금 많이 보는 레시피를 메인에서 바로 확인해보세요."),
    primaryLabel: "레시피 보기",
    primaryHref: `#/recipes/${recipe.recipeNo}`,
    secondaryLabel: ingredientText ? "관련 레시피" : "레시피 전체 보기",
    secondaryHref: ingredientText
      ? `#/recipes?ingredientKeyword=${encodeURIComponent(
          ingredientText.split(",")[0].trim()
        )}`
      : "#/recipes",
    imageUrl: recipe?.imageUrl || "",
  };
}

function buildMealPlanHeroSlide() {
  return {
    key: "meal-plan-slide",
    eyebrow: "Meal Plan",
    title: "맞춤 식단 추천",
    desc: "식단 목표와 재료 취향에 맞는 식사 계획을 바로 이어서 확인할 수 있어요.",
    primaryLabel: "식단 보러가기",
    primaryHref: "#/meal-plan",
    secondaryLabel: "추천 레시피",
    secondaryHref: "#/recipes",
    imageUrl: "",
  };
}

function buildSeasonalHeroSlide(item) {
  const seasonalProduct = item?.product;
  if (!seasonalProduct?.productNo) {
    return null;
  }

  const imageSources = buildProductImageSources(seasonalProduct);
  const mainImageUrl = Array.isArray(seasonalProduct?.images)
    ? seasonalProduct.images.find((image) => image?.isMain === "Y")?.imageUrl ||
      seasonalProduct.images[0]?.imageUrl ||
      ""
    : "";

  const recipeText = Array.isArray(item?.linkedRecipes)
    ? item.linkedRecipes
        .map((recipe) => recipe?.recipeName)
        .filter(Boolean)
        .slice(0, 2)
        .join(", ")
    : "";

  return {
    key: `seasonal-slide-${seasonalProduct.productNo}`,
    eyebrow: "Seasonal Menu",
    title: "제철상품",
    desc:
      item?.summary ||
      (recipeText
        ? `${seasonalProduct.productName || "제철 재료"}로 ${recipeText} 같은 메뉴를 준비해보세요.`
        : `${seasonalProduct.productName || "제철 재료"}를 활용한 요리를 메인에서 바로 확인해보세요.`),
    primaryLabel: "제철 재료 보기",
    primaryHref: `#/products/${seasonalProduct.productNo}`,
    secondaryLabel: recipeText ? "관련 레시피" : "상품 전체 보기",
    secondaryHref: recipeText ? "#/recipes" : "#/products",
    imageUrl:
      imageSources[0] ||
      mainImageUrl ||
      seasonalProduct.imageUrl ||
      "",
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

  const nextSlides = [
    buildMealPlanHeroSlide(),
    seasonalSlide,
    firstRecipeSlide,
  ].filter(Boolean);

  if (nextSlides.length > 0) {
    return nextSlides;
  }

  return fallbackSlides;
}

function normalizeSeasonalProduct(item) {
  if (!item?.product?.productNo) {
    return null;
  }

  const salePrice = toNumber(item.product.salePrice);
  const avgPrice = toNumber(item.avgPrice, salePrice);
  const savingRate =
    avgPrice > 0 && salePrice > 0 && salePrice < avgPrice
      ? ((avgPrice - salePrice) / avgPrice) * 100
      : 0;

  return {
    badges: Array.isArray(item?.badges) ? item.badges.filter(Boolean) : [],
    detail: item?.linkedRecipes?.length
      ? item.linkedRecipes.map((recipe) => recipe.recipeName).filter(Boolean).join(" / ")
      : "",
    metricLabel: avgPrice > 0 ? "\uD3C9\uADE0\uAC00" : "",
    metricValue: avgPrice > 0 ? `${Math.round(avgPrice).toLocaleString("ko-KR")}\uC6D0` : "",
    product: {
      ...item.product,
      images: buildProductImageList(item.product),
      priceSnapshot: {
        avgPrice,
        displayAvgPrice: avgPrice,
      },
      priceMatch: {
        comparedPrice: avgPrice,
        savingRate,
      },
    },
    summary: item?.summary || "",
    typeLabel: "\uC81C\uCCA0",
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
    imageUrl: item?.imageUrl || "",
  };
}

export function buildEmptyRecommendData() {
  return {
    heroSlides: [],
    seasonalProducts: [],
    popularRecipes: [],
  };
}

export async function loadRecommendData() {
  const payload = await fetchMainRecommendations();
  const seasonalProducts = Array.isArray(payload?.seasonalProducts)
    ? payload.seasonalProducts.map(normalizeSeasonalProduct).filter(Boolean)
    : [];
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
    popularRecipes,
  };
}
