function formatCurrency(value) {
  return `${Math.round(Number(value || 0)).toLocaleString('ko-KR')}원`;
}

function formatPercent(value) {
  const numericValue = Number(value || 0);
  const prefix = numericValue > 0 ? '+' : '';
  return `${prefix}${numericValue.toFixed(1)}%`;
}

function buildDeltaIcon(value) {
  if (value > 0) {
    return '▲';
  }
  if (value < 0) {
    return '▼';
  }
  return '•';
}

export default function HeroPriceSummary({
  currentPrice,
  dailyChangeRate,
  onPrimaryAction,
  onSecondaryAction,
  primaryActionLabel,
  productName,
  secondaryActionLabel,
  subtitle,
  summary,
  trendSummary,
  weeklySummary,
}) {
  const deltaDirection =
    dailyChangeRate > 0 ? 'up' : dailyChangeRate < 0 ? 'down' : 'flat';

  return (
    <section className="hero-summary-card">
      <div className="hero-summary-card__top">
        <span className="price-chip-label">오늘의 핵심 상품</span>
        <span className={`hero-summary-card__delta is-${deltaDirection}`}>
          <span aria-hidden="true">{buildDeltaIcon(dailyChangeRate)}</span>
          전일 대비 {formatPercent(dailyChangeRate)}
        </span>
      </div>

      <div className="hero-summary-card__headline">
        <div className="hero-summary-card__copy">
          <h1>{productName || '분석 상품'}</h1>
          <p>
            {subtitle
              ? `${subtitle} 기준으로 오늘 시세를 해석하고 있습니다.`
              : '오늘 시세 흐름을 빠르게 확인해보세요.'}
          </p>
        </div>

        <div className="hero-summary-card__price">
          <span>오늘 평균가</span>
          <strong>{formatCurrency(currentPrice)}</strong>
        </div>
      </div>

      <p className="hero-summary-card__summary">{summary}</p>

      <div className="hero-summary-card__notes">
        <div>
          <span className="hero-summary-card__note-label">최근 추세</span>
          <strong>{trendSummary}</strong>
        </div>
        <div>
          <span className="hero-summary-card__note-label">7일 해석</span>
          <strong>{weeklySummary}</strong>
        </div>
      </div>

      <div className="hero-summary-card__actions">
        <button className="price-btn price-btn--primary" type="button" onClick={onPrimaryAction}>
          {primaryActionLabel}
        </button>
        <button
          className="price-btn price-btn--secondary"
          type="button"
          onClick={onSecondaryAction}
        >
          {secondaryActionLabel}
        </button>
      </div>
    </section>
  );
}
