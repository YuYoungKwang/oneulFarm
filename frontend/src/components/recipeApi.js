import { buildAuthHeaders, requestAuthApi } from '../auth';

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

async function requestRecipeApi(path, options, fallbackMessage) {
  const payload = await requestAuthApi(
    path,
    options || {
      headers: {
        Accept: 'application/json',
      },
    },
    fallbackMessage || '레시피 데이터를 불러오지 못했습니다.'
  );

  return payload.data;
}

function buildRecipeReviewFormData({ rating, content, imageFileList = [] }) {
  const formData = new FormData();
  formData.append('rating', String(rating));
  formData.append('content', content || '');

  imageFileList.forEach((imageFile) => {
    if (imageFile instanceof File) {
      formData.append('images', imageFile);
    }
  });

  return formData;
}

export function fetchRecipeList({
  keyword,
  ingredientKeyword,
  sort,
  limit,
  page,
  pageSize,
}) {
  return requestRecipeApi(
    `${RECIPE_API_PATH}${buildQueryString({
      keyword,
      ingredientKeyword,
      sort,
      limit,
      page,
      pageSize,
    })}`,
    {
      headers: {
        Accept: 'application/json',
      },
    },
    '레시피 목록을 불러오지 못했습니다.'
  );
}

export function fetchRecipeDetail(recipeNo) {
  return requestRecipeApi(
    `${RECIPE_API_PATH}/${recipeNo}`,
    {
      headers: {
        Accept: 'application/json',
      },
    },
    '레시피 상세를 불러오지 못했습니다.'
  );
}

export function createRecipeReview(recipeNo, reviewForm) {
  return requestRecipeApi(
    `${RECIPE_API_PATH}/${recipeNo}/reviews`,
    {
      method: 'POST',
      headers: buildAuthHeaders({
        includeUserNo: true,
      }),
      body: buildRecipeReviewFormData(reviewForm),
    },
    '레시피 리뷰를 등록하지 못했습니다.'
  );
}

export function updateRecipeReview(recipeNo, reviewNo, reviewForm) {
  return requestRecipeApi(
    `${RECIPE_API_PATH}/${recipeNo}/reviews/${reviewNo}`,
    {
      method: 'POST',
      headers: buildAuthHeaders({
        includeUserNo: true,
      }),
      body: buildRecipeReviewFormData(reviewForm),
    },
    '레시피 리뷰를 수정하지 못했습니다.'
  );
}

export function deleteRecipeReview(recipeNo, reviewNo) {
  return requestRecipeApi(
    `${RECIPE_API_PATH}/${recipeNo}/reviews/${reviewNo}`,
    {
      method: 'DELETE',
      headers: buildAuthHeaders({
        includeUserNo: true,
      }),
    },
    '레시피 리뷰를 삭제하지 못했습니다.'
  );
}
