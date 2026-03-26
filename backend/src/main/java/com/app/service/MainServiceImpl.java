package com.app.service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.app.dao.MainDao;
import com.app.dto.PriceSnapshotDTO;
import com.app.dto.ProductDto;
import com.app.dto.RecipeDTO;
import com.app.dto.main.HeroSlideDto;
import com.app.dto.main.MainRecommendationResponseDto;
import com.app.dto.main.PopularRecipeCardDto;
import com.app.dto.main.SeasonalProductCardDto;

@Service
public class MainServiceImpl implements MainService {

    private static final int MAIN_PRODUCT_LIMIT = 12;
    private static final int MAIN_INSIGHT_LIMIT = 10;
    private static final int MAIN_RECIPE_LIMIT = 2;
    private static final int MAIN_CHART_DAYS = 7;
    private static final String DEFAULT_MARKET_TYPE = "RETAIL";

    private static final int SEASONAL_LIMIT = 4;
    private static final int LINKED_RECIPE_LIMIT = 2;
    private static final int POPULAR_RECIPE_LIMIT = 4;
    private static final int MATCHED_INGREDIENT_LIMIT = 3;

    private static final String SEASONAL_SUMMARY =
        "\uC9C0\uAE08 \uD65C\uC6A9\uD558\uAE30 \uC88B\uC740 \uC81C\uCCA0 \uC7AC\uB8CC\uC785\uB2C8\uB2E4.";
    private static final String SEASONAL_BADGE = "\uC81C\uCCA0";
    private static final String PRICE_BADGE = "\uAC00\uACA9 \uBA54\uB9AC\uD2B8";
    private static final String POPULAR_RECIPE_SUMMARY = "\uB9CE\uC774 \uCC3E\uB294 \uC9D1\uBC25 \uBA54\uB274";
    private static final String HERO_TITLE =
        "\uC9C0\uAE08 \uC81C\uCCA0 \uC7AC\uB8CC\uB85C \uB9CC\uB4E4\uAE30 \uC88B\uC740 \uC694\uB9AC\uB97C \uBA3C\uC800 \uB9CC\uB098\uBCF4\uC138\uC694";
    private static final String HERO_DESC =
        "\uC81C\uCCA0 \uC7AC\uB8CC\uB97C \uC911\uC2EC\uC73C\uB85C \uD65C\uC6A9 \uAC00\uB2A5\uD55C \uBA54\uB274\uB97C \uBCF4\uACE0, \uD544\uC694\uD55C \uC7AC\uB8CC\uC640 \uB808\uC2DC\uD53C\uB97C \uBC14\uB85C \uD655\uC778\uD560 \uC218 \uC788\uC5B4\uC694.";
    private static final String HERO_PRIMARY_LABEL = "\uC81C\uCCA0 \uC694\uB9AC \uBCF4\uAE30";
    private static final String HERO_SECONDARY_LABEL = "\uC778\uAE30 \uBA54\uB274 \uBCF4\uAE30";

    @Autowired
    private ProductService productService;

    @Autowired
    private PriceSnapshotService priceSnapshotService;

    @Autowired
    private RecipeService recipeService;

    @Autowired
    private MainDao mainDao;

    @Override
    public Map<String, Object> getMainPage() {
        List<ProductDto> products = defaultList(productService.getProducts());
        List<ProductDto> pricedProducts = filterPricedProducts(products);
        List<ProductDto> mainProducts = enrichProducts(limit(products, MAIN_PRODUCT_LIMIT));
        List<ProductDto> insights = enrichProducts(
            limit(sortByInsightPriority(pricedProducts), MAIN_INSIGHT_LIMIT)
        );
        List<PriceSnapshotDTO> chart = getChartData(mainProducts, insights);
        List<RecipeDTO> recipes = getRecipes();

        Map<String, Object> payload = new LinkedHashMap<String, Object>();
        payload.put("products", mainProducts);
        payload.put("insights", insights);
        payload.put("chart", chart);
        payload.put("recipes", recipes);
        return payload;
    }

    @Override
    public MainRecommendationResponseDto getMainRecommendations() {
        MainRecommendationResponseDto response = new MainRecommendationResponseDto();

        List<SeasonalProductCardDto> seasonalProducts =
            defaultList(mainDao.findSeasonalRecommendationProducts(limitParam(SEASONAL_LIMIT)));

        for (SeasonalProductCardDto item : seasonalProducts) {
            item.setSummary(SEASONAL_SUMMARY);

            List<String> badges = new ArrayList<String>();
            badges.add(SEASONAL_BADGE);
            if (isPriceBenefit(toBigDecimal(item), item.getAvgPrice())) {
                badges.add(PRICE_BADGE);
            }
            item.setBadges(badges);

            Map<String, Object> linkedParam = new HashMap<String, Object>();
            linkedParam.put("productName", item.getProduct() == null ? "" : item.getProduct().getProductName());
            linkedParam.put("limit", Integer.valueOf(LINKED_RECIPE_LIMIT));
            item.setLinkedRecipes(defaultList(mainDao.findLinkedRecipesByProductName(linkedParam)));
        }

        List<PopularRecipeCardDto> popularRecipes =
            defaultList(mainDao.findPopularRecipes(limitParam(POPULAR_RECIPE_LIMIT)));

        for (PopularRecipeCardDto recipe : popularRecipes) {
            recipe.setSummary(POPULAR_RECIPE_SUMMARY);

            Map<String, Object> ingredientParam = new HashMap<String, Object>();
            ingredientParam.put("recipeNo", recipe.getRecipeNo());
            ingredientParam.put("limit", Integer.valueOf(MATCHED_INGREDIENT_LIMIT));
            recipe.setMatchedIngredients(defaultList(mainDao.findMatchedIngredientsByRecipeNo(ingredientParam)));
        }

        response.setSeasonalProducts(seasonalProducts);
        response.setPopularRecipes(popularRecipes);
        response.setHeroSlides(buildHeroSlides(seasonalProducts, popularRecipes));

        return response;
    }

    private List<HeroSlideDto> buildHeroSlides(
        List<SeasonalProductCardDto> seasonalProducts,
        List<PopularRecipeCardDto> popularRecipes
    ) {
        List<HeroSlideDto> slides = new ArrayList<HeroSlideDto>();

        HeroSlideDto slide = new HeroSlideDto();
        slide.setKey("seasonal-main");
        slide.setEyebrow("SEASONAL RECIPE");
        slide.setTitle(HERO_TITLE);
        slide.setDesc(HERO_DESC);
        slide.setPrimaryLabel(HERO_PRIMARY_LABEL);
        slide.setPrimaryHref("#seasonal-section");
        slide.setSecondaryLabel(HERO_SECONDARY_LABEL);
        slide.setSecondaryHref("#popular-section");

        String heroImageUrl = "";
        if (!defaultList(popularRecipes).isEmpty()) {
            heroImageUrl = nullToEmpty(popularRecipes.get(0).getImageUrl());
        }
        if (heroImageUrl.isEmpty()
            && !defaultList(seasonalProducts).isEmpty()
            && seasonalProducts.get(0).getProduct() != null) {
            heroImageUrl = nullToEmpty(seasonalProducts.get(0).getProduct().getImageUrl());
        }
        slide.setImageUrl(heroImageUrl);

        slides.add(slide);
        return slides;
    }

    private boolean isPriceBenefit(BigDecimal salePrice, BigDecimal avgPrice) {
        if (salePrice == null || avgPrice == null) {
            return false;
        }
        return avgPrice.compareTo(BigDecimal.ZERO) > 0 && salePrice.compareTo(avgPrice) < 0;
    }

    private BigDecimal toBigDecimal(SeasonalProductCardDto item) {
        if (item == null || item.getProduct() == null) {
            return null;
        }
        return BigDecimal.valueOf(item.getProduct().getSalePrice());
    }

    private String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    private Map<String, Object> limitParam(int limit) {
        Map<String, Object> paramMap = new HashMap<String, Object>();
        paramMap.put("limit", Integer.valueOf(limit));
        return paramMap;
    }

    private List<ProductDto> filterPricedProducts(List<ProductDto> products) {
        List<ProductDto> filtered = new ArrayList<ProductDto>();
        for (ProductDto product : products) {
            if (product == null || product.getItemCode() == null || product.getItemCode().trim().isEmpty()) {
                continue;
            }
            filtered.add(product);
        }
        return filtered;
    }

    private List<ProductDto> sortByInsightPriority(List<ProductDto> products) {
        List<ProductDto> sorted = new ArrayList<ProductDto>(defaultList(products));
        sorted.sort(
            Comparator
                .comparingDouble(this::calculateInsightPriorityScore)
                .reversed()
                .thenComparing(ProductDto::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder()))
        );
        return sorted;
    }

    private double calculateInsightPriorityScore(ProductDto product) {
        if (product == null) {
            return 0D;
        }

        double reviewScore = toDouble(product.getReviewCount()) * 3D;
        double ratingScore = toDouble(product.getAverageRating()) * 10D;
        double savingScore = toDouble(product.getSavingRate()) * 2D;
        double seasonalBonus = "Y".equalsIgnoreCase(product.getIsSeasonal()) ? 10D : 0D;

        return reviewScore + ratingScore + savingScore + seasonalBonus;
    }

    private double toDouble(Number value) {
        return value == null ? 0D : value.doubleValue();
    }

    private List<PriceSnapshotDTO> getChartData(List<ProductDto> mainProducts, List<ProductDto> insights) {
        ProductDto chartSource = firstWithItemCode(mainProducts);
        if (chartSource == null) {
            chartSource = firstWithItemCode(insights);
        }

        if (chartSource == null) {
            return Collections.emptyList();
        }

        return defaultList(
            priceSnapshotService.getPriceSnapshotTrend(
                chartSource.getItemCode(),
                chartSource.getMarketType() == null || chartSource.getMarketType().trim().isEmpty()
                    ? DEFAULT_MARKET_TYPE
                    : chartSource.getMarketType(),
                Integer.valueOf(MAIN_CHART_DAYS)
            )
        );
    }

    private List<RecipeDTO> getRecipes() {
        List<RecipeDTO> recipeList = recipeService.getRecipeList(
            null,
            null,
            null,
            Integer.valueOf(MAIN_RECIPE_LIMIT),
            null
        );

        if (recipeList == null || recipeList.isEmpty()) {
            return Collections.emptyList();
        }

        List<RecipeDTO> recipes = new ArrayList<RecipeDTO>();
        for (RecipeDTO recipe : recipeList) {
            recipes.add(enrichRecipe(recipe));
        }
        return recipes;
    }

    private List<ProductDto> enrichProducts(List<ProductDto> products) {
        if (products == null || products.isEmpty()) {
            return Collections.emptyList();
        }

        List<ProductDto> enriched = new ArrayList<ProductDto>();
        for (ProductDto product : products) {
            if (product == null || product.getProductNo() == null) {
                continue;
            }

            ProductDto detailedProduct = productService.getProduct(product.getProductNo());
            enriched.add(detailedProduct == null ? product : detailedProduct);
        }
        return enriched;
    }

    private RecipeDTO enrichRecipe(RecipeDTO recipe) {
        if (recipe == null || recipe.getRecipeNo() == null) {
            return recipe;
        }

        RecipeDTO detail = recipeService.getRecipeDetail(recipe.getRecipeNo());
        if (detail == null) {
            return recipe;
        }

        RecipeDTO enrichedRecipe = new RecipeDTO();
        enrichedRecipe.setRecipeNo(detail.getRecipeNo());
        enrichedRecipe.setExternalRecipeId(detail.getExternalRecipeId());
        enrichedRecipe.setRecipeName(detail.getRecipeName());
        enrichedRecipe.setDescription(detail.getDescription());
        enrichedRecipe.setCookTime(detail.getCookTime());
        enrichedRecipe.setDifficulty(detail.getDifficulty());
        enrichedRecipe.setCalories(detail.getCalories());
        enrichedRecipe.setImageUrl(detail.getImageUrl());
        enrichedRecipe.setSourceName(detail.getSourceName());
        enrichedRecipe.setIngredientList(detail.getIngredientList());
        enrichedRecipe.setStepList(detail.getStepList());
        return enrichedRecipe;
    }

    private ProductDto firstWithItemCode(List<ProductDto> products) {
        for (ProductDto product : products) {
            if (product != null && product.getItemCode() != null && !product.getItemCode().trim().isEmpty()) {
                return product;
            }
        }
        return null;
    }

    private <T> List<T> limit(List<T> source, int maxSize) {
        if (source == null || source.isEmpty()) {
            return Collections.emptyList();
        }
        return new ArrayList<T>(source.subList(0, Math.min(source.size(), maxSize)));
    }

    private <T> List<T> defaultList(List<T> source) {
        return source == null ? Collections.<T>emptyList() : source;
    }
}
