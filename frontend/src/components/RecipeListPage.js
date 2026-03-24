import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import '../styles/recipe.css';
import { fetchRecipeList } from './recipeApi';

const PAGE_SIZE = 8;
const QUICK_INGREDIENTS = ['양파', '감자', '토마토', '오이', '버섯'];

export default function RecipeListPage({
  initialIngredientKeyword = '',
  initialKeyword = '',
  onOpenRecipe,
}) {
  const [keyword, setKeyword] = useState(initialKeyword);
  const [ingredientKeyword, setIngredientKeyword] = useState(initialIngredientKeyword);
  const [currentPage, setCurrentPage] = useState(1);
  const [recipeResponse, setRecipeResponse] = useState({
    count: 0,
    currentCount: 0,
    page: 1,
    pageSize: PAGE_SIZE,
    recipeList: [],
    totalCount: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const deferredKeyword = useDeferredValue(keyword);
  const listAnchorRef = useRef(null);
  const paginationScrollPendingRef = useRef(false);
  const recipeList = recipeResponse.recipeList || [];
  const totalCount = recipeResponse.totalCount || recipeResponse.count || 0;
  const totalPages = recipeResponse.totalPages || 0;
  const hasFilters = Boolean(keyword.trim() || ingredientKeyword);

  useEffect(() => {
    setKeyword(initialKeyword || '');
    setIngredientKeyword(initialIngredientKeyword || '');
    setCurrentPage(1);
  }, [initialIngredientKeyword, initialKeyword]);

  useEffect(() => {
    setCurrentPage(1);
  }, [deferredKeyword, ingredientKeyword]);

  useEffect(() => {
    if (!paginationScrollPendingRef.current) {
      return;
    }

    paginationScrollPendingRef.current = false;
    listAnchorRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }, [currentPage]);

  useEffect(() => {
    let cancelled = false;

    async function loadRecipeList() {
      setLoading(true);
      setErrorMessage('');

      try {
        const data = await fetchRecipeList({
          keyword: deferredKeyword,
          ingredientKeyword,
          page: currentPage,
          pageSize: PAGE_SIZE,
        });

        if (cancelled) {
          return;
        }

        setRecipeResponse({
          count: data?.count || 0,
          currentCount: data?.currentCount || 0,
          page: data?.page || currentPage,
          pageSize: data?.pageSize || PAGE_SIZE,
          recipeList: Array.isArray(data?.recipeList) ? data.recipeList : [],
          totalCount: data?.totalCount || data?.count || 0,
          totalPages: data?.totalPages || 0,
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        setErrorMessage(error?.message || '레시피 목록을 불러오지 못했습니다.');
        setRecipeResponse({
          count: 0,
          currentCount: 0,
          page: 1,
          pageSize: PAGE_SIZE,
          recipeList: [],
          totalCount: 0,
          totalPages: 0,
        });
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
  }, [currentPage, deferredKeyword, ingredientKeyword]);

  const paginationNumbers = useMemo(
    () => buildPaginationNumbers(currentPage, totalPages),
    [currentPage, totalPages]
  );

  const ingredientChipList = useMemo(() => {
    if (ingredientKeyword && !QUICK_INGREDIENTS.includes(ingredientKeyword)) {
      return [ingredientKeyword, ...QUICK_INGREDIENTS];
    }

    return QUICK_INGREDIENTS;
  }, [ingredientKeyword]);

  function resetFilters() {
    setKeyword('');
    setIngredientKeyword('');
    setCurrentPage(1);
  }

  function handlePageChange(nextPage) {
    if (nextPage === currentPage) {
      return;
    }

    paginationScrollPendingRef.current = true;
    setCurrentPage(nextPage);
  }

  return (
    <div className="recipe-page recipe-list-page">
      <section className="recipe-hero recipe-hero--list">
        <div className="recipe-hero__content">
          <span className="recipe-kicker">Recipe Collection</span>
          <h1>오늘 먹을 메뉴를 한눈에 골라보세요.</h1>

          <div className="recipe-hero__stats">
            <div className="recipe-hero-stat">
              <strong>{totalCount}</strong>
              <span>전체 레시피</span>
            </div>
            <div className="recipe-hero-stat">
              <strong>{ingredientKeyword || '전체'}</strong>
              <span>선택 재료</span>
            </div>
            <div className="recipe-hero-stat">
              <strong>{totalPages ? `${currentPage} / ${totalPages}` : '1 / 1'}</strong>
              <span>{PAGE_SIZE}개씩 보기</span>
            </div>
          </div>
        </div>
      </section>

      <section className="recipe-toolbar-card" ref={listAnchorRef}>
        <div className="recipe-toolbar-card__top">
          <div className="recipe-toolbar-copy recipe-toolbar-copy--search">
            <strong>레시피 검색</strong>
            <span>재료명이나 레시피 이름으로 원하는 메뉴를 빠르게 찾아보세요.</span>
          </div>

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

        <label className="recipe-search-shell recipe-search-shell--full">
          <span className="recipe-search-icon" aria-hidden="true">
            SEARCH
          </span>
          <input
            type="text"
            placeholder="재료명 또는 레시피 이름을 입력하세요"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
        </label>

        <div className="recipe-toolbar-copy">
          <strong>자주 찾는 재료</strong>
        </div>

        <div className="recipe-chip-row">
          {ingredientChipList.map((item) => (
            <button
              key={item}
              className={`btn-chip ${ingredientKeyword === item ? 'active' : ''}`}
              type="button"
              onClick={() =>
                setIngredientKeyword((currentValue) => (currentValue === item ? '' : item))
              }
            >
              {item}
            </button>
          ))}
        </div>

        <div className="recipe-toolbar-footer">
          <div className="recipe-result-meta">
            <strong>총 {totalCount}개의 레시피</strong>
            <span>
              {ingredientKeyword
                ? `선택 재료 · ${ingredientKeyword}`
                : '재료 칩으로 빠르게 범위를 좁혀보세요.'}
            </span>
          </div>
        </div>
      </section>

      {loading ? (
        <section className="recipe-state-card">
          <div className="recipe-state-icon">LOADING</div>
          <h2>레시피를 불러오는 중입니다</h2>
          <p>검색 조건에 맞는 메뉴를 준비하고 있어요.</p>
        </section>
      ) : errorMessage ? (
        <section className="recipe-state-card">
          <div className="recipe-state-icon">ERROR</div>
          <h2>레시피 목록을 가져오지 못했습니다</h2>
          <p>{errorMessage}</p>
        </section>
      ) : recipeList.length ? (
        <>
          <div className="recipe-list-grid recipe-list-grid--compact">
            {recipeList.map((recipe) => (
              <article
                className="recipe-list-card recipe-list-card--compact"
                key={recipe.recipeNo}
              >
                <div className="recipe-list-card__visual">
                  <button
                    className="recipe-list-card__media recipe-list-card__media--compact"
                    type="button"
                    onClick={() => onOpenRecipe(recipe.recipeNo)}
                  >
                    {recipe.imageUrl ? (
                      <img alt={recipe.recipeName} src={recipe.imageUrl} />
                    ) : (
                      <div className="recipe-list-card__fallback recipe-list-card__fallback--compact">
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
                      className="recipe-list-card__title recipe-list-card__title--compact"
                      type="button"
                      onClick={() => onOpenRecipe(recipe.recipeNo)}
                    >
                      {recipe.recipeName}
                    </button>
                    <p className="recipe-list-card__summary recipe-list-card__summary--compact">
                      {summarizeDescription(recipe.description)}
                    </p>
                  </div>

                  {ingredientKeyword ? (
                    <div className="recipe-list-card__meta">
                      <span className="recipe-pill">{ingredientKeyword}</span>
                    </div>
                  ) : null}

                  <div className="recipe-list-card__foot recipe-list-card__foot--compact">
                    <button
                      className="btn recipe-list-card__action recipe-list-card__action--compact"
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

          {totalPages > 1 ? (
            <nav aria-label="레시피 목록 페이지 이동" className="recipe-pagination">
              <button
                className="recipe-pagination__button"
                disabled={currentPage <= 1}
                type="button"
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              >
                이전
              </button>

              <div className="recipe-pagination__numbers">
                {paginationNumbers.map((pageNumber) => (
                  <button
                    key={pageNumber}
                    aria-current={pageNumber === currentPage ? 'page' : undefined}
                    className={`recipe-pagination__button ${
                      pageNumber === currentPage ? 'is-active' : ''
                    }`}
                    type="button"
                    onClick={() => handlePageChange(pageNumber)}
                  >
                    {pageNumber}
                  </button>
                ))}
              </div>

              <button
                className="recipe-pagination__button"
                disabled={currentPage >= totalPages}
                type="button"
                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
              >
                다음
              </button>
            </nav>
          ) : null}
        </>
      ) : (
        <section className="recipe-state-card">
          <div className="recipe-state-icon">EMPTY</div>
          <h2>조건에 맞는 레시피가 없습니다</h2>
          <p>검색어를 줄이거나 재료 필터를 해제한 뒤 다시 확인해보세요.</p>
        </section>
      )}
    </div>
  );
}

function summarizeDescription(description) {
  if (!description) {
    return '설명이 아직 등록되지 않은 레시피입니다.';
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
    normalizedName.includes('스프') ||
    normalizedName.includes('수프')
  ) {
    return '🍲';
  }

  if (normalizedName.includes('샐러드') || normalizedName.includes('무침')) {
    return '🥗';
  }

  if (
    normalizedName.includes('볶음') ||
    normalizedName.includes('전') ||
    normalizedName.includes('구이') ||
    normalizedName.includes('찜')
  ) {
    return '🍳';
  }

  if (normalizedName.includes('파스타') || normalizedName.includes('국수')) {
    return '🍝';
  }

  return '🍽️';
}

function buildPaginationNumbers(currentPage, totalPages) {
  if (!totalPages) {
    return [1];
  }

  const visibleCount = 5;
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, startPage + visibleCount - 1);

  if (endPage - startPage + 1 < visibleCount) {
    startPage = Math.max(1, endPage - visibleCount + 1);
  }

  const pageNumbers = [];
  for (let page = startPage; page <= endPage; page += 1) {
    pageNumbers.push(page);
  }

  return pageNumbers;
}
