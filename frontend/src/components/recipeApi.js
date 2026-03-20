import { requestAuthApi } from '../auth';

const RECIPE_API_PATH = '/api/recipes';

function buildQueryString(params) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value == null || value === '') {
      return;
    }

    searchParams.set(key, value);
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

async function requestRecipeApi(path) {
  const payload = await requestAuthApi(
    path,
    {
      headers: {
        Accept: 'application/json',
      },
    },
    '레시피 데이터를 불러오지 못했습니다.'
  );

  return payload.data;
}

export function fetchRecipeList({ keyword, ingredientKeyword, sort, limit }) {
  return requestRecipeApi(
    `${RECIPE_API_PATH}${buildQueryString({
      keyword,
      ingredientKeyword,
      sort,
      limit,
    })}`
  );
}

export function fetchRecipeDetail(recipeNo) {
  return requestRecipeApi(`${RECIPE_API_PATH}/${recipeNo}`);
}
