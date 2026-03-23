const API_BASE_PREFIXES = buildApiBasePrefixes(
  process.env.REACT_APP_API_BASE_URL || ''
);
const ADMIN_API_BASE = '/api/admin';
const RECIPE_SYNC_API_BASE = '/api/admin/recipes/sync';
const DEMO_USER_NO = '1';
let resolvedApiBasePrefix = '';

function buildApiBasePrefixes(explicitBaseUrl) {
  const normalizedBaseUrl = normalizeBaseUrl(explicitBaseUrl);
  if (normalizedBaseUrl) {
    return [normalizedBaseUrl];
  }

  return ['', '/backend'];
}

function normalizeBaseUrl(value) {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return '';
  }

  return trimmedValue.replace(/\/+$/, '');
}

async function parseResponse(response, fallbackMessage) {
  const payload = await response.json().catch(() => null);

  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.message || fallbackMessage);
  }

  return payload?.data;
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
  const headers = {
    'X-USER-NO': DEMO_USER_NO,
  };

  if (includeJson) {
    headers['Content-Type'] = 'application/json';
  }

  return headers;
}

export async function fetchAdminProductCategories() {
  return (
    (await requestApi(
      `${ADMIN_API_BASE}/product-categories`,
      undefined,
      '상품 카테고리를 불러오지 못했습니다.'
    )) || []
  );
}

export async function fetchAdminProducts() {
  return (
    (await requestApi(
      `${ADMIN_API_BASE}/products`,
      undefined,
      '관리자 상품 목록을 불러오지 못했습니다.'
    )) || []
  );
}

export async function saveAdminProduct(product) {
  const isUpdate = Boolean(product?.productNo);
  return requestApi(
    isUpdate ? `${ADMIN_API_BASE}/products/${product.productNo}` : `${ADMIN_API_BASE}/products`,
    {
      method: isUpdate ? 'PATCH' : 'POST',
      headers: apiHeaders(true),
      body: JSON.stringify(product),
    },
    '상품 저장에 실패했습니다.'
  );
}

export async function deleteAdminProduct(productNo) {
  return requestApi(
    `${ADMIN_API_BASE}/products/${productNo}`,
    {
      method: 'DELETE',
      headers: apiHeaders(),
    },
    '상품 삭제에 실패했습니다.'
  );
}

export async function fetchAdminOrders() {
  return (
    (await requestApi(
      `${ADMIN_API_BASE}/orders`,
      {
        headers: apiHeaders(),
      },
      '관리자 주문 목록을 불러오지 못했습니다.'
    )) || []
  );
}

export async function uploadAdminProductImages(productNo, files) {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });

  return requestApi(
    `${ADMIN_API_BASE}/products/${productNo}/images`,
    {
      method: 'POST',
      headers: apiHeaders(),
      body: formData,
    },
    '상품 이미지 업로드에 실패했습니다.'
  );
}

export async function fetchAdminOrderDetail(orderNo) {
  return requestApi(
    `${ADMIN_API_BASE}/orders/${orderNo}`,
    {
      headers: apiHeaders(),
    },
    '주문 상세를 불러오지 못했습니다.'
  );
}

export async function updateAdminOrder(orderNo, payload) {
  return requestApi(
    `${ADMIN_API_BASE}/orders/${orderNo}`,
    {
      method: 'PATCH',
      headers: apiHeaders(true),
      body: JSON.stringify(payload),
    },
    '주문 상태 변경에 실패했습니다.'
  );
}

export async function deleteAdminOrder(orderNo) {
  return requestApi(
    `${ADMIN_API_BASE}/orders/${orderNo}`,
    {
      method: 'DELETE',
      headers: apiHeaders(),
    },
    '주문 정보 제거에 실패했습니다.'
  );
}

export async function fetchAdminUsers() {
  return (
    (await requestApi(
      `${ADMIN_API_BASE}/users`,
      {
        headers: apiHeaders(),
      },
      '회원 목록을 불러오지 못했습니다.'
    )) || []
  );
}

export async function updateAdminUserStatus(userNo, status) {
  return requestApi(
    `${ADMIN_API_BASE}/users/${userNo}`,
    {
      method: 'PATCH',
      headers: apiHeaders(true),
      body: JSON.stringify({ status }),
    },
    '회원 상태 변경에 실패했습니다.'
  );
}

export async function deleteAdminUser(userNo) {
  return requestApi(
    `${ADMIN_API_BASE}/users/${userNo}`,
    {
      method: 'DELETE',
      headers: apiHeaders(),
    },
    '\ud68c\uc6d0 \uc644\uc804 \uc0ad\uc81c\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4.'
  );
}

export async function fetchAdminPurchases() {
  return (
    (await requestApi(
      `${ADMIN_API_BASE}/purchases`,
      {
        headers: apiHeaders(),
      },
      '매입 이력을 불러오지 못했습니다.'
    )) || []
  );
}

export async function fetchAdminPackageHistories() {
  return (
    (await requestApi(
      `${ADMIN_API_BASE}/package-histories`,
      {
        headers: apiHeaders(),
      },
      '소분 이력을 불러오지 못했습니다.'
    )) || []
  );
}

export async function createAdminPurchaseBatch(payload) {
  return requestApi(
    `${ADMIN_API_BASE}/purchases`,
    {
      method: 'POST',
      headers: apiHeaders(true),
      body: JSON.stringify(payload),
    },
    '매입 등록에 실패했습니다.'
  );
}

export async function createAdminPackageHistory(batchNo, payload) {
  return requestApi(
    `${ADMIN_API_BASE}/purchases/${batchNo}/package`,
    {
      method: 'POST',
      headers: apiHeaders(true),
      body: JSON.stringify(payload),
    },
    '소분 처리에 실패했습니다.'
  );
}

export async function fetchAdminBanners() {
  return (
    (await requestApi(
      `${ADMIN_API_BASE}/content/banners`,
      {
        headers: apiHeaders(),
      },
      '배너 목록을 불러오지 못했습니다.'
    )) || []
  );
}

export async function fetchAdminRecipeMappings() {
  return (
    (await requestApi(
      `${ADMIN_API_BASE}/content/recipe-mappings`,
      {
        headers: apiHeaders(),
      },
      '레시피 매핑 목록을 불러오지 못했습니다.'
    )) || []
  );
}

export async function triggerAdminRecipeSync() {
  return requestApi(
    RECIPE_SYNC_API_BASE,
    {
      method: 'POST',
      headers: apiHeaders(),
    },
    '레시피 동기화 요청에 실패했습니다.'
  );
}

export function getAdminBannerImageUrl(bannerNo) {
  const explicitBaseUrl = normalizeBaseUrl(process.env.REACT_APP_API_BASE_URL || '');
  const basePrefix = explicitBaseUrl || resolvedApiBasePrefix || '';
  return `${basePrefix}/api/image/banner/${bannerNo}`;
}

export function getAdminProductImageUrl(imageNo) {
  const explicitBaseUrl = normalizeBaseUrl(process.env.REACT_APP_API_BASE_URL || '');
  const basePrefix = explicitBaseUrl || resolvedApiBasePrefix || '';
  return `${basePrefix}/api/image/product/${imageNo}`;
}
