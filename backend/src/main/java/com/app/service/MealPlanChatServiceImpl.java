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
            + "1) \uC624\uB298 \uCD94\uCC9C, 2) \uD544\uC694\uD55C \uC7AC\uB8CC, 3) \uC7A5\uBCF4\uAE30 \uD301. "
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
            logger.warn(
                "Failed to call OpenAI meal-plan chat. Falling back to local template.",
                exception
            );
            return buildFallbackResponse(userMessage);
        }
    }

    private MealPlanChatResponseDto requestOpenAiChat(
        String userMessage,
        String previousResponseId
    ) {
        try {
            Map<String, Object> requestBodyMap = new LinkedHashMap<String, Object>();
            requestBodyMap.put(
                "model",
                trimToNull(openAiModel) == null ? DEFAULT_MODEL : openAiModel.trim()
            );
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
        String reply = extractReplyFromOutputNode(rootNode.path("output"));
        if (reply == null) {
            reply = trimToNull(rootNode.path("output_text").asText(null));
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
                    JsonNode textNode = contentItemNode.path("text");
                    String text = null;
                    if (textNode.isTextual()) {
                        text = trimToNull(textNode.asText(null));
                    } else {
                        text = trimToNull(textNode.path("value").asText(null));
                    }

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

        return "\uC624\uB298 \uCD94\uCC9C\n"
            + "- " + ingredientHint + "\uB97C \uC911\uC2EC\uC73C\uB85C " + mealTypeHint
            + " 2\uAC00\uC9C0 \uC815\uB3C4\uBD80\uD130 \uC2DC\uC791\uD574\uBCF4\uC138\uC694.\n"
            + "- \uD55C \uB07C\uB294 \uC7AC\uB8CC \uACB9\uCE68\uC774 \uC788\uB294 \uBA54\uB274\uB85C \uC7A1\uC73C\uBA74 "
            + "\uC7A5\uBCF4\uAE30 \uBD80\uB2F4\uC774 \uC904\uC5B4\uB4ED\uB2C8\uB2E4.\n\n"
            + "\uD544\uC694\uD55C \uC7AC\uB8CC\n"
            + "- \uAE30\uBCF8 \uCC44\uC18C: \uC591\uD30C, \uB300\uD30C, \uB9C8\uB298\n"
            + "- \uB2E8\uBC31\uC9C8: \uB2EC\uAC40, \uB450\uBD80, \uB2ED\uAC00\uC2B4\uC0B4 \uC911 \uD55C \uAC00\uC9C0\n"
            + "- \uBA54\uC778 \uC7AC\uB8CC: " + ingredientHint + "\n\n"
            + "\uC7A5\uBCF4\uAE30 \uD301\n"
            + "- \uC608\uC0B0 \uAE30\uC900\uC740 " + budgetHint
            + " \uC815\uB3C4\uB85C \uC2DC\uC791\uD558\uBA74 \uBB34\uB09C\uD569\uB2C8\uB2E4.\n"
            + "- \uBA3C\uC800 \uC8FC\uC7AC\uB8CC 1\uAC1C, \uB2E8\uBC31\uC9C8 1\uAC1C, "
            + "\uACF0\uB4E4\uC784 \uCC44\uC18C 2\uAC1C\uB9CC \uC815\uD558\uBA74 \uC2DD\uB2E8 \uAD6C\uC131\uC774 "
            + "\uC26C\uC6CC\uC9D1\uB2C8\uB2E4.\n\n"
            + "\uC6D0\uD558\uBA74 \uB2E4\uC74C \uBA54\uC2DC\uC9C0\uC5D0 \uC778\uC6D0 \uC218, \uC608\uC0B0, "
            + "\uB0C9\uC7A5\uACE0 \uC7AC\uB8CC\uB97C \uBCF4\uB0B4\uC8FC\uC138\uC694. "
            + "\uB354 \uAD6C\uCCB4\uC801\uC73C\uB85C \uC2DD\uB2E8\uC744 \uC9DC\uB4DC\uB9B4\uAC8C\uC694.";
    }

    private String resolveIngredientHint(String userMessage) {
        String normalizedMessage = userMessage.toLowerCase(Locale.ROOT);
        if (normalizedMessage.contains("\uAC10\uC790")) {
            return "\uAC10\uC790";
        }
        if (normalizedMessage.contains("\uBC84\uC12F")) {
            return "\uBC84\uC12F";
        }
        if (normalizedMessage.contains("\uACE0\uCD94")) {
            return "\uACE0\uCD94";
        }
        if (normalizedMessage.contains("\uB450\uBD80")) {
            return "\uB450\uBD80";
        }
        if (
            normalizedMessage.contains("\uACC4\uB780")
                || normalizedMessage.contains("\uB2EC\uAC40")
        ) {
            return "\uB2EC\uAC40";
        }
        if (
            normalizedMessage.contains("\uACE0\uAE30")
                || normalizedMessage.contains("\uB2ED")
        ) {
            return "\uB2E8\uBC31\uC9C8 \uC7AC\uB8CC";
        }
        return "\uB0C9\uC7A5\uACE0\uC5D0 \uC788\uB294 \uC8FC\uC7AC\uB8CC";
    }

    private String resolveMealTypeHint(String userMessage) {
        String normalizedMessage = userMessage.toLowerCase(Locale.ROOT);
        if (normalizedMessage.contains("\uC544\uCE68")) {
            return "\uAC04\uB2E8\uD55C \uC544\uCE68 \uBA54\uB274";
        }
        if (normalizedMessage.contains("\uC810\uC2EC")) {
            return "\uB4E0\uB4E0\uD55C \uC810\uC2EC \uBA54\uB274";
        }
        if (normalizedMessage.contains("\uC800\uB141")) {
            return "\uBD80\uB2F4 \uC5C6\uB294 \uC800\uB141 \uBA54\uB274";
        }
        if (normalizedMessage.contains("\uB3C4\uC2DC\uB77D")) {
            return "\uB3C4\uC2DC\uB77D\uC6A9 \uBA54\uB274";
        }
        return "\uD55C \uB07C \uC2DD\uB2E8";
    }

    private String resolveBudgetHint(String userMessage) {
        String normalizedMessage = userMessage.toLowerCase(Locale.ROOT);
        if (normalizedMessage.contains("1\uC778")) {
            return "1\uB9CC \uC6D0 \uC548\uD31D";
        }
        if (normalizedMessage.contains("2\uC778")) {
            return "1\uB9CC 5\uCC9C \uC6D0 \uC548\uD31D";
        }
        if (
            normalizedMessage.contains("\uAC00\uC131\uBE44")
                || normalizedMessage.contains("\uC808\uC57D")
        ) {
            return "1\uB9CC \uC6D0 \uC774\uD558";
        }
        return "1\uB9CC~2\uB9CC \uC6D0";
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
