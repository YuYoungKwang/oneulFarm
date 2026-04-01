package com.app.service;

import java.io.IOException;
import java.net.SocketException;
import java.net.SocketTimeoutException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

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
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class NaverDataLabServiceImpl implements NaverDataLabService {

    private static final Logger logger = LoggerFactory.getLogger(NaverDataLabServiceImpl.class);

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE;
    private static final String DEFAULT_TIME_UNIT = "date";
    private static final int DEFAULT_PERIOD_DAYS = 30;
    private static final int MAX_KEYWORD_COUNT = 5;
    private static final int CONNECT_TIMEOUT_MS = 5000;
    private static final int READ_TIMEOUT_MS = 7000;
    private static final int MAX_REQUEST_ATTEMPTS = 2;
    private static final long RETRY_DELAY_MILLIS = 250L;
    private static final long CACHE_TTL_MILLIS = 10L * 60L * 1000L;
    private static final long STALE_CACHE_TTL_MILLIS = 60L * 60L * 1000L;

    @Value("${naver.datalab.baseUrl:https://openapi.naver.com/v1/datalab/search}")
    private String naverDataLabBaseUrl;

    @Value("${naver.datalab.clientId:}")
    private String naverClientId;

    @Value("${naver.datalab.clientSecret:}")
    private String naverClientSecret;

    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate;
    private final ConcurrentMap<String, CachedTrendResponse> responseCache;

    public NaverDataLabServiceImpl() {
        this.objectMapper = new ObjectMapper();
        this.restTemplate = createRestTemplate();
        this.responseCache = new ConcurrentHashMap<String, CachedTrendResponse>();
    }

    @Override
    public Map<String, Object> getPopularSearchData(
        List<String> keywordList,
        String startDate,
        String endDate,
        String timeUnit
    ) {
        List<String> resolvedKeywordList = normalizeKeywordList(keywordList);
        String resolvedEndDate = resolveEndDate(endDate);
        String resolvedStartDate = resolveStartDate(startDate, resolvedEndDate);
        String resolvedTimeUnit = resolveTimeUnit(timeUnit);

        if (!hasCredentials()) {
            logger.warn(
                "Naver DataLab credentials are missing. Skip DataLab request and return empty result. keywords={}",
                resolvedKeywordList
            );
            return buildEmptySearchTrendResponse(
                resolvedKeywordList,
                resolvedStartDate,
                resolvedEndDate,
                resolvedTimeUnit
            );
        }

        logger.debug(
            "Naver DataLab request - keywords={}, startDate={}, endDate={}, timeUnit={}",
            resolvedKeywordList,
            resolvedStartDate,
            resolvedEndDate,
            resolvedTimeUnit
        );

        String cacheKey = buildCacheKey(
            resolvedKeywordList,
            resolvedStartDate,
            resolvedEndDate,
            resolvedTimeUnit
        );
        long currentTimeMillis = System.currentTimeMillis();
        Map<String, Object> cachedResponse = findCachedResponse(cacheKey, currentTimeMillis, false);
        if (cachedResponse != null) {
            return cachedResponse;
        }

        try {
            String responseBody = requestSearchTrend(
                resolvedKeywordList,
                resolvedStartDate,
                resolvedEndDate,
                resolvedTimeUnit
            );

            Map<String, Object> responseData = parseSearchTrendResponse(
                responseBody,
                resolvedKeywordList,
                resolvedStartDate,
                resolvedEndDate,
                resolvedTimeUnit
            );
            cacheResponse(cacheKey, responseData, currentTimeMillis);
            return responseData;
        } catch (IllegalStateException exception) {
            Map<String, Object> staleResponse = findCachedResponse(
                cacheKey,
                currentTimeMillis,
                true
            );
            if (staleResponse != null) {
                logger.warn(
                    "Naver DataLab request failed. Use stale cache instead. keywords={}, cause={}",
                    resolvedKeywordList,
                    rootCauseMessage(exception)
                );
                return staleResponse;
            }

            if (isRetryableFailure(exception)) {
                logger.warn(
                    "Naver DataLab request failed. Return empty result. keywords={}, cause={}",
                    resolvedKeywordList,
                    rootCauseMessage(exception)
                );
                return buildEmptySearchTrendResponse(
                    resolvedKeywordList,
                    resolvedStartDate,
                    resolvedEndDate,
                    resolvedTimeUnit
                );
            }

            throw exception;
        }
    }

    private boolean hasCredentials() {
        return !isBlank(naverClientId) && !isBlank(naverClientSecret);
    }

    private List<String> normalizeKeywordList(List<String> keywordList) {
        if (keywordList == null || keywordList.isEmpty()) {
            throw new IllegalArgumentException("Keyword list is empty.");
        }

        Set<String> normalizedKeywordSet = new LinkedHashSet<String>();
        for (String keyword : keywordList) {
            String normalizedKeyword = trimToNull(keyword);
            if (normalizedKeyword == null) {
                continue;
            }

            normalizedKeywordSet.add(normalizedKeyword);
            if (normalizedKeywordSet.size() >= MAX_KEYWORD_COUNT) {
                break;
            }
        }

        if (normalizedKeywordSet.isEmpty()) {
            throw new IllegalArgumentException("Keyword list is empty.");
        }

        return new ArrayList<String>(normalizedKeywordSet);
    }

    private String resolveEndDate(String endDate) {
        if (isBlank(endDate)) {
            return LocalDate.now().format(DATE_FORMATTER);
        }

        return parseDate(endDate).format(DATE_FORMATTER);
    }

    private String resolveStartDate(String startDate, String resolvedEndDate) {
        if (isBlank(startDate)) {
            return LocalDate.parse(resolvedEndDate, DATE_FORMATTER)
                .minusDays(DEFAULT_PERIOD_DAYS - 1L)
                .format(DATE_FORMATTER);
        }

        return parseDate(startDate).format(DATE_FORMATTER);
    }

    private String resolveTimeUnit(String timeUnit) {
        String normalizedValue = trimToNull(timeUnit);
        if (normalizedValue == null) {
            return DEFAULT_TIME_UNIT;
        }

        String lowerCaseValue = normalizedValue.toLowerCase(Locale.ROOT);
        if (
            "date".equals(lowerCaseValue) ||
            "week".equals(lowerCaseValue) ||
            "month".equals(lowerCaseValue)
        ) {
            return lowerCaseValue;
        }

        throw new IllegalArgumentException("timeUnit must be one of date, week, or month.");
    }

    private LocalDate parseDate(String value) {
        try {
            return LocalDate.parse(value.trim(), DATE_FORMATTER);
        } catch (DateTimeParseException exception) {
            throw new IllegalArgumentException("Date must follow yyyy-MM-dd format.", exception);
        }
    }

    private String requestSearchTrend(
        List<String> keywordList,
        String startDate,
        String endDate,
        String timeUnit
    ) {
        try {
            Map<String, Object> requestBodyMap = new LinkedHashMap<String, Object>();
            requestBodyMap.put("startDate", startDate);
            requestBodyMap.put("endDate", endDate);
            requestBodyMap.put("timeUnit", timeUnit);
            requestBodyMap.put("keywordGroups", buildKeywordGroupList(keywordList));

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("X-Naver-Client-Id", naverClientId.trim());
            headers.set("X-Naver-Client-Secret", naverClientSecret.trim());

            String requestBody = objectMapper.writeValueAsString(requestBodyMap);
            HttpEntity<String> requestEntity = new HttpEntity<String>(requestBody, headers);
            Exception lastException = null;

            for (int attempt = 1; attempt <= MAX_REQUEST_ATTEMPTS; attempt++) {
                try {
                    ResponseEntity<String> responseEntity = restTemplate.exchange(
                        naverDataLabBaseUrl,
                        HttpMethod.POST,
                        requestEntity,
                        String.class
                    );
                    return responseEntity.getBody();
                } catch (Exception exception) {
                    lastException = exception;

                    if (!isRetryableFailure(exception) || attempt >= MAX_REQUEST_ATTEMPTS) {
                        break;
                    }

                    logger.warn(
                        "Naver DataLab transient failure. Retry request. attempt={}, keywords={}, cause={}",
                        Integer.valueOf(attempt),
                        keywordList,
                        rootCauseMessage(exception)
                    );
                    sleepQuietly(RETRY_DELAY_MILLIS);
                }
            }

            throw new IllegalStateException("Failed to call Naver DataLab API.", lastException);
        } catch (IOException exception) {
            throw new IllegalStateException("Failed to build Naver DataLab request body.", exception);
        } catch (IllegalStateException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new IllegalStateException("Failed to call Naver DataLab API.", exception);
        }
    }

    private String buildCacheKey(
        List<String> keywordList,
        String startDate,
        String endDate,
        String timeUnit
    ) {
        return String.join("|", keywordList) + "|" + startDate + "|" + endDate + "|" + timeUnit;
    }

    private Map<String, Object> findCachedResponse(
        String cacheKey,
        long currentTimeMillis,
        boolean allowStale
    ) {
        CachedTrendResponse cachedTrendResponse = responseCache.get(cacheKey);
        if (cachedTrendResponse == null) {
            return null;
        }

        long ttlMillis = allowStale ? STALE_CACHE_TTL_MILLIS : CACHE_TTL_MILLIS;
        if (currentTimeMillis - cachedTrendResponse.cachedAt > ttlMillis) {
            if (!allowStale) {
                responseCache.remove(cacheKey, cachedTrendResponse);
            }
            return null;
        }

        return new LinkedHashMap<String, Object>(cachedTrendResponse.responseData);
    }

    private void cacheResponse(String cacheKey, Map<String, Object> responseData, long currentTimeMillis) {
        responseCache.put(
            cacheKey,
            new CachedTrendResponse(new LinkedHashMap<String, Object>(responseData), currentTimeMillis)
        );
    }

    private boolean isRetryableFailure(Throwable throwable) {
        Throwable current = throwable;
        while (current != null) {
            if (current instanceof ResourceAccessException) {
                return true;
            }
            if (current instanceof SocketTimeoutException || current instanceof SocketException) {
                return true;
            }
            current = current.getCause();
        }
        return false;
    }

    private String rootCauseMessage(Throwable throwable) {
        Throwable current = throwable;
        Throwable root = throwable;
        while (current != null) {
            root = current;
            current = current.getCause();
        }

        String message = root == null ? "" : trimToNull(root.getMessage());
        if (message != null) {
            return message;
        }

        return root == null ? "unknown" : root.getClass().getSimpleName();
    }

    private void sleepQuietly(long delayMillis) {
        try {
            Thread.sleep(delayMillis);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
        }
    }

    private List<Map<String, Object>> buildKeywordGroupList(List<String> keywordList) {
        List<Map<String, Object>> keywordGroupList = new ArrayList<Map<String, Object>>();

        for (String keyword : keywordList) {
            Map<String, Object> keywordGroupMap = new LinkedHashMap<String, Object>();
            keywordGroupMap.put("groupName", keyword);

            List<String> keywords = new ArrayList<String>();
            keywords.add(keyword);
            keywordGroupMap.put("keywords", keywords);

            keywordGroupList.add(keywordGroupMap);
        }

        return keywordGroupList;
    }

    private Map<String, Object> parseSearchTrendResponse(
        String responseBody,
        List<String> keywordList,
        String startDate,
        String endDate,
        String timeUnit
    ) {
        try {
            JsonNode rootNode = objectMapper.readTree(responseBody);
            JsonNode resultArrayNode = rootNode.path("results");

            List<Map<String, Object>> popularSearchList = new ArrayList<Map<String, Object>>();
            if (resultArrayNode.isArray()) {
                for (JsonNode resultNode : resultArrayNode) {
                    popularSearchList.add(buildPopularSearchItem(resultNode));
                }
            }

            popularSearchList.sort((leftMap, rightMap) -> {
                double leftValue = toDouble(leftMap.get("latestRatio"));
                double rightValue = toDouble(rightMap.get("latestRatio"));
                return Double.compare(rightValue, leftValue);
            });

            Map<String, Object> responseData = new LinkedHashMap<String, Object>();
            responseData.put("startDate", startDate);
            responseData.put("endDate", endDate);
            responseData.put("timeUnit", timeUnit);
            responseData.put("keywordList", keywordList);
            responseData.put("count", Integer.valueOf(popularSearchList.size()));
            responseData.put("popularSearchList", popularSearchList);
            return responseData;
        } catch (IOException exception) {
            throw new IllegalStateException("Failed to parse Naver DataLab response.", exception);
        }
    }

    private Map<String, Object> buildEmptySearchTrendResponse(
        List<String> keywordList,
        String startDate,
        String endDate,
        String timeUnit
    ) {
        Map<String, Object> responseData = new LinkedHashMap<String, Object>();
        responseData.put("startDate", startDate);
        responseData.put("endDate", endDate);
        responseData.put("timeUnit", timeUnit);
        responseData.put("keywordList", keywordList);
        responseData.put("count", Integer.valueOf(0));
        responseData.put("popularSearchList", new ArrayList<Map<String, Object>>());
        return responseData;
    }

    private Map<String, Object> buildPopularSearchItem(JsonNode resultNode) {
        String keyword = trimToNull(resultNode.path("title").asText());
        JsonNode dataArrayNode = resultNode.path("data");

        double latestRatio = 0d;
        double firstRatio = 0d;
        double peakRatio = 0d;
        double ratioSum = 0d;
        int pointCount = 0;
        String latestPeriod = null;
        List<Map<String, Object>> pointList = new ArrayList<Map<String, Object>>();

        if (dataArrayNode.isArray()) {
            for (JsonNode dataNode : dataArrayNode) {
                double ratio = dataNode.path("ratio").asDouble(0d);
                String period = trimToNull(dataNode.path("period").asText());

                if (pointCount == 0) {
                    firstRatio = ratio;
                }

                latestRatio = ratio;
                latestPeriod = period;
                peakRatio = Math.max(peakRatio, ratio);
                ratioSum += ratio;
                pointCount++;

                Map<String, Object> pointMap = new LinkedHashMap<String, Object>();
                pointMap.put("period", period);
                pointMap.put("ratio", Double.valueOf(round(ratio)));
                pointList.add(pointMap);
            }
        }

        double averageRatio = pointCount == 0 ? 0d : ratioSum / pointCount;
        double changeRatio = latestRatio - firstRatio;

        Map<String, Object> itemMap = new LinkedHashMap<String, Object>();
        itemMap.put("keyword", keyword);
        itemMap.put("latestRatio", Double.valueOf(round(latestRatio)));
        itemMap.put("averageRatio", Double.valueOf(round(averageRatio)));
        itemMap.put("peakRatio", Double.valueOf(round(peakRatio)));
        itemMap.put("changeRatio", Double.valueOf(round(changeRatio)));
        itemMap.put("latestPeriod", latestPeriod);
        itemMap.put("trendDirection", resolveTrendDirection(changeRatio));
        itemMap.put("pointList", pointList);
        return itemMap;
    }

    private String resolveTrendDirection(double changeRatio) {
        if (changeRatio > 3d) {
            return "UP";
        }

        if (changeRatio < -3d) {
            return "DOWN";
        }

        return "FLAT";
    }

    private double round(double value) {
        return Math.round(value * 100d) / 100d;
    }

    private double toDouble(Object value) {
        if (value instanceof Number) {
            return ((Number) value).doubleValue();
        }

        return 0d;
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

    private RestTemplate createRestTemplate() {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(CONNECT_TIMEOUT_MS);
        requestFactory.setReadTimeout(READ_TIMEOUT_MS);
        return new RestTemplate(requestFactory);
    }

    private static final class CachedTrendResponse {

        private final Map<String, Object> responseData;
        private final long cachedAt;

        private CachedTrendResponse(Map<String, Object> responseData, long cachedAt) {
            this.responseData = responseData;
            this.cachedAt = cachedAt;
        }
    }
}
