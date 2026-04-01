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
  onOpen,
  product,
  title,
  typeLabel,
}) {
  const productName = title || product?.productName || "추천 상품";
  const displaySymbol = product?.display?.symbol || "P";
  const salePrice = Number(product?.salePrice || 0);
  const averagePrice = Number(
    product?.priceSnapshot?.displayAvgPrice ||
      product?.priceSnapshot?.avgPrice ||
      0
  );
  const imageSources = buildProductImageSources(product);
  const visibleBadges = badges.filter(Boolean);
  const packageLabel =
    product?.packageWeight && product?.unit
      ? `${product.packageWeight}${product.unit}`
      : product?.unit || "";
  const metaLabel = [product?.origin, packageLabel].filter(Boolean).join(" / ");

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
          <p>{metaLabel || product?.categoryName || "오늘의 추천 상품"}</p>
        </div>

        <div className="recommend-product-card__price-grid">
          <div className="recommend-product-card__price-line">
            <span className="recommend-product-card__price-label">평균가</span>
            <strong className="recommend-product-card__price-value recommend-product-card__price-value--muted">
              {formatCurrency(averagePrice)}
            </strong>
          </div>
          <div className="recommend-product-card__price-line">
            <span className="recommend-product-card__price-label">판매가</span>
            <strong className="recommend-product-card__price-value">
              {formatCurrency(salePrice)}
            </strong>
          </div>
        </div>

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
