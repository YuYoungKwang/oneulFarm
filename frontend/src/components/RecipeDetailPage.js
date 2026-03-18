import { useEffect, useState } from 'react';
import '../styles/recipe.css';
import { fetchRecipeDetail } from './recipeApi';

export default function RecipeDetailPage({ onBack, recipeNo }) {
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadRecipeDetail() {
      setLoading(true);
      setErrorMessage('');

      try {
        const data = await fetchRecipeDetail(recipeNo);
        if (!cancelled) {
          setRecipe(data);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error.message);
          setRecipe(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadRecipeDetail();

    return () => {
      cancelled = true;
    };
  }, [recipeNo]);

  if (loading) {
    return (
      <section className="recipe-state-card recipe-detail-state">
        <div className="recipe-state-icon">🍲</div>
        <h2>레시피 상세를 불러오는 중입니다.</h2>
        <p>조리 순서와 재료 정보를 준비하고 있습니다.</p>
      </section>
    );
  }

  if (errorMessage || !recipe) {
    return (
      <section className="recipe-state-card recipe-detail-state">
        <div className="recipe-state-icon">⚠️</div>
        <h2>레시피 상세를 찾지 못했습니다.</h2>
        <p>{errorMessage || '잘못된 경로이거나 삭제된 레시피입니다.'}</p>
        <button className="btn" type="button" onClick={onBack}>
          레시피 목록으로
        </button>
      </section>
    );
  }

  return (
    <div className="recipe-page recipe-detail-page">
      <section className="recipe-detail-head">
        <button className="btn-outline recipe-back-link" type="button" onClick={onBack}>
          목록으로
        </button>
      </section>

      <section className="recipe-detail-top">
        <article className="recipe-detail-media-card">
          {recipe.imageUrl ? (
            <img alt={recipe.recipeName} className="recipe-detail-main-image" src={recipe.imageUrl} />
          ) : (
            <div className="recipe-detail-main-fallback">{getRecipeEmoji(recipe.recipeName)}</div>
          )}
        </article>

        <article className="recipe-detail-info-card">
          <span className="recipe-kicker">RECIPE / DETAIL</span>
          <h1>{recipe.recipeName}</h1>

          <div className="recipe-detail-badges">
            <span className="recipe-badge recipe-badge--green">{recipe.difficulty || '난이도 미정'}</span>
            <span className="recipe-badge recipe-badge--yellow">{recipe.cookTime || '시간 정보 없음'}</span>
            {recipe.calories != null ? (
              <span className="recipe-badge">{Math.round(recipe.calories)} kcal</span>
            ) : null}
          </div>

          <p className="recipe-detail-description">
            {recipe.description || '레시피 설명이 아직 등록되지 않았습니다.'}
          </p>

          <div className="recipe-detail-info-grid">
            <div className="recipe-summary-box">
              <strong>재료</strong>
              {recipe.ingredientList?.length ? (
                <ul className="recipe-summary-list">
                  {recipe.ingredientList.map((ingredient) => (
                    <li key={ingredient.ingredientNo}>
                      <span>{ingredient.ingredientName}</span>
                      <small>{ingredient.amount || '적당량'}</small>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>등록된 재료 정보가 없습니다.</p>
              )}
            </div>

            <div className="recipe-summary-box">
              <strong>레시피 정보</strong>
              <div className="recipe-nutrition-grid">
                <div>
                  <span>칼로리</span>
                  <strong>{recipe.calories != null ? `${Math.round(recipe.calories)} kcal` : '정보 없음'}</strong>
                </div>
                <div>
                  <span>조리 단계</span>
                  <strong>{recipe.stepList?.length || 0}단계</strong>
                </div>
                <div>
                  <span>재료 수</span>
                  <strong>{recipe.ingredientList?.length || 0}개</strong>
                </div>
                <div>
                  <span>출처</span>
                  <strong>{recipe.sourceName || 'oneulFarm'}</strong>
                </div>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className="recipe-step-section">
        <div className="recipe-step-section__head">
          <div>
            <span className="recipe-kicker">STEP GUIDE</span>
            <h2>조리 순서</h2>
          </div>
        </div>

        {recipe.stepList?.length ? (
          <div className="recipe-step-list">
            {recipe.stepList.map((step) => (
              <article className="recipe-step-card" key={step.stepNo}>
                <div className="recipe-step-number">{step.stepSeq}</div>

                <div className="recipe-step-copy">
                  <strong>{`${step.stepSeq}단계`}</strong>
                  <p>{step.description}</p>
                </div>

                <div className="recipe-step-media">
                  {step.primaryImageUrl ? (
                    <img alt={`${recipe.recipeName} ${step.stepSeq}단계`} src={step.primaryImageUrl} />
                  ) : (
                    <div className="recipe-step-fallback">
                      <span>IMG</span>
                      {step.stepSeq}단계 조리 이미지
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <section className="recipe-state-card recipe-detail-state">
            <div className="recipe-state-icon">📝</div>
            <h2>조리 순서가 아직 없습니다.</h2>
            <p>레시피 단계 데이터가 들어오면 이 영역에 순서대로 보여집니다.</p>
          </section>
        )}
      </section>
    </div>
  );
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
