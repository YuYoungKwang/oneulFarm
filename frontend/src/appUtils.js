import { monthlySavings, productSavings } from './mockData';

export function formatPrice(value) {
  return `${Number(value || 0).toLocaleString('ko-KR')}원`;
}

export function formatDate(value) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function formatDateTime(value) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getMonthlyHeight(value) {
  const maxValue = Math.max(...monthlySavings.map((item) => item.value));
  return `${(value / maxValue) * 100}%`;
}

export function getProductWidth(value) {
  const maxValue = Math.max(...productSavings.map((item) => item.value));
  return `${(value / maxValue) * 100}%`;
}

export function getDeliveryBadgeClass(status) {
  return status === 'DELIVERED' ? 'done' : 'ready';
}

export function getDeliveryLabel(status) {
  const labels = {
    READY: '배송준비',
    SHIPPING: '배송중',
    DELIVERED: '배송완료',
  };

  return labels[status] || status || '-';
}

export function getOrderStats(orders) {
  return {
    totalCount: orders.length,
    shippingCount: orders.filter(
      (order) => order.deliveryStatus === 'SHIPPING' || order.deliveryStatus === 'READY',
    ).length,
    deliveredCount: orders.filter((order) => order.deliveryStatus === 'DELIVERED').length,
    totalSavedAmount: orders.reduce((sum, order) => sum + Number(order.totalSavedAmount || 0), 0),
  };
}

export function getProfileInitials(profile) {
  const source = profile.nickname || profile.userId || 'MY';
  return source.slice(0, 2).toUpperCase();
}
