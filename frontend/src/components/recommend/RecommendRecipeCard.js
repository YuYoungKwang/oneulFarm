export default function RecommendRecipeCard({
  keyword,
  matchedIngredients = [],
  onOpen,
  recipe,
}) {
  return (
    <article className="recommend-recipe-card">
      <div className="recommend-recipe-card__media">
        {recipe?.imageUrl ? (
          <img alt={recipe.recipeName} src={recipe.imageUrl} />
        ) : (
          <div className="recommend-recipe-card__fallback" aria-hidden="true">
            {getRecipeSymbol(recipe?.recipeName)}
          </div>
        )}
      </div>

      <div className="recommend-recipe-card__body">
        <div className="recommend-recipe-card__heading">
          <span className="recommend-recipe-card__eyebrow">
            {keyword ? `${keyword} 활용 레시피` : "추천 레시피"}
          </span>
          <h3>{recipe?.recipeName || "레시피 추천"}</h3>
          <p>{summarizeRecipeDescription(recipe?.description)}</p>
        </div>

        <div className="recommend-recipe-card__ingredients">
          {matchedIngredients.length ? (
            matchedIngredients.map((ingredient, index) => (
              <div
                className="recommend-recipe-card__ingredient"
                key={`${ingredient.ingredientNo || ingredient.ingredientName}-${index}`}
              >
                <strong>{ingredient.ingredientName}</strong>
                <span>{ingredient.amount || "적당량"}</span>
              </div>
            ))
          ) : (
            <div className="recommend-recipe-card__ingredient is-empty">
              <strong>필요 재료</strong>
              <span>재료 수량 정보를 준비 중입니다.</span>
            </div>
          )}
        </div>

        <button className="recommend-recipe-card__action" type="button" onClick={onOpen}>
          레시피 보기
        </button>
      </div>
    </article>
  );
}

function summarizeRecipeDescription(description) {
  if (!description) {
    return "레시피 소개 문구는 상세 페이지에서 더 자세히 확인할 수 있습니다.";
  }

  const normalizedValue = description.replace(/\s+/g, " ").trim();
  if (normalizedValue.length <= 72) {
    return normalizedValue;
  }

  return `${normalizedValue.slice(0, 72)}...`;
}

function getRecipeSymbol(recipeName) {
  const normalizedValue = String(recipeName || "").toLowerCase();

  if (normalizedValue.includes("볶음") || normalizedValue.includes("구이")) {
    return "P";
  }
  if (normalizedValue.includes("샐러드") || normalizedValue.includes("무침")) {
    return "S";
  }
  if (normalizedValue.includes("국") || normalizedValue.includes("탕")) {
    return "B";
  }

  return "R";
}
