import * as PortOne from '@portone/browser-sdk/v2';

const PENDING_PORTONE_PAYMENT_KEY = 'oneulFarmPendingPortOnePayment';

function buildOrderName(cartItems) {
  if (!Array.isArray(cartItems) || !cartItems.length) {
    return 'oneulFarm order';
  }

  const [firstItem] = cartItems;
  if (cartItems.length === 1) {
    return firstItem.product.productName;
  }

  return `${firstItem.product.productName} 외 ${cartItems.length - 1}건`;
}

function buildPaymentId() {
  const timePart = Date.now().toString(36);
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `of_${timePart}_${randomPart}`.slice(0, 32);
}

function buildBaseUrl() {
  return `${window.location.origin}${window.location.pathname}`;
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function resolveChannelKeys(paymentConfig) {
  return {
    card: normalizeText(paymentConfig?.channelKeys?.card || paymentConfig?.channelKey),
    virtualAccount: normalizeText(
      paymentConfig?.channelKeys?.virtualAccount || paymentConfig?.channelKey
    ),
    kakaoPay: normalizeText(paymentConfig?.channelKeys?.kakaoPay),
    tossPay: normalizeText(paymentConfig?.channelKeys?.tossPay),
  };
}

export function isPortOneReady(paymentConfig) {
  const channelKeys = resolveChannelKeys(paymentConfig);
  const hasAnyChannel = Object.values(channelKeys).some(Boolean);

  return Boolean(paymentConfig?.ready && paymentConfig?.storeId && hasAnyChannel);
}

export function getPortOnePaymentOptions(paymentConfig) {
  const channelKeys = resolveChannelKeys(paymentConfig);
  const options = [];

  if (channelKeys.card) {
    options.push({
      method: 'CARD',
      provider: '',
      label: '카드 결제',
      channelKey: channelKeys.card,
      payMethod: 'CARD',
    });
  }

  if (channelKeys.virtualAccount) {
    options.push({
      method: 'BANK',
      provider: '',
      label: '가상계좌',
      channelKey: channelKeys.virtualAccount,
      payMethod: 'VIRTUAL_ACCOUNT',
    });
  }

  if (channelKeys.kakaoPay) {
    options.push({
      method: 'EASY_PAY',
      provider: 'KAKAOPAY',
      label: '카카오페이',
      channelKey: channelKeys.kakaoPay,
      payMethod: 'EASY_PAY',
      easyPayProvider: 'KAKAOPAY',
    });
  }

  if (channelKeys.tossPay) {
    options.push({
      method: 'EASY_PAY',
      provider: 'TOSSPAY',
      label: '토스페이',
      channelKey: channelKeys.tossPay,
      payMethod: 'EASY_PAY',
      easyPayProvider: 'TOSSPAY',
    });
  }

  return options;
}

function resolvePaymentOption(paymentConfig, paymentMethod, paymentProvider) {
  const options = getPortOnePaymentOptions(paymentConfig);
  const normalizedProvider = normalizeText(paymentProvider).toUpperCase();

  return (
    options.find(
      (option) =>
        option.method === paymentMethod &&
        normalizeText(option.provider).toUpperCase() === normalizedProvider
    ) ||
    options.find((option) => option.method === paymentMethod) ||
    null
  );
}

export function createPortOnePaymentDraft(paymentConfig, checkoutForm, cartItems) {
  const paymentOption = resolvePaymentOption(
    paymentConfig,
    checkoutForm?.paymentMethod,
    checkoutForm?.paymentProvider
  );

  if (!paymentOption) {
    throw new Error('선택한 결제수단에 연결된 PortOne 채널이 없습니다.');
  }

  const totalAmount = cartItems.reduce(
    (sum, item) => sum + item.product.salePrice * item.quantity,
    0
  );
  const baseUrl = buildBaseUrl();

  return {
    provider: 'PORTONE',
    paymentId: buildPaymentId(),
    orderId: '',
    orderName: buildOrderName(cartItems),
    amount: totalAmount,
    paymentMethod: paymentOption.method,
    paymentProvider: paymentOption.provider,
    checkoutForm: {
      ...checkoutForm,
      paymentMethod: paymentOption.method,
      paymentProvider: paymentOption.provider,
    },
    storeId: paymentConfig.storeId,
    channelKey: paymentOption.channelKey,
    payMethod: paymentOption.payMethod,
    easyPayProvider: paymentOption.easyPayProvider || '',
    redirectUrl: `${baseUrl}#/payment-success`,
    customer: {
      fullName: checkoutForm.recipientName,
      phoneNumber: checkoutForm.recipientPhone,
    },
  };
}

export async function requestPortOnePayment(paymentConfig, paymentDraft) {
  if (!isPortOneReady(paymentConfig)) {
    throw new Error('PortOne config is not ready.');
  }

  const request = {
    storeId: paymentDraft.storeId,
    channelKey: paymentDraft.channelKey,
    paymentId: paymentDraft.paymentId,
    orderName: paymentDraft.orderName,
    totalAmount: paymentDraft.amount,
    currency: 'CURRENCY_KRW',
    payMethod: paymentDraft.payMethod,
    customer: paymentDraft.customer,
    redirectUrl: paymentDraft.redirectUrl,
  };

  if (paymentDraft.easyPayProvider) {
    request.easyPayProvider = paymentDraft.easyPayProvider;
    request.easyPay = {
      easyPayProvider: paymentDraft.easyPayProvider,
    };
  }

  if (paymentDraft.payMethod === 'VIRTUAL_ACCOUNT') {
    request.virtualAccount = {
      accountExpiry: {
        validHours: 24,
      },
    };
  }

  return PortOne.requestPayment(request);
}

export function storePendingPortOnePayment(paymentDraft) {
  window.sessionStorage.setItem(
    PENDING_PORTONE_PAYMENT_KEY,
    JSON.stringify(paymentDraft)
  );
}

export function readPendingPortOnePayment() {
  try {
    const storedDraft = window.sessionStorage.getItem(PENDING_PORTONE_PAYMENT_KEY);
    return storedDraft ? JSON.parse(storedDraft) : null;
  } catch (error) {
    return null;
  }
}

export function clearPendingPortOnePayment() {
  window.sessionStorage.removeItem(PENDING_PORTONE_PAYMENT_KEY);
}

export function readPortOneCallbackParams(location = window.location) {
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
    paymentId: params.get('paymentId') || '',
    code: params.get('code') || '',
    message: params.get('message') || '',
    pgCode: params.get('pgCode') || '',
    pgMessage: params.get('pgMessage') || '',
  };
}
