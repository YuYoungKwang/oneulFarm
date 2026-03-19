export const DEFAULT_ROUTE = '#/products';

export const defaultFilters = {
  search: '',
  category: 'ALL',
  priceRange: 'ALL',
  tags: ['UNDER_AVG'],
  sort: 'RECOMMENDED',
};

const currencyFormatter = new Intl.NumberFormat('ko-KR');

export const dateFormatter = new Intl.DateTimeFormat('ko-KR', {
  month: 'long',
  day: 'numeric',
  weekday: 'short',
});

export function formatCurrency(value) {
  return `${currencyFormatter.format(Math.round(value))}원`;
}

export function formatPercent(value) {
  return `${Math.round(value)}%`;
}

export function parseHash(hash) {
  const normalized = hash.replace(/^#/, '').trim();
  const [hashPath] = normalized.split('?');

  if (!hashPath || hashPath === '/') {
    return { page: 'products' };
  }

  const segments = hashPath.split('/').filter(Boolean);

  if (segments[0] === 'cart') {
    return { page: 'cart' };
  }

  if (segments[0] === 'checkout') {
    return { page: 'checkout' };
  }

  if (segments[0] === 'payment-success') {
    return { page: 'payment-success' };
  }

  if (segments[0] === 'payment-fail') {
    return { page: 'payment-fail' };
  }

  if (segments[0] === 'order-complete' && segments[1]) {
    return {
      page: 'order-complete',
      orderId: decodeURIComponent(segments[1]),
    };
  }

  if (segments[0] === 'orders') {
    return {
      page: 'orders',
      orderId: segments[1] ? decodeURIComponent(segments[1]) : null,
    };
  }

  if (segments[0] === 'recipes' && segments[1]) {
    const recipeNo = Number(segments[1]);

    return Number.isNaN(recipeNo)
      ? { page: 'recipes' }
      : { page: 'recipe-detail', recipeNo };
  }

  if (segments[0] === 'recipes') {
    return { page: 'recipes' };
  }

  if (segments[0] === 'products' && segments[1]) {
    const productNo = Number(segments[1]);

    return Number.isNaN(productNo)
      ? { page: 'products' }
      : { page: 'product-detail', productNo };
  }

  // 로그인 라우트 추가
  if (segments[0] === 'login') {
    return { page: 'login' };
  }

  // 회원가입 라우트 추가
  if (segments[0] === 'signup') {
    return { page: 'signup' };
  }

  return { page: 'products' };
}

export function navigateToHash(hash) {
  window.location.hash = hash;
}

export function getSavingAmount(product) {
  const averagePrice = Number(product?.priceSnapshot?.avgPrice || 0);
  const salePrice = Number(product?.salePrice || 0);
  return Math.max(averagePrice - salePrice, 0);
}

export function getDiscountRate(product) {
  return Number(product?.priceMatch?.savingRate || 0);
}

export function getBadgeLabel(product) {
  if (product.priceMatch.badgeType === 'UNDER_AVG') {
    return `${Math.round(product.priceMatch.savingRate)}% 절약`;
  }

  if (product.priceMatch.badgeType === 'HOT_DEAL') {
    return '핫딜';
  }

  if (product.isSeasonal === 'Y') {
    return '제철';
  }

  return '추천';
}

export function getBadgeTone(product) {
  if (product.priceMatch.badgeType === 'HOT_DEAL') {
    return 'yellow';
  }

  if (product.isSeasonal === 'Y') {
    return 'green';
  }

  return 'default';
}

export function getPriceRange(price) {
  if (price < 3000) {
    return 'UNDER_3000';
  }

  if (price <= 5000) {
    return 'FROM_3000_TO_5000';
  }

  return 'OVER_5000';
}

export function isSingleHouseholdFriendly(product) {
  if (typeof product?.isSingleFriendly === 'boolean') {
    return product.isSingleFriendly;
  }

  return Array.isArray(product?.recommendedFor)
    ? product.recommendedFor.includes('Single Friendly')
    : false;
}

export function applyFilters(products, filters, searchKeyword) {
  const keyword = searchKeyword.trim().toLowerCase();

  let filteredProducts = products.filter((product) => {
    if (
      keyword &&
      ![
        product.productName,
        product.categoryName,
        product.origin,
        product.description,
      ]
        .join(' ')
        .toLowerCase()
        .includes(keyword)
    ) {
      return false;
    }

    if (filters.category !== 'ALL' && product.categoryName !== filters.category) {
      return false;
    }

    if (
      filters.priceRange !== 'ALL' &&
      getPriceRange(product.salePrice) !== filters.priceRange
    ) {
      return false;
    }

    if (
      filters.tags.includes('UNDER_AVG') &&
      product.priceMatch.badgeType !== 'UNDER_AVG'
    ) {
      return false;
    }

    if (filters.tags.includes('SEASONAL') && product.isSeasonal !== 'Y') {
      return false;
    }

    if (filters.tags.includes('SINGLE') && !isSingleHouseholdFriendly(product)) {
      return false;
    }

    return product.saleStatus === 'SELLING';
  });

  filteredProducts = [...filteredProducts].sort((left, right) => {
    if (filters.sort === 'LOW_PRICE') {
      return left.salePrice - right.salePrice;
    }

    if (filters.sort === 'HIGH_SAVING') {
      return getSavingAmount(right) - getSavingAmount(left);
    }

    if (filters.sort === 'LATEST') {
      return new Date(right.createdAt) - new Date(left.createdAt);
    }

    return (right.featuredScore || 0) - (left.featuredScore || 0);
  });

  return filteredProducts;
}

export function readStoredValue(key, fallbackValue) {
  try {
    const storedValue = window.localStorage.getItem(key);
    return storedValue ? JSON.parse(storedValue) : fallbackValue;
  } catch (error) {
    return fallbackValue;
  }
}

export function persistValue(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(
      new CustomEvent('oneulFarm:storage-change', {
        detail: { key },
      })
    );
  } catch (error) {
    // Ignore storage failures in local preview.
  }
}
