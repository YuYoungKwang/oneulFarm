import { useEffect, useState } from 'react';
import '../styles/recipe.css';
import { fetchRecipeDetail } from './recipeApi';

const RECIPE_SAVED_KEY = 'oneulfarm_saved_recipes';
const RECIPE_INGREDIENT_CART_KEY = 'oneulfarm_recipe_ingredient_cart';
const SERVING_SCALE_OPTIONS = [
  { value: 0.5, label: '0.5 인분' },
  { value: 1, label: '1 인분' },
  { value: 2, label: '2 인분' },
];

export default function RecipeDetailPage({ onBack, recipeNo }) {
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [saved, setSaved] = useState(false);
  const [servingScale, setServingScale] = useState(1);
  const [actionMessage, setActionMessage] = useState('');
  const [selectedStep, setSelectedStep] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadRecipeDetail() {
      setLoading(true);
      setErrorMessage('');
      setActionMessage('');
      setServingScale(1);
      setSelectedStep(null);

      if (recipeNo == null) {
        if (!cancelled) {
          setRecipe(null);
          setSaved(false);
          setErrorMessage('잘못된 레시피 경로입니다.');
          setLoading(false);
        }
        return;
      }

      try {
        const data = await fetchRecipeDetail(recipeNo);
        if (cancelled) {
          return;
        }

        setRecipe(data);
        setSaved(isRecipeSaved(data?.recipeNo));
      } catch (error) {
        if (cancelled) {
          return;
        }

        setRecipe(null);
        setSaved(false);
        setErrorMessage(error?.message || '레시피 상세를 불러오지 못했습니다.');
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

  useEffect(() => {
    if (!selectedStep || typeof document === 'undefined') {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setSelectedStep(null);
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedStep]);

  if (loading) {
    return (
      <section className="recipe-state-card recipe-detail-state">
        <div className="recipe-state-icon">⌛</div>
        <h2>레시피 상세를 불러오는 중입니다</h2>
        <p>재료와 조리 단계를 정리해서 보여드릴게요.</p>
      </section>
    );
  }

  if (errorMessage || !recipe) {
    return (
      <section className="recipe-state-card recipe-detail-state">
        <div className="recipe-state-icon">⚠️</div>
        <h2>레시피 상세를 찾지 못했습니다</h2>
        <p>{errorMessage || '잘못된 경로이거나 삭제된 레시피입니다.'}</p>
        <button className="btn" type="button" onClick={onBack}>
          레시피 목록으로
        </button>
      </section>
    );
  }

  const ingredientList = recipe.ingredientList || [];
  const stepList = recipe.stepList || [];
  const quickFactList = buildQuickFactList(recipe, ingredientList.length, stepList.length);
  const detailInfoList = buildDetailInfoList(recipe, ingredientList, stepList);
  const ingredientSectionList = groupIngredients(ingredientList).map((section) => ({
    ...section,
    items: section.items.map((item) => ({
      ...item,
      amount: normalizeIngredientAmount(scaleAmountLabel(item.amount, servingScale)),
    })),
  }));
  const recommendedProductList =
    recipe.recommendedProductList ||
    recipe.recommendedProducts ||
    recipe.recommendProducts ||
    [];
  const normalizedRecommendedProducts = Array.isArray(recommendedProductList)
    ? recommendedProductList
    : [];
  const stepCardList = stepList.map((step, index) => ({
    ...step,
    stepSeq: step.stepSeq || index + 1,
    description: normalizeStepDescription(step.description),
  }));

  function handleToggleSave() {
    const savedRecipeNoList = readLocalStorageArray(RECIPE_SAVED_KEY);
    const normalizedRecipeNo = Number(recipe.recipeNo);
    const nextSaved = !saved;
    const nextRecipeNoList = nextSaved
      ? Array.from(new Set([...savedRecipeNoList, normalizedRecipeNo]))
      : savedRecipeNoList.filter((value) => Number(value) !== normalizedRecipeNo);

    writeLocalStorageArray(RECIPE_SAVED_KEY, nextRecipeNoList);
    setSaved(nextSaved);
    setActionMessage(
      nextSaved ? '레시피를 저장했어요.' : '저장한 레시피에서 제거했어요.'
    );
  }

  async function handleShare() {
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

    try {
      if (navigator.share) {
        await navigator.share({
          title: recipe.recipeName,
          text: `${recipe.recipeName} 레시피를 확인해보세요.`,
          url: shareUrl,
        });
        setActionMessage('레시피를 공유했어요.');
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        setActionMessage('레시피 링크를 복사했어요.');
        return;
      }

      setActionMessage('현재 브라우저는 공유 기능을 지원하지 않습니다.');
    } catch (error) {
      setActionMessage('공유 중 오류가 발생했어요. 다시 시도해 주세요.');
    }
  }

  function handleAddIngredients() {
    const currentCartList = readLocalStorageArray(RECIPE_INGREDIENT_CART_KEY);
    const nextItemList = ingredientList.map((ingredient) => {
      const display = normalizeIngredientDisplay(ingredient);

      return {
        recipeNo: recipe.recipeNo,
        recipeName: recipe.recipeName,
        ingredientName: display.name,
        amount: normalizeIngredientAmount(
          scaleAmountLabel(display.amount, servingScale)
        ),
      };
    });

    const mergedItemMap = new Map();
    [...currentCartList, ...nextItemList].forEach((item) => {
      const key = `${item.recipeNo}-${item.ingredientName}`;
      mergedItemMap.set(key, item);
    });

    writeLocalStorageArray(RECIPE_INGREDIENT_CART_KEY, Array.from(mergedItemMap.values()));
    setActionMessage(`레시피 재료 ${nextItemList.length}개를 담았어요.`);
  }

  function handleOpenProduct(productNo) {
    if (productNo == null) {
      return;
    }
    window.location.hash = `#/products/${productNo}`;
  }

  return (
    <div className="recipe-page recipe-detail-page">
      <section className="recipe-detail-head">
        <button className="btn-outline recipe-back-link" type="button" onClick={onBack}>
          레시피 목록으로
        </button>
        <div className="recipe-breadcrumbs" aria-label="breadcrumb">
          <span>홈</span>
          <span aria-hidden="true">/</span>
          <span>레시피</span>
          <span aria-hidden="true">/</span>
          <strong>{recipe.recipeName}</strong>
        </div>
      </section>

      <section className="recipe-detail-hero">
        <article className="recipe-hero-media-card">
          {recipe.imageUrl ? (
            <img alt={recipe.recipeName} className="recipe-detail-main-image" src={recipe.imageUrl} />
          ) : (
            <div className="recipe-detail-main-fallback">{getRecipeEmoji(recipe.recipeName)}</div>
          )}
        </article>

        <article className="recipe-hero-panel recipe-detail-panel">
          <div className="recipe-hero-topline">
            <span className="recipe-kicker">RECIPE / DETAIL</span>
            <span className="recipe-detail-chip">한눈에 보기</span>
          </div>

          <div className="recipe-hero-copy">
            <h1>{recipe.recipeName}</h1>
            <p className="recipe-hero-summary">{summarizeDescription(recipe.description)}</p>
          </div>

          <div className="recipe-hero-quickfacts" aria-label="핵심 정보">
            {quickFactList.map((item) => (
              <div className="recipe-hero-fact" key={item.label}>
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </div>
            ))}
          </div>

          <div className="recipe-hero-actions">
            <button className="btn recipe-action-primary" type="button" onClick={handleAddIngredients}>
              재료 담기
            </button>
            <button
              className={`btn-outline recipe-action-ghost ${saved ? 'is-active' : ''}`}
              type="button"
              aria-pressed={saved}
              onClick={handleToggleSave}
            >
              {saved ? '저장됨' : '저장'}
            </button>
            <button className="btn-outline recipe-action-ghost" type="button" onClick={handleShare}>
              공유
            </button>
          </div>

          <div className="recipe-scale-row">
            <div className="recipe-scale-copy">
              <strong>분량 조절</strong>
              <span>재료 수량을 함께 다시 계산합니다.</span>
            </div>
            <div className="recipe-scale-options">
              {SERVING_SCALE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  className={`btn-chip ${servingScale === option.value ? 'active' : ''}`}
                  type="button"
                  onClick={() => setServingScale(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {actionMessage ? (
            <p className="recipe-action-feedback" role="status" aria-live="polite">
              {actionMessage}
            </p>
          ) : null}
        </article>
      </section>

      <section className="recipe-detail-info-layout">
        <article className="recipe-detail-panel recipe-detail-panel--tight recipe-detail-info-panel">
          <div className="recipe-section-head">
            <div>
              <span className="recipe-kicker">DETAIL INFO</span>
              <h2>조리 전 체크</h2>
            </div>
            <p>조리 전에 확인하면 좋은 핵심 포인트를 모았습니다.</p>
          </div>

          <div className="recipe-insight-list">
            {detailInfoList.map((item) => (
              <div className="recipe-insight-row" key={item.label}>
                <div className="recipe-insight-row__meta">
                  <span className="recipe-insight-row__label">{item.label}</span>
                  <small className="recipe-insight-row__hint">{item.hint}</small>
                </div>
                <strong className="recipe-insight-row__value">{item.value}</strong>
              </div>
            ))}
          </div>

          <div className="recipe-insight-note">
            <strong>빠른 확인</strong>
            <p>보관 방식과 조리 도구를 먼저 확인하면 레시피를 더 수월하게 따라갈 수 있습니다.</p>
          </div>
        </article>

        <article className="recipe-detail-panel recipe-detail-panel--tight recipe-detail-ingredient-panel">
          <div className="recipe-section-head">
            <div>
              <span className="recipe-kicker">INGREDIENTS</span>
              <h2>재료 정리</h2>
            </div>
            <p>재료명과 수량을 분리해, 장보기와 조리를 더 쉽게 볼 수 있게 정리했습니다.</p>
          </div>

          <div className="recipe-ingredient-groups">
            {ingredientSectionList.map((section) => (
              <section className="recipe-ingredient-group" key={section.title}>
                <div className="recipe-ingredient-group__head">
                  <strong>{section.title}</strong>
                  <span>{section.items.length}개</span>
                </div>
                <ul className="recipe-ingredient-list">
                  {section.items.map((ingredient) => (
                    <li className="recipe-ingredient-row" key={`${section.title}-${ingredient.key}`}>
                      <span className="recipe-ingredient-name" title={ingredient.name}>
                        {ingredient.name}
                      </span>
                      <strong className="recipe-ingredient-amount">
                        {ingredient.amount}
                      </strong>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </article>
      </section>

      {normalizedRecommendedProducts.length ? (
        <section className="recipe-recommend-section recipe-detail-panel">
          <div className="recipe-section-head">
            <div>
              <span className="recipe-kicker">RECOMMEND</span>
              <h2>추천 상품</h2>
            </div>
            <p>레시피 재료와 맞닿은 실제 판매 상품을 골라 보여줍니다.</p>
          </div>

          <div className="recipe-recommend-grid">
            {normalizedRecommendedProducts.map((product) => {
              const avgPrice = toNumber(
                product.avgPrice ?? product.priceSnapshot?.avgPrice,
                toNumber(product.salePrice, 0)
              );
              const savingRate = toNumber(
                product.savingRate ?? product.priceMatch?.savingRate,
                0
              );
              const badgeType = product.badgeType || product.priceMatch?.badgeType;
              const matchedIngredient =
                product.matchedIngredientName ||
                product.matchedIngredient ||
                product.matchedIngredientText;

              return (
                <article className="recipe-recommend-card" key={product.productNo || product.productName}>
                  <div className="recipe-recommend-card__head">
                    <div>
                      <strong className="recipe-recommend-card__title">{product.productName}</strong>
                      <div className="recipe-recommend-card__meta">
                        <span>{product.categoryName || '농산물'}</span>
                        <span>·</span>
                        <span>{product.origin || '산지 정보'}</span>
                      </div>
                    </div>
                    <span className={`recipe-recommend-badge ${badgeType ? 'is-accent' : ''}`}>
                      {savingRate > 0 ? `${Math.round(savingRate)}% 절약` : '추천'}
                    </span>
                  </div>

                  <div className="recipe-recommend-card__body">
                    <div className="recipe-recommend-price">
                      <strong>{formatCurrency(product.salePrice)}</strong>
                      <span>평균가 {formatCurrency(avgPrice)}</span>
                    </div>
                    {matchedIngredient ? (
                      <div className="recipe-recommend-match">
                        <span>매칭 재료</span>
                        <strong>{matchedIngredient}</strong>
                      </div>
                    ) : null}
                  </div>

                  <div className="recipe-recommend-card__foot">
                    <span className="recipe-recommend-stock">
                      재고 {toNumber(product.stockQty, 0)}개
                    </span>
                    <button
                      className="btn-outline recipe-recommend-action"
                      type="button"
                      onClick={() => handleOpenProduct(product.productNo)}
                    >
                      상품 보기
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="recipe-step-section">
        <div className="recipe-step-section__head recipe-step-section__head--detail">
          <div>
            <span className="recipe-kicker">STEP GUIDE</span>
            <h2>조리 단계</h2>
          </div>
          <p>단계별로 더 짧고 읽기 좋게 정리해 스크롤 피로를 줄였습니다.</p>
        </div>

        {stepCardList.length ? (
          <div className="recipe-step-list recipe-step-list--dense">
            {stepCardList.map((step) => (
              <article className="recipe-step-card recipe-step-card--dense" key={step.stepNo || `${recipe.recipeNo}-${step.stepSeq}`}>
                <div className="recipe-step-copy recipe-step-copy--dense">
                  <div className="recipe-step-copy__meta">
                    <span className="recipe-step-chip">STEP {String(step.stepSeq).padStart(2, '0')}</span>
                  </div>
                  <p>{step.description}</p>
                </div>

                <button
                  className="recipe-step-media recipe-step-media--dense recipe-step-media--button"
                  type="button"
                  onClick={() => step.primaryImageUrl && setSelectedStep(step)}
                  disabled={!step.primaryImageUrl}
                  aria-label={
                    step.primaryImageUrl
                      ? `${recipe.recipeName} ${step.stepSeq}단계 사진 확대`
                      : `${recipe.recipeName} ${step.stepSeq}단계 사진 없음`
                  }
                >
                  {step.primaryImageUrl ? (
                    <img alt={`${recipe.recipeName} ${step.stepSeq}단계`} src={step.primaryImageUrl} />
                  ) : (
                    <div className="recipe-step-fallback">
                      <span>IMG</span>
                      단계 사진 없음
                    </div>
                  )}
                </button>
              </article>
            ))}
          </div>
        ) : (
          <section className="recipe-state-card recipe-detail-state">
            <div className="recipe-state-icon">📝</div>
            <h2>조리 순서가 아직 없습니다</h2>
            <p>레시피 단계 데이터가 들어오면 이 영역에 순서대로 보여집니다.</p>
          </section>
        )}
      </section>

      {selectedStep ? (
        <div className="recipe-step-modal" role="presentation" onClick={() => setSelectedStep(null)}>
          <div
            className="recipe-step-modal__card"
            role="dialog"
            aria-modal="true"
            aria-label={`${recipe.recipeName} ${selectedStep.stepSeq}단계 사진 확대`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="recipe-step-modal__head">
              <div className="recipe-step-modal__title">
                <span className="recipe-kicker">STEP {String(selectedStep.stepSeq).padStart(2, '0')}</span>
                <h2>단계 사진 확대</h2>
              </div>
              <button className="recipe-step-modal__close" type="button" onClick={() => setSelectedStep(null)} autoFocus>
                닫기
              </button>
            </div>

            <div className="recipe-step-modal__body">
              <div className="recipe-step-modal__image">
                <img alt={`${recipe.recipeName} ${selectedStep.stepSeq}단계`} src={selectedStep.primaryImageUrl} />
              </div>
              <p>{selectedStep.description}</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function buildQuickFactList(recipe, ingredientCount, stepCount) {
  return [
    {
      label: '칼로리',
      value: recipe.calories != null ? `${Math.round(recipe.calories)} kcal` : '정보 없음',
    },
    {
      label: '재료 수',
      value: `${ingredientCount}개`,
    },
    {
      label: '조리 단계',
      value: `${stepCount}단계`,
    },
    {
      label: '권장 인분',
      value: estimatePortion(ingredientCount),
    },
  ];
}

function buildDetailInfoList(recipe, ingredientList, stepList) {
  return [
    {
      label: '보관 가이드',
      value: inferStorageGuide(recipe.recipeName, recipe.description),
      hint: '조리 후 보관할 때 참고하세요.',
    },
    {
      label: '추천 도구',
      value: inferToolGuide(stepList),
      hint: '미리 준비하면 조리가 편합니다.',
    },
    {
      label: '알레르기',
      value: inferAllergenGuide(ingredientList),
      hint: '민감한 재료를 먼저 확인해 주세요.',
    },
  ];
}

function groupIngredients(ingredientList) {
  const sectionMap = new Map([
    ['기본 재료', []],
    ['양념·소스', []],
    ['토핑·마무리', []],
  ]);

  ingredientList.forEach((ingredient, index) => {
    const display = normalizeIngredientDisplay(ingredient);
    const groupName = resolveIngredientGroupName(display.name);
    const itemList = sectionMap.get(groupName) || [];

    itemList.push({
      key: ingredient.ingredientNo || `${display.name}-${index}`,
      name: display.name,
      amount: display.amount,
    });

    sectionMap.set(groupName, itemList);
  });

  return Array.from(sectionMap.entries())
    .filter(([, items]) => items.length > 0)
    .map(([title, items]) => ({ title, items }));
}

function normalizeIngredientDisplay(ingredient) {
  const rawName = ingredient?.ingredientName;
  const rawAmount = ingredient?.amount;

  const name = normalizeIngredientName(rawName) || '재료';
  const amount = normalizeIngredientAmount(rawAmount) || extractAmountFromName(rawName) || '적당량';

  return { name, amount };
}

function normalizeIngredientName(value) {
  return stripIngredientText(value);
}

function normalizeIngredientAmount(value) {
  return stripIngredientText(value);
}

function stripIngredientText(value) {
  if (!value) {
    return '';
  }

  return String(value)
    .replace(/\r?\n/g, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/[()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[,:·\-/]+/, '')
    .replace(/[,:·\-/]+$/, '')
    .trim();
}

function extractAmountFromName(value) {
  if (!value) {
    return '';
  }

  const parentheticalMatch = String(value).match(/\(([^()]*)\)/);
  if (!parentheticalMatch) {
    return '';
  }

  return normalizeIngredientAmount(parentheticalMatch[1]);
}

function resolveIngredientGroupName(ingredientName) {
  const normalizedName = normalizeIngredientName(ingredientName).toLowerCase();

  const sauceKeywords = [
    '소스',
    '양념',
    '간장',
    '고추장',
    '된장',
    '설탕',
    '소금',
    '후추',
    '식초',
    '참기름',
    '버터',
    '마요',
    '드레싱',
    '가루',
    '액젓',
    '밑간',
  ];

  const toppingKeywords = [
    '깨',
    '김',
    '파',
    '버섯',
    '치즈',
    '견과',
    '고명',
    '토핑',
    '슬라이스',
    '허브',
    '파슬리',
    '장식',
  ];

  if (sauceKeywords.some((keyword) => normalizedName.includes(keyword))) {
    return '양념·소스';
  }

  if (toppingKeywords.some((keyword) => normalizedName.includes(keyword))) {
    return '토핑·마무리';
  }

  return '기본 재료';
}

function scaleAmountLabel(amount, scale) {
  const normalizedAmount = normalizeIngredientAmount(amount);

  if (!normalizedAmount || scale === 1) {
    return normalizedAmount;
  }

  return normalizedAmount.replace(
    /(\d+\s+\d+\s*\/\s*\d+|\d+\s*\/\s*\d+|\d+(?:\.\d+)?)/g,
    (token) => {
      const parsedValue = parseNumericToken(token);
      if (parsedValue == null) {
        return token;
      }

      return formatScaledNumber(parsedValue * scale);
    }
  );
}

function parseNumericToken(token) {
  const normalizedToken = token.replace(/\s+/g, ' ').trim();

  if (normalizedToken.includes(' ')) {
    const [wholePart, fractionPart] = normalizedToken.split(/\s+/, 2);
    const parsedWholePart = Number(wholePart);
    const parsedFractionPart = parseNumericToken(fractionPart);

    if (!Number.isFinite(parsedWholePart) || parsedFractionPart == null) {
      return null;
    }

    return parsedWholePart + parsedFractionPart;
  }

  if (normalizedToken.includes('/')) {
    const [numerator, denominator] = normalizedToken.split('/');
    const parsedNumerator = Number(numerator);
    const parsedDenominator = Number(denominator);

    if (
      !Number.isFinite(parsedNumerator) ||
      !Number.isFinite(parsedDenominator) ||
      parsedDenominator === 0
    ) {
      return null;
    }

    return parsedNumerator / parsedDenominator;
  }

  const parsedValue = Number(normalizedToken);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function formatScaledNumber(value) {
  const roundedValue = Math.round(value * 100) / 100;
  const fractionMap = new Map([
    [0.25, '1/4'],
    [0.33, '1/3'],
    [0.5, '1/2'],
    [0.67, '2/3'],
    [0.75, '3/4'],
  ]);

  if (Number.isInteger(roundedValue)) {
    return String(roundedValue);
  }

  const integerPart = Math.floor(roundedValue);
  const decimalPart = Math.round((roundedValue - integerPart) * 100) / 100;
  const fractionToken = fractionMap.get(decimalPart);

  if (fractionToken) {
    return integerPart > 0 ? `${integerPart} ${fractionToken}` : fractionToken;
  }

  return roundedValue.toFixed(1).replace(/\.0$/, '');
}

function formatCurrency(value) {
  const amount = toNumber(value, 0);
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(amount);
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function inferStorageGuide(recipeName, description) {
  const text = `${recipeName || ''} ${description || ''}`.toLowerCase();

  if (text.includes('샐러드') || text.includes('무침') || text.includes('회')) {
    return '냉장 보관, 당일 섭취 권장';
  }

  if (text.includes('국') || text.includes('탕') || text.includes('찌개') || text.includes('스프')) {
    return '냉장 보관, 1~2일 내 섭취 권장';
  }

  if (text.includes('구이') || text.includes('볶음')) {
    return '냉장 보관, 2일 내 섭취 권장';
  }

  return '냉장 보관, 2~3일 내 섭취 권장';
}

function inferToolGuide(stepList) {
  const normalizedText = stepList
    .map((step) => step.description || '')
    .join(' ')
    .toLowerCase();
  const toolList = [];

  if (normalizedText.includes('냄비') || normalizedText.includes('웍')) {
    toolList.push('냄비');
  }
  if (normalizedText.includes('팬') || normalizedText.includes('프라이팬')) {
    toolList.push('팬');
  }
  if (normalizedText.includes('오븐') || normalizedText.includes('에어프라이어')) {
    toolList.push('오븐/에어프라이어');
  }
  if (normalizedText.includes('믹서') || normalizedText.includes('블렌더')) {
    toolList.push('믹서');
  }
  if (normalizedText.includes('도마') || normalizedText.includes('칼')) {
    toolList.push('도마/칼');
  }
  if (normalizedText.includes('볼') || normalizedText.includes('그릇')) {
    toolList.push('볼');
  }

  if (!toolList.length) {
    return '기본 조리도구';
  }

  return Array.from(new Set(toolList)).slice(0, 3).join(', ');
}

function inferAllergenGuide(ingredientList) {
  const normalizedNameList = ingredientList.map((ingredient) =>
    normalizeIngredientName(ingredient.ingredientName).toLowerCase()
  );
  const allergenList = [];

  if (
    normalizedNameList.some((name) =>
      ['우유', '치즈', '버터', '크림', '요거트', '생크림'].some((keyword) => name.includes(keyword))
    )
  ) {
    allergenList.push('유제품');
  }

  if (
    normalizedNameList.some((name) =>
      ['계란', '달걀', '에그'].some((keyword) => name.includes(keyword))
    )
  ) {
    allergenList.push('달걀');
  }

  if (
    normalizedNameList.some((name) =>
      ['밀', '국수', '면', '파스타', '빵', '라면', '튀김가루', '부침가루'].some((keyword) =>
        name.includes(keyword)
      )
    )
  ) {
    allergenList.push('밀');
  }

  if (
    normalizedNameList.some((name) =>
      ['콩', '두부', '된장', '간장', '고추장', '청국장'].some((keyword) => name.includes(keyword))
    )
  ) {
    allergenList.push('대두');
  }

  if (
    normalizedNameList.some((name) =>
      ['새우', '게', '꽃게', '오징어', '조개', '홍합', '멸치', '액젓', '어묵'].some((keyword) =>
        name.includes(keyword)
      )
    )
  ) {
    allergenList.push('어패류');
  }

  if (
    normalizedNameList.some((name) =>
      ['땅콩', '호두', '아몬드', '잣', '캐슈', '견과'].some((keyword) => name.includes(keyword))
    )
  ) {
    allergenList.push('견과류');
  }

  if (!allergenList.length) {
    return '주요 알레르기 재료가 뚜렷하지 않음';
  }

return Array.from(new Set(allergenList)).join(', ');
}

// eslint-disable-next-line no-unused-vars
function buildStepTitle(description) {
  const normalizedDescription = stripIngredientText(description)
    .replace(/^\s*(?:step|단계)?\s*\d+\s*/i, ' ')
    .replace(/^\s*\d+\s*[.)-]?\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalizedDescription) {
    return '조리 진행';
  }

  const keywordRuleList = [
    { title: '재료 손질', keywordList: ['썰', '다지', '채썰', '손질', '다듬'] },
    { title: '볶기', keywordList: ['볶', '팬', '프라이팬', '부치', '튀기'] },
    { title: '끓이기', keywordList: ['끓', '조리', '국물', '졸이', '데치', '삶'] },
    { title: '섞기', keywordList: ['섞', '버무', '무치', '비비', '혼합'] },
    { title: '굽기', keywordList: ['굽', '오븐', '에어프라이어', '토스팅'] },
    { title: '마무리', keywordList: ['완성', '마무', '담아', '올려', '장식'] },
  ];

  const matchedRule = keywordRuleList.find((rule) =>
    rule.keywordList.some((keyword) => normalizedDescription.includes(keyword))
  );

  if (matchedRule) {
    return matchedRule.title;
  }

  const preview = normalizedDescription
    .split(/[.!?]/)[0]
    .replace(/^\d+\s*[.)-]?\s*/g, '')
    .trim()
    .split(' ')
    .slice(0, 4)
    .join(' ');

  if (!preview || /^\d+$/.test(preview)) {
    return '조리 진행';
  }

  if (preview.length <= 16) {
    return preview;
  }

  return `${preview.slice(0, 16)}...`;
}

function normalizeStepDescription(description) {
  const normalizedDescription = stripIngredientText(description);

  if (!normalizedDescription) {
    return '';
  }

  return normalizedDescription
    .replace(/^\s*\d+\s*[.)-]?\s*/, '')
    .replace(/^\s*step\s*\d+\s*[.)-]?\s*/i, '')
    .replace(/^\s*\d+\s*단계\s*/g, '')
    .trim();
}

function estimatePortion(ingredientCount) {
  if (ingredientCount >= 12) {
    return '3~4인분';
  }

  if (ingredientCount >= 7) {
    return '2~3인분';
  }

  return '1~2인분';
}

function summarizeDescription(description) {
  if (!description) {
    return '레시피 설명이 아직 등록되지 않았습니다.';
  }

  const normalizedDescription = description.replace(/\s+/g, ' ').trim();
  if (normalizedDescription.length <= 150) {
    return normalizedDescription;
  }

  return `${normalizedDescription.slice(0, 150)}...`;
}

function normalizeIngredientText(value) {
  if (!value) {
    return '';
  }

  return String(value)
    .replace(/\r?\n/g, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/[()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function readLocalStorageArray(storageKey) {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(storageKey);
    if (!rawValue) {
      return [];
    }

    const parsedValue = JSON.parse(rawValue);
    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch (error) {
    return [];
  }
}

function writeLocalStorageArray(storageKey, value) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(value));
}

function isRecipeSaved(recipeNo) {
  return readLocalStorageArray(RECIPE_SAVED_KEY).some((value) => Number(value) === Number(recipeNo));
}

function getRecipeEmoji(recipeName) {
  const normalizedName = normalizeIngredientText(recipeName).toLowerCase();

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
