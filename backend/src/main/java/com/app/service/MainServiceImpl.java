package com.app.service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.app.dto.PriceSnapshotDTO;
import com.app.dto.ProductDto;
import com.app.dto.RecipeDTO;

@Service
public class MainServiceImpl implements MainService {

    private static final int MAIN_PRODUCT_LIMIT = 12;
    private static final int MAIN_INSIGHT_LIMIT = 10;
    private static final int MAIN_RECIPE_LIMIT = 2;
    private static final int MAIN_CHART_DAYS = 7;
    private static final String DEFAULT_MARKET_TYPE = "RETAIL";

    @Autowired
    private ProductService productService;

    @Autowired
    private PriceSnapshotService priceSnapshotService;

    @Autowired
    private RecipeService recipeService;

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
