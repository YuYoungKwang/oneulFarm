import React from "react";

export default function MainIngredientLinkCard({
  imageSources = [],
  item,
  title,
  tone = "seasonal",
  onOpenProduct,
  onOpenRecipe,
  onImageError,
}) {
  const product = item?.product || null;
  const recipeList = Array.isArray(item?.linkedRecipes) ? item.linkedRecipes.slice(0, 2) : [];
  const primaryRecipe = recipeList[0] || null;

  const badgeLabel =
    tone === "seasonal" ? "제철" : tone === "value" ? "가격 메리트" : "인기 레시피";

  const fallbackDescription =
    tone === "seasonal"
      ? "지금 활용하기 좋은 재료와 연결된 메뉴를 바로 확인할 수 있어요."
      : tone === "value"
        ? "가격 메리트가 좋은 재료와 연결된 메뉴를 함께 확인할 수 있어요."
        : "인기 레시피를 보고 필요한 재료와 메뉴 정보를 바로 확인할 수 있어요.";

  const emptyMessage =
    tone === "recipe" ? "재료 정보를 준비 중입니다." : "연결된 레시피를 준비 중입니다.";

  const primaryLabel = "레시피 보기";
  const canOpenProduct = Boolean(product?.productNo && onOpenProduct);

  return (
    <article className={`main-link-card main-link-card--${tone}`}>
      <div className="main-link-card__head">
        <span className="main-link-card__badge">{badgeLabel}</span>
        <strong className="main-link-card__name">{product?.productName || "추천 메뉴"}</strong>
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
              alt={product?.productName || title || "추천 메뉴"}
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
        {primaryRecipe ? (
          <button
            type="button"
            className="main-link-card__button main-link-card__button--hero"
            onClick={() => onOpenRecipe?.(primaryRecipe.recipeNo)}
          >
            {primaryLabel}
          </button>
        ) : null}

        {canOpenProduct ? (
          <button
            type="button"
            className="main-link-card__button main-link-card__button--subtle"
            onClick={() => onOpenProduct?.(product?.productNo)}
          >
            재료 보기
          </button>
        ) : null}
      </div>
    </article>
  );
}
