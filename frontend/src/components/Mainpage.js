import MainHeroSection from "./main/MainHeroSection";
import MainPopularSection from "./main/MainPopularSection";
import MainSeasonalSection from "./main/MainSeasonalSection";
import useMainRecommendations from "./main/useMainRecommendations";
import "../styles/mainPage.css";
import "../styles/recommend.css";

export default function MainPage() {
  const {
    isLoading,
    errorMessage,
    heroSlides,
    seasonalProducts,
    popularRecipes,
  } = useMainRecommendations();

  const hasVisibleContent =
    heroSlides.length || seasonalProducts.length || popularRecipes.length;

  return (
    <div className="page-shell">
      <main className="container recommend-page">
        {isLoading ? (
          <div className="section-empty">
            {"\uCD94\uCC9C \uC815\uBCF4\uB97C \uBD88\uB7EC\uC624\uB294 \uC911\uC785\uB2C8\uB2E4."}
          </div>
        ) : null}

        <MainHeroSection heroSlides={heroSlides} />
        <MainSeasonalSection items={seasonalProducts} />
        <MainPopularSection items={popularRecipes} />

        {!isLoading && !hasVisibleContent ? (
          <div className="section-empty">
            {
              "\uBA54\uC778\uC5D0 \uD45C\uC2DC\uD560 \uCD94\uCC9C \uB370\uC774\uD130\uAC00 \uC544\uC9C1 \uC5C6\uC2B5\uB2C8\uB2E4."
            }
          </div>
        ) : null}

        {errorMessage ? <div className="section-error">{errorMessage}</div> : null}
      </main>
    </div>
  );
}
