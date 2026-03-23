import { buildAuthHeaders } from '../auth';

const API_BASE_PREFIXES = buildApiBasePrefixes(
  process.env.REACT_APP_API_BASE_URL || ''
);
const PRODUCT_API_BASE = '/api/products';
const CART_API_BASE = '/api/cart';
const ORDER_API_BASE = '/api/orders';
let resolvedApiBasePrefix = '';

const PRODUCT_SYMBOLS = ['🥬', '🧅', '🍅', '🥒', '🍎', '🍄', '🌿', '🌾'];
const RECIPE_SYMBOLS = ['🍳', '🥗', '🥘', '🍲'];
const GALLERY_SYMBOLS = ['📦', '🥗', '📍', '🛒'];
const DISPLAY_PALETTES = [
  { softColor: '#fff6dd', strongColor: '#f3c85b', glowColor: 'rgba(243, 200, 91, 0.34)' },
  { softColor: '#fff0ef', strongColor: '#ef7f74', glowColor: 'rgba(239, 127, 116, 0.32)' },
  { softColor: '#eef8ef', strongColor: '#81c784', glowColor: 'rgba(129, 199, 132, 0.34)' },
  { softColor: '#f6f1ea', strongColor: '#b98b64', glowColor: 'rgba(185, 139, 100, 0.3)' },
];

async function parseResponse(response, fallbackMessage) {
  const payload = await response.json().catch(() => null);

  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.message || fallbackMessage);
  }

  return payload?.data;
}

function buildApiBasePrefixes(explicitBaseUrl) {
  const normalizedBaseUrl = normalizeBaseUrl(explicitBaseUrl);
  if (normalizedBaseUrl) {
    return [normalizedBaseUrl];
  }

  return ['/backend'];
}

function normalizeBaseUrl(value) {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return '';
  }

  return trimmedValue.replace(/\/+$/, '');
}

async function requestApi(path, options, fallbackMessage) {
  let lastError = null;

  for (const basePrefix of API_BASE_PREFIXES) {
    try {
      const response = await fetch(`${basePrefix}${path}`, options);
      const data = await parseResponse(response, fallbackMessage);
      resolvedApiBasePrefix = basePrefix;
      return data;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error(fallbackMessage);
}

function apiHeaders(includeJson = false) {
  return buildAuthHeaders({
    includeJson,
    includeUserNo: false,
  });
}

function toNumber(value, fallback = 0) {
  const nextValue = Number(value);
  return Number.isFinite(nextValue) ? nextValue : fallback;
}

function getProductImageUrl(imageNo) {
  if (!imageNo) {
    return '';
  }

  const explicitBaseUrl = normalizeBaseUrl(process.env.REACT_APP_API_BASE_URL || '');
  const basePrefix = explicitBaseUrl || resolvedApiBasePrefix || '';
  return `${basePrefix}/api/image/product/${imageNo}`;
}

function enrichProductImages(images = []) {
  return images.map((image) => ({
    ...image,
    imageUrl: image.imageUrl || getProductImageUrl(image.imageNo),
  }));
}

function buildDisplay(productNo) {
  const index = Math.abs(Number(productNo || 0)) % PRODUCT_SYMBOLS.length;
  const palette = DISPLAY_PALETTES[index % DISPLAY_PALETTES.length];

  return {
    symbol: PRODUCT_SYMBOLS[index],
    softColor: palette.softColor,
    strongColor: palette.strongColor,
    glowColor: palette.glowColor,
  };
}

function isSingleFriendly(rawProduct) {
  const packageWeight = toNumber(rawProduct.packageWeight, 0);

  if (rawProduct.unit === 'ea') {
    return packageWeight <= 2;
  }

  if (rawProduct.unit === 'g') {
    return packageWeight <= 500;
  }

  if (rawProduct.unit === 'kg') {
    return packageWeight <= 1;
  }

  return toNumber(rawProduct.salePrice, 0) <= 5000;
}

function buildRecommendedTags(rawProduct) {
  const tags = [];

  if (rawProduct.badgeType === 'UNDER_AVG') {
    tags.push('평균가 이하');
  }

  if (rawProduct.isSeasonal === 'Y') {
    tags.push('제철');
  }

  if (isSingleFriendly(rawProduct)) {
    tags.push('1인 가구 추천');
  }

  if (!tags.length) {
    tags.push('오늘 추천');
  }

  return tags;
}

function buildGalleryItems(rawProduct, display) {
  if (Array.isArray(rawProduct.images) && rawProduct.images.length) {
    return rawProduct.images.map((image, index) => ({
      imageNo: image.imageNo,
      label: image.imageName || `이미지 ${index + 1}`,
      symbol: index === 0 ? display.symbol : GALLERY_SYMBOLS[index % GALLERY_SYMBOLS.length],
      imageUrl: image.imageUrl || getProductImageUrl(image.imageNo),
      note: image.isMain === 'Y' ? '대표 이미지' : `이미지 ${index + 1}`,
      isMain: image.isMain || (index === 0 ? 'Y' : 'N'),
      sortOrder: image.sortOrder || index + 1,
      isPlaceholder: false,
    }));
  }

  return GALLERY_SYMBOLS.map((symbol, index) => ({
    imageNo: null,
    label: `이미지 ${index + 1}`,
    symbol: index === 0 ? display.symbol : symbol,
    imageUrl: '',
    note: '미리보기 이미지',
    isMain: index === 0 ? 'Y' : 'N',
    sortOrder: index + 1,
    isPlaceholder: true,
  }));
}

function buildRecipes(rawRecipes = []) {
  return rawRecipes.map((recipe, index) => ({
    mapNo: recipe.mapNo,
    recipeNo: recipe.recipeNo,
    recipeName: recipe.recipeName,
    cookTime: recipe.cookTime || '15 min',
    difficulty: recipe.difficulty || 'Easy',
    matchScore: toNumber(recipe.matchScore, 0),
    symbol: RECIPE_SYMBOLS[index % RECIPE_SYMBOLS.length],
  }));
}

function buildReviews(rawReviews = []) {
  return rawReviews.map((review) => ({
    reviewNo: review.reviewNo,
    author: review.author || 'User',
    rating: toNumber(review.rating, 0),
    content: review.content || '',
    createdAt: review.createdAt,
  }));
}

function buildProductModel(rawProduct) {
  const display = buildDisplay(rawProduct.productNo);
  const images = enrichProductImages(buildGalleryItems(rawProduct, display));
  const avgPrice = toNumber(rawProduct.avgPrice, toNumber(rawProduct.salePrice, 0));
  const salePrice = toNumber(rawProduct.salePrice, 0);
  const savingRate = toNumber(
    rawProduct.savingRate,
    avgPrice > 0 ? ((avgPrice - salePrice) / avgPrice) * 100 : 0
  );
  const priceGap = toNumber(rawProduct.priceGap, Math.max(avgPrice - salePrice, 0));
  const recommendedFor = buildRecommendedTags(rawProduct);

  return {
    productNo: rawProduct.productNo,
    categoryNo: rawProduct.categoryNo,
    categoryName: rawProduct.categoryName,
    productName: rawProduct.productName,
    origin: rawProduct.origin || '',
    unit: rawProduct.unit || '',
    packageWeight: toNumber(rawProduct.packageWeight, 0),
    salePrice,
    stockQty: toNumber(rawProduct.stockQty, 0),
    description: rawProduct.description || '',
    isSeasonal: rawProduct.isSeasonal || 'N',
    saleStatus: rawProduct.saleStatus || 'READY',
    createdAt: rawProduct.createdAt,
    featuredScore: Math.round(
      savingRate * 3 +
      (rawProduct.isSeasonal === 'Y' ? 10 : 0) +
      Math.min(toNumber(rawProduct.reviewCount, 0) * 2, 10) +
      toNumber(rawProduct.averageRating, 0) * 5
    ),
    storageMethod: rawProduct.unit === 'g' ? '냉장 보관 권장' : '서늘한 곳에 보관',
    purchaseNote: rawProduct.isSeasonal === 'Y' ? '주문 후 신선하게 소분' : '품질을 보고 선별한 상품',
    deliveryInfo: '오후 2시 이전 주문 시 당일 출고',
    recommendedFor,
    isSingleFriendly: isSingleFriendly(rawProduct),
    display,
    images,
    mainImage: images.find((image) => image.isMain === 'Y') || images[0] || null,
    priceSnapshot: {
      snapshotNo: rawProduct.snapshotNo,
      itemCode: rawProduct.itemCode || rawProduct.productName,
      itemName: rawProduct.itemName || rawProduct.productName,
      marketType: rawProduct.marketType || 'RETAIL',
      unit: rawProduct.snapshotUnit || rawProduct.unit || '',
      avgPrice,
      minPrice: toNumber(rawProduct.minPrice, avgPrice),
      maxPrice: toNumber(rawProduct.maxPrice, Math.max(avgPrice, salePrice)),
      changeRate: toNumber(rawProduct.changeRate, 0),
      snapshotDate: rawProduct.snapshotDate || rawProduct.createdAt,
      sourceName: rawProduct.sourceName || 'KAMIS',
    },
    priceMatch: {
      matchNo: rawProduct.matchNo,
      comparedPrice: toNumber(rawProduct.comparedPrice, salePrice),
      priceGap,
      savingRate,
      badgeType: rawProduct.badgeType || (salePrice < avgPrice ? 'UNDER_AVG' : 'HOT_DEAL'),
    },
    recipes: buildRecipes(rawProduct.recipes),
    reviews: buildReviews(rawProduct.reviews),
  };
}

function adaptCartResponse(rawCart) {
  return (rawCart?.items || []).reduce((cartMap, item) => ({
    ...cartMap,
    [item.productNo]: toNumber(item.quantity, 0),
  }), {});
}

function adaptOrderDetail(rawDetail, options = {}) {
  const orderInfo = rawDetail?.orderInfo || rawDetail || {};
  const deliveryInfo = rawDetail?.deliveryInfo || rawDetail || {};
  const paymentInfo = rawDetail?.paymentInfo || rawDetail || {};
  const amountSummary = rawDetail?.amountSummary || rawDetail || {};
  const items = (rawDetail?.items || []).map((item) => ({
    orderItemNo: item.orderItemNo,
    productNo: item.productNo,
    productName: item.productName,
    unitPrice: toNumber(item.unitPrice, 0),
    quantity: toNumber(item.quantity, 0),
    subtotal: toNumber(item.subtotal, 0),
    marketAvgPrice: toNumber(item.marketAvgPrice, 0),
    savedAmount: toNumber(item.savedAmount, 0),
    savingRate: toNumber(item.savingRate, 0),
  }));

  return {
    orderNo: orderInfo.orderNo,
    orderId: orderInfo.orderId,
    orderStatus: orderInfo.orderStatus,
    totalAmount: toNumber(amountSummary.totalAmount, 0),
    discountAmount: toNumber(amountSummary.discountAmount, 0),
    deliveryFee: toNumber(amountSummary.deliveryFee, 0),
    finalAmount: toNumber(amountSummary.finalAmount, 0),
    recipientName: deliveryInfo.recipientName || '',
    recipientPhone: deliveryInfo.recipientPhone || '',
    zipCode: deliveryInfo.zipCode || '',
    address1: deliveryInfo.address1 || '',
    address2: deliveryInfo.address2 || '',
    deliveryMessage: options.deliveryMessage || '',
    orderedAt: orderInfo.orderedAt,
    payment: {
      paymentMethod: paymentInfo.paymentMethod || 'CARD',
      paymentStatus: paymentInfo.paymentStatus || 'READY',
      paidAmount: toNumber(paymentInfo.paidAmount, 0),
      paidAt: paymentInfo.paidAt || null,
    },
    delivery: {
      courierName: deliveryInfo.courierName || '',
      trackingNo: deliveryInfo.trackingNo || '',
      deliveryStatus: deliveryInfo.deliveryStatus || 'READY',
      deliveredAt: deliveryInfo.deliveredAt || null,
    },
    items,
    totalSavedAmount: toNumber(amountSummary.totalSavedAmount, 0),
  };
}

export async function fetchProductsFromApi() {
  const data = await requestApi(PRODUCT_API_BASE, undefined, 'Failed to load products.');

  return (data || []).map(buildProductModel);
}

export async function fetchProductDetailFromApi(productNo) {
  const data = await requestApi(
    `${PRODUCT_API_BASE}/${productNo}`,
    undefined,
    'Failed to load product detail.'
  );

  return buildProductModel(data || {});
}

export async function fetchCartFromApi() {
  const data = await requestApi(
    `${CART_API_BASE}/me`,
    {
      headers: apiHeaders(),
    },
    'Failed to load cart.'
  );

  return adaptCartResponse(data);
}

export async function addCartItemToApi(productNo, quantity) {
  const data = await requestApi(
    `${CART_API_BASE}/me/items`,
    {
      method: 'POST',
      headers: apiHeaders(true),
      body: JSON.stringify({ productNo, quantity }),
    },
    'Failed to add cart item.'
  );

  return adaptCartResponse(data);
}

export async function updateCartItemOnApi(productNo, quantity) {
  const data = await requestApi(
    `${CART_API_BASE}/me/items/${productNo}`,
    {
      method: 'PATCH',
      headers: apiHeaders(true),
      body: JSON.stringify({ quantity }),
    },
    'Failed to update cart item.'
  );

  return adaptCartResponse(data);
}

export async function removeCartItemFromApi(productNo) {
  const data = await requestApi(
    `${CART_API_BASE}/me/items/${productNo}`,
    {
      method: 'DELETE',
      headers: apiHeaders(),
    },
    'Failed to remove cart item.'
  );

  return adaptCartResponse(data);
}

export async function clearCartOnApi() {
  const data = await requestApi(
    `${CART_API_BASE}/me/items`,
    {
      method: 'DELETE',
      headers: apiHeaders(),
    },
    'Failed to clear cart.'
  );

  return adaptCartResponse(data);
}

export async function fetchOrdersFromApi() {
  const list = await requestApi(
    `${ORDER_API_BASE}/me`,
    {
      headers: apiHeaders(),
    },
    'Failed to load orders.'
  );

  const details = await Promise.all(
    (list || []).map(async (order) => {
      const detail = await requestApi(
        `${ORDER_API_BASE}/me/${order.orderNo}`,
        {
          headers: apiHeaders(),
        },
        'Failed to load order detail.'
      );

      return adaptOrderDetail(detail);
    })
  );

  return details;
}

export async function createOrderOnApi(checkoutForm) {
  const data = await requestApi(
    `${ORDER_API_BASE}/me`,
    {
      method: 'POST',
      headers: apiHeaders(true),
      body: JSON.stringify(checkoutForm),
    },
    'Failed to create order.'
  );

  return adaptOrderDetail(data, {
    deliveryMessage: checkoutForm.deliveryMessage || '',
  });
}

export async function advanceOrderOnApi(orderNo, deliveryMessage = '') {
  const data = await requestApi(
    `${ORDER_API_BASE}/me/${orderNo}/advance`,
    {
      method: 'PATCH',
      headers: apiHeaders(),
    },
    'Failed to update order status.'
  );

  return adaptOrderDetail(data, { deliveryMessage });
}
