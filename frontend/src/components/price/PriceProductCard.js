import SafeImage from '../SafeImage';

function formatCurrency(value) {
  return `${Math.round(Number(value || 0)).toLocaleString('ko-KR')}원`;
}

function formatPercent(value) {
  const numericValue = Number(value || 0);
  const prefix = numericValue > 0 ? '+' : '';
  return `${prefix}${numericValue.toFixed(1)}%`;
}

function buildComparisonCopy(salePrice, averagePrice) {
  if (!averagePrice) {
    return '평균가 정보가 아직 부족합니다.';
  }

  const gapRate = ((salePrice - averagePrice) / averagePrice) * 100;
  if (gapRate <= 0) {
    return `평균가보다 ${Math.abs(gapRate).toFixed(1)}% 낮아요.`;
  }

  return `평균가보다 ${gapRate.toFixed(1)}% 높아요.`;
}

export default function PriceProductCard({
  badgeLabel,
  badgeTone = 'green',
  onAction,
  product,
  reasonDetail,
  reasonLabel,
  variant = 'best-buy',
}) {
  if (!product) {
    return null;
  }

  const imageUrl = product?.mainImage?.imageUrl || '';
  const salePrice = Number(product?.salePrice || 0);
  const averagePrice = Number(
    product?.priceMatch?.comparedPrice ||
      product?.priceSnapshot?.displayAvgPrice ||
      product?.priceSnapshot?.avgPrice ||
      0
  );
  const originLabel = product?.origin || '원산지 정보 없음';
  const unitLabel =
    product?.packageWeight && product?.unit
      ? `${product.packageWeight}${product.unit}`
      : product?.unit || '-';
  const changeRate = Number(product?.priceSnapshot?.changeRate || 0);
  const savingRate = Number(product?.priceMatch?.savingRate || 0);
  const fallbackText = product?.productName?.slice(0, 2) || '상품';
  const RootTag = onAction ? 'button' : 'article';

  return (
    <RootTag
      {...(onAction ? { type: 'button', onClick: onAction } : {})}
      className={`market-product-card market-product-card--${variant} ${
        onAction ? 'market-product-card--interactive' : ''
      }`.trim()}
    >
      <div className="market-product-card__media">
        <SafeImage
          alt={product?.productName || '추천 상품'}
          className="market-product-card__image"
          fallback={
            <div className="market-product-card__fallback" aria-hidden="true">
              {fallbackText}
            </div>
          }
          src={imageUrl}
        />

        {badgeLabel ? (
          <span className={`market-product-card__badge tone-${badgeTone}`}>{badgeLabel}</span>
        ) : null}
      </div>

      <div className="market-product-card__body">
        <div className="market-product-card__head">
          <div>
            <h3>{product?.productName || '추천 상품'}</h3>
            <p>
              {originLabel} · {unitLabel}
            </p>
          </div>
          <span className="market-product-card__mini-chip">{reasonLabel}</span>
        </div>

        <div className="market-product-card__price-row">
          <div>
            <span>현재가</span>
            <strong>{formatCurrency(salePrice)}</strong>
          </div>
          <div>
            <span>평균가</span>
            <strong>{formatCurrency(averagePrice)}</strong>
          </div>
        </div>

        <p className="market-product-card__comparison">
          {buildComparisonCopy(salePrice, averagePrice)}
        </p>
        <p className="market-product-card__reason">{reasonDetail}</p>

        <div className="market-product-card__footer">
          <div className="market-product-card__footer-meta">
            <span>변동 {formatPercent(changeRate)}</span>
            <span>절약 {formatPercent(savingRate)}</span>
          </div>
        </div>
      </div>
    </RootTag>
  );
}
