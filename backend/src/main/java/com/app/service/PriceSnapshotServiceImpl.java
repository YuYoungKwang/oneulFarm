package com.app.service;

import java.io.IOException;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import com.app.dao.PriceSnapshotDAO;
import com.app.dto.PriceSnapshot;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class PriceSnapshotServiceImpl implements PriceSnapshotService {

    private static final Logger logger = LoggerFactory.getLogger(PriceSnapshotServiceImpl.class);

    private static final String SOURCE_NAME = "KAMIS_DAILY_SALES_LIST";
    private static final String MARKET_TYPE_RETAIL = "RETAIL";
    private static final String MARKET_TYPE_WHOLESALE = "WHOLESALE";

    private final PriceSnapshotDAO priceSnapshotDAO;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate;

    @Value("${kamis.baseUrl:https://www.kamis.or.kr/service/price/xml.do}")
    private String kamisBaseUrl;

    @Value("${kamis.certKey:test}")
    private String kamisCertKey;

    @Value("${kamis.certId:test}")
    private String kamisCertId;

    public PriceSnapshotServiceImpl(PriceSnapshotDAO priceSnapshotDAO) {
        this.priceSnapshotDAO = priceSnapshotDAO;
        this.objectMapper = new ObjectMapper();
        this.restTemplate = createRestTemplate();
    }

    @Override
    public int syncPriceSnapshot() {
        List<PriceSnapshot> priceSnapshotList = fetchPriceSnapshotListFromKamis();
        int processedCount = 0;

        for (PriceSnapshot priceSnapshot : priceSnapshotList) {
            processedCount += priceSnapshotDAO.mergePriceSnapshot(priceSnapshot);
        }

        logger.info("KAMIS 시세 연동 완료 - processedCount={}", processedCount);
        return processedCount;
    }

    @Override
    public String getLatestSnapshotDate() {
        return priceSnapshotDAO.selectLatestSnapshotDate();
    }

    @Override
    public List<PriceSnapshot> getPriceSnapshotList(String itemName, String marketType, String snapshotDate, Integer limit) {
        String resolvedSnapshotDate = normalizeSnapshotDate(snapshotDate);
        String resolvedMarketType = normalizeOptionalMarketType(marketType);
        int resolvedLimit = resolveLimit(limit, 100, 300);

        if (resolvedSnapshotDate == null) {
            resolvedSnapshotDate = priceSnapshotDAO.selectLatestSnapshotDate();
        }

        if (resolvedSnapshotDate == null) {
            return Collections.emptyList();
        }

        return priceSnapshotDAO.selectPriceSnapshotList(itemName, resolvedMarketType, resolvedSnapshotDate, resolvedLimit);
    }

    @Override
    public List<PriceSnapshot> getPriceSnapshotTrend(String itemCode, String marketType, Integer limit) {
        if (itemCode == null || itemCode.isBlank()) {
            throw new IllegalArgumentException("itemCode는 필수입니다.");
        }

        String resolvedMarketType = normalizeRequiredMarketType(marketType == null || marketType.isBlank() ? MARKET_TYPE_RETAIL : marketType);
        int resolvedLimit = resolveLimit(limit, 30, 60);

        return priceSnapshotDAO.selectPriceSnapshotTrend(itemCode.trim(), resolvedMarketType, resolvedLimit);
    }

    private List<PriceSnapshot> fetchPriceSnapshotListFromKamis() {
        try {
            String responseBody = requestDailySalesList();
            JsonNode root = objectMapper.readTree(responseBody);

            String errorCode = root.path("error_code").asText();
            if (!"000".equals(errorCode)) {
                throw new IllegalStateException("KAMIS API 응답 오류입니다. errorCode=" + errorCode);
            }

            JsonNode priceNode = root.path("price");
            if (!priceNode.isArray()) {
                return Collections.emptyList();
            }

            List<PriceSnapshot> priceSnapshotList = new ArrayList<PriceSnapshot>();
            for (JsonNode itemNode : priceNode) {
                PriceSnapshot priceSnapshot = new PriceSnapshot();
                priceSnapshot.setItemCode(trimToNull(itemNode.path("productno").asText()));
                priceSnapshot.setItemName(resolveItemName(itemNode));
                priceSnapshot.setMarketType(resolveMarketType(itemNode));
                priceSnapshot.setUnit(trimToNull(itemNode.path("unit").asText()));
                priceSnapshot.setAvgPrice(toBigDecimal(itemNode.path("dpr1")));
                priceSnapshot.setMinPrice(null);
                priceSnapshot.setMaxPrice(null);
                priceSnapshot.setChangeRate(toBigDecimal(itemNode.path("value")));
                priceSnapshot.setSnapshotDate(resolveSnapshotDate(itemNode));
                priceSnapshot.setSourceName(SOURCE_NAME);

                if (priceSnapshot.getItemName() == null || priceSnapshot.getUnit() == null || priceSnapshot.getSnapshotDate() == null) {
                    continue;
                }
                if (priceSnapshot.getAvgPrice() == null) {
                    continue;
                }

                priceSnapshotList.add(priceSnapshot);
            }

            return priceSnapshotList;
        } catch (IOException exception) {
            throw new IllegalStateException("KAMIS 시세 응답을 해석하지 못했습니다.", exception);
        }
    }

    private String requestDailySalesList() {
        String requestUrl = UriComponentsBuilder
            .fromHttpUrl(kamisBaseUrl)
            .queryParam("action", "dailySalesList")
            .queryParam("p_cert_key", kamisCertKey)
            .queryParam("p_cert_id", kamisCertId)
            .queryParam("p_returntype", "json")
            .build(true)
            .toUriString();

        logger.info("KAMIS 시세 조회 요청 - action=dailySalesList");
        String responseBody = restTemplate.getForObject(requestUrl, String.class);
        if (responseBody == null || responseBody.isBlank()) {
            throw new IllegalStateException("KAMIS 시세 응답이 비어 있습니다.");
        }
        return responseBody;
    }

    private RestTemplate createRestTemplate() {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(5000);
        requestFactory.setReadTimeout(10000);
        return new RestTemplate(requestFactory);
    }

    private String resolveItemName(JsonNode itemNode) {
        String itemName = trimToNull(itemNode.path("item_name").asText());
        if (itemName != null) {
            return itemName;
        }
        return trimToNull(itemNode.path("productName").asText());
    }

    private String resolveMarketType(JsonNode itemNode) {
        String productClassCode = itemNode.path("product_cls_code").asText();
        if ("01".equals(productClassCode)) {
            return MARKET_TYPE_RETAIL;
        }
        if ("02".equals(productClassCode)) {
            return MARKET_TYPE_WHOLESALE;
        }

        String marketTypeName = trimToNull(itemNode.path("product_cls_name").asText());
        if ("소매".equals(marketTypeName)) {
            return MARKET_TYPE_RETAIL;
        }
        if ("도매".equals(marketTypeName)) {
            return MARKET_TYPE_WHOLESALE;
        }

        throw new IllegalArgumentException("지원하지 않는 marketType입니다.");
    }

    private String resolveSnapshotDate(JsonNode itemNode) {
        String rawDate = trimToNull(itemNode.path("lastest_day").asText());
        if (rawDate == null) {
            rawDate = trimToNull(itemNode.path("lastest_date").asText());
        }
        return normalizeSnapshotDate(rawDate);
    }

    private BigDecimal toBigDecimal(JsonNode valueNode) {
        if (valueNode == null || valueNode.isMissingNode() || valueNode.isNull()) {
            return null;
        }
        if (valueNode.isArray()) {
            if (valueNode.size() == 0) {
                return null;
            }
            return toBigDecimal(valueNode.get(0));
        }

        String value = trimToNull(valueNode.asText());
        if (value == null) {
            return null;
        }

        String normalizedValue = value.replace(",", "");
        if (normalizedValue.isBlank() || "-".equals(normalizedValue)) {
            return null;
        }

        return new BigDecimal(normalizedValue);
    }

    private String normalizeSnapshotDate(String snapshotDate) {
        String value = trimToNull(snapshotDate);
        if (value == null) {
            return null;
        }
        if (value.matches("\\d{4}-\\d{2}-\\d{2}")) {
            return value;
        }
        if (value.matches("\\d{8}")) {
            return value.substring(0, 4) + "-" + value.substring(4, 6) + "-" + value.substring(6, 8);
        }
        throw new IllegalArgumentException("snapshotDate는 yyyy-MM-dd 형식이어야 합니다.");
    }

    private String normalizeOptionalMarketType(String marketType) {
        String value = trimToNull(marketType);
        if (value == null) {
            return null;
        }
        return normalizeRequiredMarketType(value);
    }

    private String normalizeRequiredMarketType(String marketType) {
        String value = marketType.trim().toUpperCase(Locale.ROOT);
        if (MARKET_TYPE_RETAIL.equals(value) || MARKET_TYPE_WHOLESALE.equals(value)) {
            return value;
        }
        throw new IllegalArgumentException("marketType은 RETAIL 또는 WHOLESALE 이어야 합니다.");
    }

    private int resolveLimit(Integer limit, int defaultValue, int maxValue) {
        if (limit == null || limit.intValue() <= 0) {
            return defaultValue;
        }
        return Math.min(limit.intValue(), maxValue);
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.isEmpty()) {
            return null;
        }
        return trimmed;
    }
}
