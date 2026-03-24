import SafeImage from '../SafeImage';

function formatCurrency(value) {
  return `${Math.round(Number(value || 0)).toLocaleString('ko-KR')}원`;
}

function formatPercent(value) {
  const numericValue = Number(value || 0);
  const prefix = numericValue > 0 ? '+' : '';
  return `${prefix}${numericValue.toFixed(1)}%`;
}

export default function PriceProductCard({
  badgeLabel,
  badgeTone = 'default',
  chartCtaLabel = '차트 보기',
  ctaLabel = '상품 보기',
  onOpen,
  onViewChart,
  product,
  reasonDetail,
  reasonLabel,
  variant = 'value',
}) {
  const image = product?.mainImage?.imageUrl;
  const displaySymbol = product?.display?.symbol || 'F';
  const salePrice = Number(product?.salePrice || 0);
  const averagePrice = Number(product?.priceSnapshot?.avgPrice || salePrice);
  const savingRate = Number(product?.priceMatch?.savingRate || 0);
  const priceGap = Number(product?.priceMatch?.priceGap || 0);
  const originLabel = product?.origin || product?.categoryName || '원산지 정보 없음';
  const unitLabel =
    product?.packageWeight && product?.unit
      ? `${product.packageWeight}${product.unit}`
      : product?.unit || '-';
  const insightLabel =
    variant === 'timing'
      ? '추천 사유'
      : variant === 'value'
        ? '가격 메리트'
        : '추천 사유';
  const secondaryMetricLabel =
    variant === 'timing' ? '최근 변동률' : '평균가 차이';
  const secondaryMetricValue =
    variant === 'timing'
      ? formatPercent(product?.priceSnapshot?.changeRate || 0)
      : formatCurrency(priceGap);

  return (
    <article className={`price-product-card price-product-card--${variant}`}>
      <div className="price-product-card__media">
        <SafeImage
          alt={product?.productName || '추천 상품'}
          className="price-product-card__image"
          fallback={
            <div className="price-product-card__fallback" aria-hidden="true">
              {displaySymbol}
            </div>
          }
          src={image}
        />
        {badgeLabel ? (
          <span className={`price-product-card__badge tone-${badgeTone}`}>
            {badgeLabel}
          </span>
        ) : null}
      </div>

      <div className="price-product-card__body">
        <div className="price-product-card__header">
          <div>
            <h3>{product?.productName || '추천 상품'}</h3>
            <p>{originLabel}</p>
          </div>
          <span className="price-product-card__unit">{unitLabel}</span>
        </div>

        <div className="price-product-card__price">
          <strong>{formatCurrency(salePrice)}</strong>
          <span>시장 평균 {formatCurrency(averagePrice)}</span>
        </div>

        {reasonLabel || reasonDetail ? (
          <div className="price-product-card__reason">
            <div className="price-product-card__reason-head">
              <span className="price-product-card__reason-label">
                {reasonLabel || insightLabel}
              </span>
              <strong className="price-product-card__reason-value">
                {variant === 'timing'
                  ? formatPercent(product?.priceSnapshot?.changeRate || 0)
                  : formatPercent(savingRate)}
              </strong>
            </div>
            {reasonDetail ? <p>{reasonDetail}</p> : null}
          </div>
        ) : null}

        <dl className="price-product-card__meta">
          <div>
            <dt>절약률</dt>
            <dd>{formatPercent(savingRate)}</dd>
          </div>
          <div>
            <dt>{secondaryMetricLabel}</dt>
            <dd>{secondaryMetricValue}</dd>
          </div>
          <div>
            <dt>판매 단위</dt>
            <dd>{unitLabel}</dd>
          </div>
        </dl>

        <div className="price-product-card__footer">
          <span className="price-product-card__status">
            {product?.saleStatus === 'SELLING' ? '지금 바로 구매 가능' : '판매 준비 중'}
          </span>
          <div className="price-product-card__actions">
            {onViewChart ? (
              <button
                className="price-btn price-btn--primary price-product-card__action"
                type="button"
                onClick={onViewChart}
              >
                {chartCtaLabel}
              </button>
            ) : null}
            <button
              className={`price-btn ${
                onViewChart || variant === 'timing'
                  ? 'price-btn--ghost'
                  : 'price-btn--primary'
              } price-product-card__action`}
              type="button"
              onClick={onOpen}
            >
              {ctaLabel}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
