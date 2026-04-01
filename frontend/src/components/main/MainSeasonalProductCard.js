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

function buildImageSources(product) {
  const directSources = [];

  if (product?.mainImage?.imageUrl) {
    directSources.push(product.mainImage.imageUrl);
  }

  if (product?.imageUrl) {
    directSources.push(product.imageUrl);
  }

  if (Array.isArray(product?.images) && product.images.length > 0) {
    const mainImage =
      product.images.find((image) => image?.isMain === "Y") || product.images[0];
    if (mainImage?.imageUrl) {
      directSources.push(mainImage.imageUrl);
    }
  }

  const apiSources = buildProductImageSources(product);
  return [...new Set([...directSources.filter(Boolean), ...apiSources.filter(Boolean)])];
}

function buildBenefitCopy(product, linkedRecipes) {
  const savingRate = Number(product?.priceMatch?.savingRate || 0);
  const savedAmount = getSavingAmount(product);

  if (savingRate > 0) {
    return `절약 ${formatPercent(savingRate)}`;
  }

  if (savedAmount > 0) {
    return `${formatCurrency(savedAmount)} 절약`;
  }

  if (Array.isArray(linkedRecipes) && linkedRecipes.length > 0) {
    return "레시피와 함께 보기 좋은 재료";
  }

  return "지금 담기 좋은 제철 상품";
}

function buildTags(typeLabel, badges, product) {
  const nextTags = [];

  function appendTag(value) {
    const normalizedValue = String(value || "").trim();
    if (!normalizedValue || nextTags.includes(normalizedValue)) {
      return;
    }

    nextTags.push(normalizedValue);
  }

  appendTag(typeLabel);
  (Array.isArray(badges) ? badges : []).forEach(appendTag);

  if (nextTags.length < 2 && Number(product?.priceMatch?.savingRate || 0) >= 15) {
    appendTag("가성비");
  }

  if (nextTags.length < 2 && product?.isSeasonal === "Y") {
    appendTag("제철");
  }

  return nextTags.slice(0, 2);
}

export default function MainSeasonalProductCard({
  badges = [],
  featured = false,
  linkedRecipes = [],
  onOpen,
  product,
  typeLabel = "제철",
}) {
  const productName = product?.productName || "추천 상품";
  const imageSources = buildImageSources(product);
  const tags = buildTags(typeLabel, badges, product);
  const benefitCopy = buildBenefitCopy(product, linkedRecipes);
  const fallbackText = product?.display?.symbol || productName.slice(0, 1) || "P";

  return (
    <article className={`home-product-card ${featured ? "is-featured" : ""}`.trim()}>
      <div
        className="home-product-card__media"
        style={{
          "--home-product-glow":
            product?.display?.glowColor || "rgba(21, 154, 85, 0.18)",
          "--home-product-soft": product?.display?.softColor || "#eef6ef",
        }}
      >
        {imageSources.length ? (
          <img
            alt={productName}
            data-fallback-src={imageSources[1] || ""}
            onError={handleImageError}
            src={imageSources[0]}
          />
        ) : (
          <div className="home-product-card__fallback" aria-hidden="true">
            {fallbackText}
          </div>
        )}
      </div>

      <div className="home-product-card__body">
        <h3 className="home-product-card__title">{productName}</h3>
        <strong className="home-product-card__price">
          {formatCurrency(product?.salePrice || 0)}
        </strong>
        <p className="home-product-card__benefit">{benefitCopy}</p>

        {tags.length ? (
          <div className="home-product-card__tags">
            {tags.map((tag) => (
              <span key={tag} className="home-product-card__tag">
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        <button className="home-product-card__action" type="button" onClick={onOpen}>
          상품 보기
        </button>
      </div>
    </article>
  );
}
