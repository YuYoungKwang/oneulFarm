import { buildAuthHeaders, requestAuthApi } from '../auth';

const RECOMMEND_API_PATH = '/api/recommendations';
const DASHBOARD_API_PATH = '/api/dashboard';
const PRICE_API_PATH = '/api/prices';

function defaultHeaders() {
  return {
    Accept: 'application/json',
  };
}

export async function fetchPopularSearchesFromApi({
  endDate,
  keywords,
  startDate,
  timeUnit = 'date',
}) {
  const payload = await requestAuthApi(
    `${RECOMMEND_API_PATH}/popular-searches`,
    {
      method: 'POST',
      headers: {
        ...defaultHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        keywords,
        startDate,
        endDate,
        timeUnit,
      }),
    },
    '인기 검색 데이터를 불러오지 못했습니다.'
  );

  return payload.data;
}

export async function fetchDashboardPatternsFromApi(authUser) {
  const payload = await requestAuthApi(
    `${DASHBOARD_API_PATH}/patterns`,
    {
      headers: {
        ...defaultHeaders(),
        ...buildAuthHeaders({ user: authUser }),
      },
    },
    '구매 패턴 데이터를 불러오지 못했습니다.'
  );

  return payload.data;
}

export async function fetchDashboardProductSavingsFromApi(authUser) {
  const payload = await requestAuthApi(
    `${DASHBOARD_API_PATH}/product-savings`,
    {
      headers: {
        ...defaultHeaders(),
        ...buildAuthHeaders({ user: authUser }),
      },
    },
    '상품 절약 데이터를 불러오지 못했습니다.'
  );

  return payload.data;
}

export async function fetchPriceTrendFromApi({
  days = 30,
  itemCode,
  marketType = 'RETAIL',
}) {
  const searchParams = new URLSearchParams();
  searchParams.set('itemCode', itemCode);
  searchParams.set('marketType', marketType);
  searchParams.set('days', String(days));

  const payload = await requestAuthApi(
    `${PRICE_API_PATH}/trend?${searchParams.toString()}`,
    {
      headers: defaultHeaders(),
    },
    '가격 추이 데이터를 불러오지 못했습니다.'
  );

  return payload.data;
}
