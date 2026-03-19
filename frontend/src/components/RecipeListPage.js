import { useDeferredValue, useEffect, useState } from 'react';
import '../styles/recipe.css';
import { fetchRecipeList } from './recipeApi';

const QUICK_INGREDIENTS = ['양파', '감자', '토마토', '닭고기', '버섯'];

export default function RecipeListPage({ onOpenRecipe }) {
  const [keyword, setKeyword] = useState('');
  const [ingredientKeyword, setIngredientKeyword] = useState('');
  const [recipeResponse, setRecipeResponse] = useState({
    count: 0,
    recipeList: [],
  });
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const deferredKeyword = useDeferredValue(keyword);
  const recipeList = recipeResponse.recipeList || [];
  const hasFilters = Boolean(keyword.trim() || ingredientKeyword);

  useEffect(() => {
    let cancelled = false;

    async function loadRecipeList() {
      setLoading(true);
      setErrorMessage('');

      try {
        const data = await fetchRecipeList({
          keyword: deferredKeyword,
          ingredientKeyword,
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
  }, [deferredKeyword, ingredientKeyword]);

  function resetFilters() {
    setKeyword('');
    setIngredientKeyword('');
  }

  return (
    <div className="recipe-page recipe-list-page">
      <section className="recipe-hero recipe-hero--list">
        <div className="recipe-hero__content">
          <span className="recipe-kicker">Recipe Collection</span>
          <h1>오늘 먹을 메뉴를 더 빠르게 골라보세요</h1>
          <p>
            재료명이나 요리 이름으로 바로 찾고, 자주 찾는 재료 필터로
            레시피를 빠르게 좁혀보세요.
          </p>

          <div className="recipe-hero__stats">
            <div className="recipe-hero-stat">
              <strong>{recipeResponse.count || 0}</strong>
              <span>검색된 레시피</span>
            </div>
            <div className="recipe-hero-stat">
              <strong>{ingredientKeyword || '전체'}</strong>
              <span>활성 재료 필터</span>
            </div>
            <div className="recipe-hero-stat">
              <strong>{deferredKeyword.trim() || '추천'}</strong>
              <span>현재 검색어</span>
            </div>
          </div>
        </div>

        <aside className="recipe-hero__aside">
          <div className="recipe-hero-note">
            <strong>빠른 탐색</strong>
            <p>가볍게 둘러볼 때는 재료 칩만 눌러도 바로 목록이 바뀝니다.</p>
          </div>
          <div className="recipe-hero-note recipe-hero-note--accent">
            <strong>장보기 연계</strong>
            <p>상세 페이지에서 필요한 재료를 한 번에 담아 장보기 흐름으로 이어질 수 있습니다.</p>
          </div>
        </aside>
      </section>

      <section className="recipe-toolbar-card">
        <div className="recipe-toolbar-card__top">
          <label className="recipe-search-shell">
            <span className="recipe-search-label">검색</span>
            <input
              type="text"
              placeholder="재료명 또는 레시피 이름을 입력하세요"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
            <span className="recipe-search-icon" aria-hidden="true">
              SEARCH
            </span>
          </label>

          {hasFilters ? (
            <button
              className="btn-outline recipe-toolbar-card__reset"
              type="button"
              onClick={resetFilters}
            >
              필터 초기화
            </button>
          ) : null}
        </div>

        <div className="recipe-toolbar-copy">
          <strong>자주 찾는 재료</strong>
          <span>필터를 하나만 눌러도 바로 맞춤 목록으로 좁혀집니다.</span>
        </div>

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

        <div className="recipe-result-meta">
          <strong>총 {recipeResponse.count || 0}개의 레시피</strong>
          <span>
            {ingredientKeyword
              ? `${ingredientKeyword} 재료 기준으로 정리된 목록`
              : '전체 재료 기준으로 추천 순 노출'}
          </span>
        </div>
      </section>

      {loading ? (
        <section className="recipe-state-card">
          <div className="recipe-state-icon">⌛</div>
          <h2>레시피를 불러오는 중입니다</h2>
          <p>검색 조건에 맞는 메뉴를 준비하고 있어요.</p>
        </section>
      ) : errorMessage ? (
        <section className="recipe-state-card">
          <div className="recipe-state-icon">⚠️</div>
          <h2>레시피 목록을 가져오지 못했습니다</h2>
          <p>{errorMessage}</p>
        </section>
      ) : recipeList.length ? (
        <div className="recipe-list-grid">
          {recipeList.map((recipe) => (
            <article className="recipe-list-card" key={recipe.recipeNo}>
              <div className="recipe-list-card__visual">
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
                <div className="recipe-list-card__badge-row">
                  {recipe.calories != null ? (
                    <span className="recipe-badge recipe-badge--green">
                      {Math.round(recipe.calories)} kcal
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="recipe-list-card__body">
                <div className="recipe-list-card__head">
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
                </div>

                <div className="recipe-list-card__meta">
                  <span className="recipe-pill">재료 담기 지원</span>
                  <span className="recipe-pill">상세 단계 확인 가능</span>
                </div>

                <div className="recipe-list-card__foot">
                  <span className="recipe-list-card__hint">
                    클릭하면 상세 레시피와 재료 구성을 확인할 수 있어요.
                  </span>
                  <button
                    className="btn recipe-list-card__action"
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
          <div className="recipe-state-icon">🍽️</div>
          <h2>조건에 맞는 레시피가 없습니다</h2>
          <p>검색어를 줄이거나 재료 필터를 해제한 뒤 다시 확인해 주세요.</p>
        </section>
      )}

      <section className="recipe-note-grid">
        <article className="recipe-note-card">
          <span className="recipe-kicker">Quick Picks</span>
          <h3>지금 많이 찾는 재료</h3>
          <div className="recipe-chip-row">
            {QUICK_INGREDIENTS.map((item) => (
              <span className="recipe-note-chip" key={item}>
                {item}
              </span>
            ))}
          </div>
        </article>
        <article className="recipe-note-card recipe-note-card--accent">
          <span className="recipe-kicker">How To Use</span>
          <h3>더 편하게 보는 방법</h3>
          <ul className="recipe-note-list">
            <li>재료 필터를 먼저 고르면 원하는 분위기의 메뉴를 빠르게 좁힐 수 있습니다.</li>
            <li>상세 페이지에서는 인분 조절과 재료 담기 기능을 바로 사용할 수 있습니다.</li>
          </ul>
        </article>
      </section>
    </div>
  );
}

function summarizeDescription(description) {
  if (!description) {
    return '설명이 아직 등록되지 않은 레시피입니다.';
  }

  const normalizedDescription = description.replace(/\s+/g, ' ').trim();
  if (normalizedDescription.length <= 96) {
    return normalizedDescription;
  }

  return `${normalizedDescription.slice(0, 96)}...`;
}

function getRecipeEmoji(recipeName) {
  const normalizedName = (recipeName || '').toLowerCase();

  if (normalizedName.includes('국') || normalizedName.includes('탕') || normalizedName.includes('스프')) {
    return '🍲';
  }
  if (normalizedName.includes('샐러드') || normalizedName.includes('무침')) {
    return '🥗';
  }
  if (normalizedName.includes('볶음') || normalizedName.includes('덮밥')) {
    return '🥘';
  }
  if (normalizedName.includes('파스타') || normalizedName.includes('국수')) {
    return '🍜';
  }

  return '🍳';
}
