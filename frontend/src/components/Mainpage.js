import MainHeroSection from "./main/MainHeroSection";
import MainRecipeRankingSection from "./main/MainRecipeRankingSection";
import MainSeasonalSection from "./main/MainSeasonalSection";
import useMainRecommendations from "./main/useMainRecommendations";
import "../styles/mainPage.css";

export default function MainPage() {
  const {
    isLoading,
    errorMessage,
    heroSlides,
    seasonalProducts,
    rankingProducts,
    popularRecipes,
  } = useMainRecommendations();

  const hasVisibleContent =
    heroSlides.length || seasonalProducts.length || rankingProducts.length || popularRecipes.length;

  return (
    <div className="page-shell">
      <main className="container home-page">
        {isLoading ? (
          <div className="home-page__feedback">추천 정보를 불러오는 중입니다.</div>
        ) : null}

        <MainHeroSection heroSlides={heroSlides} />
        <MainRecipeRankingSection items={rankingProducts} />
        <MainSeasonalSection items={seasonalProducts} />

        {!isLoading && !hasVisibleContent ? (
          <div className="home-page__feedback">
            메인에 표시할 추천 데이터가 아직 없습니다.
          </div>
        ) : null}

        {errorMessage ? (
          <div className="home-page__feedback home-page__feedback--error">{errorMessage}</div>
        ) : null}
      </main>
    </div>
  );
}
