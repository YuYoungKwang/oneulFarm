package com.app.service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.app.dto.PriceSnapshotDTO;
import com.app.dto.ProductDto;
import com.app.dto.RecipeDTO;
import com.app.dto.RecipeListResponseDTO;

@Service
public class MainServiceImpl implements MainService {

    private static final int MAIN_PRODUCT_LIMIT = 4;
    private static final int MAIN_INSIGHT_LIMIT = 2;
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
        List<ProductDto> mainProducts = limit(products, MAIN_PRODUCT_LIMIT);
        List<ProductDto> insights = limit(filterPricedProducts(products), MAIN_INSIGHT_LIMIT);
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
        RecipeListResponseDTO response = recipeService.getRecipeList(
            null,
            null,
            null,
            Integer.valueOf(MAIN_RECIPE_LIMIT)
        );

        if (response == null || response.getRecipeList() == null) {
            return Collections.emptyList();
        }

        return response.getRecipeList();
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
