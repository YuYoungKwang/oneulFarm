const API_BASE_PREFIXES = buildApiBasePrefixes(
  process.env.REACT_APP_API_BASE_URL || ''
);
const TOSS_PAYMENT_API_BASE = '/api/payments/toss';

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
      return await parseResponse(response, fallbackMessage);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error(fallbackMessage);
}

export const DEFAULT_TOSS_CONFIG = {
  provider: 'TOSS',
  clientKey: '',
  clientKeyConfigured: false,
  secretKeyConfigured: false,
  ready: false,
  mode: 'UNCONFIGURED',
};

export async function fetchTossPaymentConfigFromApi() {
  const data = await requestApi(
    `${TOSS_PAYMENT_API_BASE}/config`,
    undefined,
    'Failed to load Toss Payments config.'
  );

  return {
    ...DEFAULT_TOSS_CONFIG,
    ...(data || {}),
  };
}

export async function confirmTossPaymentOnApi(confirmRequest) {
  return requestApi(
    `${TOSS_PAYMENT_API_BASE}/confirm`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(confirmRequest),
    },
    'Failed to confirm Toss payment.'
  );
}
