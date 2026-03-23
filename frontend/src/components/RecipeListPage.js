import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import '../styles/recipe.css';
import { fetchRecipeList } from './recipeApi';

const SORT_OPTIONS = [
  { value: 'RECOMMENDED', label: '추천순' },
  { value: 'EASY', label: '쉬운 순' },
  { value: 'FAST', label: '빠른 조리' },
];

const QUICK_INGREDIENTS = ['양파', '감자', '토마토', '오이', '시금치'];

export default function RecipeListPage({
  initialIngredientKeyword = '',
  initialKeyword = '',
  initialSort = 'RECOMMENDED',
  onOpenRecipe,
}) {
  const [keyword, setKeyword] = useState(initialKeyword);
  const [ingredientKeyword, setIngredientKeyword] = useState(initialIngredientKeyword);
  const [sort, setSort] = useState(initialSort || 'RECOMMENDED');
  const [recipeResponse, setRecipeResponse] = useState({
    count: 0,
    recipeList: [],
  });
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const deferredKeyword = useDeferredValue(keyword);

  useEffect(() => {
    setKeyword(initialKeyword || '');
    setIngredientKeyword(initialIngredientKeyword || '');
    setSort(initialSort || 'RECOMMENDED');
  }, [initialIngredientKeyword, initialKeyword, initialSort]);

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
          setRecipeResponse(data || { count: 0, recipeList: [] });
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error?.message || '레시피 목록을 불러오지 못했습니다.'
          );
          setRecipeResponse({ count: 0, recipeList: [] });
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

  const ingredientChipList = useMemo(() => {
    if (ingredientKeyword && !QUICK_INGREDIENTS.includes(ingredientKeyword)) {
      return [ingredientKeyword, ...QUICK_INGREDIENTS];
    }

    return QUICK_INGREDIENTS;
  }, [ingredientKeyword]);

  return (
    <div className="recipe-page">
      <section className="recipe-page-head">
        <div>
          <span className="recipe-kicker">RECIPE / LIST</span>
          <h1>레시피</h1>
          <p>
            구매한 재료와 잘 어울리는 레시피를 모아 보고, 조리 시간과 난이도 기준으로
            빠르게 골라보세요.
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
            placeholder="레시피명 또는 설명으로 검색"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
          <span className="recipe-search-icon" aria-hidden="true">
            🔎
          </span>
        </label>

        <div className="recipe-chip-row">
          {ingredientChipList.map((item) => (
            <button
              key={item}
              className={`btn-chip ${ingredientKeyword === item ? 'active' : ''}`}
              type="button"
              onClick={() =>
                setIngredientKeyword((currentValue) =>
                  currentValue === item ? '' : item
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
          {ingredientKeyword
            ? `${ingredientKeyword} 재료 필터 적용`
            : keyword
              ? `"${keyword}" 검색 결과`
              : '전체 레시피 기준'}
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
          <div className="recipe-state-icon">⚠</div>
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
                  <span className="recipe-pill">{recipe.cookTime || '조리 시간 미정'}</span>
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
          <p>검색어를 줄이거나 재료 필터를 해제해서 다시 확인해보세요.</p>
        </section>
      )}

      <section className="recipe-note-grid">
        <article className="recipe-note-card">
          <h3>자주 찾는 재료</h3>
          <div className="recipe-chip-row">
            {ingredientChipList.map((item) => (
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
              <span>상품과 잘 어울리는 레시피를 우선으로 보여드려요.</span>
            </div>
            <div>
              <strong>쉬운 순</strong>
              <span>조리 난이도와 준비 과정을 함께 고려합니다.</span>
            </div>
            <div>
              <strong>빠른 조리</strong>
              <span>조리 시간이 짧은 레시피를 먼저 확인할 수 있어요.</span>
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

  const normalizedDescription = String(description).replace(/\s+/g, ' ').trim();
  if (normalizedDescription.length <= 84) {
    return normalizedDescription;
  }

  return `${normalizedDescription.slice(0, 84).trim()}...`;
}

function getRecipeEmoji(recipeName) {
  const normalizedName = String(recipeName || '').toLowerCase();

  if (
    normalizedName.includes('국') ||
    normalizedName.includes('찌개') ||
    normalizedName.includes('탕') ||
    normalizedName.includes('수프')
  ) {
    return '🍲';
  }

  if (
    normalizedName.includes('샐러드') ||
    normalizedName.includes('무침')
  ) {
    return '🥗';
  }

  if (
    normalizedName.includes('볶음') ||
    normalizedName.includes('전') ||
    normalizedName.includes('덮밥')
  ) {
    return '🍳';
  }

  if (
    normalizedName.includes('파스타') ||
    normalizedName.includes('국수')
  ) {
    return '🍝';
  }

  return '🥘';
}
