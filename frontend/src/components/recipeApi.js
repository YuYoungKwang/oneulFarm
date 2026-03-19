const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || '').replace(/\/+$/, '');

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

async function requestRecipeApi(url) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  });

  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success) {
    throw new Error(body?.message || '레시피 데이터를 불러오지 못했습니다.');
  }

  return body.data;
}

export function fetchRecipeList({ keyword, ingredientKeyword, sort, limit }) {
  return requestRecipeApi(
    `${API_BASE_URL}/api/recipes${buildQueryString({
      keyword,
      ingredientKeyword,
      sort,
      limit,
    })}`
  );
}

export function fetchRecipeDetail(recipeNo) {
  return requestRecipeApi(`${API_BASE_URL}/api/recipes/${recipeNo}`);
}
