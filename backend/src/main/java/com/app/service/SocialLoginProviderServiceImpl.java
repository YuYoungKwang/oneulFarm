package com.app.service;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.app.dto.SocialLoginProfileDto;
import com.app.dto.SocialLoginRequestDto;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class SocialLoginProviderServiceImpl implements SocialLoginProviderService {

    private final HttpClient httpClient = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(10))
        .followRedirects(HttpClient.Redirect.NORMAL)
        .build();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${social.kakao.clientId:}")
    private String kakaoClientId;

    @Value("${social.kakao.clientSecret:}")
    private String kakaoClientSecret;

    @Value("${social.kakao.redirectUri:http://localhost:3000/oauth/kakao/callback}")
    private String kakaoRedirectUri;

    @Value("${social.naver.clientId:}")
    private String naverClientId;

    @Value("${social.naver.clientSecret:}")
    private String naverClientSecret;

    @Value("${social.naver.redirectUri:http://localhost:3000/oauth/naver/callback}")
    private String naverRedirectUri;

    @Value("${social.google.clientId:}")
    private String googleClientId;

    @Value("${social.google.clientSecret:}")
    private String googleClientSecret;

    @Value("${social.google.redirectUri:http://localhost:3000/oauth/google/callback}")
    private String googleRedirectUri;

    @Override
    public SocialLoginProfileDto fetchUserProfile(String provider, SocialLoginRequestDto request) {
        return switch (provider) {
            case "KAKAO" -> fetchKakaoProfile(request);
            case "NAVER" -> fetchNaverProfile(request);
            case "GOOGLE" -> fetchGoogleProfile(request);
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported social provider.");
        };
    }

    private SocialLoginProfileDto fetchKakaoProfile(SocialLoginRequestDto request) {
        ensureConfigured("Kakao", kakaoClientId);
        Map<String, Object> tokenResponse = exchangeToken(
            "https://kauth.kakao.com/oauth/token",
            buildTokenForm(
                kakaoClientId,
                kakaoClientSecret,
                resolveRedirectUri(request.getRedirectUri(), kakaoRedirectUri),
                request.getCode(),
                null
            )
        );
        String accessToken = readRequiredString(tokenResponse, "access_token", "Kakao access token");
        Map<String, Object> profileResponse = fetchJson(
            HttpRequest.newBuilder(URI.create("https://kapi.kakao.com/v2/user/me"))
                .header("Authorization", "Bearer " + accessToken)
                .header("Accept", "application/json")
                .GET()
                .build(),
            "Kakao user info"
        );

        Map<String, Object> kakaoAccount = getMap(profileResponse, "kakao_account");
        Map<String, Object> kakaoProfile = getMap(kakaoAccount, "profile");

        SocialLoginProfileDto profile = new SocialLoginProfileDto();
        profile.setProvider("KAKAO");
        profile.setProviderUserId(readRequiredString(profileResponse, "id", "Kakao user id"));
        profile.setEmail(readString(kakaoAccount, "email"));
        profile.setNickname(firstNonBlank(readString(kakaoProfile, "nickname"), readString(kakaoAccount, "name")));
        return profile;
    }

    private SocialLoginProfileDto fetchNaverProfile(SocialLoginRequestDto request) {
        ensureConfigured("Naver", naverClientId);
        ensureConfigured("Naver", naverClientSecret);
        Map<String, Object> tokenResponse = exchangeToken(
            "https://nid.naver.com/oauth2.0/token",
            buildTokenForm(
                naverClientId,
                naverClientSecret,
                resolveRedirectUri(request.getRedirectUri(), naverRedirectUri),
                request.getCode(),
                request.getState()
            )
        );
        String accessToken = readRequiredString(tokenResponse, "access_token", "Naver access token");
        Map<String, Object> profileResponse = fetchJson(
            HttpRequest.newBuilder(URI.create("https://openapi.naver.com/v1/nid/me"))
                .header("Authorization", "Bearer " + accessToken)
                .header("Accept", "application/json")
                .GET()
                .build(),
            "Naver user info"
        );

        Map<String, Object> response = getMap(profileResponse, "response");

        SocialLoginProfileDto profile = new SocialLoginProfileDto();
        profile.setProvider("NAVER");
        profile.setProviderUserId(readRequiredString(response, "id", "Naver user id"));
        profile.setEmail(readString(response, "email"));
        profile.setNickname(firstNonBlank(readString(response, "nickname"), readString(response, "name")));
        return profile;
    }

    private SocialLoginProfileDto fetchGoogleProfile(SocialLoginRequestDto request) {
        ensureConfigured("Google", googleClientId);
        ensureConfigured("Google", googleClientSecret);
        Map<String, Object> tokenResponse = exchangeToken(
            "https://oauth2.googleapis.com/token",
            buildTokenForm(
                googleClientId,
                googleClientSecret,
                resolveRedirectUri(request.getRedirectUri(), googleRedirectUri),
                request.getCode(),
                null
            )
        );
        String accessToken = readRequiredString(tokenResponse, "access_token", "Google access token");
        Map<String, Object> profileResponse = fetchJson(
            HttpRequest.newBuilder(URI.create("https://openidconnect.googleapis.com/v1/userinfo"))
                .header("Authorization", "Bearer " + accessToken)
                .header("Accept", "application/json")
                .GET()
                .build(),
            "Google user info"
        );

        SocialLoginProfileDto profile = new SocialLoginProfileDto();
        profile.setProvider("GOOGLE");
        profile.setProviderUserId(readRequiredString(profileResponse, "sub", "Google user id"));
        profile.setEmail(readString(profileResponse, "email"));
        profile.setNickname(firstNonBlank(readString(profileResponse, "name"), readString(profileResponse, "email")));
        return profile;
    }

    private Map<String, Object> exchangeToken(String endpoint, Map<String, String> formData) {
        HttpRequest request = HttpRequest.newBuilder(URI.create(endpoint))
            .timeout(Duration.ofSeconds(15))
            .header("Content-Type", "application/x-www-form-urlencoded;charset=UTF-8")
            .header("Accept", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(toFormBody(formData)))
            .build();

        return fetchJson(request, "social access token");
    }

    private Map<String, String> buildTokenForm(
        String clientId,
        String clientSecret,
        String redirectUri,
        String code,
        String state
    ) {
        Map<String, String> formData = new LinkedHashMap<>();
        formData.put("grant_type", "authorization_code");
        formData.put("client_id", clientId);
        if (!isBlank(clientSecret)) {
            formData.put("client_secret", clientSecret);
        }
        formData.put("redirect_uri", redirectUri);
        formData.put("code", code);
        if (!isBlank(state)) {
            formData.put("state", state);
        }
        return formData;
    }

    private Map<String, Object> fetchJson(HttpRequest request, String context) {
        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            Map<String, Object> payload = objectMapper.readValue(
                response.body() == null ? "{}" : response.body(),
                new TypeReference<Map<String, Object>>() { }
            );

            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    buildProviderErrorMessage(context, payload)
                );
            }

            return payload;
        } catch (IOException | InterruptedException exception) {
            if (exception instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            throw new ResponseStatusException(
                HttpStatus.BAD_GATEWAY,
                "Failed to complete " + context.toLowerCase(Locale.ROOT) + ".",
                exception
            );
        }
    }

    private String buildProviderErrorMessage(String context, Map<String, Object> payload) {
        String description = firstNonBlank(
            readString(payload, "error_description"),
            readString(payload, "error"),
            readString(payload, "message")
        );
        if (isBlank(description)) {
            return "Failed to complete " + context.toLowerCase(Locale.ROOT) + ".";
        }
        return description;
    }

    private Map<String, Object> getMap(Map<String, Object> source, String key) {
        Object value = source.get(key);
        if (value instanceof Map<?, ?> mapValue) {
            Map<String, Object> casted = new LinkedHashMap<>();
            for (Map.Entry<?, ?> entry : mapValue.entrySet()) {
                casted.put(String.valueOf(entry.getKey()), entry.getValue());
            }
            return casted;
        }
        return Map.of();
    }

    private String readRequiredString(Map<String, Object> source, String key, String label) {
        String value = readString(source, key);
        if (isBlank(value)) {
            throw new ResponseStatusException(
                HttpStatus.BAD_GATEWAY,
                "The provider did not return " + label + "."
            );
        }
        return value;
    }

    private String readString(Map<String, Object> source, String key) {
        Object value = source.get(key);
        return value == null ? null : String.valueOf(value).trim();
    }

    private String toFormBody(Map<String, String> formData) {
        StringBuilder builder = new StringBuilder();
        for (Map.Entry<String, String> entry : formData.entrySet()) {
            if (builder.length() > 0) {
                builder.append('&');
            }
            builder.append(URLEncoder.encode(entry.getKey(), StandardCharsets.UTF_8));
            builder.append('=');
            builder.append(URLEncoder.encode(entry.getValue(), StandardCharsets.UTF_8));
        }
        return builder.toString();
    }

    private void ensureConfigured(String providerName, String value) {
        if (isBlank(value)) {
            throw new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                providerName + " social login is not configured."
            );
        }
    }

    private String resolveRedirectUri(String requestRedirectUri, String fallbackRedirectUri) {
        return isBlank(requestRedirectUri) ? fallbackRedirectUri : requestRedirectUri.trim();
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (!isBlank(value)) {
                return value;
            }
        }
        return null;
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
