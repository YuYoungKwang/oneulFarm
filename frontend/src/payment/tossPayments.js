const TOSS_SCRIPT_URL = 'https://js.tosspayments.com/v2/standard';
const PENDING_TOSS_PAYMENT_KEY = 'oneulFarmPendingTossPayment';
const ANONYMOUS_CUSTOMER_KEY = 'guest.oneulFarm';

let tossScriptPromise = null;

function mapTossMethod(paymentMethod) {
  if (paymentMethod === 'BANK') {
    return 'TRANSFER';
  }

  if (paymentMethod === 'EASY_PAY') {
    return 'EASY_PAY';
  }

  return 'CARD';
}

function buildOrderName(cartItems) {
  if (!cartItems.length) {
    return '\uC624\uB298\uC758 \uB18D\uC0B0\uBB3C';
  }

  const [firstItem] = cartItems;
  if (cartItems.length === 1) {
    return firstItem.product.productName;
  }

  return `${firstItem.product.productName} \uC678 ${cartItems.length - 1}\uAC74`;
}

function buildTossOrderId() {
  return `OFT-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function buildBaseUrl() {
  return `${window.location.origin}${window.location.pathname}`;
}

function loadTossPaymentsScript() {
  if (window.TossPayments) {
    return Promise.resolve(window.TossPayments);
  }

  if (tossScriptPromise) {
    return tossScriptPromise;
  }

  tossScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector(
      `script[src="${TOSS_SCRIPT_URL}"]`
    );
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(window.TossPayments), {
        once: true,
      });
      existingScript.addEventListener(
        'error',
        () => reject(new Error('Failed to load Toss Payments SDK.')),
        {
          once: true,
        }
      );
      return;
    }

    const script = document.createElement('script');
    script.src = TOSS_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve(window.TossPayments);
    script.onerror = () => reject(new Error('Failed to load Toss Payments SDK.'));
    document.head.appendChild(script);
  });

  return tossScriptPromise;
}

export function isTossReady(tossConfig) {
  return Boolean(tossConfig?.ready && tossConfig?.clientKey);
}

export function createTossPaymentDraft(checkoutForm, cartItems) {
  const amount = cartItems.reduce(
    (sum, item) => sum + item.product.salePrice * item.quantity,
    0
  );
  const orderId = buildTossOrderId();
  const baseUrl = buildBaseUrl();

  return {
    provider: 'TOSS',
    orderId,
    orderName: buildOrderName(cartItems),
    amount,
    paymentMethod: checkoutForm.paymentMethod,
    customerName: checkoutForm.recipientName,
    customerMobilePhone: checkoutForm.recipientPhone,
    checkoutForm,
    successUrl: `${baseUrl}#/payment-success`,
    failUrl: `${baseUrl}#/payment-fail`,
  };
}

export async function requestTossPayment(tossConfig, paymentDraft) {
  if (!isTossReady(tossConfig)) {
    throw new Error('Toss Payments client key is not configured.');
  }

  const TossPayments = await loadTossPaymentsScript();
  if (typeof TossPayments !== 'function') {
    throw new Error('Toss Payments SDK is not available.');
  }

  const tossPayments = TossPayments(tossConfig.clientKey);
  const payment = tossPayments.payment({
    customerKey: ANONYMOUS_CUSTOMER_KEY,
  });

  return payment.requestPayment({
    method: mapTossMethod(paymentDraft.paymentMethod),
    amount: {
      currency: 'KRW',
      value: paymentDraft.amount,
    },
    orderId: paymentDraft.orderId,
    orderName: paymentDraft.orderName,
    customerName: paymentDraft.customerName,
    customerMobilePhone: paymentDraft.customerMobilePhone,
    successUrl: paymentDraft.successUrl,
    failUrl: paymentDraft.failUrl,
  });
}

export function storePendingTossPayment(paymentDraft) {
  window.sessionStorage.setItem(
    PENDING_TOSS_PAYMENT_KEY,
    JSON.stringify(paymentDraft)
  );
}

export function readPendingTossPayment() {
  try {
    const storedDraft = window.sessionStorage.getItem(PENDING_TOSS_PAYMENT_KEY);
    return storedDraft ? JSON.parse(storedDraft) : null;
  } catch (error) {
    return null;
  }
}

export function clearPendingTossPayment() {
  window.sessionStorage.removeItem(PENDING_TOSS_PAYMENT_KEY);
}

export function readTossCallbackParams(location = window.location) {
  const params = new URLSearchParams(location.search);
  const hash = location.hash || '';
  const hashQueryIndex = hash.indexOf('?');

  if (hashQueryIndex >= 0) {
    const hashParams = new URLSearchParams(hash.slice(hashQueryIndex + 1));
    hashParams.forEach((value, key) => {
      if (!params.has(key)) {
        params.set(key, value);
      }
    });
  }

  return {
    paymentKey: params.get('paymentKey') || '',
    orderId: params.get('orderId') || '',
    amount: Number(params.get('amount') || 0),
    code: params.get('code') || '',
    message: params.get('message') || '',
  };
}
