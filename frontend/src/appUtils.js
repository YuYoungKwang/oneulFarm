function normalizeDateValue(value) {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    const [year, month, day, hour = 0, minute = 0, second = 0] = value;
    return new Date(year, Number(month || 1) - 1, day || 1, hour, minute, second);
  }

  return new Date(value);
}

export function formatPrice(value) {
  return `${Number(value || 0).toLocaleString('ko-KR')}원`;
}

export function formatDate(value) {
  if (!value) {
    return '-';
  }

  const date = normalizeDateValue(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
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

  const date = normalizeDateValue(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getDeliveryBadgeClass(status) {
  return status === 'DELIVERED' ? 'done' : 'ready';
}

export function getDeliveryLabel(status) {
  const labels = {
    READY: '배송 준비',
    SHIPPING: '배송 중',
    DELIVERED: '배송 완료',
  };

  return labels[status] || status || '-';
}

export function getOrderStats(orders) {
  return {
    totalCount: orders.length,
    shippingCount: orders.filter(
      (order) => order.deliveryStatus === 'SHIPPING' || order.deliveryStatus === 'READY'
    ).length,
    deliveredCount: orders.filter((order) => order.deliveryStatus === 'DELIVERED').length,
    totalSavedAmount: orders.reduce((sum, order) => sum + Number(order.totalSavedAmount || 0), 0),
  };
}

export function getProfileInitials(profile) {
  const source = profile.nickname || profile.userId || 'MY';
  return source.slice(0, 2).toUpperCase();
}

export function getScaledHeight(value, items, key = 'value') {
  const maxValue = Math.max(...items.map((item) => Number(item[key] || 0)), 0);
  if (maxValue === 0) {
    return '0%';
  }

  return `${(Number(value || 0) / maxValue) * 100}%`;
}

export function getScaledWidth(value, items, key = 'value') {
  const maxValue = Math.max(...items.map((item) => Number(item[key] || 0)), 0);
  if (maxValue === 0) {
    return '0%';
  }

  return `${(Number(value || 0) / maxValue) * 100}%`;
}

export function formatMonthLabel(value) {
  if (!value) {
    return '-';
  }

  const matched = String(value).match(/^(\d{4})-(\d{2})$/);
  if (!matched) {
    return String(value);
  }

  return `${Number(matched[2])}월`;
}
