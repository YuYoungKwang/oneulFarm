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

function buildGroupDescription(group) {
  const sourceKeyword = String(group?.sourceKeyword || "").trim();
  const categories = Array.isArray(group?.categoryLabels)
    ? group.categoryLabels.filter(Boolean).join(", ")
    : "";

  if (group?.datalabDriven && sourceKeyword && categories) {
    return `네이버 데이터랩 인기 검색어 "${sourceKeyword}" 기준으로 ${categories} 레시피를 모았습니다.`;
  }

  if (group?.datalabDriven && sourceKeyword) {
    return `네이버 데이터랩 인기 검색어 "${sourceKeyword}" 기준으로 관련 레시피를 모았습니다.`;
  }

  if (categories) {
    return `${categories} 분류 중심으로 관련 레시피를 모았습니다.`;
  }

  return "관련 레시피를 한 번에 확인할 수 있어요.";
}

function groupPopularItems(items) {
  const groupMap = new Map();

  items.forEach((recipe) => {
    const firstIngredient = Array.isArray(recipe?.matchedIngredients)
      ? recipe.matchedIngredients.find(Boolean)
      : "";
    const normalizedIngredient = normalizeIngredientKeyword(firstIngredient);
    const sourceKeyword = String(recipe?.sourceKeyword || "").trim();
    const groupKey =
      sourceKeyword ||
      normalizedIngredient ||
      String(recipe?.categoryLabel || "").trim() ||
      String(recipe?.recipeName || "").trim();

    if (!groupKey) {
      return;
    }

    if (!groupMap.has(groupKey)) {
      groupMap.set(groupKey, {
        key: groupKey,
        sourceKeyword: sourceKeyword || groupKey,
        ingredientKeyword: sourceKeyword || normalizedIngredient || groupKey,
        datalabDriven: Boolean(recipe?.datalabDriven),
        categoryLabels: [],
        recipes: [],
        imageUrl: recipe?.imageUrl || "",
      });
    }

    const group = groupMap.get(groupKey);
    group.datalabDriven = group.datalabDriven || Boolean(recipe?.datalabDriven);

    if (recipe?.categoryLabel && !group.categoryLabels.includes(recipe.categoryLabel)) {
      group.categoryLabels.push(recipe.categoryLabel);
    }

    if (recipe?.imageUrl && !group.imageUrl) {
      group.imageUrl = recipe.imageUrl;
    }

    if (
      recipe &&
      !group.recipes.some(
        (item) =>
          (item?.recipeNo && item.recipeNo === recipe.recipeNo) ||
          (item?.recipeName && item.recipeName === recipe.recipeName)
      )
    ) {
      group.recipes.push(recipe);
    }
  });

  return Array.from(groupMap.values());
}

function getRecipeItem(group) {
  return {
    product: {
      productName: group.sourceKeyword || "인기 검색어",
    },
    linkedRecipes: group.recipes,
    description: buildGroupDescription(group),
    ingredientKeyword: group.ingredientKeyword,
  };
}

export default function MainPopularSection({ items }) {
  const groupedItems = groupPopularItems(Array.isArray(items) ? items : []);

  return (
    <section className="section" id="popular-section">
      <div className="section-head">
        <div>
          <div className="section-title">지금 인기 있는 메뉴</div>
          <div className="section-sub">
            네이버 데이터랩 검색 흐름을 먼저 반영하고, 메인요리 반찬 국/찜/탕
            면/파스타 밥/죽 샐러드 분류 안에서 관련 레시피를 묶어 보여줍니다.
          </div>
        </div>
        <a className="section-link section-link--recipes" href="#/recipes">
          레시피 전체 보기
        </a>
      </div>

      {groupedItems.length ? (
        <div className="main-link-card-grid">
          {groupedItems.map((group) => {
            const item = getRecipeItem(group);
            const title = `${group.sourceKeyword || "인기 검색어"} 관련 레시피`;

            return (
              <div key={group.key}>
                <MainIngredientLinkCard
                  imageSources={group.imageUrl ? [group.imageUrl] : []}
                  item={item}
                  onImageError={handleImageError}
                  onOpenPrimary={() => openRecipeListByIngredient(item.ingredientKeyword)}
                  onOpenRecipe={openRecipe}
                  primaryLabel="관련 레시피 보기"
                  title={title}
                  tone="recipe"
                />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="recommend-section-empty">
          <strong>추천할 메뉴가 아직 없습니다.</strong>
          <p>레시피 데이터가 더 모이면 여기서 보여드릴게요.</p>
        </div>
      )}
    </section>
  );
}
