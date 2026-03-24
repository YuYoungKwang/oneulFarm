import PriceAnalysisSection from './PriceAnalysisSection';
import PriceEmptyState from './PriceEmptyState';
import SafeImage from '../SafeImage';

export default function RecipeRecommendationSection({
  className = '',
  error,
  items = [],
  keyword,
  loading,
  onOpenAll,
  onOpenRecipe,
  onReset,
}) {
  return (
    <PriceAnalysisSection
      className={className}
      actionLabel="레시피 전체 보기"
      actionTone="ghost"
      eyebrow="레시피 연결"
      subtitle="오늘 본 품목을 실제 식탁으로 이어볼 수 있는 레시피입니다."
      title="가격 확인 후 바로 이어보는 레시피"
      onAction={onOpenAll}
    >
      {loading ? (
        <div className="price-loading-card">
          <strong>추천 레시피를 준비하고 있습니다.</strong>
          <p>선택한 품목과 연결되는 레시피를 불러오는 중입니다.</p>
        </div>
      ) : items.length ? (
        <div className="price-recipe-grid">
          {items.map((recipe) => {
            const ingredientTags = extractRecipeTags(recipe, keyword);

            return (
              <article className="price-recipe-card" key={recipe.recipeNo}>
                <div className="price-recipe-card__media">
                  <SafeImage
                    alt={recipe.recipeName || '추천 레시피'}
                    className="price-recipe-card__image"
                    fallback={
                      <div className="price-recipe-card__fallback" aria-hidden="true">
                        {recipe.recipeName?.slice(0, 2) || '레시피'}
                      </div>
                    }
                    src={recipe.imageUrl}
                  />
                </div>

                <div className="price-recipe-card__body">
                  <span className="price-tone-pill tone-green">이 상품 활용</span>
                  <h3>{recipe.recipeName}</h3>
                  <p>{buildRecipeReason(recipe, keyword)}</p>

                  <div className="price-recipe-card__chips">
                    {ingredientTags.map((tag) => (
                      <span className="price-recipe-card__chip" key={`${recipe.recipeNo}-${tag}`}>
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="price-recipe-card__footer">
                    <span>
                      {keyword
                        ? `${keyword}를 소비 행동으로 이어볼 수 있는 메뉴`
                        : '오늘 본 가격 정보를 바로 활용할 수 있는 메뉴'}
                    </span>
                    <button
                      className="price-btn price-btn--secondary"
                      type="button"
                      onClick={() => onOpenRecipe(recipe.recipeNo)}
                    >
                      레시피 보기
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <PriceEmptyState
          actionLabel="다른 품목으로 보기"
          icon="RC"
          secondaryActionLabel="레시피 전체 보기"
          subtitle={
            error ||
            '현재 선택한 품목과 바로 연결할 수 있는 레시피가 충분하지 않습니다. 다른 품목이나 전체 레시피를 살펴보세요.'
          }
          title="지금 연결할 레시피가 부족합니다."
          onAction={onReset}
          onSecondaryAction={onOpenAll}
        />
      )}
    </PriceAnalysisSection>
  );
}

function buildRecipeReason(recipe, keyword) {
  if (recipe?.description) {
    const normalized = String(recipe.description).replace(/\s+/g, ' ').trim();
    if (normalized.length <= 82) {
      return normalized;
    }
    return `${normalized.slice(0, 82).trim()}...`;
  }

  if (keyword) {
    return `${keyword}를 활용해 오늘의 시세 정보를 실제 소비로 이어볼 수 있는 메뉴입니다.`;
  }

  return '가격 데이터에서 바로 식탁 행동으로 이어질 수 있는 대표 메뉴입니다.';
}

function extractRecipeTags(recipe, keyword) {
  const ingredientList = Array.isArray(recipe?.ingredientList) ? recipe.ingredientList : [];
  const fromIngredients = ingredientList
    .map((item) => item?.ingredientName || item?.name || '')
    .filter(Boolean)
    .slice(0, 3);

  if (fromIngredients.length) {
    return fromIngredients;
  }

  if (keyword) {
    return [keyword, '제철 활용'];
  }

  return ['추천 메뉴'];
}
