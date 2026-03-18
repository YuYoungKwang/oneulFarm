import { formatCurrency, getSavingAmount } from './productUiUtils';

export const orderDateFormatter = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatOrderDateTime(value) {
  return orderDateFormatter.format(new Date(value));
}

export function getPaymentMethodLabel(method) {
  if (method === 'BANK') {
    return '\uBB34\uD1B5\uC7A5\uC785\uAE08';
  }

  if (method === 'EASY_PAY') {
    return '\uAC04\uD3B8\uACB0\uC81C';
  }

  return '\uCE74\uB4DC \uACB0\uC81C';
}

export function getDeliveryStatusLabel(status) {
  if (status === 'SHIPPING') {
    return '\uBC30\uC1A1\uC911';
  }

  if (status === 'DELIVERED') {
    return '\uBC30\uC1A1\uC644\uB8CC';
  }

  if (status === 'CANCELED') {
    return '\uBC30\uC1A1\uCDE8\uC18C';
  }

  return '\uBC30\uC1A1\uC900\uBE44';
}

export function getOrderStatusMeta(status) {
  if (status === 'SHIPPING') {
    return { label: '\uBC30\uC1A1\uC911', tone: 'shipping' };
  }

  if (status === 'COMPLETED') {
    return { label: '\uC8FC\uBB38 \uC644\uB8CC', tone: 'completed' };
  }

  if (status === 'CANCELED') {
    return { label: '\uC8FC\uBB38 \uCDE8\uC18C', tone: 'canceled' };
  }

  return { label: '\uACB0\uC81C \uC644\uB8CC', tone: 'paid' };
}

export function buildOrderId(existingOrders) {
  const now = new Date();
  const yyyymmdd = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('');
  const todayOrderCount = existingOrders.filter((order) =>
    String(order.orderId).includes(yyyymmdd)
  ).length;

  return `OFT-${yyyymmdd}-${String(todayOrderCount + 1).padStart(3, '0')}`;
}

export function createOrderFromCart(cartItems, checkoutForm, existingOrders) {
  const now = new Date().toISOString();
  const baseId = Date.now();
  const totalAmount = cartItems.reduce(
    (sum, item) => sum + item.product.salePrice * item.quantity,
    0
  );
  const totalSavedAmount = cartItems.reduce(
    (sum, item) => sum + getSavingAmount(item.product) * item.quantity,
    0
  );
  const orderId = checkoutForm.orderId || buildOrderId(existingOrders);

  return {
    orderNo: baseId,
    orderId,
    orderStatus: 'PAID',
    totalAmount,
    discountAmount: 0,
    deliveryFee: 0,
    finalAmount: totalAmount,
    recipientName: checkoutForm.recipientName,
    recipientPhone: checkoutForm.recipientPhone,
    zipCode: checkoutForm.zipCode,
    address1: checkoutForm.address1,
    address2: checkoutForm.address2,
    deliveryMessage: checkoutForm.deliveryMessage,
    orderedAt: now,
    updatedAt: now,
    payment: {
      paymentNo: baseId + 1,
      paymentMethod: checkoutForm.paymentMethod,
      paymentStatus: 'SUCCESS',
      paymentKey: checkoutForm.paymentKey || `PAY-${orderId}`,
      paidAmount: totalAmount,
      paidAt: now,
      createdAt: now,
    },
    delivery: {
      deliveryNo: baseId + 2,
      courierName: 'oneulFarm',
      trackingNo: '',
      deliveryStatus: 'READY',
      shippedAt: null,
      deliveredAt: null,
      createdAt: now,
    },
    items: cartItems.map((item, index) => ({
      orderItemNo: baseId + 10 + index,
      productNo: item.product.productNo,
      productName: item.product.productName,
      unitPrice: item.product.salePrice,
      quantity: item.quantity,
      subtotal: item.product.salePrice * item.quantity,
      marketAvgPrice: item.product.priceSnapshot.avgPrice,
      savedAmount: getSavingAmount(item.product) * item.quantity,
      product: item.product,
    })),
    summaryText: `${cartItems.length}\uAC1C \uC0C1\uD488 / ${formatCurrency(totalAmount)}`,
    totalSavedAmount,
  };
}

export function advanceOrderStatus(order) {
  const now = new Date().toISOString();

  if (order.orderStatus === 'PAID') {
    return {
      ...order,
      orderStatus: 'SHIPPING',
      updatedAt: now,
      delivery: {
        ...order.delivery,
        deliveryStatus: 'SHIPPING',
        trackingNo: order.delivery.trackingNo || `TRK-${order.orderId}`,
        shippedAt: now,
      },
    };
  }

  if (order.orderStatus === 'SHIPPING') {
    return {
      ...order,
      orderStatus: 'COMPLETED',
      updatedAt: now,
      delivery: {
        ...order.delivery,
        deliveryStatus: 'DELIVERED',
        deliveredAt: now,
      },
    };
  }

  return order;
}
