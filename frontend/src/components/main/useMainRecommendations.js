import { useEffect, useState } from "react";
import { buildEmptyRecommendData, loadRecommendData } from "../recommend/recommendData";

const DEFAULT_ERROR_MESSAGE =
  "\uBA54\uC778 \uCD94\uCC9C \uC815\uBCF4\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.";

export default function useMainRecommendations() {
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [recommendSummary, setRecommendSummary] = useState(() => buildEmptyRecommendData());

  useEffect(() => {
    let cancelled = false;

    async function loadSummary() {
      try {
        const data = await loadRecommendData();
        if (!cancelled) {
          setRecommendSummary(data);
          setErrorMessage("");
        }
      } catch (error) {
        if (!cancelled) {
          setRecommendSummary(buildEmptyRecommendData());
          setErrorMessage(error?.message || DEFAULT_ERROR_MESSAGE);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadSummary();

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    isLoading,
    errorMessage,
    heroSlides: recommendSummary.heroSlides,
    seasonalProducts: recommendSummary.seasonalProducts.slice(0, 4),
    popularRecipes: recommendSummary.popularRecipes.slice(0, 4),
  };
}
