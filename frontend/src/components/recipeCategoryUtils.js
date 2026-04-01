export const PRIMARY_MEAL_RECIPE_CATEGORIES = [
  "메인요리",
  "반찬",
  "국/찌개/탕",
  "면/파스타",
  "밥/덮밥/죽",
  "샐러드",
];

export const SECONDARY_MEAL_RECIPE_CATEGORIES = ["간식", "후식"];

export const EXCLUDED_RECIPE_CATEGORIES = ["음료", "기타"];

export function normalizeRecipeCategoryName(value) {
  return String(value || "").replace(/\s+/g, "").trim();
}

export function resolveRecipeCategoryName(recipe) {
  const explicitCategory = [
    recipe?.recipeCategoryName,
    recipe?.recipeCategory,
    recipe?.categoryName,
    recipe?.category,
    recipe?.typeLabel,
  ]
    .map(normalizeRecipeCategoryName)
    .find(Boolean);

  if (explicitCategory) {
    return explicitCategory;
  }

  const sourceText = `${recipe?.recipeName || ""} ${recipe?.description || ""}`;

  if (/주스|스무디|에이드|라떼|차|티\b|음료/i.test(sourceText)) {
    return "음료";
  }

  if (/케이크|쿠키|머핀|타르트|푸딩|빙수|아이스크림|와플|토스트|팬케이크|디저트|후식/i.test(sourceText)) {
    return "후식";
  }

  if (/샐러드|무침/i.test(sourceText)) {
    return "샐러드";
  }

  if (/국|찌개|탕|전골|수프|스프/i.test(sourceText)) {
    return "국/찌개/탕";
  }

  if (/파스타|스파게티|국수|우동|라면|면\b|쫄면|비빔면|냉면/i.test(sourceText)) {
    return "면/파스타";
  }

  if (/덮밥|볶음밥|비빔밥|죽|리조또|김밥|밥\b|주먹밥/i.test(sourceText)) {
    return "밥/덮밥/죽";
  }

  if (/나물|조림|볶음|전\b|장아찌|김치|반찬/i.test(sourceText)) {
    return "반찬";
  }

  if (/구이|찜|불고기|스테이크|커틀릿|카레|잡채|메인/i.test(sourceText)) {
    return "메인요리";
  }

  if (/샌드위치|핫도그|피자|브런치|간식/i.test(sourceText)) {
    return "간식";
  }

  return "기타";
}

export function isPrimaryMealRecipe(recipe) {
  return PRIMARY_MEAL_RECIPE_CATEGORIES.includes(resolveRecipeCategoryName(recipe));
}

export function prioritizeMealRecipes(recipeList = [], minimumPrimaryCount = 2) {
  const primaryRecipes = [];
  const secondaryRecipes = [];

  recipeList.forEach((recipe) => {
    const categoryName = resolveRecipeCategoryName(recipe);
    const enrichedRecipe = {
      ...recipe,
      resolvedCategoryName: categoryName,
    };

    if (PRIMARY_MEAL_RECIPE_CATEGORIES.includes(categoryName)) {
      primaryRecipes.push(enrichedRecipe);
      return;
    }

    if (SECONDARY_MEAL_RECIPE_CATEGORIES.includes(categoryName)) {
      secondaryRecipes.push(enrichedRecipe);
    }
  });

  if (primaryRecipes.length >= minimumPrimaryCount) {
    return primaryRecipes;
  }

  return [...primaryRecipes, ...secondaryRecipes];
}
