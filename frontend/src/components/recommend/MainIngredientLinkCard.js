import React from "react";

export default function MainIngredientLinkCard({
  imageSources = [],
  item,
  title,
  tone = "seasonal",
  onOpenPrimary,
  onOpenProduct,
  onOpenRecipe,
  onImageError,
  primaryLabel,
}) {
  const product = item?.product || null;
  const recipeList = Array.isArray(item?.linkedRecipes) ? item.linkedRecipes.slice(0, 2) : [];
  const primaryRecipe = recipeList[0] || null;

  const badgeLabel =
    tone === "seasonal"
      ? "\uC81C\uCCA0"
      : tone === "value"
        ? "\uAC00\uACA9 \uBA54\uB9AC\uD2B8"
        : "\uC778\uAE30 \uB808\uC2DC\uD53C";

  const fallbackDescription =
    tone === "seasonal"
      ? "\uC9C0\uAE08 \uC4F0\uAE30 \uC88B\uC740 \uC7AC\uB8CC\uC640 \uC5F0\uACB0\uB41C \uBA54\uB274\uB97C \uBC14\uB85C \uD655\uC778\uD560 \uC218 \uC788\uC5B4\uC694."
      : tone === "value"
        ? "\uAC00\uACA9 \uBA54\uB9AC\uD2B8\uAC00 \uC88B\uC740 \uC7AC\uB8CC\uC640 \uC5F0\uACB0\uB41C \uBA54\uB274\uB97C \uD568\uAED8 \uD655\uC778\uD560 \uC218 \uC788\uC5B4\uC694."
        : "\uC778\uAE30 \uB808\uC2DC\uD53C\uB97C \uBCF4\uACE0 \uD544\uC694\uD55C \uC7AC\uB8CC\uC640 \uBA54\uB274 \uC815\uBCF4\uB97C \uBC14\uB85C \uD655\uC778\uD560 \uC218 \uC788\uC5B4\uC694.";

  const emptyMessage =
    tone === "recipe"
      ? "\uC7AC\uB8CC \uC815\uBCF4\uB97C \uC900\uBE44 \uC911\uC785\uB2C8\uB2E4."
      : "\uC5F0\uACB0\uB41C \uB808\uC2DC\uD53C\uB97C \uC900\uBE44 \uC911\uC785\uB2C8\uB2E4.";

  const resolvedPrimaryLabel = primaryLabel || "\uB808\uC2DC\uD53C \uBCF4\uAE30";
  const canOpenPrimary = Boolean((primaryRecipe && onOpenRecipe) || onOpenPrimary);
  const canOpenProduct = Boolean(product?.productNo && onOpenProduct);

  function handlePrimaryAction() {
    if (onOpenPrimary) {
      onOpenPrimary(primaryRecipe, item);
      return;
    }

    if (primaryRecipe?.recipeNo) {
      onOpenRecipe?.(primaryRecipe.recipeNo);
    }
  }

  return (
    <article className={`main-link-card main-link-card--${tone}`}>
      <div className="main-link-card__head">
        <span className="main-link-card__badge">{badgeLabel}</span>
        <strong className="main-link-card__name">
          {product?.productName || "\uCD94\uCC9C \uBA54\uB274"}
        </strong>
      </div>

      <div className="main-link-card__body">
        <div className="main-link-card__copy">
          <h3 className="main-link-card__title">{title}</h3>
          <p className="main-link-card__desc">{item?.description || fallbackDescription}</p>
        </div>

        <div className="main-link-card__media">
          {imageSources.length ? (
            <img
              src={imageSources[0]}
              data-fallback-src={imageSources[1] || ""}
              onError={onImageError}
              alt={product?.productName || title || "\uCD94\uCC9C \uBA54\uB274"}
            />
          ) : (
            <span>{product?.productName?.slice(0, 1) || "?"}</span>
          )}
        </div>
      </div>

      {recipeList.length ? (
        <div className="main-link-card__recipes">
          {recipeList.map((recipe) => (
            <button
              key={recipe.recipeNo || recipe.recipeName}
              type="button"
              className="main-link-card__chip"
              onClick={() => onOpenRecipe?.(recipe.recipeNo)}
            >
              {recipe.recipeName}
            </button>
          ))}
        </div>
      ) : (
        <div className="main-link-card__empty">{emptyMessage}</div>
      )}

      <div className="main-link-card__actions">
        {canOpenPrimary ? (
          <button
            type="button"
            className="main-link-card__button main-link-card__button--hero"
            onClick={handlePrimaryAction}
          >
            {resolvedPrimaryLabel}
          </button>
        ) : null}

        {canOpenProduct ? (
          <button
            type="button"
            className="main-link-card__button main-link-card__button--subtle"
            onClick={() => onOpenProduct?.(product?.productNo)}
          >
            {"\uC7AC\uB8CC \uBCF4\uAE30"}
          </button>
        ) : null}
      </div>
    </article>
  );
}
