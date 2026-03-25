import { buildProductImageSources } from "../../api/productApi";
import { formatCurrency, formatPercent, getSavingAmount } from "../productUiUtils";

function handleImageError(event) {
  const nextSource = event.currentTarget.dataset.fallbackSrc;
  if (!nextSource || event.currentTarget.src === nextSource) {
    return;
  }

  event.currentTarget.src = nextSource;
  event.currentTarget.removeAttribute("data-fallback-src");
}

export default function RecommendProductCard({
  badges = [],
  detail,
  hideSavingRate = false,
  metricLabel,
  metricValue,
  onOpen,
  product,
  summary,
  title,
  typeLabel,
}) {
  const productName = title || product?.productName || "추천 상품";
  const displaySymbol = product?.display?.symbol || "P";
  const salePrice = Number(product?.salePrice || 0);
  const averagePrice = Number(
    product?.priceSnapshot?.displayAvgPrice ||
      product?.priceSnapshot?.avgPrice ||
      salePrice
  );
  const savingAmount = getSavingAmount(product);
  const savingRate = Number(product?.priceMatch?.savingRate || 0);
  const imageSources = buildProductImageSources(product);
  const hasMetric = Boolean(metricLabel && metricValue);
  const visibleBadges = badges.filter(Boolean);

  return (
    <article className="recommend-product-card">
      <div
        className="recommend-product-card__media"
        style={{
          "--recommend-media-glow":
            product?.display?.glowColor || "rgba(21, 154, 85, 0.18)",
          "--recommend-media-soft": product?.display?.softColor || "#eef6ef",
        }}
      >
        <span className="recommend-product-card__type">{typeLabel}</span>
        {imageSources.length ? (
          <img
            alt={productName}
            className="recommend-product-card__image"
            data-fallback-src={imageSources[1] || ""}
            onError={handleImageError}
            src={imageSources[0]}
          />
        ) : (
          <div className="recommend-product-card__symbol" aria-hidden="true">
            {displaySymbol}
          </div>
        )}
      </div>

      <div className="recommend-product-card__body">
        <div className="recommend-product-card__heading">
          <h3>{productName}</h3>
          <p>{product?.origin || product?.categoryName || "오늘의 추천 상품"}</p>
        </div>

        <div className="recommend-product-card__price">
          <strong>{formatCurrency(salePrice)}</strong>
          <span>평균가 대비 {formatCurrency(savingAmount)} 절약</span>
          {!hideSavingRate ? <span>{formatPercent(savingRate)}</span> : null}
        </div>

        <div className="recommend-product-card__copy">
          <p>평균가 {formatCurrency(averagePrice)}</p>
          <p>{summary}</p>
          {detail ? <small>{detail}</small> : null}
        </div>

        {hasMetric ? (
          <dl className="recommend-product-card__metric">
            <dt>{metricLabel}</dt>
            <dd>{metricValue}</dd>
          </dl>
        ) : null}

        {visibleBadges.length ? (
          <div className="recommend-product-card__badges">
            {visibleBadges.map((badge) => (
              <span className="recommend-product-card__badge" key={badge}>
                {badge}
              </span>
            ))}
          </div>
        ) : null}

        <button className="recommend-product-card__action" type="button" onClick={onOpen}>
          상품 보기
        </button>
      </div>
    </article>
  );
}
