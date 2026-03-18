package com.app.service;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.app.dto.TossPaymentConfigDto;
import com.app.dto.TossPaymentConfirmRequestDto;
import com.app.dto.TossPaymentConfirmResponseDto;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

@Service
public class TossPaymentServiceImpl implements TossPaymentService {

    private static final Duration HTTP_TIMEOUT = Duration.ofSeconds(15);

    private final HttpClient httpClient = HttpClient.newBuilder()
        .connectTimeout(HTTP_TIMEOUT)
        .build();

    private final ObjectMapper objectMapper = new ObjectMapper()
        .registerModule(new JavaTimeModule());

    @Value("${toss.payments.baseUrl:https://api.tosspayments.com}")
    private String baseUrl;

    @Value("${toss.payments.clientKey:}")
    private String clientKey;

    @Value("${toss.payments.secretKey:}")
    private String secretKey;

    @Override
    public TossPaymentConfigDto getConfig() {
        TossPaymentConfigDto config = new TossPaymentConfigDto();
        boolean clientReady = !isBlank(clientKey);
        boolean secretReady = !isBlank(secretKey);

        config.setProvider("TOSS");
        config.setClientKey(clientReady ? clientKey.trim() : "");
        config.setClientKeyConfigured(clientReady);
        config.setSecretKeyConfigured(secretReady);
        config.setReady(clientReady && secretReady);
        config.setMode(resolveMode(clientReady ? clientKey.trim() : "", secretReady ? secretKey.trim() : ""));
        return config;
    }

    @Override
    public TossPaymentConfirmResponseDto confirmPayment(TossPaymentConfirmRequestDto request) {
        validateConfirmRequest(request);

        if (isBlank(secretKey)) {
            throw new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "Toss Payments secret key is not configured."
            );
        }

        try {
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("paymentKey", request.getPaymentKey().trim());
            payload.put("orderId", request.getOrderId().trim());
            payload.put("amount", request.getAmount());

            HttpRequest httpRequest = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl.trim() + "/v1/payments/confirm"))
                .timeout(HTTP_TIMEOUT)
                .header("Authorization", buildAuthorizationHeader(secretKey.trim()))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(payload)))
                .build();

            HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());
            JsonNode body = readJson(response.body());

            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    extractErrorMessage(body, "Toss Payments approval failed.")
                );
            }

            TossPaymentConfirmResponseDto result = new TossPaymentConfirmResponseDto();
            result.setPaymentKey(readText(body, "paymentKey"));
            result.setOrderId(readText(body, "orderId"));
            result.setMethod(readText(body, "method"));
            result.setStatus(readText(body, "status"));
            result.setTotalAmount(readDecimal(body, "totalAmount"));
            result.setApprovedAt(readText(body, "approvedAt"));
            return result;
        } catch (ResponseStatusException error) {
            throw error;
        } catch (Exception error) {
            throw new ResponseStatusException(
                HttpStatus.BAD_GATEWAY,
                "Failed to confirm Toss payment.",
                error
            );
        }
    }

    private void validateConfirmRequest(TossPaymentConfirmRequestDto request) {
        if (request == null
            || isBlank(request.getPaymentKey())
            || isBlank(request.getOrderId())
            || request.getAmount() == null
            || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "paymentKey, orderId and amount are required."
            );
        }
    }

    private String buildAuthorizationHeader(String secret) {
        String encoded = Base64.getEncoder()
            .encodeToString((secret + ":").getBytes(StandardCharsets.UTF_8));
        return "Basic " + encoded;
    }

    private JsonNode readJson(String body) throws Exception {
        if (body == null || body.isBlank()) {
            return objectMapper.createObjectNode();
        }
        return objectMapper.readTree(body);
    }

    private String extractErrorMessage(JsonNode body, String fallback) {
        String message = readText(body, "message");
        if (!isBlank(message)) {
            return message;
        }
        String code = readText(body, "code");
        return isBlank(code) ? fallback : fallback + " (" + code + ")";
    }

    private String readText(JsonNode body, String fieldName) {
        JsonNode value = body.path(fieldName);
        return value.isMissingNode() || value.isNull() ? null : value.asText(null);
    }

    private BigDecimal readDecimal(JsonNode body, String fieldName) {
        JsonNode value = body.path(fieldName);
        if (value.isMissingNode() || value.isNull()) {
            return BigDecimal.ZERO;
        }

        if (value.isNumber()) {
            return value.decimalValue();
        }

        try {
            return new BigDecimal(value.asText("0"));
        } catch (NumberFormatException error) {
            return BigDecimal.ZERO;
        }
    }

    private String resolveMode(String resolvedClientKey, String resolvedSecretKey) {
        String referenceKey = !isBlank(resolvedClientKey) ? resolvedClientKey : resolvedSecretKey;
        if (referenceKey.startsWith("test_")) {
            return "TEST";
        }
        if (referenceKey.startsWith("live_")) {
            return "LIVE";
        }
        return "UNCONFIGURED";
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
