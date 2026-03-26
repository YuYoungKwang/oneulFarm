import MainIngredientLinkCard from "../recommend/MainIngredientLinkCard";

function handleImageError(event) {
  const nextSource = event.currentTarget.dataset.fallbackSrc;
  if (!nextSource || event.currentTarget.src === nextSource) {
    return;
  }

  event.currentTarget.src = nextSource;
  event.currentTarget.removeAttribute("data-fallback-src");
}

function openRecipe(recipeNo) {
  window.location.hash = `#/recipes/${recipeNo}`;
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

function openRecipeListByIngredient(ingredientKeyword) {
  const normalizedKeyword = normalizeIngredientKeyword(ingredientKeyword);
  if (!normalizedKeyword) {
    window.location.hash = "#/recipes";
    return;
  }

  window.location.hash = `#/recipes?ingredientKeyword=${encodeURIComponent(
    normalizedKeyword
  )}`;
}

function getRecipeItem(recipe) {
  const firstIngredient = Array.isArray(recipe?.matchedIngredients)
    ? recipe.matchedIngredients.find(Boolean)
    : "";
  const normalizedIngredient = normalizeIngredientKeyword(firstIngredient);

  return {
    product: {
      productName: normalizedIngredient || "\uC7AC\uB8CC \uC815\uBCF4 \uC900\uBE44 \uC911",
    },
    linkedRecipes: recipe ? [recipe] : [],
    description:
      recipe?.summary || "\uCD94\uCC9C \uBA54\uB274 \uC815\uBCF4\uB97C \uC900\uBE44 \uC911\uC785\uB2C8\uB2E4.",
    ingredientKeyword: normalizedIngredient,
  };
}

export default function MainPopularSection({ items }) {
  return (
    <section className="section" id="popular-section">
      <div className="section-head">
        <div>
          <div className="section-title">
            {"\uC9C0\uAE08 \uC778\uAE30 \uC788\uB294 \uBA54\uB274"}
          </div>
          <div className="section-sub">
            {
              "\uB9CE\uC774 \uCC3E\uB294 \uBA54\uB274\uB97C \uBCF4\uACE0 \uD544\uC694\uD55C \uC7AC\uB8CC\uC640 \uB808\uC2DC\uD53C \uC0C1\uC138 \uD398\uC774\uC9C0\uB97C \uC774\uC5B4\uC11C \uD655\uC778\uD560 \uC218 \uC788\uC5B4\uC694."
            }
          </div>
        </div>
        <a className="section-link section-link--recipes" href="#/recipes">
          {"\uB808\uC2DC\uD53C \uC804\uCCB4 \uBCF4\uAE30"}
        </a>
      </div>

      {items.length ? (
        <div className="main-link-card-grid">
          {items.map((recipe) => {
            const item = getRecipeItem(recipe);

            return (
              <MainIngredientLinkCard
                key={recipe.recipeNo || recipe.recipeName}
                imageSources={recipe.imageUrl ? [recipe.imageUrl] : []}
                item={item}
                onImageError={handleImageError}
                onOpenPrimary={() => openRecipeListByIngredient(item.ingredientKeyword)}
                onOpenRecipe={openRecipe}
                primaryLabel={"\uAD00\uB828 \uB808\uC2DC\uD53C \uBCF4\uAE30"}
                title={recipe.recipeName || "\uC9C0\uAE08 \uC778\uAE30 \uC788\uB294 \uBA54\uB274"}
                tone="recipe"
              />
            );
          })}
        </div>
      ) : (
        <div className="recommend-section-empty">
          <strong>{"\uCD94\uCC9C\uD560 \uBA54\uB274\uAC00 \uC544\uC9C1 \uC5C6\uC2B5\uB2C8\uB2E4."}</strong>
          <p>
            {
              "\uB808\uC2DC\uD53C \uB370\uC774\uD130\uAC00 \uB354 \uBAA8\uC774\uBA74 \uC5EC\uAE30\uC5D0\uC11C \uBCF4\uC5EC\uB4DC\uB9B4\uAC8C\uC694."
            }
          </p>
        </div>
      )}
    </section>
  );
}
