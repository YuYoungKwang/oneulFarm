package com.app.service;

import java.io.IOException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.app.dto.MealPlanChatRequestDto;
import com.app.dto.MealPlanChatResponseDto;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class MealPlanChatServiceImpl implements MealPlanChatService {

    private static final Logger logger = LoggerFactory.getLogger(MealPlanChatServiceImpl.class);

    private static final String DEFAULT_MODEL = "gpt-4o-mini";
    private static final int DEFAULT_MAX_OUTPUT_TOKENS = 700;
    private static final String SYSTEM_PROMPT =
        "You are oneulFarm's Korean meal-planning assistant. "
            + "Always answer in Korean. Keep answers practical, friendly, and concise. "
            + "Focus on meal planning, recipe direction, grocery suggestions, and budget-conscious choices. "
            + "When possible, structure the answer with these sections: "
            + "1) 오늘 추천, 2) 필요한 재료, 3) 장보기 팁. "
            + "If the user gives too little context, ask at most two short follow-up questions.";

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

        String previousResponseId = trimToNull(
            requestDto == null ? null : requestDto.getPreviousResponseId()
        );

        if (isBlank(openAiApiKey)) {
            logger.info("OpenAI API key is missing. Returning fallback meal-plan response.");
            return buildFallbackResponse(userMessage);
        }

        try {
            return requestOpenAiChat(userMessage, previousResponseId);
        } catch (Exception exception) {
            logger.warn("Failed to call OpenAI meal-plan chat. Falling back to local template.", exception);
            return buildFallbackResponse(userMessage);
        }
    }

    private MealPlanChatResponseDto requestOpenAiChat(String userMessage, String previousResponseId) {
        try {
            Map<String, Object> requestBodyMap = new LinkedHashMap<String, Object>();
            requestBodyMap.put("model", trimToNull(openAiModel) == null ? DEFAULT_MODEL : openAiModel.trim());
            requestBodyMap.put("instructions", SYSTEM_PROMPT);
            requestBodyMap.put("input", buildInputList(userMessage));
            requestBodyMap.put("max_output_tokens", Integer.valueOf(resolveMaxOutputTokens()));

            Map<String, Object> textConfigMap = new LinkedHashMap<String, Object>();
            Map<String, Object> textFormatMap = new LinkedHashMap<String, Object>();
            textFormatMap.put("type", "text");
            textConfigMap.put("format", textFormatMap);
            requestBodyMap.put("text", textConfigMap);

            if (!isBlank(previousResponseId)) {
                requestBodyMap.put("previous_response_id", previousResponseId);
            }

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(openAiApiKey.trim());

            String requestBody = objectMapper.writeValueAsString(requestBodyMap);
            HttpEntity<String> requestEntity = new HttpEntity<String>(requestBody, headers);
            ResponseEntity<String> responseEntity = restTemplate.exchange(
                openAiResponsesUrl,
                HttpMethod.POST,
                requestEntity,
                String.class
            );

            return parseOpenAiResponse(responseEntity.getBody());
        } catch (IOException exception) {
            throw new IllegalStateException("Failed to serialize OpenAI request.", exception);
        } catch (Exception exception) {
            throw new IllegalStateException("Failed to call OpenAI Responses API.", exception);
        }
    }

    private List<Map<String, Object>> buildInputList(String userMessage) {
        List<Map<String, Object>> inputList = new ArrayList<Map<String, Object>>();
        Map<String, Object> messageMap = new LinkedHashMap<String, Object>();
        List<Map<String, String>> contentList = new ArrayList<Map<String, String>>();
        Map<String, String> contentMap = new LinkedHashMap<String, String>();

        contentMap.put("type", "input_text");
        contentMap.put("text", userMessage);
        contentList.add(contentMap);

        messageMap.put("role", "user");
        messageMap.put("content", contentList);
        inputList.add(messageMap);
        return inputList;
    }

    private MealPlanChatResponseDto parseOpenAiResponse(String responseBody) throws IOException {
        JsonNode rootNode = objectMapper.readTree(responseBody);
        String reply = trimToNull(rootNode.path("output_text").asText(null));
        if (reply == null) {
            reply = extractReplyFromOutputNode(rootNode.path("output"));
        }

        if (reply == null) {
            throw new IllegalStateException("OpenAI response does not contain output text.");
        }

        MealPlanChatResponseDto responseDto = new MealPlanChatResponseDto();
        responseDto.setReply(reply);
        responseDto.setResponseId(trimToNull(rootNode.path("id").asText(null)));
        responseDto.setModel(trimToNull(rootNode.path("model").asText(null)));
        responseDto.setFallbackMode(false);
        return responseDto;
    }

    private String extractReplyFromOutputNode(JsonNode outputNode) {
        if (outputNode == null || !outputNode.isArray()) {
            return null;
        }

        for (JsonNode itemNode : outputNode) {
            JsonNode contentNode = itemNode.path("content");
            if (!contentNode.isArray()) {
                continue;
            }

            for (JsonNode contentItemNode : contentNode) {
                String type = trimToNull(contentItemNode.path("type").asText(null));
                if ("output_text".equals(type) || "text".equals(type)) {
                    String text = trimToNull(contentItemNode.path("text").asText(null));
                    if (text != null) {
                        return text;
                    }
                }
            }
        }

        return null;
    }

    private MealPlanChatResponseDto buildFallbackResponse(String userMessage) {
        MealPlanChatResponseDto responseDto = new MealPlanChatResponseDto();
        responseDto.setReply(buildFallbackReply(userMessage));
        responseDto.setResponseId(null);
        responseDto.setModel("local-template");
        responseDto.setFallbackMode(true);
        return responseDto;
    }

    private String buildFallbackReply(String userMessage) {
        String ingredientHint = resolveIngredientHint(userMessage);
        String mealTypeHint = resolveMealTypeHint(userMessage);
        String budgetHint = resolveBudgetHint(userMessage);

        return "오늘 추천\n"
            + "- " + ingredientHint + "를 중심으로 " + mealTypeHint + " 2가지 정도부터 시작해보세요.\n"
            + "- 한 끼는 재료 겹침이 있는 메뉴로 잡으면 장보기 부담이 줄어듭니다.\n\n"
            + "필요한 재료\n"
            + "- 기본 채소: 양파, 대파, 마늘\n"
            + "- 단백질: 달걀, 두부, 닭가슴살 중 한 가지\n"
            + "- 메인 재료: " + ingredientHint + "\n\n"
            + "장보기 팁\n"
            + "- 예산 기준은 " + budgetHint + " 정도로 시작하면 무난합니다.\n"
            + "- 먼저 주재료 1개, 단백질 1개, 곁들임 채소 2개만 정하면 식단 구성이 쉬워집니다.\n\n"
            + "원하면 다음 메시지에 인원 수, 예산, 냉장고 재료를 보내주세요. 더 구체적으로 식단을 짜드릴게요.";
    }

    private String resolveIngredientHint(String userMessage) {
        String normalizedMessage = userMessage.toLowerCase(Locale.ROOT);
        if (normalizedMessage.contains("감자")) {
            return "감자";
        }
        if (normalizedMessage.contains("버섯")) {
            return "버섯";
        }
        if (normalizedMessage.contains("고추")) {
            return "고추";
        }
        if (normalizedMessage.contains("두부")) {
            return "두부";
        }
        if (normalizedMessage.contains("계란") || normalizedMessage.contains("달걀")) {
            return "달걀";
        }
        if (normalizedMessage.contains("고기") || normalizedMessage.contains("닭")) {
            return "단백질 재료";
        }
        return "냉장고에 있는 주재료";
    }

    private String resolveMealTypeHint(String userMessage) {
        String normalizedMessage = userMessage.toLowerCase(Locale.ROOT);
        if (normalizedMessage.contains("아침")) {
            return "간단한 아침 메뉴";
        }
        if (normalizedMessage.contains("점심")) {
            return "든든한 점심 메뉴";
        }
        if (normalizedMessage.contains("저녁")) {
            return "부담 없는 저녁 메뉴";
        }
        if (normalizedMessage.contains("도시락")) {
            return "도시락용 메뉴";
        }
        return "한 끼 식단";
    }

    private String resolveBudgetHint(String userMessage) {
        String normalizedMessage = userMessage.toLowerCase(Locale.ROOT);
        if (normalizedMessage.contains("1인")) {
            return "1만 원 안팎";
        }
        if (normalizedMessage.contains("2인")) {
            return "1만 5천 원 안팎";
        }
        if (normalizedMessage.contains("가성비") || normalizedMessage.contains("절약")) {
            return "1만 원 이하";
        }
        return "1만~2만 원";
    }

    private int resolveMaxOutputTokens() {
        return maxOutputTokens > 0 ? maxOutputTokens : DEFAULT_MAX_OUTPUT_TOKENS;
    }

    private RestTemplate createRestTemplate() {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(10000);
        requestFactory.setReadTimeout(45000);
        return new RestTemplate(requestFactory);
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

    private boolean isBlank(String value) {
        return trimToNull(value) == null;
    }
}
