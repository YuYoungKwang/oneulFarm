import MainRecipeCard from "./MainRecipeCard";

function openRecipe(recipeNo) {
  if (recipeNo) {
    window.location.hash = `#/recipes/${recipeNo}`;
    return;
  }

  window.location.hash = "#/recipes";
}

function normalizeIngredientKeyword(value) {
  const baseValue = String(value || "").trim();
  if (!baseValue) {
    return "";
  }

  return baseValue
    .replace(/^.*?>\s*/, "")
    .replace(/\(.*$/, "")
    .replace(/\d.*$/, "")
    .trim();
}

function buildRecipeReason(recipe, metaText) {
  const summaryText = String(recipe?.summary || "").trim();
  if (summaryText) {
    return summaryText;
  }

  const categoryLabel = String(recipe?.categoryLabel || "").trim();
  if (recipe?.datalabDriven && metaText) {
    return `${metaText} 재료로 많이 찾는 메뉴예요.`;
  }

  if (categoryLabel) {
    return `${categoryLabel} 카테고리에서 반응이 좋은 레시피예요.`;
  }

  return "지금 사용자 반응이 좋은 레시피예요.";
}

export default function MainPopularSection({ items = [] }) {
  const recipeItems = Array.isArray(items) ? items.slice(0, 4) : [];

  return (
    <section className="home-section" id="popular-section">
      <div className="home-section__header">
        <div>
          <p className="home-section__eyebrow">Popular Recipe</p>
          <h2 className="home-section__title">지금 인기 있는 레시피</h2>
        </div>
        <a className="home-section__link" href="#/recipes">
          전체 보기
        </a>
      </div>

      {recipeItems.length ? (
        <div className="home-recipe-grid">
          {recipeItems.map((recipe, index) => {
            const firstIngredient = Array.isArray(recipe?.matchedIngredients)
              ? recipe.matchedIngredients.find(Boolean)
              : "";
            const metaText =
              normalizeIngredientKeyword(firstIngredient) ||
              String(recipe?.categoryLabel || "").trim() ||
              "바로 만들기";

            return (
              <MainRecipeCard
                key={recipe.recipeNo || recipe.recipeName || index}
                featured={index === 0}
                metaText={metaText}
                onOpen={() => openRecipe(recipe.recipeNo)}
                reasonText={buildRecipeReason(recipe, metaText)}
                recipe={recipe}
              />
            );
          })}
        </div>
      ) : (
        <div className="home-section__empty">
          <strong>지금 보여줄 레시피가 없습니다.</strong>
        </div>
      )}
    </section>
  );
}
