import { useDeferredValue, useEffect, useState } from 'react';
import '../styles/recipe.css';
import { fetchRecipeList } from './recipeApi';

const SORT_OPTIONS = [
  { value: 'RECOMMENDED', label: '추천순' },
  { value: 'EASY', label: '쉬운 순' },
  { value: 'FAST', label: '짧은 시간순' },
];

const QUICK_INGREDIENTS = ['양파', '감자', '토마토', '오이', '시금치'];

export default function RecipeListPage({ onOpenRecipe }) {
  const [keyword, setKeyword] = useState('');
  const [ingredientKeyword, setIngredientKeyword] = useState('');
  const [sort, setSort] = useState('RECOMMENDED');
  const [recipeResponse, setRecipeResponse] = useState({
    count: 0,
    recipeList: [],
  });
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const deferredKeyword = useDeferredValue(keyword);

  useEffect(() => {
    let cancelled = false;

    async function loadRecipeList() {
      setLoading(true);
      setErrorMessage('');

      try {
        const data = await fetchRecipeList({
          keyword: deferredKeyword,
          ingredientKeyword,
          sort,
          limit: 18,
        });

        if (!cancelled) {
          setRecipeResponse(data);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error.message);
          setRecipeResponse({
            count: 0,
            recipeList: [],
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadRecipeList();

    return () => {
      cancelled = true;
    };
  }, [deferredKeyword, ingredientKeyword, sort]);

  return (
    <div className="recipe-page">
      <section className="recipe-page-head">
        <div>
          <span className="recipe-kicker">RECIPE / LIST</span>
          <h1>레시피</h1>
          <p>
            구매한 재료와 잘 맞는 레시피를 모아서 보고, 조리 시간과 난이도 기준으로
            빠르게 고를 수 있게 구성했습니다.
          </p>
        </div>
        <div className="recipe-sort-row">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.value}
              className={`btn-chip ${sort === option.value ? 'active' : ''}`}
              type="button"
              onClick={() => setSort(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section className="recipe-toolbar-card">
        <label className="recipe-search-shell">
          <input
            type="text"
            placeholder="재료나 레시피명을 검색"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
          <span className="recipe-search-icon" aria-hidden="true">
            ⌕
          </span>
        </label>

        <div className="recipe-chip-row">
          {QUICK_INGREDIENTS.map((item) => (
            <button
              key={item}
              className={`btn-chip ${ingredientKeyword === item ? 'active' : ''}`}
              type="button"
              onClick={() =>
                setIngredientKeyword((previousValue) =>
                  previousValue === item ? '' : item
                )
              }
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      <section className="recipe-result-meta">
        <strong>총 {recipeResponse.count || 0}개 레시피</strong>
        <span>
          {ingredientKeyword ? `${ingredientKeyword} 재료 필터 적용` : '전체 재료 기준'}
        </span>
      </section>

      {loading ? (
        <section className="recipe-state-card">
          <div className="recipe-state-icon">🍳</div>
          <h2>레시피를 불러오는 중입니다.</h2>
          <p>조금만 기다리면 최신 레시피 목록을 보여드릴게요.</p>
        </section>
      ) : errorMessage ? (
        <section className="recipe-state-card">
          <div className="recipe-state-icon">⚠️</div>
          <h2>레시피 목록을 불러오지 못했습니다.</h2>
          <p>{errorMessage}</p>
        </section>
      ) : recipeResponse.recipeList?.length ? (
        <div className="recipe-list-grid">
          {recipeResponse.recipeList.map((recipe) => (
            <article className="recipe-list-card" key={recipe.recipeNo}>
              <button
                className="recipe-list-card__media"
                type="button"
                onClick={() => onOpenRecipe(recipe.recipeNo)}
              >
                {recipe.imageUrl ? (
                  <img alt={recipe.recipeName} src={recipe.imageUrl} />
                ) : (
                  <div className="recipe-list-card__fallback">
                    {getRecipeEmoji(recipe.recipeName)}
                  </div>
                )}
              </button>

              <div className="recipe-list-card__body">
                <button
                  className="recipe-list-card__title"
                  type="button"
                  onClick={() => onOpenRecipe(recipe.recipeNo)}
                >
                  {recipe.recipeName}
                </button>

                <p className="recipe-list-card__summary">
                  {summarizeDescription(recipe.description)}
                </p>

                <div className="recipe-list-card__meta">
                  <span className="recipe-pill">{recipe.cookTime || '시간 정보 없음'}</span>
                  <span className="recipe-pill">{recipe.difficulty || '난이도 미정'}</span>
                  {recipe.calories != null ? (
                    <span className="recipe-pill">{Math.round(recipe.calories)} kcal</span>
                  ) : null}
                </div>

                <div className="recipe-list-card__foot">
                  <span className="recipe-list-card__source">
                    {recipe.sourceName || 'oneulFarm recipe'}
                  </span>
                  <button
                    className="btn-outline recipe-list-card__action"
                    type="button"
                    onClick={() => onOpenRecipe(recipe.recipeNo)}
                  >
                    상세 보기
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <section className="recipe-state-card">
          <div className="recipe-state-icon">🥬</div>
          <h2>조건에 맞는 레시피가 없습니다.</h2>
          <p>검색어를 줄이거나 재료 칩을 해제해서 다시 확인해보세요.</p>
        </section>
      )}

      <section className="recipe-note-grid">
        <article className="recipe-note-card">
          <h3>최근 많이 찾는 재료</h3>
          <div className="recipe-chip-row">
            {QUICK_INGREDIENTS.map((item) => (
              <span className="recipe-note-chip" key={item}>
                {item}
              </span>
            ))}
          </div>
        </article>

        <article className="recipe-note-card">
          <h3>정렬 기준</h3>
          <div className="recipe-note-list">
            <div>
              <strong>추천순</strong>
              <span>최근 등록된 레시피를 우선 노출합니다.</span>
            </div>
            <div>
              <strong>쉬운 순</strong>
              <span>난이도와 조리 시간을 같이 고려합니다.</span>
            </div>
            <div>
              <strong>짧은 시간순</strong>
              <span>조리 시간 숫자가 짧은 레시피부터 정렬합니다.</span>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}

function summarizeDescription(description) {
  if (!description) {
    return '레시피 설명이 아직 등록되지 않았습니다.';
  }

  const normalizedDescription = description.replace(/\s+/g, ' ').trim();
  if (normalizedDescription.length <= 84) {
    return normalizedDescription;
  }

  return `${normalizedDescription.slice(0, 84)}...`;
}

function getRecipeEmoji(recipeName) {
  const normalizedName = (recipeName || '').toLowerCase();

  if (normalizedName.includes('국') || normalizedName.includes('탕') || normalizedName.includes('수프')) {
    return '🍲';
  }
  if (normalizedName.includes('샐러드') || normalizedName.includes('무침')) {
    return '🥗';
  }
  if (normalizedName.includes('덮밥') || normalizedName.includes('볶음밥')) {
    return '🍚';
  }
  if (normalizedName.includes('파스타') || normalizedName.includes('국수')) {
    return '🍝';
  }

  return '🍳';
}
