const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '';
const TOSS_PAYMENT_API_BASE = `${API_BASE_URL}/api/payments/toss`;

async function parseResponse(response, fallbackMessage) {
  const payload = await response.json().catch(() => null);

  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.message || fallbackMessage);
  }

  return payload?.data;
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
  const data = await parseResponse(
    await fetch(`${TOSS_PAYMENT_API_BASE}/config`),
    'Failed to load Toss Payments config.'
  );

  return {
    ...DEFAULT_TOSS_CONFIG,
    ...(data || {}),
  };
}

export async function confirmTossPaymentOnApi(confirmRequest) {
  return parseResponse(
    await fetch(`${TOSS_PAYMENT_API_BASE}/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(confirmRequest),
    }),
    'Failed to confirm Toss payment.'
  );
}
