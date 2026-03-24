import { buildProductImageSources } from "../../api/productApi";
import { formatCurrency } from "../productUiUtils";

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
  metricLabel,
  metricValue,
  onOpen,
  product,
  summary,
  title,
  typeLabel,
}) {
  const productName = title || product?.productName || "추천 농산물";
  const displaySymbol = product?.display?.symbol || "P";
  const salePrice = Number(product?.salePrice || 0);
  const averagePrice = Number(product?.priceSnapshot?.avgPrice || salePrice);
  const imageSources = buildProductImageSources(product);

  return (
    <article className="recommend-product-card">
      <div
        className="recommend-product-card__media"
        style={{
          "--recommend-media-glow": product?.display?.glowColor || "rgba(21, 154, 85, 0.18)",
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
          <span>평균가 {formatCurrency(averagePrice)}</span>
        </div>

        <dl className="recommend-product-card__metric">
          <dt>{metricLabel}</dt>
          <dd>{metricValue}</dd>
        </dl>

        <div className="recommend-product-card__copy">
          <p>{summary}</p>
          {detail ? <small>{detail}</small> : null}
        </div>

        <div className="recommend-product-card__badges">
          {badges
            .filter(Boolean)
            .map((badge) => (
              <span className="recommend-product-card__badge" key={badge}>
                {badge}
              </span>
            ))}
        </div>

        <button className="recommend-product-card__action" type="button" onClick={onOpen}>
          상품 보기
        </button>
      </div>
    </article>
  );
}
