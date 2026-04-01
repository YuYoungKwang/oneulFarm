package com.app.service;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.app.dao.ProductDao;
import com.app.dto.MealPlanChatRequestDto;
import com.app.dto.MealPlanChatResponseDto;
import com.app.dto.MealPlanChatResponseDto.CartCandidateDto;
import com.app.dto.MealPlanChatResponseDto.CartPreviewDto;
import com.app.dto.MealPlanChatResponseDto.SellableIngredientDto;
import com.app.dto.MealPlanChatResponseDto.UnsellableIngredientDto;
import com.app.dto.MealPlanPlanDto;
import com.app.dto.MealPlanPlanDto.DayDto;
import com.app.dto.MealPlanPlanDto.IngredientDto;
import com.app.dto.MealPlanPlanDto.MealDto;
import com.app.dto.ProductDto;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class MealPlanChatServiceImpl implements MealPlanChatService {

    private static final Logger logger = LoggerFactory.getLogger(MealPlanChatServiceImpl.class);

    private static final String DEFAULT_MODEL = "gpt-4o-mini";
    private static final int DEFAULT_MAX_OUTPUT_TOKENS = 1400;
    private static final String DEFAULT_SUMMARY = "\uc2dd\ub2e8\uacfc \uc7a5\ubcf4\uae30 \uc7ac\ub8cc\ub97c \uc815\ub9ac\ud588\uc5b4\uc694.";

    private static final String BREAKFAST = "\uc544\uce68";
    private static final String LUNCH = "\uc810\uc2ec";
    private static final String DINNER = "\uc800\ub141";

    private static final Pattern JSON_BLOCK_PATTERN =
        Pattern.compile("```(?:json)?\\s*(\\{.*\\})\\s*```", Pattern.DOTALL);
    private static final Pattern JSON_OBJECT_PATTERN =
        Pattern.compile("(\\{.*\\})", Pattern.DOTALL);
    private static final Pattern NUMBER_PATTERN =
        Pattern.compile("([0-9]+(?:\\.[0-9]+)?)");
    private static final Pattern DAY_PATTERN =
        Pattern.compile("([0-9]{1,2})\\s*(?:\uc77c|\uc77c\uce58|\uc77c\uac04)");
    private static final Pattern PACKAGE_PATTERN =
        Pattern.compile("([0-9]+(?:\\.[0-9]+)?)\\s*(kg|g|ml|l|ea|\uac1c|\uad6c|\uc54c|\ubd09|\ud329|\ubcd1|\ud1b5|\ud3ec\uae30|\ub2e8|\ub9dd|\ubb36\uc74c)",
            Pattern.CASE_INSENSITIVE);

    private static final Set<String> COUNT_UNIT_SET =
        Set.of("ea", "each", "\uac1c", "\uad6c", "\uc54c", "\ubd09", "\ud329", "\ubcd1", "\ud1b5", "\ud3ec\uae30", "\ub2e8", "\ub9dd", "\ubb36\uc74c");
    private static final Set<String> GOUT_AVOID_INGREDIENTS =
        Set.of(
            "\ube0c\ub85c\ucf5c\ub9ac",
            "\uc2dc\uae08\uce58",
            "\ubc84\uc12f",
            "\ud45c\uace0\ubc84\uc12f",
            "\uc0c8\uc1a1\uc774\ubc84\uc12f",
            "\ud33d\uc774\ubc84\uc12f",
            "\ucf5c\ub9ac\ud50c\ub77c\uc6cc",
            "\uc544\uc2a4\ud30c\ub77c\uac70\uc2a4",
            "\uba78\uce58",
            "\uc815\uc5b4\ub9ac",
            "\uace0\ub4f1\uc5b4",
            "\ud64d\ud569",
            "\uc870\uac1c",
            "\uc0c8\uc6b0",
            "\uc624\uc9d5\uc5b4",
            "\uac04",
            "\ub0b4\uc7a5",
            "\uacf1\ucc3d",
            "\uc721\uc218",
            "\ub9e5\uc8fc");
    private static final Map<String, List<String>> INGREDIENT_ALIAS_MAP = createIngredientAliasMap();

    @Autowired
    private ProductDao productDao;

    @Value("${openai.api.baseUrl:https://api.openai.com/v1/responses}")
    private String openAiResponsesUrl;

    @Value("${openai.api.key:}")
    private String openAiApiKey;

    @Value("${openai.model:" + DEFAULT_MODEL + "}")
    private String openAiModel;

    @Value("${openai.maxOutputTokens:" + DEFAULT_MAX_OUTPUT_TOKENS + "}")
    private int maxOutputTokens;

    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate;

    public MealPlanChatServiceImpl() {
        this.objectMapper = new ObjectMapper();
        this.restTemplate = createRestTemplate();
    }

    @Override
    public MealPlanChatResponseDto chat(MealPlanChatRequestDto requestDto) {
        String userMessage = trimToNull(requestDto == null ? null : requestDto.getMessage());
        if (userMessage == null) {
            throw new IllegalArgumentException("message is required.");
        }

        String previousResponseId = trimToNull(requestDto == null ? null : requestDto.getPreviousResponseId());
        if (isBlank(openAiApiKey)) {
            logger.info("OpenAI API key is missing. Returning local meal-plan response.");
            return buildFallbackResponse(userMessage);
        }

        try {
            MealPlanChatResponseDto responseDto = requestOpenAiChat(userMessage, previousResponseId);
            return enforceReplySafety(userMessage, responseDto);
        } catch (Exception exception) {
            logger.warn("Failed to call OpenAI meal-plan chat. Falling back to local template.", exception);
            return buildFallbackResponse(userMessage);
        }
    }

    private MealPlanChatResponseDto requestOpenAiChat(String userMessage, String previousResponseId) {
        try {
            Map<String, Object> requestBodyMap = new LinkedHashMap<String, Object>();
            requestBodyMap.put("model", trimToNull(openAiModel) == null ? DEFAULT_MODEL : openAiModel.trim());
            requestBodyMap.put("instructions", buildInstructions(userMessage));
            requestBodyMap.put("input", buildInputList(userMessage));
            requestBodyMap.put("text", buildTextFormatConfig());
            requestBodyMap.put("max_output_tokens", Integer.valueOf(resolveMaxOutputTokens()));

            if (!isBlank(previousResponseId)) {
                requestBodyMap.put("previous_response_id", previousResponseId);
            }

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(openAiApiKey.trim());

            String requestBody = objectMapper.writeValueAsString(requestBodyMap);
            HttpEntity<String> requestEntity = new HttpEntity<String>(requestBody, headers);
            ResponseEntity<String> responseEntity =
                restTemplate.exchange(openAiResponsesUrl, HttpMethod.POST, requestEntity, String.class);
            return parseOpenAiResponse(responseEntity.getBody());
        } catch (IOException exception) {
            throw new IllegalStateException("Failed to serialize OpenAI request.", exception);
        } catch (Exception exception) {
            throw new IllegalStateException("Failed to call OpenAI Responses API.", exception);
        }
    }

    private String buildInstructions(String userMessage) {
        int requestedDays = extractRequestedDays(userMessage);
        StringBuilder builder = new StringBuilder();
        builder.append("You are oneulFarm's Korean grocery meal-planning assistant. ");
        builder.append("Always answer in Korean. ");
        builder.append("This service is for grocery planning. Do not include shopping tips, store advice, or generic grocery tips. ");
        builder.append("Return JSON only. Do not use markdown. ");
        builder.append("The user wants a meal plan first, then total ingredients for one serving across the full plan, ");
        builder.append("then a clear separation between ingredients that can be matched to store products and those that cannot. ");
        builder.append("Treat 달걀, 계란, and 계란(특란) as the same grocery ingredient for meal planning and product matching. ");
        builder.append("If the user asks to remove a specific weekday or meal, revise the plan and note the removal in removalNotes. ");
        builder.append("If the user asks for a weekly plan, provide the full requested number of days, not just one day. ");
        builder.append("Default to breakfast, lunch, and dinner for each day unless the user explicitly asks for a different structure. ");
        builder.append("Use numeric amountValue whenever possible and also fill amountText. ");
        builder.append("Allowed units are g, kg, ml, L, \uac1c, \uad6c, \uc54c, \ubd09, \ud329, \ubcd1, \ud1b5, \ud3ec\uae30, \ub2e8, \ub9dd, \ubb36\uc74c. ");
        builder.append("Exclude water, salt, pepper, oil, and simple seasoning from ingredient totals unless the user explicitly asks for them. ");
        builder.append("When gout is mentioned, follow a conservative low-purine plan and avoid shellfish, organ meats, anchovy, sardine, mackerel, beer, broth concentrates, mushrooms, spinach, asparagus, cauliflower, and broccoli. ");
        builder.append("Use this JSON shape exactly: ");
        builder.append("{");
        builder.append("\"summary\":\"...\",");
        builder.append("\"servings\":1,");
        builder.append("\"days\":").append(requestedDays).append(",");
        builder.append("\"removalNotes\":[\"...\"],");
        builder.append("\"daysList\":[");
        builder.append("{\"dayLabel\":\"\uc6d4\uc694\uc77c\",\"meals\":[");
        builder.append("{\"mealType\":\"\uc544\uce68\",\"menuName\":\"...\",\"description\":\"...\",\"ingredients\":[");
        builder.append("{\"ingredientName\":\"...\",\"amountValue\":120,\"unit\":\"g\",\"amountText\":\"120g\",\"note\":\"\"}");
        builder.append("]}");
        builder.append("]}");
        builder.append("],");
        builder.append("\"aggregatedIngredients\":[");
        builder.append("{\"ingredientName\":\"...\",\"amountValue\":250,\"unit\":\"g\",\"amountText\":\"250g\",\"note\":\"\"}");
        builder.append("]");
        builder.append("}");
        return builder.toString();
    }

    private List<Map<String, Object>> buildInputList(String userMessage) {
        List<Map<String, Object>> inputList = new ArrayList<Map<String, Object>>();
        inputList.add(Map.of(
            "role", "user",
            "content", List.of(Map.of("type", "input_text", "text", userMessage))
        ));
        return inputList;
    }

    private Map<String, Object> buildTextFormatConfig() {
        Map<String, Object> textConfig = new LinkedHashMap<String, Object>();
        Map<String, Object> formatConfig = new LinkedHashMap<String, Object>();
        formatConfig.put("type", "json_schema");
        formatConfig.put("name", "meal_plan_response");
        formatConfig.put("strict", Boolean.TRUE);
        formatConfig.put("schema", buildMealPlanSchema());
        textConfig.put("format", formatConfig);
        return textConfig;
    }

    private Map<String, Object> buildMealPlanSchema() {
        Map<String, Object> schema = objectSchema();
        schema.put("properties", Map.of(
            "summary", stringSchema(1),
            "servings", integerSchema(1, 8),
            "days", integerSchema(1, 14),
            "removalNotes", stringArraySchema(),
            "daysList", dayListSchema(),
            "aggregatedIngredients", ingredientArraySchema()
        ));
        schema.put(
            "required",
            List.of("summary", "servings", "days", "removalNotes", "daysList", "aggregatedIngredients")
        );
        return schema;
    }

    private Map<String, Object> dayListSchema() {
        Map<String, Object> daySchema = objectSchema();
        daySchema.put("properties", Map.of(
            "dayLabel", stringSchema(1),
            "meals", mealArraySchema()
        ));
        daySchema.put("required", List.of("dayLabel", "meals"));

        Map<String, Object> arraySchema = arraySchema();
        arraySchema.put("items", daySchema);
        return arraySchema;
    }

    private Map<String, Object> mealArraySchema() {
        Map<String, Object> mealSchema = objectSchema();
        mealSchema.put("properties", Map.of(
            "mealType", stringSchema(1),
            "menuName", stringSchema(1),
            "description", stringSchema(0),
            "ingredients", ingredientArraySchema()
        ));
        mealSchema.put("required", List.of("mealType", "menuName", "description", "ingredients"));

        Map<String, Object> arraySchema = arraySchema();
        arraySchema.put("items", mealSchema);
        return arraySchema;
    }

    private Map<String, Object> ingredientArraySchema() {
        Map<String, Object> ingredientSchema = objectSchema();
        ingredientSchema.put("properties", Map.of(
            "ingredientName", stringSchema(1),
            "amountValue", numberSchema(0),
            "unit", stringSchema(1),
            "amountText", stringSchema(1),
            "note", stringSchema(0)
        ));
        ingredientSchema.put(
            "required",
            List.of("ingredientName", "amountValue", "unit", "amountText", "note")
        );

        Map<String, Object> arraySchema = arraySchema();
        arraySchema.put("items", ingredientSchema);
        return arraySchema;
    }

    private Map<String, Object> objectSchema() {
        Map<String, Object> schema = new LinkedHashMap<String, Object>();
        schema.put("type", "object");
        schema.put("additionalProperties", Boolean.FALSE);
        return schema;
    }

    private Map<String, Object> arraySchema() {
        Map<String, Object> schema = new LinkedHashMap<String, Object>();
        schema.put("type", "array");
        return schema;
    }

    private Map<String, Object> stringArraySchema() {
        Map<String, Object> schema = arraySchema();
        schema.put("items", stringSchema(0));
        return schema;
    }

    private Map<String, Object> stringSchema(int minLength) {
        Map<String, Object> schema = new LinkedHashMap<String, Object>();
        schema.put("type", "string");
        if (minLength > 0) {
            schema.put("minLength", Integer.valueOf(minLength));
        }
        return schema;
    }

    private Map<String, Object> integerSchema(int minimum, int maximum) {
        Map<String, Object> schema = new LinkedHashMap<String, Object>();
        schema.put("type", "integer");
        schema.put("minimum", Integer.valueOf(minimum));
        schema.put("maximum", Integer.valueOf(maximum));
        return schema;
    }

    private Map<String, Object> numberSchema(int minimum) {
        Map<String, Object> schema = new LinkedHashMap<String, Object>();
        schema.put("type", "number");
        schema.put("minimum", Integer.valueOf(minimum));
        return schema;
    }

    private MealPlanChatResponseDto parseOpenAiResponse(String responseBody) throws IOException {
        JsonNode rootNode = objectMapper.readTree(responseBody);
        String rawReply = extractReplyFromResponse(rootNode);
        if (rawReply == null) {
            throw new IllegalStateException("OpenAI response does not contain output text.");
        }

        JsonNode structuredNode = parseStructuredReply(rawReply);
        MealPlanChatResponseDto responseDto = buildStructuredResponse(structuredNode);
        responseDto.setResponseId(trimToNull(rootNode.path("id").asText(null)));
        responseDto.setModel(trimToNull(rootNode.path("model").asText(null)));
        responseDto.setFallbackMode(false);
        enrichWithCatalogData(responseDto);
        responseDto.setReply(buildReplyMessage(responseDto));
        return responseDto;
    }

    private String extractReplyFromResponse(JsonNode rootNode) {
        String outputText = trimToNull(rootNode.path("output_text").asText(null));
        if (outputText != null) {
            return outputText;
        }

        JsonNode outputNode = rootNode.path("output");
        if (!outputNode.isArray()) {
            return null;
        }

        StringBuilder builder = new StringBuilder();
        for (JsonNode itemNode : outputNode) {
            JsonNode contentNode = itemNode.path("content");
            if (!contentNode.isArray()) {
                continue;
            }
            for (JsonNode contentItemNode : contentNode) {
                String textValue = trimToNull(contentItemNode.path("text").asText(null));
                if (textValue != null) {
                    if (builder.length() > 0) {
                        builder.append('\n');
                    }
                    builder.append(textValue);
                }
            }
        }
        return trimToNull(builder.toString());
    }

    private JsonNode parseStructuredReply(String rawReply) throws IOException {
        String candidate = trimToNull(rawReply);
        if (candidate == null) {
            throw new IllegalStateException("Meal-plan reply is empty.");
        }

        Matcher codeBlockMatcher = JSON_BLOCK_PATTERN.matcher(candidate);
        if (codeBlockMatcher.find()) {
            candidate = trimToNull(codeBlockMatcher.group(1));
        } else {
            Matcher objectMatcher = JSON_OBJECT_PATTERN.matcher(candidate);
            if (objectMatcher.find()) {
                candidate = trimToNull(objectMatcher.group(1));
            }
        }

        if (candidate == null) {
            throw new IllegalStateException("Meal-plan reply does not contain JSON.");
        }

        JsonNode structuredNode = objectMapper.readTree(candidate);
        if (!structuredNode.isObject()) {
            throw new IllegalStateException("Meal-plan JSON root must be an object.");
        }
        return structuredNode;
    }

    private MealPlanChatResponseDto buildStructuredResponse(JsonNode rootNode) {
        MealPlanChatResponseDto responseDto = new MealPlanChatResponseDto();
        MealPlanPlanDto planDto = new MealPlanPlanDto();
        planDto.setGoalSummary(firstText(rootNode, "summary", DEFAULT_SUMMARY));
        planDto.setServings(readInteger(rootNode.path("servings"), Integer.valueOf(1)));
        planDto.setDays(readInteger(rootNode.path("days"), null));
        planDto.setRemovalNotes(readStringList(rootNode.path("removalNotes")));
        planDto.setDaysList(parseDayList(rootNode.path("daysList")));

        List<IngredientDto> aggregatedIngredientList = aggregateIngredients(planDto.getDaysList());
        if (aggregatedIngredientList.isEmpty()) {
            aggregatedIngredientList = parseIngredientList(rootNode.path("aggregatedIngredients"));
        }

        responseDto.setPlan(planDto);
        responseDto.setAggregatedIngredients(aggregatedIngredientList);
        responseDto.setSellableIngredients(new ArrayList<SellableIngredientDto>());
        responseDto.setUnsellableIngredients(new ArrayList<UnsellableIngredientDto>());
        return responseDto;
    }

    private List<DayDto> parseDayList(JsonNode dayListNode) {
        if (!dayListNode.isArray()) {
            return new ArrayList<DayDto>();
        }

        List<DayDto> dayList = new ArrayList<DayDto>();
        for (JsonNode dayNode : dayListNode) {
            if (!dayNode.isObject()) {
                continue;
            }
            DayDto dayDto = new DayDto();
            dayDto.setDayLabel(firstText(dayNode, "dayLabel", "\uc2dd\ub2e8"));
            dayDto.setMeals(parseMealList(dayNode.path("meals")));
            dayList.add(dayDto);
        }
        return dayList;
    }

    private List<MealDto> parseMealList(JsonNode mealListNode) {
        if (!mealListNode.isArray()) {
            return new ArrayList<MealDto>();
        }

        List<MealDto> mealList = new ArrayList<MealDto>();
        for (JsonNode mealNode : mealListNode) {
            if (!mealNode.isObject()) {
                continue;
            }
            MealDto mealDto = new MealDto();
            mealDto.setMealType(firstText(mealNode, "mealType", ""));
            mealDto.setMenuName(firstText(mealNode, "menuName", ""));
            mealDto.setDescription(firstText(mealNode, "description", ""));
            mealDto.setIngredients(parseIngredientList(mealNode.path("ingredients")));
            mealList.add(mealDto);
        }
        return mealList;
    }

    private List<IngredientDto> parseIngredientList(JsonNode ingredientListNode) {
        if (!ingredientListNode.isArray()) {
            return new ArrayList<IngredientDto>();
        }

        List<IngredientDto> ingredientList = new ArrayList<IngredientDto>();
        for (JsonNode ingredientNode : ingredientListNode) {
            if (!ingredientNode.isObject()) {
                continue;
            }
            String ingredientName = trimToNull(firstText(ingredientNode, "ingredientName", null));
            if (ingredientName == null) {
                continue;
            }

            IngredientDto ingredientDto = new IngredientDto();
            ingredientDto.setIngredientName(ingredientName);
            ingredientDto.setUnit(trimToNull(firstText(ingredientNode, "unit", null)));
            ingredientDto.setAmountValue(readDecimal(ingredientNode.path("amountValue")));
            ingredientDto.setAmountText(firstText(ingredientNode, "amountText", null));
            ingredientDto.setNote(firstText(ingredientNode, "note", null));

            if (ingredientDto.getAmountValue() == null) {
                ingredientDto.setAmountValue(parseDecimal(ingredientDto.getAmountText()));
            }
            if (ingredientDto.getAmountText() == null && ingredientDto.getAmountValue() != null) {
                ingredientDto.setAmountText(formatAmount(ingredientDto.getAmountValue(), ingredientDto.getUnit()));
            }

            ingredientList.add(ingredientDto);
        }
        return ingredientList;
    }

    private List<IngredientDto> aggregateIngredients(List<DayDto> dayList) {
        if (dayList == null || dayList.isEmpty()) {
            return new ArrayList<IngredientDto>();
        }

        Map<String, AggregatedIngredientBucket> bucketMap = new LinkedHashMap<String, AggregatedIngredientBucket>();
        for (DayDto dayDto : dayList) {
            if (dayDto == null || dayDto.getMeals() == null) {
                continue;
            }
            for (MealDto mealDto : dayDto.getMeals()) {
                if (mealDto == null || mealDto.getIngredients() == null) {
                    continue;
                }
                for (IngredientDto ingredientDto : mealDto.getIngredients()) {
                    if (ingredientDto == null || trimToNull(ingredientDto.getIngredientName()) == null) {
                        continue;
                    }
                    ComparableAmount comparableAmount = toComparableAmount(
                        ingredientDto.getAmountValue(),
                        ingredientDto.getUnit()
                    );
                    String normalizedName = normalizeIngredientName(ingredientDto.getIngredientName());
                    if (normalizedName == null) {
                        continue;
                    }
                    String key = normalizedName + "|" + comparableAmount.kind + "|" + comparableAmount.baseUnit;
                    AggregatedIngredientBucket bucket = bucketMap.get(key);
                    if (bucket == null) {
                        bucket = new AggregatedIngredientBucket();
                        bucket.displayName = ingredientDto.getIngredientName();
                        bucket.kind = comparableAmount.kind;
                        bucket.baseUnit = comparableAmount.baseUnit;
                        bucket.displayUnit = comparableAmount.displayUnit;
                        bucket.total = BigDecimal.ZERO;
                        bucketMap.put(key, bucket);
                    }
                    if (comparableAmount.value != null) {
                        bucket.total = bucket.total.add(comparableAmount.value);
                    }
                }
            }
        }

        List<IngredientDto> aggregatedList = new ArrayList<IngredientDto>();
        for (AggregatedIngredientBucket bucket : bucketMap.values()) {
            IngredientDto ingredientDto = new IngredientDto();
            ingredientDto.setIngredientName(bucket.displayName);
            ingredientDto.setAmountValue(bucket.total);
            ingredientDto.setUnit(bucket.displayUnit);
            ingredientDto.setAmountText(formatAmount(bucket.total, bucket.displayUnit));
            aggregatedList.add(ingredientDto);
        }
        return aggregatedList;
    }

    private void enrichWithCatalogData(MealPlanChatResponseDto responseDto) {
        List<IngredientDto> aggregatedIngredientList = responseDto.getAggregatedIngredients();
        if (aggregatedIngredientList == null || aggregatedIngredientList.isEmpty()) {
            responseDto.setSellableIngredients(Collections.emptyList());
            responseDto.setUnsellableIngredients(Collections.emptyList());
            responseDto.setCartPreview(null);
            responseDto.setCartPromptMessage("");
            return;
        }

        List<ProductDto> productList = productDao.findSellingProducts();
        List<SellableIngredientDto> sellableIngredientList = new ArrayList<SellableIngredientDto>();
        List<UnsellableIngredientDto> unsellableIngredientList = new ArrayList<UnsellableIngredientDto>();
        Set<Long> previewedProductNos = new LinkedHashSet<Long>();
        BigDecimal totalPrice = BigDecimal.ZERO;
        int totalQuantity = 0;

        for (IngredientDto ingredientDto : aggregatedIngredientList) {
            ProductMatch productMatch = findBestProductMatch(ingredientDto, productList);
            if (productMatch == null) {
                UnsellableIngredientDto unsellableIngredientDto = new UnsellableIngredientDto();
                unsellableIngredientDto.setIngredientName(ingredientDto.getIngredientName());
                unsellableIngredientDto.setRequiredAmountText(resolveRequiredAmountText(ingredientDto));
                unsellableIngredientDto.setReason("\ud604\uc7ac \ud310\ub9e4 \uc911\uc778 \uc0c1\ud488\uacfc \uc5f0\uacb0\ub418\uc9c0 \uc54a\uc558\uc5b4\uc694.");
                unsellableIngredientList.add(unsellableIngredientDto);
                continue;
            }

            CartCandidateDto cartCandidateDto = buildCartCandidate(productMatch.productDto, ingredientDto);
            SellableIngredientDto sellableIngredientDto = new SellableIngredientDto();
            sellableIngredientDto.setIngredientName(ingredientDto.getIngredientName());
            sellableIngredientDto.setRequiredAmountText(resolveRequiredAmountText(ingredientDto));
            sellableIngredientDto.setCartCandidate(cartCandidateDto);
            sellableIngredientDto.setMatchSummary(
                cartCandidateDto.getProductName()
                    + " \uc0c1\ud488 "
                    + cartCandidateDto.getRecommendedQuantity()
                    + "\uac1c\uba74 \ubd80\uc871\ud558\uc9c0 \uc54a\uac8c \ub2f4\uc744 \uc218 \uc788\uc5b4\uc694."
            );
            sellableIngredientList.add(sellableIngredientDto);

            previewedProductNos.add(cartCandidateDto.getProductNo());
            totalQuantity += safeInteger(cartCandidateDto.getRecommendedQuantity());
            if (cartCandidateDto.getSalePrice() != null) {
                totalPrice = totalPrice.add(
                    cartCandidateDto.getSalePrice().multiply(BigDecimal.valueOf(safeInteger(cartCandidateDto.getRecommendedQuantity())))
                );
            }
        }

        responseDto.setSellableIngredients(sellableIngredientList);
        responseDto.setUnsellableIngredients(unsellableIngredientList);

        if (sellableIngredientList.isEmpty()) {
            responseDto.setCartPreview(null);
            responseDto.setCartPromptMessage("");
            return;
        }

        CartPreviewDto cartPreviewDto = new CartPreviewDto();
        cartPreviewDto.setTotalProductKinds(Integer.valueOf(previewedProductNos.size()));
        cartPreviewDto.setTotalQuantity(Integer.valueOf(totalQuantity));
        cartPreviewDto.setEstimatedTotalPrice(totalPrice);
        responseDto.setCartPreview(cartPreviewDto);
        responseDto.setCartPromptMessage("\ud310\ub9e4 \uc911\uc778 \uc7ac\ub8cc\ub97c \uc7a5\ubc14\uad6c\ub2c8\uc5d0 \ub2f4\uc744\uae4c\uc694?");
    }

    private ProductMatch findBestProductMatch(IngredientDto ingredientDto, List<ProductDto> productList) {
        if (ingredientDto == null || productList == null || productList.isEmpty()) {
            return null;
        }

        Set<String> ingredientSearchTerms = buildIngredientSearchTerms(ingredientDto.getIngredientName());
        ProductMatch bestMatch = null;
        for (ProductDto productDto : productList) {
            int score = scoreProductMatch(productDto, ingredientSearchTerms);
            if (score < 60) {
                continue;
            }
            if (bestMatch == null || score > bestMatch.score) {
                bestMatch = new ProductMatch(productDto, score);
            }
        }
        return bestMatch;
    }

    private Set<String> buildIngredientSearchTerms(String ingredientName) {
        String normalizedIngredientName = normalizeIngredientName(ingredientName);
        if (normalizedIngredientName == null) {
            return Collections.emptySet();
        }

        LinkedHashSet<String> searchTerms = new LinkedHashSet<String>();
        searchTerms.add(normalizedIngredientName);

        List<String> aliasList = INGREDIENT_ALIAS_MAP.get(normalizedIngredientName);
        if (aliasList != null) {
            for (String alias : aliasList) {
                String normalizedAlias = normalizeIngredientName(alias);
                if (normalizedAlias != null) {
                    searchTerms.add(normalizedAlias);
                }
            }
        }
        return searchTerms;
    }

    private int scoreProductMatch(ProductDto productDto, Set<String> ingredientSearchTerms) {
        if (productDto == null || ingredientSearchTerms.isEmpty()) {
            return 0;
        }

        Set<String> productSearchTerms = new LinkedHashSet<String>();
        addSearchTerm(productSearchTerms, productDto.getProductName());
        addSearchTerm(productSearchTerms, stripQuantitySuffix(productDto.getProductName()));
        addSearchTerm(productSearchTerms, productDto.getItemName());

        int bestScore = 0;
        for (String ingredientSearchTerm : ingredientSearchTerms) {
            for (String productSearchTerm : productSearchTerms) {
                if (ingredientSearchTerm.equals(productSearchTerm)) {
                    bestScore = Math.max(bestScore, 120);
                } else if (ingredientSearchTerm.length() >= 2 && productSearchTerm.contains(ingredientSearchTerm)) {
                    bestScore = Math.max(bestScore, 100);
                } else if (productSearchTerm.length() >= 2 && ingredientSearchTerm.contains(productSearchTerm)) {
                    bestScore = Math.max(bestScore, 90);
                } else if (isLooseVariantMatch(ingredientSearchTerm, productSearchTerm)) {
                    bestScore = Math.max(bestScore, 75);
                }
            }
        }
        return bestScore;
    }

    private boolean isLooseVariantMatch(String ingredientSearchTerm, String productSearchTerm) {
        if (ingredientSearchTerm == null || productSearchTerm == null) {
            return false;
        }

        if (ingredientSearchTerm.startsWith("\ud638\ubc15") && productSearchTerm.contains("\uc560\ud638\ubc15")) {
            return true;
        }
        if (ingredientSearchTerm.equals("\uc560\ud638\ubc15") && productSearchTerm.contains("\ud638\ubc15")) {
            return true;
        }
        if (ingredientSearchTerm.equals("\uc96c\ud0a4\ub2c8") && productSearchTerm.contains("\ud638\ubc15")) {
            return true;
        }
        if (ingredientSearchTerm.equals("\ud48b\uace0\ucd94") && productSearchTerm.contains("\uace0\ucd94")) {
            return true;
        }
        return false;
    }

    private CartCandidateDto buildCartCandidate(ProductDto productDto, IngredientDto ingredientDto) {
        CartCandidateDto cartCandidateDto = new CartCandidateDto();
        cartCandidateDto.setProductNo(productDto.getProductNo());
        cartCandidateDto.setProductName(productDto.getProductName());
        cartCandidateDto.setSalePrice(productDto.getSalePrice());
        cartCandidateDto.setUnit(productDto.getUnit());
        cartCandidateDto.setPackageWeight(productDto.getPackageWeight());
        cartCandidateDto.setRequiredAmountValue(ingredientDto.getAmountValue());
        cartCandidateDto.setRequiredUnit(ingredientDto.getUnit());
        cartCandidateDto.setRequiredAmountText(resolveRequiredAmountText(ingredientDto));

        ComparableAmount requiredAmount = toComparableAmount(ingredientDto.getAmountValue(), ingredientDto.getUnit());
        ComparableAmount productAmount = resolveProductComparableAmount(productDto);

        int recommendedQuantity = 1;
        if (requiredAmount.isComparableTo(productAmount) && productAmount.value.compareTo(BigDecimal.ZERO) > 0) {
            recommendedQuantity = requiredAmount.value
                .divide(productAmount.value, 0, RoundingMode.CEILING)
                .max(BigDecimal.ONE)
                .intValue();
        }

        cartCandidateDto.setRecommendedQuantity(Integer.valueOf(recommendedQuantity));
        cartCandidateDto.setDisplayPackageText(resolveProductPackageText(productDto));
        cartCandidateDto.setCoveredAmountText(resolveCoveredAmountText(productDto, productAmount, recommendedQuantity));
        return cartCandidateDto;
    }

    private ComparableAmount resolveProductComparableAmount(ProductDto productDto) {
        BigDecimal packageWeight = productDto.getPackageWeight();
        String unit = trimToNull(productDto.getUnit());

        if (packageWeight != null && packageWeight.compareTo(BigDecimal.ZERO) > 0 && unit != null) {
            return toComparableAmount(packageWeight, unit);
        }

        if (unit != null && COUNT_UNIT_SET.contains(normalizeUnit(unit))) {
            return toComparableAmount(BigDecimal.ONE, unit);
        }

        Matcher matcher = PACKAGE_PATTERN.matcher(defaultString(productDto.getProductName()));
        if (matcher.find()) {
            BigDecimal parsedWeight = parseDecimal(matcher.group(1));
            String parsedUnit = matcher.group(2);
            return toComparableAmount(parsedWeight, parsedUnit);
        }

        return ComparableAmount.unknown();
    }

    private String resolveCoveredAmountText(ProductDto productDto, ComparableAmount productAmount, int quantity) {
        if (productAmount.value == null || productAmount.kind == ComparableKind.UNKNOWN) {
            return resolveProductPackageText(productDto) + " x " + quantity + "\uac1c";
        }

        BigDecimal coveredValue = productAmount.value.multiply(BigDecimal.valueOf(quantity));
        return formatAmount(coveredValue, productAmount.displayUnit);
    }

    private String resolveProductPackageText(ProductDto productDto) {
        if (productDto.getPackageWeight() != null
            && productDto.getPackageWeight().compareTo(BigDecimal.ZERO) > 0
            && trimToNull(productDto.getUnit()) != null) {
            return formatAmount(productDto.getPackageWeight(), productDto.getUnit());
        }

        if (trimToNull(productDto.getUnit()) != null && COUNT_UNIT_SET.contains(normalizeUnit(productDto.getUnit()))) {
            return "1" + productDto.getUnit();
        }

        return defaultString(productDto.getProductName());
    }

    private String resolveRequiredAmountText(IngredientDto ingredientDto) {
        if (trimToNull(ingredientDto.getAmountText()) != null) {
            return ingredientDto.getAmountText();
        }
        return formatAmount(ingredientDto.getAmountValue(), ingredientDto.getUnit());
    }

    private MealPlanChatResponseDto enforceReplySafety(String userMessage, MealPlanChatResponseDto responseDto) {
        if (responseDto == null || responseDto.getPlan() == null) {
            return buildFallbackResponse(userMessage);
        }

        List<DayDto> dayList = responseDto.getPlan().getDaysList();
        if (dayList == null || dayList.isEmpty()) {
            return buildFallbackResponse(userMessage);
        }

        int requestedDays = extractRequestedDays(userMessage);
        if (!requestsRemoval(userMessage) && dayList.size() < requestedDays) {
            return buildFallbackResponse(userMessage);
        }

        if (mentionsGout(userMessage) && containsGoutRiskIngredient(responseDto.getAggregatedIngredients())) {
            return buildFallbackResponse(userMessage);
        }

        if (isSeverelyRepetitivePlan(dayList, requestedDays)) {
            return buildFallbackResponse(userMessage);
        }

        return responseDto;
    }

    private boolean isSeverelyRepetitivePlan(List<DayDto> dayList, int requestedDays) {
        if (dayList == null || dayList.isEmpty() || requestedDays < 5) {
            return false;
        }

        Set<String> uniqueMenuNameSet = new LinkedHashSet<String>();
        Map<String, Set<String>> mealTypeMenuMap = new LinkedHashMap<String, Set<String>>();

        for (DayDto dayDto : dayList) {
            if (dayDto == null || dayDto.getMeals() == null) {
                continue;
            }
            for (MealDto mealDto : dayDto.getMeals()) {
                if (mealDto == null) {
                    continue;
                }

                String mealType = trimToNull(mealDto.getMealType());
                String menuName = trimToNull(mealDto.getMenuName());
                if (menuName == null) {
                    continue;
                }

                uniqueMenuNameSet.add(menuName);
                if (mealType != null) {
                    mealTypeMenuMap.computeIfAbsent(mealType, key -> new LinkedHashSet<String>()).add(menuName);
                }
            }
        }

        int repeatedMealTypeCount = 0;
        for (String mealType : List.of(BREAKFAST, LUNCH, DINNER)) {
            Set<String> menuSet = mealTypeMenuMap.get(mealType);
            if (menuSet != null && menuSet.size() <= 1) {
                repeatedMealTypeCount++;
            }
        }

        return repeatedMealTypeCount >= 2 || uniqueMenuNameSet.size() <= 4;
    }

    private boolean containsGoutRiskIngredient(List<IngredientDto> ingredientList) {
        if (ingredientList == null || ingredientList.isEmpty()) {
            return false;
        }

        for (IngredientDto ingredientDto : ingredientList) {
            String normalizedName = normalizeIngredientName(ingredientDto.getIngredientName());
            if (normalizedName != null && GOUT_AVOID_INGREDIENTS.contains(normalizedName)) {
                return true;
            }
        }
        return false;
    }

    private MealPlanChatResponseDto buildFallbackResponse(String userMessage) {
        MealPlanChatResponseDto responseDto = new MealPlanChatResponseDto();
        MealPlanPlanDto planDto = buildFallbackPlan(userMessage);
        List<IngredientDto> aggregatedIngredientList = aggregateIngredients(planDto.getDaysList());

        responseDto.setPlan(planDto);
        responseDto.setAggregatedIngredients(aggregatedIngredientList);
        responseDto.setResponseId(null);
        responseDto.setModel("local-fallback");
        responseDto.setFallbackMode(true);
        enrichWithCatalogData(responseDto);
        responseDto.setReply(buildReplyMessage(responseDto));
        return responseDto;
    }

    private MealPlanPlanDto buildFallbackPlan(String userMessage) {
        int requestedDays = extractRequestedDays(userMessage);
        boolean gout = mentionsGout(userMessage);
        boolean diet = mentionsDiet(userMessage);
        Set<String> removedDayLabels = extractRemovedDayLabels(userMessage);
        Set<String> removedMealTypes = extractRemovedMealTypes(userMessage);

        MealPlanPlanDto planDto = new MealPlanPlanDto();
        planDto.setGoalSummary(buildFallbackSummary(gout, diet, requestedDays));
        planDto.setServings(Integer.valueOf(1));
        planDto.setDays(Integer.valueOf(requestedDays));

        List<DayDto> dayList = new ArrayList<DayDto>();
        List<String> removalNotes = new ArrayList<String>();
        for (int index = 0; index < requestedDays; index++) {
            String dayLabel = buildDayLabel(index);
            if (removedDayLabels.contains(dayLabel)) {
                removalNotes.add(dayLabel + " \uc2dd\ub2e8\uc744 \uc81c\uc678\ud588\uc5b4\uc694.");
                continue;
            }

            DayDto dayDto = new DayDto();
            dayDto.setDayLabel(dayLabel);
            dayDto.setMeals(buildFallbackMeals(index, gout, diet, removedMealTypes, removalNotes));
            dayList.add(dayDto);
        }

        planDto.setDaysList(dayList);
        planDto.setRemovalNotes(removalNotes);
        return planDto;
    }

    private List<MealDto> buildFallbackMeals(
        int index,
        boolean gout,
        boolean diet,
        Set<String> removedMealTypes,
        List<String> removalNotes
    ) {
        List<MealDto> mealList = new ArrayList<MealDto>();

        if (!removedMealTypes.contains(BREAKFAST)) {
            mealList.add(buildFallbackBreakfast(index, gout, diet));
        } else {
            removalNotes.add("\uc544\uce68 \uc2dd\ub2e8\uc744 \uc81c\uc678\ud588\uc5b4\uc694.");
        }

        if (!removedMealTypes.contains(LUNCH)) {
            mealList.add(buildFallbackLunch(index, gout, diet));
        } else {
            removalNotes.add("\uc810\uc2ec \uc2dd\ub2e8\uc744 \uc81c\uc678\ud588\uc5b4\uc694.");
        }

        if (!removedMealTypes.contains(DINNER)) {
            mealList.add(buildFallbackDinner(index, gout, diet));
        } else {
            removalNotes.add("\uc800\ub141 \uc2dd\ub2e8\uc744 \uc81c\uc678\ud588\uc5b4\uc694.");
        }

        return mealList;
    }

    private MealDto buildFallbackBreakfast(int index, boolean gout, boolean diet) {
        int variant = Math.floorMod(index, 7);
        boolean lightMode = gout || diet;

        if (lightMode) {
            switch (variant) {
                case 0:
                    return createMeal(
                        BREAKFAST,
                        "\uc624\ud2b8\ubc00 \uc694\uac70\ud2b8 \ubcfc",
                        "\uac00\ubccd\uac8c \uc2dc\uc791\ud558\ub294 \uc544\uce68 \uc2dd\uc0ac\uc608\uc694.",
                        List.of(
                            createIngredient("\uc624\ud2b8\ubc00", "80", "g"),
                            createIngredient("\ud50c\ub808\uc778 \uc694\uac70\ud2b8", "180", "g"),
                            createIngredient("\ubc14\ub098\ub098", "1", "\uac1c"))
                    );
                case 1:
                    return createMeal(
                        BREAKFAST,
                        "\uace0\uad6c\ub9c8 \ub2ec\uac40 \ud50c\ub808\uc774\ud2b8",
                        "\ud3ec\ub9cc\uac10 \uc788\uac8c \uc2dc\uc791\ud558\ub294 \uc544\uce68 \uc2dd\uc0ac\uc608\uc694.",
                        List.of(
                            createIngredient("\uace0\uad6c\ub9c8", "180", "g"),
                            createIngredient("\ub2ec\uac40", "2", "\uac1c"),
                            createIngredient("\ubc29\uc6b8\ud1a0\ub9c8\ud1a0", "120", "g"))
                    );
                case 2:
                    return createMeal(
                        BREAKFAST,
                        "\ub450\ubd80 \uc0ac\uacfc \uc0d0\ub7ec\ub4dc",
                        "\ub2f4\ubc31\ud558\uac8c \uba39\uae30 \uc88b\uc740 \uc544\uce68 \uc2dd\uc0ac\uc608\uc694.",
                        List.of(
                            createIngredient("\ub450\ubd80", "200", "g"),
                            createIngredient("\uc0ac\uacfc", "1", "\uac1c"),
                            createIngredient("\uc591\uc0c1\ucd94", "80", "g"))
                    );
                case 3:
                    return createMeal(
                        BREAKFAST,
                        "\uac10\uc790 \ub2ec\uac40 \ube0c\ub7f0\uce58",
                        "\ubd80\ub2f4 \uc5c6\uc774 \ub2e8\ubc31\uc9c8\uacfc \ud0c4\uc218\ud654\ubb3c\uc744 \ucc59\uae30\ub294 \uad6c\uc131\uc774\uc5d0\uc694.",
                        List.of(
                            createIngredient("\uac10\uc790", "180", "g"),
                            createIngredient("\ub2ec\uac40", "2", "\uac1c"),
                            createIngredient("\uc624\uc774", "100", "g"))
                    );
                case 4:
                    return createMeal(
                        BREAKFAST,
                        "\uc694\uac70\ud2b8 \ubc30 \ubcfc",
                        "\uacfc\uc77c\uacfc \uc720\uc81c\ud488\uc73c\ub85c \uac00\ubccd\uac8c \uc2dc\uc791\ud574\uc694.",
                        List.of(
                            createIngredient("\ud50c\ub808\uc778 \uc694\uac70\ud2b8", "180", "g"),
                            createIngredient("\ubc30", "1", "\uac1c"),
                            createIngredient("\uc624\ud2b8\ubc00", "50", "g"))
                    );
                case 5:
                    return createMeal(
                        BREAKFAST,
                        "\ud604\ubbf8 \uc8fc\uba39\ubc25 \uc544\uce68",
                        "\ub4e0\ub4e0\ud558\uac8c \ud558\ub8e8\ub97c \uc2dc\uc791\ud558\ub294 \uad6c\uc131\uc774\uc5d0\uc694.",
                        List.of(
                            createIngredient("\ud604\ubbf8\ubc25", "180", "g"),
                            createIngredient("\ub2ec\uac40", "1", "\uac1c"),
                            createIngredient("\ub2f9\uadfc", "70", "g"))
                    );
                default:
                    return createMeal(
                        BREAKFAST,
                        "\uc591\ubc30\ucd94 \ub2ec\uac40 \ubcf6\uc74c",
                        "\ucc44\uc18c \ube44\uc911\uc744 \ub192\uc778 \uac00\ubcbc\uc6b4 \uc544\uce68 \uc2dd\uc0ac\uc608\uc694.",
                        List.of(
                            createIngredient("\uc591\ubc30\ucd94", "150", "g"),
                            createIngredient("\ub2ec\uac40", "2", "\uac1c"),
                            createIngredient("\ubc14\ub098\ub098", "1", "\uac1c"))
                    );
            }
        }

        switch (variant) {
            case 0:
                return createMeal(
                    BREAKFAST,
                    "\uace0\uad6c\ub9c8 \ub2ec\uac40 \uc544\uce68",
                    "\ubd80\ub2f4 \uc5c6\uc774 \uba39\uae30 \uc88b\uc740 \uc544\uce68 \uc2dd\uc0ac\uc608\uc694.",
                    List.of(
                        createIngredient("\uace0\uad6c\ub9c8", "200", "g"),
                        createIngredient("\ub2ec\uac40", "2", "\uac1c"),
                        createIngredient("\uc591\uc0c1\ucd94", "80", "g"))
                );
            case 1:
                return createMeal(
                    BREAKFAST,
                    "\ud1a0\uc2a4\ud2b8 \uc694\uac70\ud2b8 \ud50c\ub808\uc774\ud2b8",
                    "\uacfc\uc77c\uacfc \ud568\uaed8 \uba39\ub294 \uc544\uce68 \uc2dd\uc0ac\uc608\uc694.",
                    List.of(
                        createIngredient("\uc2dd\ube75", "2", "\uc7a5"),
                        createIngredient("\ud50c\ub808\uc778 \uc694\uac70\ud2b8", "180", "g"),
                        createIngredient("\uc0ac\uacfc", "1", "\uac1c"))
                );
            case 2:
                return createMeal(
                    BREAKFAST,
                    "\uac10\uc790 \ub2ec\uac40 \uc0d0\ub7ec\ub4dc",
                    "\ud3ec\ub9cc\uac10 \uc788\uac8c \uc2dc\uc791\ud558\ub294 \uc544\uce68 \uc2dd\uc0ac\uc608\uc694.",
                    List.of(
                        createIngredient("\uac10\uc790", "180", "g"),
                        createIngredient("\ub2ec\uac40", "2", "\uac1c"),
                        createIngredient("\uc624\uc774", "100", "g"))
                );
            case 3:
                return createMeal(
                    BREAKFAST,
                    "\ub450\ubd80 \ud1a0\ub9c8\ud1a0 \ud50c\ub808\uc774\ud2b8",
                    "\ub2f4\ubc31\uc9c8\uacfc \ucc44\uc18c\ub97c \uac19\uc774 \ub2f4\uc740 \uc544\uce68 \uc2dd\uc0ac\uc608\uc694.",
                    List.of(
                        createIngredient("\ub450\ubd80", "220", "g"),
                        createIngredient("\ubc29\uc6b8\ud1a0\ub9c8\ud1a0", "120", "g"),
                        createIngredient("\uc2dd\ube75", "2", "\uc7a5"))
                );
            case 4:
                return createMeal(
                    BREAKFAST,
                    "\ud604\ubbf8\ubc25 \ub2ec\uac40 \uc544\uce68",
                    "\ub4e0\ub4e0\ud558\uac8c \uc2dc\uc791\ud558\ub294 \uad6c\uc131\uc774\uc5d0\uc694.",
                    List.of(
                        createIngredient("\ud604\ubbf8\ubc25", "180", "g"),
                        createIngredient("\ub2ec\uac40", "2", "\uac1c"),
                        createIngredient("\uc591\ubc30\ucd94", "100", "g"))
                );
            case 5:
                return createMeal(
                    BREAKFAST,
                    "\uc694\uac70\ud2b8 \ubc14\ub098\ub098 \ubcfc",
                    "\uc0c1\ud07c\ud558\uac8c \uc2dc\uc791\ud558\ub294 \uc544\uce68 \uc2dd\uc0ac\uc608\uc694.",
                    List.of(
                        createIngredient("\ud50c\ub808\uc778 \uc694\uac70\ud2b8", "180", "g"),
                        createIngredient("\ubc14\ub098\ub098", "1", "\uac1c"),
                        createIngredient("\uc624\ud2b8\ubc00", "60", "g"))
                );
            default:
                return createMeal(
                    BREAKFAST,
                    "\uace0\uad6c\ub9c8 \uc0ac\uacfc \ud50c\ub808\uc774\ud2b8",
                    "\uacfc\uc77c\uacfc \ud568\uaed8 \uac00\ubccd\uac8c \uc2dc\uc791\ud558\ub294 \uc2dd\uc0ac\uc608\uc694.",
                    List.of(
                        createIngredient("\uace0\uad6c\ub9c8", "180", "g"),
                        createIngredient("\uc0ac\uacfc", "1", "\uac1c"),
                        createIngredient("\ub2ec\uac40", "1", "\uac1c"))
                );
        }
    }

    private MealDto buildFallbackLunch(int index, boolean gout, boolean diet) {
        int variant = Math.floorMod(index, 7);
        boolean lightMode = gout || diet;

        if (lightMode) {
            switch (variant) {
                case 0:
                    return createMeal(
                        LUNCH,
                        "\ub2ed\uac00\uc2b4\uc0b4 \uc591\ubc30\ucd94 \ub36e\ubc25",
                        "\ub2e8\ubc31\uc9c8\uacfc \ucc44\uc18c\ub97c \ud568\uaed8 \ucc59\uae30\ub294 \uc810\uc2ec \uc2dd\uc0ac\uc608\uc694.",
                        List.of(
                            createIngredient("\ub2ed\uac00\uc2b4\uc0b4", "150", "g"),
                            createIngredient("\uc591\ubc30\ucd94", "180", "g"),
                            createIngredient("\uac10\uc790", "180", "g"),
                            createIngredient("\ub2f9\uadfc", "80", "g"))
                    );
                case 1:
                    return createMeal(
                        LUNCH,
                        "\ub450\ubd80 \uac10\uc790 \uc870\ub9bc \uc815\uc2dd",
                        "\ub450\ubd80\uc640 \uac10\uc790\ub85c \uad6c\uc131\ud55c \ub2f4\ubc31\ud55c \uc810\uc2ec\uc774\uc5d0\uc694.",
                        List.of(
                            createIngredient("\ub450\ubd80", "260", "g"),
                            createIngredient("\uac10\uc790", "200", "g"),
                            createIngredient("\uc591\ud30c", "100", "g"),
                            createIngredient("\uc591\uc0c1\ucd94", "80", "g"))
                    );
                case 2:
                    return createMeal(
                        LUNCH,
                        "\ub2ec\uac40 \ucc44\uc18c \ube44\ube54\ubcfc",
                        "\ub2ec\uac40\uacfc \ucc44\uc18c\ub97c \uac00\ubccd\uac8c \ube44\ube48 \uc810\uc2ec\uc774\uc5d0\uc694.",
                        List.of(
                            createIngredient("\ub2ec\uac40", "2", "\uac1c"),
                            createIngredient("\uc591\uc0c1\ucd94", "120", "g"),
                            createIngredient("\uc624\uc774", "120", "g"),
                            createIngredient("\ud604\ubbf8\ubc25", "180", "g"))
                    );
                case 3:
                    return createMeal(
                        LUNCH,
                        "\ub2ed\uac00\uc2b4\uc0b4 \uc624\uc774 \uc0d0\ub7ec\ub4dc \ubcfc",
                        "\uc0c1\ud07c\ud558\uac8c \uba39\ub294 \ub2e4\uc774\uc5b4\ud2b8 \uc810\uc2ec\uc774\uc5d0\uc694.",
                        List.of(
                            createIngredient("\ub2ed\uac00\uc2b4\uc0b4", "140", "g"),
                            createIngredient("\uc624\uc774", "150", "g"),
                            createIngredient("\ubc29\uc6b8\ud1a0\ub9c8\ud1a0", "120", "g"),
                            createIngredient("\uace0\uad6c\ub9c8", "180", "g"))
                    );
                case 4:
                    return createMeal(
                        LUNCH,
                        "\uc560\ud638\ubc15 \ub450\ubd80 \ub36e\ubc25",
                        "\uc560\ud638\ubc15\uacfc \ub450\ubd80\ub85c \ud3ec\ub9cc\uac10 \uc788\uac8c \uad6c\uc131\ud55c \uc810\uc2ec\uc774\uc5d0\uc694.",
                        List.of(
                            createIngredient("\uc560\ud638\ubc15", "1", "\uac1c"),
                            createIngredient("\ub450\ubd80", "240", "g"),
                            createIngredient("\uc591\ud30c", "120", "g"),
                            createIngredient("\ud604\ubbf8\ubc25", "180", "g"))
                    );
                case 5:
                    return createMeal(
                        LUNCH,
                        "\uc591\ubc30\ucd94 \uac10\uc790 \uc218\ud504 \uc2dd\uc0ac",
                        "\ub530\ub73b\ud558\uac8c \uba39\ub294 \ucc44\uc18c \uc911\uc2ec \uc810\uc2ec\uc774\uc5d0\uc694.",
                        List.of(
                            createIngredient("\uc591\ubc30\ucd94", "180", "g"),
                            createIngredient("\uac10\uc790", "180", "g"),
                            createIngredient("\ub2ec\uac40", "1", "\uac1c"),
                            createIngredient("\ub2f9\uadfc", "80", "g"))
                    );
                default:
                    return createMeal(
                        LUNCH,
                        "\ub2ed\uac00\uc2b4\uc0b4 \ub2f9\uadfc \ubcf6\uc74c",
                        "\uc9c8\ub9ac\uc9c0 \uc54a\uac8c \uba39\ub294 \uac00\ubcbc\uc6b4 \uc810\uc2ec\uc774\uc5d0\uc694.",
                        List.of(
                            createIngredient("\ub2ed\uac00\uc2b4\uc0b4", "150", "g"),
                            createIngredient("\ub2f9\uadfc", "100", "g"),
                            createIngredient("\uc591\ud30c", "100", "g"),
                            createIngredient("\ud604\ubbf8\ubc25", "180", "g"))
                    );
            }
        }

        switch (variant) {
            case 0:
                return createMeal(
                    LUNCH,
                    "\ub2ed\uac00\uc2b4\uc0b4 \ucc44\uc18c\ubcfc",
                    "\ub2e8\ubc31\uc9c8\uacfc \ucc44\uc18c\ub97c \ud568\uaed8 \ucc59\uae30\ub294 \uc810\uc2ec \uc2dd\uc0ac\uc608\uc694.",
                    List.of(
                        createIngredient("\ub2ed\uac00\uc2b4\uc0b4", "180", "g"),
                        createIngredient("\uc591\ubc30\ucd94", "150", "g"),
                        createIngredient("\ub2f9\uadfc", "80", "g"),
                        createIngredient("\ud604\ubbf8\ubc25", "180", "g"))
                );
            case 1:
                return createMeal(
                    LUNCH,
                    "\ub3fc\uc9c0\uc548\uc2ec \ucc44\uc18c\ubcf6\uc74c",
                    "\uace0\uae30\uc640 \ucc44\uc18c\ub97c \uade0\ud615 \uc788\uac8c \uad6c\uc131\ud55c \uc810\uc2ec\uc774\uc5d0\uc694.",
                    List.of(
                        createIngredient("\ub3fc\uc9c0\uc548\uc2ec", "160", "g"),
                        createIngredient("\uc591\ubc30\ucd94", "150", "g"),
                        createIngredient("\uc591\ud30c", "100", "g"),
                        createIngredient("\uac10\uc790", "180", "g"))
                );
            case 2:
                return createMeal(
                    LUNCH,
                    "\ub450\ubd80 \ube44\ube54\ubc25",
                    "\ub450\ubd80\uc640 \ucc44\uc18c\ub97c \ud568\uaed8 \ube44\ube48 \uc810\uc2ec\uc774\uc5d0\uc694.",
                    List.of(
                        createIngredient("\ub450\ubd80", "240", "g"),
                        createIngredient("\uc591\uc0c1\ucd94", "120", "g"),
                        createIngredient("\uc624\uc774", "120", "g"),
                        createIngredient("\ud604\ubbf8\ubc25", "200", "g"))
                );
            case 3:
                return createMeal(
                    LUNCH,
                    "\ub2ed\uac00\uc2b4\uc0b4 \uc560\ud638\ubc15 \ub36e\ubc25",
                    "\uc560\ud638\ubc15\uacfc \ub2ed\uac00\uc2b4\uc0b4\ub85c \ud3ec\ub9cc\uac10 \uc788\uac8c \uad6c\uc131\ud55c \uc810\uc2ec\uc774\uc5d0\uc694.",
                    List.of(
                        createIngredient("\ub2ed\uac00\uc2b4\uc0b4", "170", "g"),
                        createIngredient("\uc560\ud638\ubc15", "1", "\uac1c"),
                        createIngredient("\uc591\ud30c", "100", "g"),
                        createIngredient("\ud604\ubbf8\ubc25", "180", "g"))
                );
            case 4:
                return createMeal(
                    LUNCH,
                    "\ub3fc\uc9c0\uc548\uc2ec \uac10\uc790\uc870\ub9bc",
                    "\ub2f4\ubc31\ud558\uac8c \uba39\uae30 \uc88b\uc740 \ud55c \ub07c\uc608\uc694.",
                    List.of(
                        createIngredient("\ub3fc\uc9c0\uc548\uc2ec", "160", "g"),
                        createIngredient("\uac10\uc790", "200", "g"),
                        createIngredient("\ub2f9\uadfc", "80", "g"),
                        createIngredient("\uc591\ud30c", "90", "g"))
                );
            case 5:
                return createMeal(
                    LUNCH,
                    "\ub2ec\uac40 \ucc44\uc18c \ub36e\ubc25",
                    "\uc5b4\ub824\uc6c0 \uc5c6\uc774 \uba39\uae30 \uc88b\uc740 \uc810\uc2ec\uc774\uc5d0\uc694.",
                    List.of(
                        createIngredient("\ub2ec\uac40", "2", "\uac1c"),
                        createIngredient("\uc591\ubc30\ucd94", "150", "g"),
                        createIngredient("\ub2f9\uadfc", "80", "g"),
                        createIngredient("\ud604\ubbf8\ubc25", "180", "g"))
                );
            default:
                return createMeal(
                    LUNCH,
                    "\ub450\ubd80 \uc591\ubc30\ucd94 \ubcfc",
                    "\ucc44\uc18c \ube44\uc911\uc744 \ub192\uc778 \uad6c\uc131\uc774\uc5d0\uc694.",
                    List.of(
                        createIngredient("\ub450\ubd80", "220", "g"),
                        createIngredient("\uc591\ubc30\ucd94", "180", "g"),
                        createIngredient("\ubc29\uc6b8\ud1a0\ub9c8\ud1a0", "120", "g"),
                        createIngredient("\uace0\uad6c\ub9c8", "180", "g"))
                );
        }
    }

    private MealDto buildFallbackDinner(int index, boolean gout, boolean diet) {
        int variant = Math.floorMod(index, 7);
        boolean lightMode = gout || diet;

        if (lightMode) {
            switch (variant) {
                case 0:
                    return createMeal(
                        DINNER,
                        "\uc560\ud638\ubc15 \ub450\ubd80 \ubcf6\uc74c",
                        "\uc800\ub141\uc5d0\ub294 \uac00\ubccd\uc9c0\ub9cc \ud3ec\ub9cc\uac10 \uc788\uac8c \ub9c8\ubb34\ub9ac\ud574\uc694.",
                        List.of(
                            createIngredient("\uc560\ud638\ubc15", "1", "\uac1c"),
                            createIngredient("\ub450\ubd80", "300", "g"),
                            createIngredient("\uc591\ud30c", "120", "g"))
                    );
                case 1:
                    return createMeal(
                        DINNER,
                        "\uc591\ubc30\ucd94 \ub2ec\uac40\uad6d",
                        "\ub530\ub73b\ud558\uac8c \ub9c8\ubb34\ub9ac\ud558\ub294 \uc800\ub141 \uc2dd\uc0ac\uc608\uc694.",
                        List.of(
                            createIngredient("\uc591\ubc30\ucd94", "180", "g"),
                            createIngredient("\ub2ec\uac40", "2", "\uac1c"),
                            createIngredient("\uac10\uc790", "160", "g"))
                    );
                case 2:
                    return createMeal(
                        DINNER,
                        "\ub2ed\uac00\uc2b4\uc0b4 \uc591\ud30c \ubcf6\uc74c",
                        "\ub2e8\ubc31\ud558\uc9c0\ub9cc \ubb34\uac81\uc9c0 \uc54a\uac8c \uad6c\uc131\ud55c \uc800\ub141\uc774\uc5d0\uc694.",
                        List.of(
                            createIngredient("\ub2ed\uac00\uc2b4\uc0b4", "140", "g"),
                            createIngredient("\uc591\ud30c", "120", "g"),
                            createIngredient("\ub2f9\uadfc", "80", "g"))
                    );
                case 3:
                    return createMeal(
                        DINNER,
                        "\ub450\ubd80 \uc591\uc0c1\ucd94 \uc0d0\ub7ec\ub4dc",
                        "\uac00\ubccd\uc9c0\ub9cc \ud3ec\ub9cc\uac10 \uc788\uac8c \uc815\ub9ac\ud55c \uc800\ub141 \uc2dd\uc0ac\uc608\uc694.",
                        List.of(
                            createIngredient("\ub450\ubd80", "260", "g"),
                            createIngredient("\uc591\uc0c1\ucd94", "120", "g"),
                            createIngredient("\uace0\uad6c\ub9c8", "180", "g"))
                    );
                case 4:
                    return createMeal(
                        DINNER,
                        "\uac10\uc790 \uc591\ubc30\ucd94 \uc804\uace8",
                        "\uacc4\uc18d \uba39\uc5b4\ub3c4 \ubd80\ub2f4 \uc801\uc740 \uc800\ub141 \uba54\ub274\uc608\uc694.",
                        List.of(
                            createIngredient("\uac10\uc790", "200", "g"),
                            createIngredient("\uc591\ubc30\ucd94", "180", "g"),
                            createIngredient("\uc591\ud30c", "100", "g"))
                    );
                case 5:
                    return createMeal(
                        DINNER,
                        "\uc560\ud638\ubc15 \ub2ec\uac40 \ubcf6\uc74c",
                        "\uc560\ud638\ubc15\uacfc \ub2ec\uac40\uc73c\ub85c \uac00\ubccd\uac8c \ub9c8\ubb34\ub9ac\ud574\uc694.",
                        List.of(
                            createIngredient("\uc560\ud638\ubc15", "1", "\uac1c"),
                            createIngredient("\ub2ec\uac40", "2", "\uac1c"),
                            createIngredient("\uc591\ud30c", "100", "g"))
                    );
                default:
                    return createMeal(
                        DINNER,
                        "\ub2ed\uac00\uc2b4\uc0b4 \ub2f9\uadfc \uc870\ub9bc",
                        "\ud3ec\ub9cc\uac10 \uc788\uac8c \ub9c8\ubb34\ub9ac\ud558\ub294 \ub2e8\ubc31\uc9c8 \uc911\uc2ec \uc800\ub141\uc774\uc5d0\uc694.",
                        List.of(
                            createIngredient("\ub2ed\uac00\uc2b4\uc0b4", "150", "g"),
                            createIngredient("\ub2f9\uadfc", "100", "g"),
                            createIngredient("\uac10\uc790", "150", "g"))
                    );
            }
        }

        switch (variant) {
            case 0:
                return createMeal(
                    DINNER,
                    "\uc560\ud638\ubc15 \ub2ed\uac00\uc2b4\uc0b4 \ubcf6\uc74c",
                    "\uc800\ub141\uc5d0\ub294 \uac00\ubccd\uc9c0\ub9cc \ud3ec\ub9cc\uac10 \uc788\uac8c \ub9c8\ubb34\ub9ac\ud574\uc694.",
                    List.of(
                        createIngredient("\uc560\ud638\ubc15", "1", "\uac1c"),
                        createIngredient("\ub2ed\uac00\uc2b4\uc0b4", "140", "g"),
                        createIngredient("\uc591\ud30c", "120", "g"))
                );
            case 1:
                return createMeal(
                    DINNER,
                    "\ub3fc\uc9c0\uc548\uc2ec \uc591\ubc30\ucd94\ubcf6\uc74c",
                    "\ub2f4\ubc31\ud558\uac8c \uc870\ub9ac\ud55c \uc800\ub141 \uba54\ub274\uc608\uc694.",
                    List.of(
                        createIngredient("\ub3fc\uc9c0\uc548\uc2ec", "160", "g"),
                        createIngredient("\uc591\ubc30\ucd94", "180", "g"),
                        createIngredient("\uc591\ud30c", "100", "g"))
                );
            case 2:
                return createMeal(
                    DINNER,
                    "\ub450\ubd80 \uc560\ud638\ubc15 \uc870\ub9bc",
                    "\ucc44\uc18c\uc640 \ub450\ubd80\ub85c \ubd80\ub2f4 \uc5c6\uc774 \uba39\uae30 \uc88b\uc740 \uc800\ub141\uc774\uc5d0\uc694.",
                    List.of(
                        createIngredient("\ub450\ubd80", "280", "g"),
                        createIngredient("\uc560\ud638\ubc15", "1", "\uac1c"),
                        createIngredient("\uc591\ud30c", "100", "g"))
                );
            case 3:
                return createMeal(
                    DINNER,
                    "\ub2ec\uac40 \ucc44\uc18c\ud0d5",
                    "\ub530\ub73b\ud558\uac8c \ub9c8\ubb34\ub9ac\ud558\ub294 \uc800\ub141 \uc2dd\uc0ac\uc608\uc694.",
                    List.of(
                        createIngredient("\ub2ec\uac40", "2", "\uac1c"),
                        createIngredient("\uc591\ubc30\ucd94", "150", "g"),
                        createIngredient("\uac10\uc790", "160", "g"))
                );
            case 4:
                return createMeal(
                    DINNER,
                    "\ub2ed\uac00\uc2b4\uc0b4 \ub2f9\uadfc\uc870\ub9bc",
                    "\ub2f4\ubc31\ud55c \ub2e8\ubc31\uc9c8 \uc911\uc2ec \uc800\ub141\uc774\uc5d0\uc694.",
                    List.of(
                        createIngredient("\ub2ed\uac00\uc2b4\uc0b4", "150", "g"),
                        createIngredient("\ub2f9\uadfc", "100", "g"),
                        createIngredient("\uc591\ud30c", "90", "g"))
                );
            case 5:
                return createMeal(
                    DINNER,
                    "\ub450\ubd80 \uac10\uc790 \uad6c\uc774",
                    "\ub450\ubd80\uc640 \uac10\uc790\ub85c \uac00\ubccd\uac8c \ub9c8\ubb34\ub9ac\ud558\ub294 \uc800\ub141\uc774\uc5d0\uc694.",
                    List.of(
                        createIngredient("\ub450\ubd80", "260", "g"),
                        createIngredient("\uac10\uc790", "180", "g"),
                        createIngredient("\ubc29\uc6b8\ud1a0\ub9c8\ud1a0", "100", "g"))
                );
            default:
                return createMeal(
                    DINNER,
                    "\uc591\ubc30\ucd94 \ub2ed\uac00\uc2b4\uc0b4 \uc218\ud504",
                    "\uac00\ubccd\uc9c0\ub9cc \ud3ec\ub9cc\uac10 \uc788\uac8c \ub9c8\ubb34\ub9ac\ud558\ub294 \uc800\ub141\uc774\uc5d0\uc694.",
                    List.of(
                        createIngredient("\uc591\ubc30\ucd94", "180", "g"),
                        createIngredient("\ub2ed\uac00\uc2b4\uc0b4", "140", "g"),
                        createIngredient("\uac10\uc790", "150", "g"))
                );
        }
    }

    private MealDto createMeal(
        String mealType,
        String menuName,
        String description,
        List<IngredientDto> ingredientList
    ) {
        MealDto mealDto = new MealDto();
        mealDto.setMealType(mealType);
        mealDto.setMenuName(menuName);
        mealDto.setDescription(description);
        mealDto.setIngredients(new ArrayList<IngredientDto>(ingredientList));
        return mealDto;
    }

    private IngredientDto createIngredient(String ingredientName, String amountValue, String unit) {
        IngredientDto ingredientDto = new IngredientDto();
        ingredientDto.setIngredientName(ingredientName);
        ingredientDto.setAmountValue(parseDecimal(amountValue));
        ingredientDto.setUnit(unit);
        ingredientDto.setAmountText(formatAmount(ingredientDto.getAmountValue(), unit));
        return ingredientDto;
    }

    private String buildFallbackSummary(boolean gout, boolean diet, int requestedDays) {
        if (gout && diet) {
            return "\ud1b5\ud48d\uc744 \uace0\ub824\ud55c \uc800\ud4e8\ub9b0 \ub2e4\uc774\uc5b4\ud2b8 \uc2dd\ub2e8 " + requestedDays + "\uc77c\ubd84\uc744 \uc815\ub9ac\ud588\uc5b4\uc694.";
        }
        if (gout) {
            return "\ud1b5\ud48d\uc744 \uace0\ub824\ud55c \uc800\ud4e8\ub9b0 \uc2dd\ub2e8 " + requestedDays + "\uc77c\ubd84\uc744 \uc815\ub9ac\ud588\uc5b4\uc694.";
        }
        if (diet) {
            return "\ub2e4\uc774\uc5b4\ud2b8\ub97c \uace0\ub824\ud55c \uc2dd\ub2e8 " + requestedDays + "\uc77c\ubd84\uc744 \uc815\ub9ac\ud588\uc5b4\uc694.";
        }
        return requestedDays + "\uc77c\uce58 \uc2dd\ub2e8\uacfc \uc7a5\ubcf4\uae30 \uc7ac\ub8cc\ub97c \uc815\ub9ac\ud588\uc5b4\uc694.";
    }

    private String buildReplyMessage(MealPlanChatResponseDto responseDto) {
        StringBuilder builder = new StringBuilder();
        MealPlanPlanDto planDto = responseDto.getPlan();
        builder.append(defaultString(planDto == null ? null : planDto.getGoalSummary()));

        if (planDto != null && planDto.getRemovalNotes() != null && !planDto.getRemovalNotes().isEmpty()) {
            builder.append("\n\uc81c\uc678 \ubc18\uc601: ");
            builder.append(String.join(", ", planDto.getRemovalNotes()));
        }

        builder.append("\n1\uc778\ubd84 \uae30\uc900 \ud544\uc694\ud55c \uc7ac\ub8cc \ucd1d\ub7c9\uc744 \ud569\uc0b0\ud574 \ub450\uc5c8\uc5b4\uc694.");
        builder.append("\n\ud310\ub9e4 \uc911\uc778 \uc7ac\ub8cc ");
        builder.append(responseDto.getSellableIngredients() == null ? 0 : responseDto.getSellableIngredients().size());
        builder.append("\uac1c, \ud604\uc7ac \ud310\ub9e4\ud558\uc9c0 \uc54a\ub294 \uc7ac\ub8cc ");
        builder.append(responseDto.getUnsellableIngredients() == null ? 0 : responseDto.getUnsellableIngredients().size());
        builder.append("\uac1c\ub85c \ub098\ub220\uc11c \ubcf4\uc5ec\ub4dc\ub9b4\uac8c\uc694.");
        builder.append("\n\uc6d0\ud558\uba74 \"\uc218\uc694\uc77c \uc800\ub141\uc740 \ube7c\uc918\"\ucc98\ub7fc \ub9d0\ud574\uc8fc\uc2dc\uba74 \ubc14\ub85c \ub2e4\uc2dc \uc815\ub9ac\ud574\ub4dc\ub9b4\uac8c\uc694.");

        if (responseDto.getCartPreview() != null
            && safeInteger(responseDto.getCartPreview().getTotalProductKinds()) > 0) {
            builder.append("\n\ud310\ub9e4 \uc911\uc778 \uc7ac\ub8cc\ub294 \"\uc7a5\ubc14\uad6c\ub2c8\uc5d0 \ub123\uc5b4\uc918\"\ub77c\uace0 \ub9d0\ud558\uba74 \ubd80\uc871\ud558\uc9c0 \uc54a\uac8c \uc62c\ub9bc \uacc4\uc0b0\ud574\uc11c \ub2f4\uc544\ub4dc\ub9b4\uac8c\uc694.");
        }

        return builder.toString();
    }

    private Set<String> extractRemovedDayLabels(String userMessage) {
        Set<String> removedDayLabels = new HashSet<String>();
        if (isBlank(userMessage)) {
            return removedDayLabels;
        }

        if (userMessage.contains("\uc6d4\uc694\uc77c")) {
            removedDayLabels.add("\uc6d4\uc694\uc77c");
        }
        if (userMessage.contains("\ud654\uc694\uc77c")) {
            removedDayLabels.add("\ud654\uc694\uc77c");
        }
        if (userMessage.contains("\uc218\uc694\uc77c")) {
            removedDayLabels.add("\uc218\uc694\uc77c");
        }
        if (userMessage.contains("\ubaa9\uc694\uc77c")) {
            removedDayLabels.add("\ubaa9\uc694\uc77c");
        }
        if (userMessage.contains("\uae08\uc694\uc77c")) {
            removedDayLabels.add("\uae08\uc694\uc77c");
        }
        if (userMessage.contains("\ud1a0\uc694\uc77c")) {
            removedDayLabels.add("\ud1a0\uc694\uc77c");
        }
        if (userMessage.contains("\uc77c\uc694\uc77c")) {
            removedDayLabels.add("\uc77c\uc694\uc77c");
        }
        return removedDayLabels;
    }

    private Set<String> extractRemovedMealTypes(String userMessage) {
        Set<String> removedMealTypes = new HashSet<String>();
        if (isBlank(userMessage) || !(userMessage.contains("\ube7c") || userMessage.contains("\uc81c\uc678"))) {
            return removedMealTypes;
        }

        if (userMessage.contains(BREAKFAST)) {
            removedMealTypes.add(BREAKFAST);
        }
        if (userMessage.contains(LUNCH)) {
            removedMealTypes.add(LUNCH);
        }
        if (userMessage.contains(DINNER)) {
            removedMealTypes.add(DINNER);
        }
        return removedMealTypes;
    }

    private int extractRequestedDays(String userMessage) {
        if (isBlank(userMessage)) {
            return 3;
        }

        if (userMessage.contains("\uc77c\uc8fc\uc77c") || userMessage.contains("\uc8fc\uac04") || userMessage.contains("7\uc77c")) {
            return 7;
        }

        Matcher matcher = DAY_PATTERN.matcher(userMessage);
        if (matcher.find()) {
            int requestedDays = Integer.parseInt(matcher.group(1));
            if (requestedDays > 0) {
                return Math.min(requestedDays, 14);
            }
        }

        return 3;
    }

    private boolean mentionsGout(String userMessage) {
        return !isBlank(userMessage) && userMessage.contains("\ud1b5\ud48d");
    }

    private boolean mentionsDiet(String userMessage) {
        return !isBlank(userMessage)
            && (userMessage.contains("\ub2e4\uc774\uc5b4\ud2b8") || userMessage.contains("\uac10\ub7c9") || userMessage.contains("\uccb4\uc911"));
    }

    private boolean requestsRemoval(String userMessage) {
        return !isBlank(userMessage) && (userMessage.contains("\ube7c") || userMessage.contains("\uc81c\uc678"));
    }

    private String buildDayLabel(int index) {
        String[] dayLabels = {"\uc6d4\uc694\uc77c", "\ud654\uc694\uc77c", "\uc218\uc694\uc77c", "\ubaa9\uc694\uc77c", "\uae08\uc694\uc77c", "\ud1a0\uc694\uc77c", "\uc77c\uc694\uc77c"};
        return dayLabels[index % dayLabels.length];
    }

    private void addSearchTerm(Set<String> searchTerms, String value) {
        String normalizedValue = normalizeIngredientName(value);
        if (normalizedValue != null) {
            searchTerms.add(normalizedValue);
        }
    }

    private String stripQuantitySuffix(String productName) {
        String normalizedProductName = trimToNull(productName);
        if (normalizedProductName == null) {
            return null;
        }

        Matcher matcher = PACKAGE_PATTERN.matcher(normalizedProductName);
        if (matcher.find()) {
            return trimToNull(normalizedProductName.substring(0, matcher.start()));
        }
        return normalizedProductName;
    }

    private String normalizeIngredientName(String value) {
        String normalizedValue = trimToNull(value);
        if (normalizedValue == null) {
            return null;
        }

        normalizedValue = normalizedValue
            .replaceAll("\\([^)]*\\)", "")
            .replace("/", "")
            .replace("-", "")
            .replace("_", "")
            .replace(" ", "")
            .toLowerCase(Locale.ROOT);

        return trimToNull(normalizedValue);
    }

    private ComparableAmount toComparableAmount(BigDecimal amountValue, String unit) {
        BigDecimal safeAmountValue = amountValue;
        String normalizedUnit = normalizeUnit(unit);
        if (safeAmountValue == null || normalizedUnit == null) {
            return ComparableAmount.unknown();
        }

        if ("kg".equals(normalizedUnit)) {
            return new ComparableAmount(
                ComparableKind.WEIGHT,
                safeAmountValue.multiply(BigDecimal.valueOf(1000L)),
                "g",
                "g");
        }
        if ("g".equals(normalizedUnit)) {
            return new ComparableAmount(ComparableKind.WEIGHT, safeAmountValue, "g", "g");
        }
        if ("l".equals(normalizedUnit)) {
            return new ComparableAmount(
                ComparableKind.VOLUME,
                safeAmountValue.multiply(BigDecimal.valueOf(1000L)),
                "ml",
                "ml");
        }
        if ("ml".equals(normalizedUnit)) {
            return new ComparableAmount(ComparableKind.VOLUME, safeAmountValue, "ml", "ml");
        }
        if (COUNT_UNIT_SET.contains(normalizedUnit)) {
            return new ComparableAmount(ComparableKind.COUNT, safeAmountValue, normalizedUnit, normalizedUnit);
        }
        return ComparableAmount.unknown();
    }

    private String normalizeUnit(String unit) {
        String normalizedUnit = trimToNull(unit);
        if (normalizedUnit == null) {
            return null;
        }

        normalizedUnit = normalizedUnit.toLowerCase(Locale.ROOT);
        if ("liter".equals(normalizedUnit) || "liters".equals(normalizedUnit)) {
            return "l";
        }
        return normalizedUnit;
    }

    private String formatAmount(BigDecimal amountValue, String unit) {
        if (amountValue == null) {
            return "";
        }

        String normalizedUnit = trimToNull(unit);
        BigDecimal safeAmountValue = amountValue.stripTrailingZeros();
        String amountText = safeAmountValue.scale() <= 0
            ? safeAmountValue.toPlainString()
            : safeAmountValue.setScale(Math.min(Math.max(safeAmountValue.scale(), 0), 2), RoundingMode.HALF_UP).stripTrailingZeros().toPlainString();
        return amountText + defaultString(normalizedUnit);
    }

    private int resolveMaxOutputTokens() {
        return maxOutputTokens > 0 ? maxOutputTokens : DEFAULT_MAX_OUTPUT_TOKENS;
    }

    private RestTemplate createRestTemplate() {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(10000);
        requestFactory.setReadTimeout(30000);
        return new RestTemplate(requestFactory);
    }

    private Integer readInteger(JsonNode node, Integer defaultValue) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return defaultValue;
        }
        if (node.isInt() || node.isLong()) {
            return Integer.valueOf(node.asInt());
        }
        String text = trimToNull(node.asText(null));
        if (text == null) {
            return defaultValue;
        }
        try {
            return Integer.valueOf(Integer.parseInt(text));
        } catch (NumberFormatException exception) {
            return defaultValue;
        }
    }

    private BigDecimal readDecimal(JsonNode node) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return null;
        }
        if (node.isNumber()) {
            return node.decimalValue();
        }
        return parseDecimal(node.asText(null));
    }

    private BigDecimal parseDecimal(String value) {
        String normalizedValue = trimToNull(value);
        if (normalizedValue == null) {
            return null;
        }

        Matcher matcher = NUMBER_PATTERN.matcher(normalizedValue);
        if (!matcher.find()) {
            return null;
        }

        try {
            return new BigDecimal(matcher.group(1));
        } catch (NumberFormatException exception) {
            return null;
        }
    }

    private List<String> readStringList(JsonNode node) {
        if (node == null || !node.isArray()) {
            return new ArrayList<String>();
        }

        List<String> stringList = new ArrayList<String>();
        for (JsonNode itemNode : node) {
            String text = trimToNull(itemNode.asText(null));
            if (text != null) {
                stringList.add(text);
            }
        }
        return stringList;
    }

    private String firstText(JsonNode node, String fieldName, String defaultValue) {
        if (node == null || node.isMissingNode()) {
            return defaultValue;
        }
        String value = trimToNull(node.path(fieldName).asText(null));
        return value == null ? defaultValue : value;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmedValue = value.trim();
        return trimmedValue.isEmpty() ? null : trimmedValue;
    }

    private boolean isBlank(String value) {
        return trimToNull(value) == null;
    }

    private String defaultString(String value) {
        return value == null ? "" : value;
    }

    private int safeInteger(Integer value) {
        return value == null ? 0 : value.intValue();
    }

    private static Map<String, List<String>> createIngredientAliasMap() {
        Map<String, List<String>> aliasMap = new LinkedHashMap<String, List<String>>();
        aliasMap.put("\uc560\ud638\ubc15", List.of("\ud638\ubc15", "\ud638\ubc15\uc560\ud638\ubc15"));
        aliasMap.put("\uc96c\ud0a4\ub2c8", List.of("\ud638\ubc15", "\ud638\ubc15\uc96c\ud0a4\ub2c8"));
        aliasMap.put("\ubd89\uc740\uace0\ucd94", List.of("\uace0\ucd94", "\ubd89\uc740\uace0\ucd94"));
        aliasMap.put("\ud48b\uace0\ucd94", List.of("\uace0\ucd94", "\uccad\uc591\uace0\ucd94", "\uaf48\ub9ac\uace0\ucd94", "\uc624\uc774\ub9db\uace0\ucd94"));
        aliasMap.put("\uac10\uc790", List.of("\uac10\uc790\uc218\ubbf8", "\uac10\uc790\uc218\ubbf8\ub178\uc9c0"));
        aliasMap.put("\uc0c1\ucd94", List.of("\uccad\uc0c1\ucd94", "\uc801\uc0c1\ucd94"));
        aliasMap.put("\ub2ec\uac40", List.of("\uacc4\ub780", "\uacc4\ub780 \ud2b9\ub780", "\uacc4\ub780\ud2b9\ub780"));
        aliasMap.put("\uacc4\ub780", List.of("\ub2ec\uac40", "\uacc4\ub780 \ud2b9\ub780", "\uacc4\ub780\ud2b9\ub780"));
        return aliasMap;
    }

    private static final class ProductMatch {
        private final ProductDto productDto;
        private final int score;

        private ProductMatch(ProductDto productDto, int score) {
            this.productDto = productDto;
            this.score = score;
        }
    }

    private static final class AggregatedIngredientBucket {
        private String displayName;
        private ComparableKind kind;
        private String baseUnit;
        private String displayUnit;
        private BigDecimal total;
    }

    private static final class ComparableAmount {
        private final ComparableKind kind;
        private final BigDecimal value;
        private final String baseUnit;
        private final String displayUnit;

        private ComparableAmount(ComparableKind kind, BigDecimal value, String baseUnit, String displayUnit) {
            this.kind = kind;
            this.value = value;
            this.baseUnit = baseUnit;
            this.displayUnit = displayUnit;
        }

        private static ComparableAmount unknown() {
            return new ComparableAmount(ComparableKind.UNKNOWN, null, "", "");
        }

        private boolean isComparableTo(ComparableAmount other) {
            return other != null
                && kind != ComparableKind.UNKNOWN
                && kind == other.kind
                && value != null
                && other.value != null;
        }
    }

    private enum ComparableKind {
        WEIGHT,
        VOLUME,
        COUNT,
        UNKNOWN
    }
}
