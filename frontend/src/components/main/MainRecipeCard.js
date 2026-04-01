function getFallbackText(recipeName) {
  const baseText = String(recipeName || "").trim();
  if (!baseText) {
    return "레시";
  }

  return baseText.slice(0, 2);
}

export default function MainRecipeCard({
  featured = false,
  metaText = "",
  onOpen,
  reasonText = "",
  recipe,
}) {
  const recipeName = recipe?.recipeName || "추천 레시피";

  return (
    <article className={`home-recipe-card ${featured ? "is-featured" : ""}`.trim()}>
      <div className="home-recipe-card__media">
        {recipe?.imageUrl ? (
          <img alt={recipeName} src={recipe.imageUrl} />
        ) : (
          <div className="home-recipe-card__fallback" aria-hidden="true">
            {getFallbackText(recipeName)}
          </div>
        )}
      </div>

      <div className="home-recipe-card__body">
        {metaText ? <span className="home-recipe-card__meta">{metaText}</span> : null}
        <h3 className="home-recipe-card__title">{recipeName}</h3>
        {reasonText ? <p className="home-recipe-card__reason">{reasonText}</p> : null}
        <button className="home-recipe-card__action" type="button" onClick={onOpen}>
          레시피 보기
        </button>
      </div>
    </article>
  );
}
