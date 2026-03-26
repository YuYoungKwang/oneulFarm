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

  return {
    heroSlides: Array.isArray(payload?.heroSlides)
      ? payload.heroSlides.map(normalizeHeroSlide)
      : [],
    seasonalProducts: Array.isArray(payload?.seasonalProducts)
      ? payload.seasonalProducts.map(normalizeSeasonalProduct).filter(Boolean)
      : [],
    popularRecipes: Array.isArray(payload?.popularRecipes)
      ? payload.popularRecipes.map(normalizePopularRecipe).filter(Boolean)
      : [],
  };
}
