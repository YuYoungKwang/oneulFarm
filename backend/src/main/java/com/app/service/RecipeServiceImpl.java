package com.app.service;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriUtils;

import com.app.dao.ProductDao;
import com.app.dao.RecipeDAO;
import com.app.dto.ProductDto;
import com.app.dto.RecipeDTO;
import com.app.dto.RecipeIngredientDTO;
import com.app.dto.RecipeStepDTO;
import com.app.dto.RecipeStepImageDTO;
import com.app.dto.ReviewDto;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class RecipeServiceImpl implements RecipeService {

    private static final Logger logger = LoggerFactory.getLogger(RecipeServiceImpl.class);

    private static final String SOURCE_NAME = "FOOD_SAFETY_KOREA_COOKRCP01";
    private static final String RECIPE_API_RESULT_SUCCESS = "INFO-000";
    private static final String RECIPE_API_RESULT_NO_DATA = "INFO-200";
    private static final int DEFAULT_RECIPE_SYNC_BATCH_SIZE = 100;
    private static final int MAX_RECIPE_API_BATCH_SIZE = 100;
    private static final int DEFAULT_LIMIT = 12;
    private static final int MAX_LIMIT = 60;
    private static final int RECOMMEND_PRODUCT_LIMIT = 6;

    @Autowired
    private RecipeDAO recipeDAO;

    @Autowired
    private ProductDao productDao;

    @Autowired
    private ReviewService reviewService;

    @Value("${foodsafetykorea.baseUrl:https://openapi.foodsafetykorea.go.kr/api}")
    private String foodsafetyKoreaBaseUrl;

    @Value("${foodsafetykorea.apiKey:sample}")
    private String foodsafetyKoreaApiKey;

    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate;

    public RecipeServiceImpl() {
        this.objectMapper = new ObjectMapper();
        this.restTemplate = createRestTemplate();
    }

    @Override
    public int syncRecipe(String keyword, Integer limit) {
        int processedCount = 0;
        int requestCount = 0;
        int startIndex = 1;
        int targetCount = resolveSyncTargetCount(limit);
        String normalizedKeyword = trimToNull(keyword);

        while (requestCount < targetCount) {
            int remainingCount = targetCount - requestCount;
            int batchSize = Math.min(Math.min(DEFAULT_RECIPE_SYNC_BATCH_SIZE, MAX_RECIPE_API_BATCH_SIZE), remainingCount);
            int endIndex = startIndex + batchSize - 1;

            RecipeApiResponse recipeApiResponse = fetchRecipeApiResponse(normalizedKeyword, startIndex, endIndex);
            List<JsonNode> recipeNodeList = recipeApiResponse.getRecipeNodeList();
            if (recipeNodeList.isEmpty()) {
                break;
            }

            requestCount += recipeNodeList.size();
            processedCount += syncRecipeNodeList(recipeNodeList);
            startIndex += recipeNodeList.size();

            if (recipeApiResponse.getTotalCount() > 0 && startIndex > recipeApiResponse.getTotalCount()) {
                break;
            }
            if (recipeNodeList.size() < batchSize) {
                break;
            }
        }

        logger.info(
            "레시피 연동 완료 - keyword={}, requestedCount={}, processedCount={}",
            normalizedKeyword,
            Integer.valueOf(requestCount),
            Integer.valueOf(processedCount)
        );
        return processedCount;
    }

    @Override
    public List<RecipeDTO> getRecipeList(String keyword, String ingredientKeyword, String sort, Integer limit, Integer page) {
        String resolvedKeyword = trimToNull(keyword);
        String resolvedIngredientKeyword = trimToNull(ingredientKeyword);
        String resolvedSort = normalizeSort(sort);
        int resolvedLimit = resolveLimit(limit);
        int resolvedPage = resolvePage(page);
        int resolvedOffset = (resolvedPage - 1) * resolvedLimit;

        return recipeDAO.selectRecipeList(
            resolvedKeyword,
            resolvedIngredientKeyword,
            resolvedSort,
            resolvedOffset,
            resolvedLimit
        );
    }

    @Override
    public int getRecipeListCount(String keyword, String ingredientKeyword) {
        return recipeDAO.countRecipeList(trimToNull(keyword), trimToNull(ingredientKeyword));
    }

    @Override
    public RecipeDTO getRecipeDetail(Long recipeNo) {
        if (recipeNo == null || recipeNo.longValue() <= 0L) {
            throw new IllegalArgumentException("recipeNo는 필수입니다.");
        }

        RecipeDTO recipeDTO = recipeDAO.selectRecipeDetail(recipeNo);
        if (recipeDTO == null) {
            return null;
        }

        List<RecipeIngredientDTO> ingredientList = recipeDAO.selectRecipeIngredientList(recipeNo);
        List<RecipeStepDTO> stepList = recipeDAO.selectRecipeStepList(recipeNo);
        List<RecipeStepImageDTO> stepImageList = recipeDAO.selectRecipeStepImageList(recipeNo);

        Map<Long, List<RecipeStepImageDTO>> stepImageMap = new LinkedHashMap<Long, List<RecipeStepImageDTO>>();
        for (RecipeStepImageDTO stepImageDTO : stepImageList) {
            stepImageMap
                .computeIfAbsent(stepImageDTO.getStepNo(), key -> new ArrayList<RecipeStepImageDTO>())
                .add(stepImageDTO);
        }

        for (RecipeStepDTO stepDTO : stepList) {
            List<RecipeStepImageDTO> imageList = stepImageMap.get(stepDTO.getStepNo());
            if (imageList == null) {
                imageList = new ArrayList<RecipeStepImageDTO>();
            }
            stepDTO.setImageList(imageList);
            stepDTO.setPrimaryImageUrl(imageList.isEmpty() ? null : imageList.get(0).getImageUrl());
        }

        recipeDTO.setIngredientList(ingredientList);
        recipeDTO.setStepList(stepList);
        recipeDTO.setRecommendedProductList(
            buildRecommendedProductList(ingredientList, productDao.findSellingProducts(), RECOMMEND_PRODUCT_LIMIT)
        );
        List<ReviewDto> reviewList = reviewService.getRecipeReviews(recipeNo);
        recipeDTO.setReviewList(reviewList);
        return recipeDTO;
    }

    private List<ProductDto> buildRecommendedProductList(
        List<RecipeIngredientDTO> ingredientList,
        List<ProductDto> sellingProductList,
        int limit
    ) {
        if (ingredientList == null || ingredientList.isEmpty() || sellingProductList == null || sellingProductList.isEmpty()) {
            return Collections.emptyList();
        }

        Map<Long, Integer> bestScoreMap = new HashMap<Long, Integer>();
        Map<Long, ProductDto> matchedProductMap = new LinkedHashMap<Long, ProductDto>();
        Set<String> ingredientTokenSet = new LinkedHashSet<String>();
        for (RecipeIngredientDTO ingredientDTO : ingredientList) {
            String ingredientName = normalizeIngredientToken(ingredientDTO.getIngredientName());
            if (ingredientName != null) {
                ingredientTokenSet.add(ingredientName);
            }
        }

        for (ProductDto product : sellingProductList) {
            if (product == null || product.getProductNo() == null) {
                continue;
            }

            String normalizedProductName = normalizeIngredientToken(product.getProductName());
            if (normalizedProductName == null) {
                continue;
            }

            int bestScore = 0;
            for (String ingredientToken : ingredientTokenSet) {
                int score = calculateMatchScore(normalizedProductName, ingredientToken);
                if (score > bestScore) {
                    bestScore = score;
                }
            }

            if (bestScore <= 0) {
                continue;
            }

            Long productNo = product.getProductNo();
            Integer existingScore = bestScoreMap.get(productNo);
            if (existingScore == null || bestScore > existingScore.intValue()) {
                bestScoreMap.put(productNo, Integer.valueOf(bestScore));
                matchedProductMap.put(productNo, product);
            }
        }

        List<ProductDto> candidateList = new ArrayList<ProductDto>(matchedProductMap.values());
        candidateList.sort(
            Comparator
                .comparing((ProductDto product) -> bestScoreMap.get(product.getProductNo()), Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(ProductDto::getSavingRate, Comparator.nullsLast(Comparator.reverseOrder()))
        );

        if (candidateList.size() > limit) {
            return candidateList.subList(0, limit);
        }

        return candidateList;
    }

    private String normalizeIngredientToken(String value) {
        if (value == null) {
            return null;
        }

        String normalized = value
            .toLowerCase(Locale.ROOT)
            .replaceAll("\\([^)]*\\)", " ")
            .replaceAll("\\[[^\\]]*\\]", " ")
            .replaceAll("[^a-z0-9가-힣\\s]", " ")
            .replaceAll("\\s+", " ")
            .trim();

        if (normalized.isEmpty()) {
            return null;
        }

        return normalized;
    }

    private int calculateMatchScore(String productName, String ingredientToken) {
        if (productName == null || ingredientToken == null) {
            return 0;
        }

        if (productName.equals(ingredientToken)) {
            return 100;
        }

        if (productName.contains(ingredientToken)) {
            return 80 + Math.min(ingredientToken.length(), 10);
        }

        if (ingredientToken.contains(productName)) {
            return 60 + Math.min(productName.length(), 10);
        }

        int tokenScore = 0;
        String[] tokenParts = ingredientToken.split(" ");
        for (String tokenPart : tokenParts) {
            if (tokenPart.length() < 2) {
                continue;
            }
            if (productName.contains(tokenPart)) {
                tokenScore += 10;
            }
        }

        return tokenScore;
    }

    private int syncRecipeNodeList(List<JsonNode> recipeNodeList) {
        int processedCount = 0;
        int failedCount = 0;

        for (JsonNode recipeNode : recipeNodeList) {
            RecipeDTO recipeDTO = buildRecipe(recipeNode);
            if (recipeDTO.getExternalRecipeId() == null || recipeDTO.getRecipeName() == null) {
                continue;
            }

            try {
                recipeDAO.mergeRecipe(recipeDTO);
                if (recipeDTO.getRecipeNo() == null) {
                    continue;
                }

                recipeDAO.deleteRecipeIngredientByRecipeNo(recipeDTO.getRecipeNo());
                recipeDAO.deleteRecipeStepImageByRecipeNo(recipeDTO.getRecipeNo());
                recipeDAO.deleteRecipeStepByRecipeNo(recipeDTO.getRecipeNo());

                List<RecipeIngredientDTO> ingredientList = buildRecipeIngredientList(
                    recipeDTO.getRecipeNo(),
                    recipeNode.path("RCP_PARTS_DTLS").asText()
                );
                for (RecipeIngredientDTO recipeIngredientDTO : ingredientList) {
                    recipeDAO.insertRecipeIngredient(recipeIngredientDTO);
                }

                List<RecipeStepDTO> stepList = buildRecipeStepList(recipeDTO.getRecipeNo(), recipeNode);
                for (RecipeStepDTO recipeStepDTO : stepList) {
                    recipeDAO.insertRecipeStep(recipeStepDTO);

                    List<RecipeStepImageDTO> stepImageDTOList = buildRecipeStepImageList(
                        recipeStepDTO.getStepNo(),
                        recipeNode,
                        recipeStepDTO.getStepSeq()
                    );
                    for (RecipeStepImageDTO recipeStepImageDTO : stepImageDTOList) {
                        recipeDAO.insertRecipeStepImage(recipeStepImageDTO);
                    }
                }

                processedCount++;
            } catch (Exception exception) {
                failedCount++;
                logger.error(
                    "레시피 저장 실패 - externalRecipeId={}, recipeName={}",
                    recipeDTO.getExternalRecipeId(),
                    recipeDTO.getRecipeName(),
                    exception
                );
            }
        }

        if (processedCount == 0 && failedCount > 0) {
            throw new IllegalStateException("레시피 저장에 모두 실패했습니다. 서버 로그를 확인하세요.");
        }

        if (failedCount > 0) {
            logger.warn("레시피 일부 저장 실패 - failedCount={}", Integer.valueOf(failedCount));
        }

        return processedCount;
    }

    private RecipeApiResponse fetchRecipeApiResponse(String keyword, int startIndex, int endIndex) {
        try {
            String requestUrl = buildRecipeRequestUrl(keyword, startIndex, endIndex);
            logger.info(
                "레시피 API 조회 요청 - keyword={}, startIndex={}, endIndex={}",
                keyword,
                Integer.valueOf(startIndex),
                Integer.valueOf(endIndex)
            );

            String responseBody = restTemplate.getForObject(requestUrl, String.class);
            if (responseBody == null || responseBody.isBlank()) {
                throw new IllegalStateException("레시피 API 응답이 비어 있습니다.");
            }

            JsonNode rootNode = objectMapper.readTree(responseBody);
            JsonNode recipeRootNode = rootNode.path("COOKRCP01");
            JsonNode resultNode = recipeRootNode.path("RESULT");
            String resultCode = resultNode.path("CODE").asText();
            if (RECIPE_API_RESULT_NO_DATA.equals(resultCode)) {
                return new RecipeApiResponse(0, Collections.<JsonNode>emptyList());
            }
            if (!RECIPE_API_RESULT_SUCCESS.equals(resultCode)) {
                throw new IllegalStateException("레시피 API 응답 오류입니다. resultCode=" + resultCode);
            }

            int totalCount = parsePositiveInteger(recipeRootNode.path("total_count").asText(), 0);
            JsonNode rowNode = recipeRootNode.path("row");
            if (!rowNode.isArray()) {
                return new RecipeApiResponse(totalCount, Collections.<JsonNode>emptyList());
            }

            List<JsonNode> recipeNodeList = new ArrayList<JsonNode>();
            for (JsonNode itemNode : rowNode) {
                recipeNodeList.add(itemNode);
            }

            return new RecipeApiResponse(totalCount, recipeNodeList);
        } catch (IOException exception) {
            throw new IllegalStateException("레시피 API 응답을 해석하지 못했습니다.", exception);
        }
    }

    private String buildRecipeRequestUrl(String keyword, int startIndex, int endIndex) {
        StringBuilder requestUrl = new StringBuilder();
        requestUrl
            .append(foodsafetyKoreaBaseUrl)
            .append("/")
            .append(foodsafetyKoreaApiKey)
            .append("/COOKRCP01/json/")
            .append(startIndex)
            .append("/")
            .append(endIndex);

        String normalizedKeyword = trimToNull(keyword);
        if (normalizedKeyword != null) {
            requestUrl.append("/RCP_NM=").append(UriUtils.encodePathSegment(normalizedKeyword, StandardCharsets.UTF_8));
        }

        return requestUrl.toString();
    }

    private RecipeDTO buildRecipe(JsonNode recipeNode) {
        RecipeDTO recipeDTO = new RecipeDTO();
        recipeDTO.setExternalRecipeId(truncate(trimToNull(recipeNode.path("RCP_SEQ").asText()), 100));
        recipeDTO.setRecipeName(truncate(trimToNull(recipeNode.path("RCP_NM").asText()), 100));
        recipeDTO.setDescription(buildRecipeDescription(recipeNode));
        recipeDTO.setCookTime(null);
        recipeDTO.setDifficulty(null);
        recipeDTO.setCalories(toBigDecimal(recipeNode.path("INFO_ENG")));
        recipeDTO.setImageUrl(truncate(resolveRecipeImageUrl(recipeNode), 500));
        recipeDTO.setSourceName(SOURCE_NAME);
        return recipeDTO;
    }

    private String buildRecipeDescription(JsonNode recipeNode) {
        List<String> partList = new ArrayList<String>();

        String recipePattern = trimToNull(recipeNode.path("RCP_PAT2").asText());
        String recipeMethod = trimToNull(recipeNode.path("RCP_WAY2").asText());
        String recipeTip = trimToNull(recipeNode.path("RCP_NA_TIP").asText());

        if (recipePattern != null || recipeMethod != null) {
            StringBuilder titleLine = new StringBuilder();
            if (recipePattern != null) {
                titleLine.append(recipePattern);
            }
            if (recipeMethod != null) {
                if (titleLine.length() > 0) {
                    titleLine.append(" / ");
                }
                titleLine.append(recipeMethod);
            }
            partList.add(titleLine.toString());
        }

        if (recipeTip != null) {
            partList.add(recipeTip);
        }

        if (partList.isEmpty()) {
            return null;
        }

        return String.join(System.lineSeparator(), partList);
    }

    private String resolveRecipeImageUrl(JsonNode recipeNode) {
        String imageUrl = trimToNull(recipeNode.path("ATT_FILE_NO_MAIN").asText());
        if (imageUrl != null) {
            return imageUrl;
        }

        return trimToNull(recipeNode.path("ATT_FILE_NO_MK").asText());
    }

    private List<RecipeIngredientDTO> buildRecipeIngredientList(Long recipeNo, String rawIngredientText) {
        String ingredientText = trimToNull(rawIngredientText);
        if (ingredientText == null) {
            return Collections.emptyList();
        }

        List<RecipeIngredientDTO> ingredientList = new ArrayList<RecipeIngredientDTO>();
        String[] lineArray = ingredientText.split("\\r?\\n");
        for (String line : lineArray) {
            String normalizedLine = normalizeIngredientLine(line);
            if (normalizedLine == null) {
                continue;
            }

            String[] tokenArray = normalizedLine.split(",");
            for (String token : tokenArray) {
                String ingredientToken = trimToNull(token);
                if (ingredientToken == null) {
                    continue;
                }

                ingredientToken = ingredientToken.replace("·", "").trim();
                ingredientToken = ingredientToken.replaceAll("^\\[[^\\]]+\\]", "").trim();
                if (ingredientToken.isEmpty()) {
                    continue;
                }

                int digitIndex = findFirstDigitIndex(ingredientToken);
                String ingredientName = ingredientToken;
                String amount = null;

                if (digitIndex > 0) {
                    ingredientName = ingredientToken.substring(0, digitIndex).trim();
                    amount = ingredientToken.substring(digitIndex).trim();
                }

                ingredientName = truncate(trimToNull(ingredientName), 100);
                amount = truncate(trimToNull(amount), 50);
                if (ingredientName == null) {
                    continue;
                }

                RecipeIngredientDTO recipeIngredientDTO = new RecipeIngredientDTO();
                recipeIngredientDTO.setRecipeNo(recipeNo);
                recipeIngredientDTO.setIngredientName(ingredientName);
                recipeIngredientDTO.setAmount(amount);
                ingredientList.add(recipeIngredientDTO);
            }
        }

        return ingredientList;
    }

    private List<RecipeStepDTO> buildRecipeStepList(Long recipeNo, JsonNode recipeNode) {
        List<RecipeStepDTO> stepList = new ArrayList<RecipeStepDTO>();

        for (int index = 1; index <= 20; index++) {
            String manualKey = String.format(Locale.ROOT, "MANUAL%02d", Integer.valueOf(index));
            String description = trimToNull(recipeNode.path(manualKey).asText());
            if (description == null) {
                continue;
            }

            RecipeStepDTO recipeStepDTO = new RecipeStepDTO();
            recipeStepDTO.setRecipeNo(recipeNo);
            recipeStepDTO.setStepSeq(Integer.valueOf(index));
            recipeStepDTO.setDescription(description);
            stepList.add(recipeStepDTO);
        }

        return stepList;
    }

    private List<RecipeStepImageDTO> buildRecipeStepImageList(Long stepNo, JsonNode recipeNode, Integer stepSeq) {
        if (stepNo == null || stepSeq == null) {
            return Collections.emptyList();
        }

        String imageKey = String.format(Locale.ROOT, "MANUAL_IMG%02d", stepSeq);
        String imageUrl = trimToNull(recipeNode.path(imageKey).asText());
        if (imageUrl == null) {
            return Collections.emptyList();
        }

        RecipeStepImageDTO recipeStepImageDTO = new RecipeStepImageDTO();
        recipeStepImageDTO.setStepNo(stepNo);
        recipeStepImageDTO.setImageUrl(truncate(imageUrl, 500));
        recipeStepImageDTO.setSortOrder(Integer.valueOf(1));

        List<RecipeStepImageDTO> recipeStepImageList = new ArrayList<RecipeStepImageDTO>();
        recipeStepImageList.add(recipeStepImageDTO);
        return recipeStepImageList;
    }

    private String normalizeSort(String sort) {
        String normalizedSort = trimToNull(sort);
        if (normalizedSort == null) {
            return "RECOMMENDED";
        }

        String upperCaseSort = normalizedSort.toUpperCase(Locale.ROOT);
        if ("RECOMMENDED".equals(upperCaseSort) || "EASY".equals(upperCaseSort) || "FAST".equals(upperCaseSort)) {
            return upperCaseSort;
        }

        throw new IllegalArgumentException("sort는 RECOMMENDED, EASY, FAST 중 하나여야 합니다.");
    }

    private int resolveLimit(Integer limit) {
        if (limit == null || limit.intValue() <= 0) {
            return DEFAULT_LIMIT;
        }
        return Math.min(limit.intValue(), MAX_LIMIT);
    }

    private int resolvePage(Integer page) {
        if (page == null || page.intValue() <= 0) {
            return 1;
        }
        return page.intValue();
    }

    private int resolveSyncTargetCount(Integer limit) {
        if (limit == null || limit.intValue() <= 0) {
            return Integer.MAX_VALUE;
        }
        return limit.intValue();
    }

    private int parsePositiveInteger(String value, int defaultValue) {
        String normalizedValue = trimToNull(value);
        if (normalizedValue == null) {
            return defaultValue;
        }

        try {
            int parsedValue = Integer.parseInt(normalizedValue);
            if (parsedValue < 0) {
                return defaultValue;
            }
            return parsedValue;
        } catch (NumberFormatException exception) {
            return defaultValue;
        }
    }

    private String normalizeIngredientLine(String line) {
        String normalizedLine = trimToNull(line);
        if (normalizedLine == null) {
            return null;
        }

        normalizedLine = normalizedLine.replace("●", "").trim();

        int colonIndex = normalizedLine.indexOf(":");
        if (colonIndex < 0) {
            colonIndex = normalizedLine.indexOf("：");
        }
        if (colonIndex >= 0 && colonIndex < normalizedLine.length() - 1) {
            normalizedLine = normalizedLine.substring(colonIndex + 1).trim();
        }

        return trimToNull(normalizedLine);
    }

    private int findFirstDigitIndex(String value) {
        for (int index = 0; index < value.length(); index++) {
            if (Character.isDigit(value.charAt(index))) {
                return index;
            }
        }
        return -1;
    }

    private BigDecimal toBigDecimal(JsonNode valueNode) {
        if (valueNode == null || valueNode.isMissingNode() || valueNode.isNull()) {
            return null;
        }

        String value = trimToNull(valueNode.asText());
        if (value == null) {
            return null;
        }

        return new BigDecimal(value.replace(",", ""));
    }

    private String truncate(String value, int maxLength) {
        if (value == null) {
            return null;
        }
        if (value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, maxLength);
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }

        String trimmedValue = value.trim();
        if (trimmedValue.isEmpty()) {
            return null;
        }

        return trimmedValue;
    }

    private RestTemplate createRestTemplate() {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(5000);
        requestFactory.setReadTimeout(10000);
        return new RestTemplate(requestFactory);
    }

    private static final class RecipeApiResponse {

        private final int totalCount;
        private final List<JsonNode> recipeNodeList;

        private RecipeApiResponse(int totalCount, List<JsonNode> recipeNodeList) {
            this.totalCount = totalCount;
            this.recipeNodeList = recipeNodeList;
        }

        private int getTotalCount() {
            return totalCount;
        }

        private List<JsonNode> getRecipeNodeList() {
            return recipeNodeList;
        }
    }
}
