package com.app.service;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

@Service
public class PortOnePaymentServiceImpl implements PortOnePaymentService {

    private static final Duration HTTP_TIMEOUT = Duration.ofSeconds(15);

    private final HttpClient httpClient = HttpClient.newBuilder()
        .connectTimeout(HTTP_TIMEOUT)
        .build();

    private final ObjectMapper objectMapper = new ObjectMapper()
        .registerModule(new JavaTimeModule());

    @Value("${portone.api.baseUrl:https://api.portone.io}")
    private String baseUrl;

    @Value("${portone.api.secret:}")
    private String apiSecret;

    @Value("${portone.storeId:}")
    private String storeId;

    @Value("${portone.channelKey:}")
    private String legacyChannelKey;

    @Value("${portone.channelKey.default:}")
    private String defaultChannelKey;

    @Value("${portone.channelKey.card:}")
    private String cardChannelKey;

    @Value("${portone.channelKey.virtualAccount:}")
    private String virtualAccountChannelKey;

    @Value("${portone.channelKey.kakaoPay:}")
    private String kakaoPayChannelKey;

    @Value("${portone.channelKey.tossPay:}")
    private String tossPayChannelKey;

    @Value("${portone.mode:TEST}")
    private String mode;

    @Override
    public Map<String, Object> getConfig() {
        Map<String, Object> channelKeys = new LinkedHashMap<>();
        String resolvedCardChannelKey = resolveChannelKey(cardChannelKey, defaultChannelKey, legacyChannelKey);
        String resolvedVirtualAccountChannelKey = resolveChannelKey(
            virtualAccountChannelKey,
            defaultChannelKey,
            legacyChannelKey
        );
        String resolvedKakaoPayChannelKey = resolveChannelKey(kakaoPayChannelKey);
        String resolvedTossPayChannelKey = resolveChannelKey(tossPayChannelKey);

        Map<String, Object> config = new LinkedHashMap<>();
        boolean hasChannelKey = !isBlank(resolvedCardChannelKey)
            || !isBlank(resolvedVirtualAccountChannelKey)
            || !isBlank(resolvedKakaoPayChannelKey)
            || !isBlank(resolvedTossPayChannelKey);
        boolean ready = !isBlank(apiSecret) && !isBlank(storeId) && hasChannelKey;

        channelKeys.put("card", ready ? normalizeOrEmpty(resolvedCardChannelKey) : "");
        channelKeys.put("virtualAccount", ready ? normalizeOrEmpty(resolvedVirtualAccountChannelKey) : "");
        channelKeys.put("kakaoPay", ready ? normalizeOrEmpty(resolvedKakaoPayChannelKey) : "");
        channelKeys.put("tossPay", ready ? normalizeOrEmpty(resolvedTossPayChannelKey) : "");

        config.put("provider", "PORTONE");
        config.put("storeId", ready ? storeId.trim() : "");
        config.put("channelKey", ready ? normalizeOrEmpty(resolvedCardChannelKey) : "");
        config.put("channelKeys", channelKeys);
        config.put("apiSecretConfigured", !isBlank(apiSecret));
        config.put("ready", ready);
        config.put("mode", isBlank(mode) ? "TEST" : mode.trim().toUpperCase());
        return config;
    }

    @Override
    public Map<String, Object> completePayment(Map<String, Object> request) {
        String paymentId = trimToNull(readText(request, "paymentId"));
        BigDecimal amount = readDecimal(request, "amount");

        if (paymentId == null || amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "paymentId and amount are required.");
        }

        if (isBlank(apiSecret)) {
            throw new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "PortOne API secret is not configured."
            );
        }

        try {
            HttpRequest httpRequest = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl.trim() + "/payments/" + paymentId))
                .timeout(HTTP_TIMEOUT)
                .header("Authorization", "PortOne " + apiSecret.trim())
                .GET()
                .build();

            HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());
            JsonNode body = readJson(response.body());

            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    extractErrorMessage(body, "PortOne payment verification failed.")
                );
            }

            BigDecimal paidAmount = readAmount(body);
            if (paidAmount.compareTo(amount) != 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Payment amount mismatch.");
            }

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("paymentId", readText(body, "id", paymentId));
            result.put("transactionId", readText(body, "transactionId", null));
            result.put("status", readText(body, "status", null));
            result.put("payMethod", readText(body, "method", readText(body, "payMethod", null)));
            result.put("paidAmount", paidAmount);
            result.put("paidAt", readText(body, "paidAt", readText(body, "requestedAt", null)));
            return result;
        } catch (ResponseStatusException error) {
            throw error;
        } catch (Exception error) {
            throw new ResponseStatusException(
                HttpStatus.BAD_GATEWAY,
                "Failed to verify PortOne payment.",
                error
            );
        }
    }

    private JsonNode readJson(String body) throws Exception {
        if (body == null || body.isBlank()) {
            return objectMapper.createObjectNode();
        }
        return objectMapper.readTree(body);
    }

    private BigDecimal readAmount(JsonNode body) {
        JsonNode amountNode = body.path("amount").path("total");
        if (amountNode.isMissingNode() || amountNode.isNull()) {
            amountNode = body.path("amount");
        }

        if (amountNode.isMissingNode() || amountNode.isNull()) {
            return BigDecimal.ZERO;
        }

        if (amountNode.isNumber()) {
            return amountNode.decimalValue();
        }

        try {
            return new BigDecimal(amountNode.asText("0"));
        } catch (NumberFormatException error) {
            return BigDecimal.ZERO;
        }
    }

    private String extractErrorMessage(JsonNode body, String fallback) {
        String message = readText(body, "message", null);
        if (message != null && !message.isBlank()) {
            return message;
        }

        String code = readText(body, "code", null);
        return code == null || code.isBlank() ? fallback : fallback + " (" + code + ")";
    }

    private String readText(Map<String, Object> request, String key) {
        if (request == null) {
            return null;
        }

        Object value = request.get(key);
        return value == null ? null : String.valueOf(value);
    }

    private BigDecimal readDecimal(Map<String, Object> request, String key) {
        if (request == null) {
            return null;
        }

        Object value = request.get(key);
        if (value == null) {
            return null;
        }

        if (value instanceof Number) {
            return BigDecimal.valueOf(((Number) value).doubleValue());
        }

        try {
            return new BigDecimal(String.valueOf(value));
        } catch (NumberFormatException error) {
            return null;
        }
    }

    private String readText(JsonNode body, String fieldName, String fallback) {
        JsonNode value = body.path(fieldName);
        return value.isMissingNode() || value.isNull() ? fallback : value.asText(fallback);
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }

        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private String normalizeOrEmpty(String value) {
        return isBlank(value) ? "" : value.trim();
    }

    private String resolveChannelKey(String... candidates) {
        if (candidates == null) {
            return null;
        }

        for (String candidate : candidates) {
            if (!isBlank(candidate)) {
                return candidate.trim();
            }
        }

        return null;
    }
}
