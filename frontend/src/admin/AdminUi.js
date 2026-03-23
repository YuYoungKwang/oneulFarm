export const adminCurrencyFormatter = new Intl.NumberFormat('ko-KR');

function toAdminDate(value) {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    const [year, month, day, hour = 0, minute = 0, second = 0, nano = 0] = value;
    if (!year || !month || !day) {
      return null;
    }

    return new Date(
      year,
      month - 1,
      day,
      hour,
      minute,
      second,
      Math.floor(Number(nano || 0) / 1000000)
    );
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateParts(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour24 = date.getHours();
  const minute = String(date.getMinutes()).padStart(2, '0');
  const meridiem = hour24 < 12 ? '오전' : '오후';
  const hour12 = String(hour24 % 12 || 12).padStart(2, '0');

  return {
    date: `${year}.${month}.${day}.`,
    time: `${meridiem} ${hour12}:${minute}`,
  };
}

export function formatAdminCurrency(value) {
  return `${adminCurrencyFormatter.format(Math.round(Number(value || 0)))}원`;
}

export function formatAdminCount(value, suffix = '건') {
  return `${adminCurrencyFormatter.format(Math.round(Number(value || 0)))}${suffix}`;
}

export function formatAdminDate(value) {
  if (!value) {
    return '-';
  }

  const date = toAdminDate(value);
  if (!date) {
    return String(value);
  }

  const { date: datePart, time } = formatDateParts(date);
  return `${datePart} ${time}`;
}

export function formatAdminDateParts(value) {
  if (!value) {
    return { date: '-', time: '' };
  }

  const date = toAdminDate(value);
  if (!date) {
    return { date: String(value), time: '' };
  }

  return formatDateParts(date);
}

export function formatAdminDateTime(value) {
  return formatAdminDate(value);
}

export function getStatusTone(status) {
  if (
    ['SELLING', 'PAID', 'ACTIVE', 'PACKAGED', 'SUCCESS', 'SHIPPING', 'DELIVERED', 'Y'].includes(status)
  ) {
    return 'green';
  }

  if (['READY', 'PURCHASED', 'WITHDRAWN', 'SOLD_OUT', 'FAIL'].includes(status)) {
    return 'yellow';
  }

  if (['STOP', 'BLOCKED', 'CANCELED', 'N'].includes(status)) {
    return 'red';
  }

  return 'default';
}

export function getStatusLabel(status) {
  const statusMap = {
    ACTIVE: '활성',
    BLOCKED: '차단',
    WITHDRAWN: '탈퇴',
    READY: '준비',
    SELLING: '판매중',
    SOLD_OUT: '품절',
    STOP: '판매중지',
    PURCHASED: '매입완료',
    PACKAGED: '소분완료',
    PAID: '결제완료',
    CREATED: '주문생성',
    SHIPPING: '배송중',
    COMPLETED: '주문완료',
    DELIVERED: '배송완료',
    SUCCESS: '결제성공',
    FAIL: '결제실패',
    Y: '노출',
    N: '숨김',
  };

  return statusMap[status] || status || '-';
}

export function AdminStatusBadge({ status }) {
  const tone = getStatusTone(status);
  return <span className={`admin-badge admin-badge--${tone}`}>{getStatusLabel(status)}</span>;
}

export function AdminPageHeader({ title, description, actions }) {
  return (
    <div className="admin-page-head">
      <div>
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="admin-page-actions">{actions}</div> : null}
    </div>
  );
}

export function AdminMetricCard({ label, value, helper }) {
  return (
    <article className="admin-card admin-metric-card">
      <div className="admin-metric-card__label">{label}</div>
      <div className="admin-metric-card__value">{value}</div>
      {helper ? <div className="admin-metric-card__helper">{helper}</div> : null}
    </article>
  );
}

export function AdminEmptyState({ title, description }) {
  return (
    <div className="admin-empty-state">
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}
