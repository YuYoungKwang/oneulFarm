import { useEffect, useMemo, useState } from "react";
import MainRecipeCard from "./MainRecipeCard";

const RANKING_MODE = {
  DISCOUNT: "discount",
  DATALAB: "datalab",
};

const RANKING_PAGE = {
  TOP10: "top10",
  NEXT10: "next10",
};

function openRecipe(recipeNo) {
  if (recipeNo) {
    window.location.hash = `#/recipes/${recipeNo}`;
    return;
  }

  window.location.hash = "#/recipes";
}

function openProduct(productNo) {
  if (productNo) {
    window.location.hash = `#/products/${productNo}`;
    return;
  }

  window.location.hash = "#/products";
}

function formatCurrency(value) {
  return `${Math.round(Number(value || 0)).toLocaleString("ko-KR")}원`;
}

function formatTrendScore(value) {
  const numericValue = Number(value || 0);
  if (numericValue <= 0) {
    return "점수 준비중";
  }

  return `${numericValue.toFixed(1)}점`;
}

function formatSavingRate(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function getSavingRate(item) {
  return Number(item?.product?.priceMatch?.savingRate || 0);
}

function getSavingAmount(item) {
  const comparedPrice = Number(
    item?.product?.priceSnapshot?.displayAvgPrice ||
      item?.product?.priceMatch?.comparedPrice ||
      0
  );
  const salePrice = Number(item?.product?.salePrice || 0);
  return Math.max(comparedPrice - salePrice, 0);
}

function formatDatalabSummary(item) {
  const changeRatio = Number(item?.changeRatio || 0);
  const latestRatio = Number(item?.latestRatio || 0);
  const trendDirection = String(item?.trendDirection || "").toUpperCase();

  if (trendDirection === "UP" && changeRatio > 0) {
    return `상승 ${changeRatio.toFixed(1)}%`;
  }

  if (trendDirection === "DOWN" && changeRatio < 0) {
    return `하락 ${Math.abs(changeRatio).toFixed(1)}%`;
  }

  if (latestRatio > 0) {
    return `최근 관심도 ${latestRatio.toFixed(1)}`;
  }

  return "판매중 상품";
}

function formatDiscountSummary(item) {
  const savingAmount = getSavingAmount(item);
  if (savingAmount > 0) {
    return `평균가 대비 ${formatCurrency(savingAmount)} 절약`;
  }

  return "할인 정보 준비중";
}

function sortByDatalab(leftItem, rightItem) {
  const leftRank = Number(leftItem?.rank || 999);
  const rightRank = Number(rightItem?.rank || 999);
  if (leftRank !== rightRank) {
    return leftRank - rightRank;
  }

  const rankScoreDiff = Number(rightItem?.rankScore || 0) - Number(leftItem?.rankScore || 0);
  if (rankScoreDiff !== 0) {
    return rankScoreDiff;
  }

  const latestRatioDiff =
    Number(rightItem?.latestRatio || 0) - Number(leftItem?.latestRatio || 0);
  if (latestRatioDiff !== 0) {
    return latestRatioDiff;
  }

  return getSavingRate(rightItem) - getSavingRate(leftItem);
}

function sortByDiscount(leftItem, rightItem) {
  const savingRateDiff = getSavingRate(rightItem) - getSavingRate(leftItem);
  if (savingRateDiff !== 0) {
    return savingRateDiff;
  }

  const savingAmountDiff = getSavingAmount(rightItem) - getSavingAmount(leftItem);
  if (savingAmountDiff !== 0) {
    return savingAmountDiff;
  }

  return sortByDatalab(leftItem, rightItem);
}

function buildRecipeMeta(recipe, selectedItem, rankingMode) {
  const matchedIngredient = String(recipe?.matchedIngredient || "").trim();
  if (matchedIngredient) {
    return matchedIngredient;
  }

  if (rankingMode === RANKING_MODE.DISCOUNT) {
    return "할인율 상위";
  }

  const rankKeyword = String(selectedItem?.rankKeyword || "").trim();
  if (rankKeyword) {
    return rankKeyword;
  }

  return "연관 레시피";
}

function buildRecipeReason(recipe, selectedItem, rankingMode) {
  const matchedIngredient = String(recipe?.matchedIngredient || "").trim();
  const productName = String(selectedItem?.product?.productName || "").trim();

  if (matchedIngredient) {
    return `${matchedIngredient}를 활용해 바로 이어 만들기 좋습니다.`;
  }

  if (rankingMode === RANKING_MODE.DISCOUNT) {
    return `${productName || "이 상품"}은 절약률이 높아 함께 담기 좋은 레시피입니다.`;
  }

  return `${productName || "이 상품"}으로 많이 찾는 연관 레시피입니다.`;
}

function getModeBadge(rankingMode) {
  return rankingMode === RANKING_MODE.DISCOUNT ? "할인율 상위" : "데이터랩 상위";
}

function getModeDescription(selectedItem, rankingMode) {
  if (!selectedItem) {
    return "선택한 상품에 맞는 레시피를 보여줍니다.";
  }

  if (rankingMode === RANKING_MODE.DISCOUNT) {
    return formatDiscountSummary(selectedItem);
  }

  return formatDatalabSummary(selectedItem);
}

function getModeMeta(item, rankingMode) {
  if (rankingMode === RANKING_MODE.DISCOUNT) {
    return {
      strong: `절약 ${formatSavingRate(getSavingRate(item))}`,
      sub: formatDiscountSummary(item),
    };
  }

  return {
    strong: formatTrendScore(item?.rankScore),
    sub: formatDatalabSummary(item),
  };
}

export default function MainRecipeRankingSection({ items = [] }) {
  const seasonalItems = useMemo(
    () =>
      (Array.isArray(items) ? items.filter((item) => item?.product?.productNo) : []).slice(
        0,
        20
      ),
    [items]
  );
  const [rankingMode, setRankingMode] = useState(RANKING_MODE.DISCOUNT);
  const [rankingPage, setRankingPage] = useState(RANKING_PAGE.TOP10);
  const [selectedProductNo, setSelectedProductNo] = useState(
    seasonalItems[0]?.product?.productNo || null
  );

  const rankingItems = useMemo(() => {
    const nextItems = [...seasonalItems];
    nextItems.sort(
      rankingMode === RANKING_MODE.DISCOUNT ? sortByDiscount : sortByDatalab
    );
    return nextItems;
  }, [rankingMode, seasonalItems]);

  const hasNextPage = rankingItems.length > 10;

  useEffect(() => {
    setRankingPage(RANKING_PAGE.TOP10);
    setSelectedProductNo(rankingItems[0]?.product?.productNo || null);
  }, [rankingItems, rankingMode]);

  useEffect(() => {
    if (rankingPage === RANKING_PAGE.NEXT10 && !hasNextPage) {
      setRankingPage(RANKING_PAGE.TOP10);
    }
  }, [hasNextPage, rankingPage]);

  const visibleRankingItems =
    rankingPage === RANKING_PAGE.NEXT10
      ? rankingItems.slice(10, 20)
      : rankingItems.slice(0, 10);

  useEffect(() => {
    if (!rankingItems.length) {
      if (selectedProductNo !== null) {
        setSelectedProductNo(null);
      }
      return;
    }

    const hasSelectedItem = rankingItems.some(
      (item) => item?.product?.productNo === selectedProductNo
    );
    if (!hasSelectedItem) {
      setSelectedProductNo(rankingItems[0]?.product?.productNo || null);
    }
  }, [rankingItems, selectedProductNo]);

  const selectedItem =
    rankingItems.find((item) => item?.product?.productNo === selectedProductNo) ||
    rankingItems[0] ||
    null;
  const recipeItems = Array.isArray(selectedItem?.linkedRecipes)
    ? selectedItem.linkedRecipes.slice(0, 4)
    : [];

  return (
    <section className="home-section" id="popular-section">
      <div className="home-section__header">
        <div>
          <p className="home-section__eyebrow">Trend Recipe</p>
          <h2 className="home-section__title">지금 뜨는 상품으로 만드는 레시피</h2>
        </div>
        <a className="home-section__link" href="#/recipes">
          레시피 전체 보기
        </a>
      </div>

      {rankingItems.length ? (
        <div className="home-trend-layout">
          <div className="home-trend-recipes">
            <div className="home-trend-recipes__header">
              <div className="home-trend-recipes__copy">
                <span className="home-trend-recipes__badge">{getModeBadge(rankingMode)}</span>
                <h3>{selectedItem?.product?.productName || "추천 상품"}</h3>
                <p>{getModeDescription(selectedItem, rankingMode)}</p>
              </div>
            </div>

            {recipeItems.length ? (
              <div className="home-trend-recipes__grid">
                {recipeItems.map((recipe, index) => (
                  <MainRecipeCard
                    key={recipe.recipeNo || `${selectedItem?.product?.productNo}-${index}`}
                    featured={index === 0}
                    metaText={buildRecipeMeta(recipe, selectedItem, rankingMode)}
                    onOpen={() => openRecipe(recipe.recipeNo)}
                    reasonText={buildRecipeReason(recipe, selectedItem, rankingMode)}
                    recipe={recipe}
                  />
                ))}
              </div>
            ) : (
              <div className="home-section__empty">
                <strong>연결된 레시피가 아직 없습니다.</strong>
              </div>
            )}
          </div>

          <aside className="home-trend-ranking">
            <div className="home-trend-ranking__header">
              <p className="home-trend-ranking__eyebrow">Product Ranking</p>
              <strong>판매중 상품 랭킹</strong>
            </div>

            <div className="home-trend-ranking__toolbar" role="tablist" aria-label="홈 상품 랭킹 기준">
              <button
                className={`home-trend-ranking__toggle ${
                  rankingMode === RANKING_MODE.DISCOUNT ? "is-active" : ""
                }`.trim()}
                type="button"
                onClick={() => setRankingMode(RANKING_MODE.DISCOUNT)}
              >
                할인율
              </button>
              <button
                className={`home-trend-ranking__toggle ${
                  rankingMode === RANKING_MODE.DATALAB ? "is-active" : ""
                }`.trim()}
                type="button"
                onClick={() => setRankingMode(RANKING_MODE.DATALAB)}
              >
                데이터랩
              </button>
            </div>

            <div className="home-trend-ranking__list" role="list">
              {visibleRankingItems.map((item, index) => {
                const productNo = item?.product?.productNo;
                const isActive = productNo === selectedItem?.product?.productNo;
                const meta = getModeMeta(item, rankingMode);
                const rankingNumber =
                  rankingPage === RANKING_PAGE.NEXT10 ? index + 11 : index + 1;

                return (
                  <button
                    key={productNo}
                    className={`home-trend-ranking__item ${isActive ? "is-active" : ""}`.trim()}
                    type="button"
                    onClick={() => openProduct(productNo)}
                    onFocus={() => setSelectedProductNo(productNo)}
                    onMouseEnter={() => setSelectedProductNo(productNo)}
                  >
                    <span className="home-trend-ranking__rank">
                      {String(rankingNumber).padStart(2, "0")}
                    </span>

                    <span className="home-trend-ranking__body">
                      <strong>{item?.product?.productName || "판매중 상품"}</strong>
                      <span>
                        {rankingMode === RANKING_MODE.DISCOUNT
                          ? "시세분석 기준 절약률"
                          : item?.rankKeyword || "네이버 데이터랩 기준"}
                      </span>
                    </span>

                    <span className="home-trend-ranking__meta">
                      <strong>{meta.strong}</strong>
                      <span>{meta.sub}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="home-trend-ranking__pagination" role="tablist" aria-label="홈 상품 랭킹 페이지">
              <button
                aria-label="랭킹 1위부터 10위 보기"
                aria-pressed={rankingPage === RANKING_PAGE.TOP10}
                className={`home-trend-ranking__page-button ${
                  rankingPage === RANKING_PAGE.TOP10 ? "is-active" : ""
                }`.trim()}
                type="button"
                onClick={() => setRankingPage(RANKING_PAGE.TOP10)}
              >
                1~10
              </button>
              <button
                aria-label="랭킹 11위부터 20위 보기"
                aria-pressed={rankingPage === RANKING_PAGE.NEXT10}
                className={`home-trend-ranking__page-button ${
                  rankingPage === RANKING_PAGE.NEXT10 ? "is-active" : ""
                }`.trim()}
                disabled={!hasNextPage}
                type="button"
                onClick={() => setRankingPage(RANKING_PAGE.NEXT10)}
              >
                11~20
              </button>
            </div>
          </aside>
        </div>
      ) : (
        <div className="home-section__empty">
          <strong>랭킹에 표시할 판매중 상품이 없습니다.</strong>
        </div>
      )}
    </section>
  );
}
