package com.app.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.app.dao.MainDao;
import com.app.dto.PriceSnapshotDTO;
import com.app.dto.ProductDto;
import com.app.dto.ProductKeywordProfileDto;
import com.app.dto.RecipeDTO;
import com.app.dto.main.HeroSlideDto;
import com.app.dto.main.LinkedRecipeDto;
import com.app.dto.main.MainRecommendationResponseDto;
import com.app.dto.main.PopularRecipeCardDto;
import com.app.dto.main.SeasonalProductCardDto;

@Service
public class MainServiceImpl implements MainService {

    private static final Logger logger = LoggerFactory.getLogger(MainServiceImpl.class);

    private static final int MAIN_PRODUCT_LIMIT = 12;
    private static final int MAIN_INSIGHT_LIMIT = 10;
    private static final int MAIN_RECIPE_LIMIT = 2;
    private static final int MAIN_CHART_DAYS = 7;
    private static final String DEFAULT_MARKET_TYPE = "RETAIL";

    private static final int SEASONAL_LIMIT = 20;
    private static final int LINKED_RECIPE_LIMIT = 4;
    private static final int POPULAR_RECIPE_LIMIT = 6;
    private static final int POPULAR_RECIPE_CANDIDATE_LIMIT = 18;
    private static final int MATCHED_INGREDIENT_LIMIT = 3;
    private static final int SEARCH_RECIPE_LIMIT = 4;
    private static final int DATALAB_KEYWORD_LIMIT = 5;
    private static final List<String> PREFERRED_RECIPE_CATEGORIES = Collections.unmodifiableList(
        java.util.Arrays.asList(
            "\uBA54\uC778\uC694\uB9AC",
            "\uBC18\uCC2C",
            "\uAD6D/\uCC1C/\uD0D5",
            "\uBA74/\uD30C\uC2A4\uD0C0",
            "\uBC25/\uC8FD",
            "\uC0D0\uB7EC\uB4DC"
        )
    );

    private static final String SEASONAL_SUMMARY =
        "\uC9C0\uAE08 \uD65C\uC6A9\uD558\uAE30 \uC88B\uC740 \uC81C\uCCA0 \uC7AC\uB8CC\uC785\uB2C8\uB2E4.";
    private static final String SEASONAL_BADGE = "\uC81C\uCCA0";
    private static final String PRICE_BADGE = "\uAC00\uACA9 \uBA54\uB9AC\uD2B8";
    private static final String POPULAR_RECIPE_SUMMARY = "\uB9CE\uC774 \uCC3E\uB294 \uC9D1\uBC25 \uBA54\uB274";
    private static final String DATALAB_RECIPE_SUMMARY =
        "\uB124\uC774\uBC84 \uB370\uC774\uD130\uB7A9 \uAC80\uC0C9 \uD0A4\uC6CC\uB4DC \uD750\uB984\uC5D0\uC11C \uC9D1\uC740 \uB808\uC2DC\uD53C";
    private static final String REVIEW_FALLBACK_SUMMARY =
        "\uB9AC\uBDF0 \uBC18\uC751\uC73C\uB85C \uBCF4\uC644\uD55C \uC9D1\uBC25 \uBA54\uB274";
    private static final String HERO_TITLE =
        "\uC9C0\uAE08 \uC81C\uCCA0 \uC7AC\uB8CC\uB85C \uB9CC\uB4E4\uAE30 \uC88B\uC740 \uC694\uB9AC\uB97C \uBA3C\uC800 \uB9CC\uB098\uBCF4\uC138\uC694";
    private static final String HERO_DESC =
        "\uC81C\uCCA0 \uC7AC\uB8CC\uB97C \uC911\uC2EC\uC73C\uB85C \uD65C\uC6A9 \uAC00\uB2A5\uD55C \uBA54\uB274\uB97C \uBCF4\uACE0, \uD544\uC694\uD55C \uC7AC\uB8CC\uC640 \uB808\uC2DC\uD53C\uB97C \uBC14\uB85C \uD655\uC778\uD560 \uC218 \uC788\uC5B4\uC694.";
    private static final String HERO_PRIMARY_LABEL = "\uC81C\uCCA0 \uC694\uB9AC \uBCF4\uAE30";
    private static final String HERO_SECONDARY_LABEL = "\uC778\uAE30 \uBA54\uB274 \uBCF4\uAE30";
    private static final Pattern DRINK_RECIPE_PATTERN =
        Pattern.compile("\uC8FC\uC2A4|\uC2A4\uBB34\uB514|\uC5D0\uC774\uB4DC|\uC154\uBCA0\uD2B8|\uB77C\uB5BC|\uCC28|\uC74C\uB8CC", Pattern.CASE_INSENSITIVE);
    private static final Pattern DESSERT_RECIPE_PATTERN =
        Pattern.compile("\uCF00\uC774\uD06C|\uCFE0\uD0A4|\uBA38\uD540|\uD0C0\uB974\uD2B8|\uD478\uB529|\uBE59\uC218|\uC544\uC774\uC2A4\uD06C\uB9BC|\uB514\uC800\uD2B8|\uAC04\uC2DD", Pattern.CASE_INSENSITIVE);
    private static final Pattern SALAD_RECIPE_PATTERN =
        Pattern.compile("\uC0D0\uB7EC\uB4DC|\uBB34\uCE68", Pattern.CASE_INSENSITIVE);
    private static final Pattern SOUP_RECIPE_PATTERN =
        Pattern.compile("\uAD6D|\uCC0C\uAC1C|\uD0D5|\uC804\uACE8|\uC2A4\uD504|\uC218\uD504", Pattern.CASE_INSENSITIVE);
    private static final Pattern NOODLE_RECIPE_PATTERN =
        Pattern.compile("\uD30C\uC2A4\uD0C0|\uC2A4\uD30C\uAC8C\uD2F0|\uAD6D\uC218|\uC6B0\uB3D9|\uB77C\uBA74|\uBA74|\uCABC\uBA74|\uBE44\uBE54\uBA74|\uC789\uBA74", Pattern.CASE_INSENSITIVE);
    private static final Pattern RICE_RECIPE_PATTERN =
        Pattern.compile("\uBC25|\uB36E\uBC25|\uB36E\uBC25|\uC8FD|\uB9AC\uC18C\uD1A0|\uAE40\uBC25|\uBCF6\uC74C\uBC25", Pattern.CASE_INSENSITIVE);
    private static final Pattern SIDE_DISH_RECIPE_PATTERN =
        Pattern.compile("\uB098\uBB3C|\uC870\uB9BC|\uBCF6\uC74C|\uBB34\uCE68|\uC7A5\uC544\uCC0C|\uAE40\uCE58|\uBC18\uCC2C", Pattern.CASE_INSENSITIVE);
    private static final Pattern MAIN_DISH_RECIPE_PATTERN =
        Pattern.compile("\uAD6C\uC774|\uCC1C|\uBD88\uACE0\uAE30|\uC2A4\uD14C\uC774\uD06C|\uCEE4\uB9AC|\uCE58\uD0A8|\uC218\uC721|\uBA54\uC778", Pattern.CASE_INSENSITIVE);

    @Autowired
    private ProductService productService;

    @Autowired
    private PriceSnapshotService priceSnapshotService;

    @Autowired
    private RecipeService recipeService;

    @Autowired
    private MainDao mainDao;

    @Autowired(required = false)
    private NaverDataLabService naverDataLabService;

    @Autowired(required = false)
    private ProductKeywordMapService productKeywordMapService;

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
        List<SeasonalProductCardDto> rankingProducts =
            defaultList(mainDao.findRankingRecommendationProducts(limitParam(SEASONAL_LIMIT)));
        Map<Long, ProductKeywordProfileDto> seasonalProductProfileMap =
            buildSeasonalProductProfileMap(seasonalProducts);
        Map<Long, ProductKeywordProfileDto> rankingProductProfileMap =
            buildSeasonalProductProfileMap(rankingProducts);

        applyDatalabRanking(seasonalProducts, seasonalProductProfileMap);
        applyDatalabRanking(rankingProducts, rankingProductProfileMap);

        decorateRecommendationProducts(seasonalProducts, seasonalProductProfileMap, true);
        decorateRecommendationProducts(rankingProducts, rankingProductProfileMap, false);

        List<PopularRecipeCardDto> popularRecipes = buildPopularRecipeCards(seasonalProducts);

        response.setSeasonalProducts(seasonalProducts);
        response.setRankingProducts(rankingProducts);
        response.setPopularRecipes(popularRecipes);
        response.setHeroSlides(buildHeroSlides(seasonalProducts, popularRecipes));

        return response;
    }

    private void decorateRecommendationProducts(
        List<SeasonalProductCardDto> products,
        Map<Long, ProductKeywordProfileDto> productProfileMap,
        boolean seasonal
    ) {
        for (SeasonalProductCardDto item : defaultList(products)) {
            item.setSummary(seasonal ? SEASONAL_SUMMARY : POPULAR_RECIPE_SUMMARY);

            List<String> badges = new ArrayList<String>();
            if (seasonal) {
                badges.add(SEASONAL_BADGE);
            }
            if (isPriceBenefit(toBigDecimal(item), item.getAvgPrice())) {
                badges.add(PRICE_BADGE);
            }
            item.setBadges(badges);

            ProductKeywordProfileDto keywordProfile =
                productProfileMap.get(resolveProductNo(item));
            item.setLinkedRecipes(findLinkedRecipes(item, keywordProfile));
        }
    }

    private Map<Long, ProductKeywordProfileDto> buildSeasonalProductProfileMap(
        List<SeasonalProductCardDto> seasonalProducts
    ) {
        Map<Long, ProductKeywordProfileDto> productProfileMap = new LinkedHashMap<Long, ProductKeywordProfileDto>();

        for (SeasonalProductCardDto item : defaultList(seasonalProducts)) {
            Long productNo = resolveProductNo(item);
            if (productNo.longValue() <= 0L) {
                continue;
            }

            ProductDto product = productService.getProduct(productNo);
            if (product == null) {
                continue;
            }

            ProductKeywordProfileDto keywordProfile = buildKeywordProfile(product);
            if (keywordProfile == null) {
                continue;
            }

            productProfileMap.put(productNo, keywordProfile);
        }

        return productProfileMap;
    }

    private void applyDatalabRanking(
        List<SeasonalProductCardDto> seasonalProducts,
        Map<Long, ProductKeywordProfileDto> seasonalProductProfileMap
    ) {
        if (seasonalProducts == null || seasonalProducts.isEmpty()) {
            return;
        }

        Map<String, KeywordTrendScore> trendScoreMap = buildKeywordTrendScoreMap(seasonalProductProfileMap);

        for (SeasonalProductCardDto item : seasonalProducts) {
            Long productNo = resolveProductNo(item);
            ProductKeywordProfileDto keywordProfile = seasonalProductProfileMap.get(productNo);
            KeywordTrendScore keywordTrendScore = resolveKeywordTrendScore(keywordProfile, trendScoreMap);

            if (keywordProfile != null && keywordProfile.getRepresentKeyword() != null) {
                item.setRankKeyword(keywordProfile.getRepresentKeyword().trim());
            }

            if (keywordTrendScore == null) {
                continue;
            }

            item.setRankScore(toScaledDecimal(keywordTrendScore.getScore()));
            item.setLatestRatio(toScaledDecimal(keywordTrendScore.getLatestRatio()));
            item.setAverageRatio(toScaledDecimal(keywordTrendScore.getAverageRatio()));
            item.setChangeRatio(toScaledDecimal(keywordTrendScore.getChangeRatio()));
            item.setTrendDirection(keywordTrendScore.getTrendDirection());
        }

        seasonalProducts.sort((leftItem, rightItem) -> {
            int compareValue = Double.compare(
                getSeasonalRankScoreValue(rightItem),
                getSeasonalRankScoreValue(leftItem)
            );
            if (compareValue != 0) {
                return compareValue;
            }

            compareValue = Double.compare(
                getSeasonalLatestRatioValue(rightItem),
                getSeasonalLatestRatioValue(leftItem)
            );
            if (compareValue != 0) {
                return compareValue;
            }

            compareValue = Double.compare(
                getSeasonalChangeRatioValue(rightItem),
                getSeasonalChangeRatioValue(leftItem)
            );
            if (compareValue != 0) {
                return compareValue;
            }

            compareValue = Double.compare(
                calculateSeasonalSavingRate(rightItem),
                calculateSeasonalSavingRate(leftItem)
            );
            if (compareValue != 0) {
                return compareValue;
            }

            return Long.compare(resolveProductNo(rightItem), resolveProductNo(leftItem));
        });

        for (int index = 0; index < seasonalProducts.size(); index++) {
            seasonalProducts.get(index).setRank(Integer.valueOf(index + 1));
        }
    }

    private Map<String, KeywordTrendScore> buildKeywordTrendScoreMap(
        Map<Long, ProductKeywordProfileDto> seasonalProductProfileMap
    ) {
        Map<String, KeywordTrendScore> trendScoreMap = new HashMap<String, KeywordTrendScore>();

        if (naverDataLabService == null || seasonalProductProfileMap == null || seasonalProductProfileMap.isEmpty()) {
            return trendScoreMap;
        }

        Set<String> keywordSet = new LinkedHashSet<String>();
        for (ProductKeywordProfileDto keywordProfile : seasonalProductProfileMap.values()) {
            String normalizedKeyword = normalizeKeywordKey(normalizeRepresentKeyword(keywordProfile));
            if (normalizedKeyword.isEmpty()) {
                continue;
            }

            keywordSet.add(normalizedKeyword);
        }

        List<String> keywordList = new ArrayList<String>(keywordSet);
        for (int index = 0; index < keywordList.size(); index += DATALAB_KEYWORD_LIMIT) {
            int endIndex = Math.min(index + DATALAB_KEYWORD_LIMIT, keywordList.size());
            List<String> keywordBatch = keywordList.subList(index, endIndex);
            if (keywordBatch.isEmpty()) {
                continue;
            }

            trendScoreMap.putAll(fetchKeywordTrendScoreMap(keywordBatch));
        }

        return trendScoreMap;
    }

    private Map<String, KeywordTrendScore> fetchKeywordTrendScoreMap(List<String> keywordBatch) {
        Map<String, KeywordTrendScore> trendScoreMap = new HashMap<String, KeywordTrendScore>();
        if (keywordBatch == null || keywordBatch.isEmpty()) {
            return trendScoreMap;
        }

        try {
            Map<String, Object> data = naverDataLabService.getPopularSearchData(
                keywordBatch,
                null,
                null,
                "date"
            );

            Object popularSearchObject = data.get("popularSearchList");
            if (!(popularSearchObject instanceof List<?>)) {
                return trendScoreMap;
            }

            for (Object value : (List<?>) popularSearchObject) {
                if (!(value instanceof Map<?, ?> keywordMap)) {
                    continue;
                }

                String currentKeyword = normalizeKeywordKey(
                    String.valueOf(keywordMap.get("keyword") == null ? "" : keywordMap.get("keyword"))
                );
                if (currentKeyword.isEmpty()) {
                    continue;
                }

                double latestRatio = toDouble(keywordMap.get("latestRatio"));
                double averageRatio = toDouble(keywordMap.get("averageRatio"));
                double changeRatio = toDouble(keywordMap.get("changeRatio"));
                String trendDirection = String.valueOf(
                    keywordMap.get("trendDirection") == null ? "" : keywordMap.get("trendDirection")
                ).trim();

                trendScoreMap.put(currentKeyword, new KeywordTrendScore(
                    calculateKeywordTrendScore(latestRatio, averageRatio, changeRatio, trendDirection),
                    latestRatio,
                    averageRatio,
                    changeRatio,
                    trendDirection
                ));
            }
        } catch (Exception exception) {
            logger.warn("Main seasonal ranking - failed to resolve datalab score for keywords={}", keywordBatch, exception);
        }

        return trendScoreMap;
    }

    private double calculateKeywordTrendScore(
        double latestRatio,
        double averageRatio,
        double changeRatio,
        String trendDirection
    ) {
        double normalizedChange = Math.max(-20d, Math.min(changeRatio, 40d));
        double directionBonus;

        if ("UP".equalsIgnoreCase(trendDirection)) {
            directionBonus = 12d;
        } else if ("FLAT".equalsIgnoreCase(trendDirection)) {
            directionBonus = 4d;
        } else {
            directionBonus = 0d;
        }

        return latestRatio * 0.55d
            + averageRatio * 0.25d
            + normalizedChange * 1.2d
            + directionBonus;
    }

    private KeywordTrendScore resolveKeywordTrendScore(
        ProductKeywordProfileDto keywordProfile,
        Map<String, KeywordTrendScore> trendScoreMap
    ) {
        if (keywordProfile == null || trendScoreMap == null || trendScoreMap.isEmpty()) {
            return null;
        }

        return trendScoreMap.get(normalizeKeywordKey(normalizeRepresentKeyword(keywordProfile)));
    }

    private String normalizeRepresentKeyword(ProductKeywordProfileDto keywordProfile) {
        if (keywordProfile == null || keywordProfile.getRepresentKeyword() == null) {
            return "";
        }

        return keywordProfile.getRepresentKeyword().trim();
    }

    private String normalizeKeywordKey(String value) {
        return nullToEmpty(value).trim().toUpperCase();
    }

    private List<LinkedRecipeDto> findLinkedRecipes(
        SeasonalProductCardDto item,
        ProductKeywordProfileDto keywordProfile
    ) {
        Set<Long> usedRecipeNoSet = new LinkedHashSet<Long>();
        Set<String> keywordSet = new LinkedHashSet<String>();
        List<LinkedRecipeDto> linkedRecipeList = new ArrayList<LinkedRecipeDto>();

        if (keywordProfile != null) {
            for (String searchKeyword : defaultList(keywordProfile.getSearchKeywordList())) {
                String normalizedKeyword = nullToEmpty(searchKeyword).trim();
                if (!normalizedKeyword.isEmpty()) {
                    keywordSet.add(normalizedKeyword);
                }
            }
        }

        String productName = item == null || item.getProduct() == null
            ? ""
            : nullToEmpty(item.getProduct().getProductName()).trim();
        if (!productName.isEmpty()) {
            keywordSet.add(productName);
        }

        for (String keyword : keywordSet) {
            Map<String, Object> linkedParam = new HashMap<String, Object>();
            linkedParam.put("productName", keyword);
            linkedParam.put("limit", Integer.valueOf(LINKED_RECIPE_LIMIT));

            for (LinkedRecipeDto linkedRecipe : defaultList(mainDao.findLinkedRecipesByProductName(linkedParam))) {
                if (linkedRecipe == null || linkedRecipe.getRecipeNo() == null) {
                    continue;
                }
                if (!usedRecipeNoSet.add(linkedRecipe.getRecipeNo())) {
                    continue;
                }

                linkedRecipeList.add(linkedRecipe);
                if (linkedRecipeList.size() >= LINKED_RECIPE_LIMIT) {
                    return linkedRecipeList;
                }
            }
        }

        return linkedRecipeList;
    }

    private List<PopularRecipeCardDto> buildPopularRecipeCards(List<SeasonalProductCardDto> seasonalProducts) {
        List<PopularRecipeCardDto> reviewedRecipes =
            defaultList(mainDao.findPopularRecipes(limitParam(POPULAR_RECIPE_CANDIDATE_LIMIT)));

        List<PopularRecipeCardDto> candidateRecipes = new ArrayList<PopularRecipeCardDto>();
        Set<Long> usedRecipeNoSet = new HashSet<Long>();

        for (PopularRecipeCardDto recipe : buildDatalabDrivenRecipes(seasonalProducts)) {
            appendPopularRecipe(candidateRecipes, usedRecipeNoSet, recipe);
        }

        for (PopularRecipeCardDto recipe : reviewedRecipes) {
            appendPopularRecipe(candidateRecipes, usedRecipeNoSet, recipe);
        }

        List<PopularRecipeCardDto> mergedRecipes = pickCategoryBalancedRecipes(candidateRecipes);

        for (PopularRecipeCardDto recipe : mergedRecipes) {
            recipe.setCategoryLabel(resolveRecipeCategoryLabel(recipe.getRecipeName()));
            if (recipe.isDatalabDriven()) {
                recipe.setSummary(buildDatalabRecipeSummary(recipe));
            } else {
                recipe.setSummary(REVIEW_FALLBACK_SUMMARY);
            }

            Map<String, Object> ingredientParam = new HashMap<String, Object>();
            ingredientParam.put("recipeNo", recipe.getRecipeNo());
            ingredientParam.put("limit", Integer.valueOf(MATCHED_INGREDIENT_LIMIT));
            recipe.setMatchedIngredients(defaultList(mainDao.findMatchedIngredientsByRecipeNo(ingredientParam)));
        }

        return mergedRecipes;
    }

    private List<PopularRecipeCardDto> pickCategoryBalancedRecipes(List<PopularRecipeCardDto> candidateRecipes) {
        List<PopularRecipeCardDto> selectedRecipes = new ArrayList<PopularRecipeCardDto>();
        Set<Long> usedRecipeNoSet = new LinkedHashSet<Long>();

        for (String categoryLabel : PREFERRED_RECIPE_CATEGORIES) {
            for (PopularRecipeCardDto recipe : defaultList(candidateRecipes)) {
                if (selectedRecipes.size() >= POPULAR_RECIPE_LIMIT) {
                    return selectedRecipes;
                }
                if (!categoryLabel.equals(recipe.getCategoryLabel())) {
                    continue;
                }
                if (!usedRecipeNoSet.add(recipe.getRecipeNo())) {
                    continue;
                }

                selectedRecipes.add(recipe);
                break;
            }
        }

        for (PopularRecipeCardDto recipe : defaultList(candidateRecipes)) {
            if (selectedRecipes.size() >= POPULAR_RECIPE_LIMIT) {
                break;
            }
            if (!usedRecipeNoSet.add(recipe.getRecipeNo())) {
                continue;
            }

            selectedRecipes.add(recipe);
        }

        return selectedRecipes;
    }

    private List<PopularRecipeCardDto> buildDatalabDrivenRecipes(List<SeasonalProductCardDto> seasonalProducts) {
        if (naverDataLabService == null) {
            return Collections.emptyList();
        }

        List<ProductKeywordProfileDto> keywordProfiles = buildSeasonalKeywordProfiles(seasonalProducts);
        logger.info("Main popular recipes - seasonal keyword profiles={}", keywordProfiles.size());
        List<String> keywordList = new ArrayList<String>();
        for (ProductKeywordProfileDto profile : keywordProfiles) {
            String representKeyword = profile == null ? null : profile.getRepresentKeyword();
            if (representKeyword == null || representKeyword.trim().isEmpty()) {
                continue;
            }

            keywordList.add(representKeyword.trim());
            if (keywordList.size() >= DATALAB_KEYWORD_LIMIT) {
                break;
            }
        }

        if (keywordList.isEmpty()) {
            logger.info("Main popular recipes - no represent keywords resolved from seasonal products");
            return Collections.emptyList();
        }

        logger.info("Main popular recipes - datalab request keywords={}", keywordList);

        try {
            Map<String, Object> data = naverDataLabService.getPopularSearchData(
                keywordList,
                null,
                null,
                "date"
            );
            Object popularSearchObject = data.get("popularSearchList");
            if (!(popularSearchObject instanceof List<?>)) {
                return Collections.emptyList();
            }

            List<PopularRecipeCardDto> datalabRecipes = new ArrayList<PopularRecipeCardDto>();
            for (Object value : (List<?>) popularSearchObject) {
                if (!(value instanceof Map<?, ?> keywordMap)) {
                    continue;
                }

                Object keywordValue = keywordMap.get("keyword");
                String keyword = keywordValue == null ? null : String.valueOf(keywordValue).trim();
                if (keyword == null || keyword.isEmpty()) {
                    continue;
                }

                ProductKeywordProfileDto matchedProfile = findKeywordProfile(keywordProfiles, keyword);
                List<String> searchKeywordList = matchedProfile == null
                    ? Collections.singletonList(keyword)
                    : defaultList(matchedProfile.getSearchKeywordList());
                List<String> allowedRecipeCategoryList = matchedProfile == null
                    ? Collections.<String>emptyList()
                    : defaultList(matchedProfile.getAllowedRecipeCategoryList());

                logger.info(
                    "Main popular recipes - datalab keyword='{}', searchKeywords={}, allowedCategories={}",
                    keyword,
                    searchKeywordList,
                    allowedRecipeCategoryList
                );

                List<PopularRecipeCardDto> relaxedDatalabRecipes = new ArrayList<PopularRecipeCardDto>();
                Set<Long> relaxedRecipeNoSet = new HashSet<Long>();
                int acceptedCountForKeyword = 0;

                for (String searchKeyword : searchKeywordList) {
                    List<RecipeDTO> recipeList = searchRecipesByKeyword(searchKeyword);
                    logger.info(
                        "Main popular recipes - searchKeyword='{}', matchedRecipes={}",
                        searchKeyword,
                        recipeList == null ? 0 : recipeList.size()
                    );

                    for (RecipeDTO recipe : defaultList(recipeList)) {
                        PopularRecipeCardDto card = toPopularRecipeCard(recipe);
                        if (card == null) {
                            logger.info(
                                "Main popular recipes - skip null card for searchKeyword='{}'",
                                searchKeyword
                            );
                            continue;
                        }
                        if (!isAllowedRecipeCategory(card, allowedRecipeCategoryList)) {
                            logger.info(
                                "Main popular recipes - filtered recipeNo={}, recipeName='{}', category='{}', allowedCategories={}",
                                card.getRecipeNo(),
                                card.getRecipeName(),
                                card.getCategoryLabel(),
                                allowedRecipeCategoryList
                            );
                            if (isAllowedMealRecipe(card) && relaxedRecipeNoSet.add(card.getRecipeNo())) {
                                relaxedDatalabRecipes.add(card);
                            }
                            continue;
                        }

                        card.setDatalabDriven(true);
                        card.setSourceKeyword(keyword);
                        acceptedCountForKeyword++;
                        logger.info(
                            "Main popular recipes - accepted datalab recipeNo={}, recipeName='{}', sourceKeyword='{}', category='{}'",
                            card.getRecipeNo(),
                            card.getRecipeName(),
                            keyword,
                            card.getCategoryLabel()
                        );
                        datalabRecipes.add(card);
                    }
                }

                if (acceptedCountForKeyword == 0 && !relaxedDatalabRecipes.isEmpty()) {
                    logger.info(
                        "Main popular recipes - relaxed category filter for keyword='{}', fallbackAccepted={}",
                        keyword,
                        relaxedDatalabRecipes.size()
                    );
                    for (PopularRecipeCardDto relaxedRecipe : relaxedDatalabRecipes) {
                        relaxedRecipe.setDatalabDriven(true);
                        relaxedRecipe.setSourceKeyword(keyword);
                        datalabRecipes.add(relaxedRecipe);
                    }
                }
            }

            logger.info("Main popular recipes - total datalab recipes={}", datalabRecipes.size());
            return datalabRecipes;
        } catch (Exception exception) {
            logger.warn("Main popular recipes - datalab recipe build failed", exception);
            return Collections.emptyList();
        }
    }

    private void appendPopularRecipe(
        List<PopularRecipeCardDto> target,
        Set<Long> usedRecipeNoSet,
        PopularRecipeCardDto recipe
    ) {
        if (recipe == null || recipe.getRecipeNo() == null) {
            return;
        }
        if (!usedRecipeNoSet.add(recipe.getRecipeNo())) {
            return;
        }
        if (!isAllowedMealRecipe(recipe)) {
            return;
        }

        target.add(recipe);
    }

    private List<ProductKeywordProfileDto> buildSeasonalKeywordProfiles(List<SeasonalProductCardDto> seasonalProducts) {
        List<ProductKeywordProfileDto> keywordProfiles = new ArrayList<ProductKeywordProfileDto>();
        Set<String> usedRepresentKeywordSet = new LinkedHashSet<String>();

        for (SeasonalProductCardDto item : defaultList(seasonalProducts)) {
            Long productNo = item == null || item.getProduct() == null ? null : item.getProduct().getProductNo();
            if (productNo == null) {
                continue;
            }

            ProductDto product = productService.getProduct(productNo);
            if (product == null) {
                continue;
            }

            ProductKeywordProfileDto profile = buildKeywordProfile(product);
            if (profile == null || profile.getRepresentKeyword() == null || profile.getRepresentKeyword().trim().isEmpty()) {
                continue;
            }

            String normalizedKeyword = profile.getRepresentKeyword().trim().toUpperCase();
            if (!usedRepresentKeywordSet.add(normalizedKeyword)) {
                continue;
            }

            keywordProfiles.add(profile);
        }

        return keywordProfiles;
    }

    private ProductKeywordProfileDto buildKeywordProfile(ProductDto product) {
        if (productKeywordMapService != null) {
            ProductKeywordProfileDto mappedProfile = productKeywordMapService.getKeywordProfile(product);
            if (mappedProfile != null && mappedProfile.getRepresentKeyword() != null
                && !mappedProfile.getRepresentKeyword().trim().isEmpty()) {
                return mappedProfile;
            }
        }

        if (product == null) {
            return null;
        }

        List<String> searchKeywordList = buildAutomaticSearchKeywords(product);
        if (searchKeywordList.isEmpty()) {
            return null;
        }

        ProductKeywordProfileDto fallbackProfile = new ProductKeywordProfileDto();
        fallbackProfile.setProductNo(product.getProductNo());
        fallbackProfile.setProductName(product.getProductName());
        fallbackProfile.setCategoryNo(product.getCategoryNo());
        fallbackProfile.setCategoryName(product.getCategoryName());
        fallbackProfile.setRepresentKeyword(searchKeywordList.get(0));
        fallbackProfile.setSearchKeywordList(searchKeywordList);
        fallbackProfile.setAllowedRecipeCategoryList(buildAutomaticAllowedRecipeCategories(product, searchKeywordList.get(0)));
        return fallbackProfile;
    }

    private ProductKeywordProfileDto findKeywordProfile(List<ProductKeywordProfileDto> keywordProfiles, String representKeyword) {
        String normalizedKeyword = nullToEmpty(representKeyword).trim();
        if (normalizedKeyword.isEmpty()) {
            return null;
        }

        for (ProductKeywordProfileDto profile : defaultList(keywordProfiles)) {
            String currentKeyword = profile == null ? null : profile.getRepresentKeyword();
            if (currentKeyword != null && normalizedKeyword.equalsIgnoreCase(currentKeyword.trim())) {
                return profile;
            }
        }

        return null;
    }

    private List<String> buildAutomaticSearchKeywords(ProductDto product) {
        Set<String> keywordSet = new LinkedHashSet<String>();
        String productName = nullToEmpty(product.getProductName()).trim();
        String categoryName = nullToEmpty(product.getCategoryName()).trim();
        String itemName = nullToEmpty(product.getItemName()).trim();
        String sourceText = (productName + " " + itemName + " " + categoryName).trim();

        if (!productName.isEmpty()) {
            keywordSet.add(productName);
        }
        if (!itemName.isEmpty()) {
            keywordSet.add(itemName);
        }

        if (containsAnyKeyword(sourceText, "양파")) {
            Collections.addAll(keywordSet, "양파", "자색양파", "햇양파");
        } else if (containsAnyKeyword(sourceText, "감자")) {
            Collections.addAll(keywordSet, "감자", "햇감자", "감자전");
        } else if (containsAnyKeyword(sourceText, "오이")) {
            Collections.addAll(keywordSet, "오이", "백오이", "오이무침");
        } else if (containsAnyKeyword(sourceText, "시금치")) {
            Collections.addAll(keywordSet, "시금치", "포항초", "시금치무침");
        } else if (containsAnyKeyword(sourceText, "배추")) {
            Collections.addAll(keywordSet, "배추", "알배추", "배추국");
        } else if (containsAnyKeyword(sourceText, "양배추")) {
            Collections.addAll(keywordSet, "양배추", "적양배추", "양배추샐러드");
        } else if (containsAnyKeyword(sourceText, "새송이")) {
            Collections.addAll(keywordSet, "새송이", "버섯", "새송이버섯볶음");
        } else if (containsAnyKeyword(sourceText, "팽이", "팽이버섯")) {
            Collections.addAll(keywordSet, "팽이버섯", "버섯", "버섯국");
        } else if (containsAnyKeyword(sourceText, "사과")) {
            Collections.addAll(keywordSet, "사과", "사과샐러드", "사과요리");
        } else if (containsAnyKeyword(sourceText, "쌀", "곡물", "잡곡", "현미")) {
            Collections.addAll(keywordSet, "쌀", "잡곡", "현미", "떡");
        }

        if (keywordSet.isEmpty()) {
            if (!categoryName.isEmpty()) {
                keywordSet.add(categoryName);
            }
        }

        return new ArrayList<String>(keywordSet);
    }

    private List<String> buildAutomaticAllowedRecipeCategories(ProductDto product, String representKeyword) {
        String categoryName = nullToEmpty(product.getCategoryName()).trim();
        String sourceText = (
            nullToEmpty(representKeyword) + " "
                + nullToEmpty(product.getProductName()) + " "
                + nullToEmpty(product.getItemName()) + " "
                + categoryName
        ).trim();
        Set<String> categorySet = new LinkedHashSet<String>();

        if (containsAnyKeyword(sourceText, "양파")) {
            Collections.addAll(categorySet, "반찬", "국/찜/탕", "메인요리");
        } else if (containsAnyKeyword(sourceText, "감자")) {
            Collections.addAll(categorySet, "메인요리", "국/찜/탕", "밥/죽", "간식");
        } else if (containsAnyKeyword(sourceText, "오이")) {
            Collections.addAll(categorySet, "반찬", "샐러드");
        } else if (containsAnyKeyword(sourceText, "시금치")) {
            Collections.addAll(categorySet, "반찬", "국/찜/탕");
        } else if (containsAnyKeyword(sourceText, "배추", "양배추")) {
            Collections.addAll(categorySet, "반찬", "국/찜/탕", "샐러드");
        } else if (containsAnyKeyword(sourceText, "새송이", "팽이버섯", "버섯")) {
            Collections.addAll(categorySet, "반찬", "메인요리", "국/찜/탕");
        } else if (containsAnyKeyword(sourceText, "사과")) {
            Collections.addAll(categorySet, "샐러드", "간식");
        } else if (containsAnyKeyword(sourceText, "쌀", "곡물", "잡곡", "현미")) {
            Collections.addAll(categorySet, "밥/죽", "간식");
        }

        if (categorySet.isEmpty()) {
            if ("과일".equalsIgnoreCase(categoryName)) {
                Collections.addAll(categorySet, "샐러드", "간식");
            } else if ("버섯".equalsIgnoreCase(categoryName)) {
                Collections.addAll(categorySet, "반찬", "메인요리", "국/찜/탕");
            } else if ("곡물".equalsIgnoreCase(categoryName)) {
                Collections.addAll(categorySet, "밥/죽", "간식");
            } else if ("채소".equalsIgnoreCase(categoryName)) {
                Collections.addAll(categorySet, "반찬", "국/찜/탕", "메인요리", "샐러드");
            }
        }

        if (categorySet.isEmpty()) {
            categorySet.addAll(PREFERRED_RECIPE_CATEGORIES);
        }

        return new ArrayList<String>(categorySet);
    }

    private PopularRecipeCardDto toPopularRecipeCard(RecipeDTO recipe) {
        if (recipe == null || recipe.getRecipeNo() == null) {
            return null;
        }

        PopularRecipeCardDto card = new PopularRecipeCardDto();
        card.setRecipeNo(recipe.getRecipeNo());
        card.setRecipeName(recipe.getRecipeName());
        card.setImageUrl(recipe.getImageUrl());
        card.setCategoryLabel(resolveRecipeCategoryLabel(recipe.getRecipeName()));
        return card;
    }

    private List<RecipeDTO> searchRecipesByKeyword(String searchKeyword) {
        String normalizedKeyword = nullToEmpty(searchKeyword).trim();
        if (normalizedKeyword.isEmpty()) {
            return Collections.emptyList();
        }

        List<RecipeDTO> mergedRecipes = new ArrayList<RecipeDTO>();
        Set<Long> usedRecipeNoSet = new HashSet<Long>();

        appendRecipeSearchResults(
            mergedRecipes,
            usedRecipeNoSet,
            recipeService.getRecipeList(
                normalizedKeyword,
                null,
                null,
                Integer.valueOf(SEARCH_RECIPE_LIMIT),
                Integer.valueOf(1)
            )
        );

        appendRecipeSearchResults(
            mergedRecipes,
            usedRecipeNoSet,
            recipeService.getRecipeList(
                null,
                normalizedKeyword,
                null,
                Integer.valueOf(SEARCH_RECIPE_LIMIT),
                Integer.valueOf(1)
            )
        );

        return mergedRecipes;
    }

    private void appendRecipeSearchResults(
        List<RecipeDTO> target,
        Set<Long> usedRecipeNoSet,
        List<RecipeDTO> recipeList
    ) {
        for (RecipeDTO recipe : defaultList(recipeList)) {
            if (recipe == null || recipe.getRecipeNo() == null) {
                continue;
            }
            if (!usedRecipeNoSet.add(recipe.getRecipeNo())) {
                continue;
            }

            target.add(recipe);
        }
    }

    private boolean isAllowedMealRecipe(PopularRecipeCardDto recipe) {
        String sourceText = ((recipe.getRecipeName() == null ? "" : recipe.getRecipeName()) + " "
            + (recipe.getSummary() == null ? "" : recipe.getSummary())).trim();

        if (sourceText.isEmpty()) {
            return false;
        }

        if (DRINK_RECIPE_PATTERN.matcher(sourceText).find()) {
            return false;
        }
        if (DESSERT_RECIPE_PATTERN.matcher(sourceText).find()) {
            return false;
        }
        if (SALAD_RECIPE_PATTERN.matcher(sourceText).find()) {
            return true;
        }
        if (NOODLE_RECIPE_PATTERN.matcher(sourceText).find()) {
            return true;
        }
        if (SOUP_RECIPE_PATTERN.matcher(sourceText).find()) {
            return true;
        }
        if (RICE_RECIPE_PATTERN.matcher(sourceText).find()) {
            return true;
        }
        if (SIDE_DISH_RECIPE_PATTERN.matcher(sourceText).find()) {
            return true;
        }
        if (MAIN_DISH_RECIPE_PATTERN.matcher(sourceText).find()) {
            return true;
        }

        return false;
    }

    private boolean isAllowedRecipeCategory(PopularRecipeCardDto recipe, List<String> allowedCategoryList) {
        if (allowedCategoryList == null || allowedCategoryList.isEmpty()) {
            return true;
        }

        String categoryLabel = nullToEmpty(recipe.getCategoryLabel()).trim();
        if (categoryLabel.isEmpty()) {
            return false;
        }

        for (String allowedCategory : allowedCategoryList) {
            if (allowedCategory != null && categoryLabel.equalsIgnoreCase(allowedCategory.trim())) {
                return true;
            }
        }

        return false;
    }

    private boolean containsAnyKeyword(String value, String... keywordArray) {
        String normalizedValue = nullToEmpty(value).trim();
        if (normalizedValue.isEmpty()) {
            return false;
        }

        for (String keyword : keywordArray) {
            if (keyword != null && !keyword.trim().isEmpty() && normalizedValue.contains(keyword.trim())) {
                return true;
            }
        }

        return false;
    }

    private String buildDatalabRecipeSummary(PopularRecipeCardDto recipe) {
        String keyword = nullToEmpty(recipe.getSourceKeyword()).trim();
        String categoryLabel = nullToEmpty(recipe.getCategoryLabel()).trim();

        if (!keyword.isEmpty() && !categoryLabel.isEmpty()) {
            return keyword + " \uD0A4\uC6CC\uB4DC \uD750\uB984\uC5D0\uC11C \uC9D1\uC740 " + categoryLabel + " \uB808\uC2DC\uD53C";
        }
        if (!keyword.isEmpty()) {
            return keyword + " \uD0A4\uC6CC\uB4DC \uD750\uB984\uC5D0\uC11C \uC9D1\uC740 \uC9D1\uBC25 \uBA54\uB274";
        }

        return DATALAB_RECIPE_SUMMARY;
    }

    private String resolveRecipeCategoryLabel(String recipeName) {
        String sourceText = nullToEmpty(recipeName).trim();
        if (sourceText.isEmpty()) {
            return "";
        }

        if (SALAD_RECIPE_PATTERN.matcher(sourceText).find()) {
            return "\uC0D0\uB7EC\uB4DC";
        }
        if (NOODLE_RECIPE_PATTERN.matcher(sourceText).find()) {
            return "\uBA74/\uD30C\uC2A4\uD0C0";
        }
        if (SOUP_RECIPE_PATTERN.matcher(sourceText).find()) {
            return "\uAD6D/\uCC1C/\uD0D5";
        }
        if (RICE_RECIPE_PATTERN.matcher(sourceText).find()) {
            return "\uBC25/\uC8FD";
        }
        if (SIDE_DISH_RECIPE_PATTERN.matcher(sourceText).find()) {
            return "\uBC18\uCC2C";
        }
        if (MAIN_DISH_RECIPE_PATTERN.matcher(sourceText).find()) {
            return "\uBA54\uC778\uC694\uB9AC";
        }

        return "";
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

    private double getSeasonalRankScoreValue(SeasonalProductCardDto item) {
        return item == null || item.getRankScore() == null ? 0d : item.getRankScore().doubleValue();
    }

    private double getSeasonalLatestRatioValue(SeasonalProductCardDto item) {
        return item == null || item.getLatestRatio() == null ? 0d : item.getLatestRatio().doubleValue();
    }

    private double getSeasonalChangeRatioValue(SeasonalProductCardDto item) {
        return item == null || item.getChangeRatio() == null ? 0d : item.getChangeRatio().doubleValue();
    }

    private double calculateSeasonalSavingRate(SeasonalProductCardDto item) {
        BigDecimal salePrice = toBigDecimal(item);
        BigDecimal avgPrice = item == null ? null : item.getAvgPrice();

        if (salePrice == null || avgPrice == null || avgPrice.compareTo(BigDecimal.ZERO) <= 0) {
            return 0d;
        }

        return avgPrice.subtract(salePrice)
            .divide(avgPrice, 4, RoundingMode.HALF_UP)
            .doubleValue();
    }

    private long resolveProductNo(SeasonalProductCardDto item) {
        if (item == null || item.getProduct() == null || item.getProduct().getProductNo() == null) {
            return 0L;
        }

        return item.getProduct().getProductNo();
    }

    private BigDecimal toScaledDecimal(double value) {
        return BigDecimal.valueOf(Math.round(value * 10d) / 10d);
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

    private double toDouble(Object value) {
        if (value instanceof Number) {
            return ((Number) value).doubleValue();
        }

        if (value == null) {
            return 0D;
        }

        try {
            return Double.parseDouble(String.valueOf(value).trim());
        } catch (NumberFormatException exception) {
            return 0D;
        }
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

    private static class KeywordTrendScore {

        private final double score;
        private final double latestRatio;
        private final double averageRatio;
        private final double changeRatio;
        private final String trendDirection;

        private KeywordTrendScore(
            double score,
            double latestRatio,
            double averageRatio,
            double changeRatio,
            String trendDirection
        ) {
            this.score = score;
            this.latestRatio = latestRatio;
            this.averageRatio = averageRatio;
            this.changeRatio = changeRatio;
            this.trendDirection = trendDirection == null ? "" : trendDirection;
        }

        private double getScore() {
            return score;
        }

        private double getLatestRatio() {
            return latestRatio;
        }

        private double getAverageRatio() {
            return averageRatio;
        }

        private double getChangeRatio() {
            return changeRatio;
        }

        private String getTrendDirection() {
            return trendDirection;
        }
    }
}
