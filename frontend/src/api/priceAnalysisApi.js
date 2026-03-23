import { requestAuthApi } from '../auth';

const PRICE_API_PATH = '/api/prices';
const DEFAULT_TIMEOUT_MS = 12000;

function defaultHeaders() {
  return {
    Accept: 'application/json',
  };
}

export async function fetchPriceListFromApi({
  itemName,
  limit = 120,
  marketType = 'RETAIL',
  snapshotDate,
} = {}) {
  const searchParams = new URLSearchParams();

  if (itemName) {
    searchParams.set('itemName', itemName);
  }
  if (marketType) {
    searchParams.set('marketType', marketType);
  }
  if (snapshotDate) {
    searchParams.set('snapshotDate', snapshotDate);
  }
  if (limit) {
    searchParams.set('limit', String(limit));
  }

  const payload = await requestAuthApi(
    `${PRICE_API_PATH}?${searchParams.toString()}`,
    {
      headers: defaultHeaders(),
    },
    '시세 목록을 불러오지 못했습니다.'
  );

  return payload.data;
}

export async function fetchPriceTrendFromApi({
  days = 365,
  itemCode,
  marketType = 'RETAIL',
  signal,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}) {
  const abortController =
    typeof AbortController !== 'undefined' && !signal ? new AbortController() : null;
  const requestSignal = signal || abortController?.signal;
  const timeoutId =
    abortController != null
      ? window.setTimeout(() => abortController.abort(), timeoutMs)
      : null;

  const searchParams = new URLSearchParams();
  searchParams.set('itemCode', itemCode);
  searchParams.set('marketType', marketType);
  searchParams.set('days', String(days));

  try {
    const payload = await requestAuthApi(
      `${PRICE_API_PATH}/trend?${searchParams.toString()}`,
      {
        headers: defaultHeaders(),
        signal: requestSignal,
      },
      '시세 추이를 불러오지 못했습니다.'
    );

    return payload.data;
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('시세 추이 응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.');
    }
    throw error;
  } finally {
    if (timeoutId) {
      window.clearTimeout(timeoutId);
    }
  }
}
