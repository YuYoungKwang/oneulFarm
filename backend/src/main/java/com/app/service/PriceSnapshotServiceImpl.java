package com.app.service;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import com.app.dao.PriceSnapshotDAO;
import com.app.dto.PriceSnapshotBackfillItemDTO;
import com.app.dto.PriceSnapshotDTO;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class PriceSnapshotServiceImpl implements PriceSnapshotService {

    private static final Logger logger = LoggerFactory.getLogger(PriceSnapshotServiceImpl.class);

    private static final String SOURCE_NAME_DAILY = "KAMIS_DAILY_SALES_LIST";
    private static final String SOURCE_NAME_PERIOD_RETAIL = "KAMIS_PERIOD_RETAIL_PRODUCT_LIST";
    private static final String SOURCE_NAME_PERIOD_WHOLESALE = "KAMIS_PERIOD_WHOLESALE_PRODUCT_LIST";
    private static final String DEFAULT_BACKFILL_ITEM_RESOURCE_PATH = "kamis-price-backfill-items.csv";
    private static final String MULTI_KIND_CODE_DELIMITER = "|";

    private static final String MARKET_TYPE_RETAIL = "RETAIL";
    private static final String MARKET_TYPE_WHOLESALE = "WHOLESALE";

    private static final String DEFAULT_COUNTRY_CODE = "1101";
    private static final String DEFAULT_CONVERT_KG_YN = "Y";
    private static final int DEFAULT_BACKFILL_DAYS = 365;
    private static final int MAX_BACKFILL_DAYS = 365;

    private static final DateTimeFormatter SNAPSHOT_DATE_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE;
    private static final DateTimeFormatter REGDAY_SLASH_FORMATTER = DateTimeFormatter.ofPattern("yyyy/MM/dd");
    private static final DateTimeFormatter REGDAY_DASH_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");

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
        List<PriceSnapshotDTO> priceSnapshotList = fetchDailyPriceSnapshotListFromKamis();
        int processedCount = mergePriceSnapshotList(priceSnapshotList);

        logger.info("KAMIS 시세 일일 동기화 완료 - processedCount={}", processedCount);
        return processedCount;
    }

    @Override
    public int backfillPriceSnapshot(
        String marketType,
        String itemCategoryCode,
        String itemCode,
        String kindCode,
        String productRankCode,
        String countryCode,
        String convertKgYn,
        String startDate,
        String endDate
    ) {
        return backfillPriceSnapshotInternal(
            marketType,
            itemCategoryCode,
            itemCode,
            kindCode,
            productRankCode,
            countryCode,
            convertKgYn,
            startDate,
            endDate,
            null,
            null
        );
    }

    private int backfillPriceSnapshotInternal(
        String marketType,
        String itemCategoryCode,
        String itemCode,
        String kindCode,
        String productRankCode,
        String countryCode,
        String convertKgYn,
        String startDate,
        String endDate,
        String itemNameHint,
        String unitHint
    ) {
        List<String> kindCodeList = splitKindCodeList(kindCode);
        if (kindCodeList.size() > 1) {
            PriceBackfillRequest seedRequest = createPriceBackfillRequest(
                marketType,
                itemCategoryCode,
                itemCode,
                kindCodeList.get(0),
                productRankCode,
                countryCode,
                convertKgYn,
                startDate,
                endDate,
                itemNameHint,
                unitHint
            );

            String groupedKindCode = String.join(MULTI_KIND_CODE_DELIMITER, kindCodeList);
            String groupedStoredItemCode = buildHistoricalItemCode(
                seedRequest.getMarketType(),
                seedRequest.getItemCategoryCode(),
                seedRequest.getItemCode(),
                groupedKindCode,
                seedRequest.getProductRankCode(),
                seedRequest.getCountryCode(),
                seedRequest.getConvertKgYn()
            );

            List<PriceSnapshotDTO> priceSnapshotList = fetchGroupedHistoricalPriceSnapshotListFromKamis(
                seedRequest,
                kindCodeList,
                groupedStoredItemCode,
                itemNameHint,
                unitHint
            );
            int processedCount = mergePriceSnapshotList(priceSnapshotList);

            logger.info(
                "KAMIS 시세 기간 그룹 백필 완료 - marketType={}, storedItemCode={}, kindCodeCount={}, processedCount={}, startDate={}, endDate={}",
                seedRequest.getMarketType(),
                groupedStoredItemCode,
                Integer.valueOf(kindCodeList.size()),
                processedCount,
                seedRequest.getStartDate(),
                seedRequest.getEndDate()
            );
            return processedCount;
        }

        PriceBackfillRequest priceBackfillRequest = createPriceBackfillRequest(
            marketType,
            itemCategoryCode,
            itemCode,
            kindCodeList.get(0),
            productRankCode,
            countryCode,
            convertKgYn,
            startDate,
            endDate,
            itemNameHint,
            unitHint
        );

        List<PriceSnapshotDTO> priceSnapshotList = fetchHistoricalPriceSnapshotListFromKamis(priceBackfillRequest);
        int processedCount = mergePriceSnapshotList(priceSnapshotList);

        logger.info(
            "KAMIS 시세 기간 백필 완료 - marketType={}, storedItemCode={}, processedCount={}, startDate={}, endDate={}",
            priceBackfillRequest.getMarketType(),
            priceBackfillRequest.getStoredItemCode(),
            processedCount,
            priceBackfillRequest.getStartDate(),
            priceBackfillRequest.getEndDate()
        );
        return processedCount;
    }

    private List<PriceSnapshotDTO> fetchGroupedHistoricalPriceSnapshotListFromKamis(
        PriceBackfillRequest seedRequest,
        List<String> kindCodeList,
        String groupedStoredItemCode,
        String itemNameHint,
        String unitHint
    ) {
        Map<String, BigDecimal> totalPriceMap = new LinkedHashMap<String, BigDecimal>();
        Map<String, Integer> countMap = new LinkedHashMap<String, Integer>();
        Map<String, PriceRange> priceRangeMap = new LinkedHashMap<String, PriceRange>();

        String resolvedItemName = trimToNull(itemNameHint);
        String resolvedUnit = trimToNull(unitHint);

        for (String currentKindCode : kindCodeList) {
            PriceBackfillRequest kindRequest = createPriceBackfillRequest(
                seedRequest.getMarketType(),
                seedRequest.getItemCategoryCode(),
                seedRequest.getItemCode(),
                currentKindCode,
                seedRequest.getProductRankCode(),
                seedRequest.getCountryCode(),
                seedRequest.getConvertKgYn(),
                seedRequest.getStartDate(),
                seedRequest.getEndDate(),
                itemNameHint,
                unitHint
            );

            List<PriceSnapshotDTO> kindSnapshotList = fetchHistoricalPriceSnapshotListFromKamis(kindRequest);
            for (PriceSnapshotDTO priceSnapshotDTO : kindSnapshotList) {
                String snapshotDate = priceSnapshotDTO.getSnapshotDate();
                BigDecimal avgPrice = priceSnapshotDTO.getAvgPrice();
                if (snapshotDate == null || avgPrice == null) {
                    continue;
                }

                totalPriceMap.merge(snapshotDate, avgPrice, BigDecimal::add);
                countMap.merge(snapshotDate, Integer.valueOf(1), Integer::sum);
                if (priceSnapshotDTO.getMinPrice() != null) {
                    accumulatePriceRange(priceRangeMap, snapshotDate, priceSnapshotDTO.getMinPrice());
                }
                if (priceSnapshotDTO.getMaxPrice() != null) {
                    accumulatePriceRange(priceRangeMap, snapshotDate, priceSnapshotDTO.getMaxPrice());
                }

                if (resolvedItemName == null) {
                    resolvedItemName = trimToNull(priceSnapshotDTO.getItemName());
                }
                if (resolvedUnit == null) {
                    resolvedUnit = trimToNull(priceSnapshotDTO.getUnit());
                }
            }
        }

        if (resolvedItemName == null) {
            resolvedItemName = seedRequest.getItemNameHint();
        }
        if (resolvedUnit == null) {
            resolvedUnit = seedRequest.getUnitHint();
        }
        if (resolvedItemName == null) {
            resolvedItemName = seedRequest.getItemCode();
        }
        if (resolvedUnit == null) {
            resolvedUnit = seedRequest.getKindCode();
        }

        List<PriceSnapshotDTO> groupedSnapshotList = new ArrayList<PriceSnapshotDTO>();
        for (Map.Entry<String, BigDecimal> entry : totalPriceMap.entrySet()) {
            String snapshotDate = entry.getKey();
            int count = countMap.get(snapshotDate).intValue();
            BigDecimal avgPrice = entry.getValue().divide(BigDecimal.valueOf(count), 2, RoundingMode.HALF_UP);

            PriceSnapshotDTO priceSnapshotDTO = new PriceSnapshotDTO();
            priceSnapshotDTO.setItemCode(groupedStoredItemCode);
            priceSnapshotDTO.setItemName(resolvedItemName);
            priceSnapshotDTO.setMarketType(seedRequest.getMarketType());
            priceSnapshotDTO.setUnit(resolvedUnit);
            priceSnapshotDTO.setAvgPrice(avgPrice);
            PriceRange priceRange = priceRangeMap.get(snapshotDate);
            priceSnapshotDTO.setMinPrice(priceRange == null ? null : priceRange.getMinPrice());
            priceSnapshotDTO.setMaxPrice(priceRange == null ? null : priceRange.getMaxPrice());
            priceSnapshotDTO.setChangeRate(null);
            priceSnapshotDTO.setSnapshotDate(snapshotDate);
            priceSnapshotDTO.setSourceName(seedRequest.getSourceName());
            groupedSnapshotList.add(priceSnapshotDTO);
        }

        return groupedSnapshotList;
    }

    @Override
    public List<PriceSnapshotBackfillItemDTO> backfillDefaultPriceSnapshotSet(String startDate, String endDate) {
        List<PriceSnapshotBackfillItemDTO> defaultBackfillItemList = loadDefaultBackfillItemList();
        List<PriceSnapshotBackfillItemDTO> resultList = new ArrayList<PriceSnapshotBackfillItemDTO>();

        for (PriceSnapshotBackfillItemDTO itemDTO : defaultBackfillItemList) {
            PriceSnapshotBackfillItemDTO resultItemDTO = copyBackfillItem(itemDTO);

            try {
                int processedCount = backfillPriceSnapshotInternal(
                    itemDTO.getMarketType(),
                    itemDTO.getItemCategoryCode(),
                    itemDTO.getItemCode(),
                    itemDTO.getKindCode(),
                    itemDTO.getProductRankCode(),
                    itemDTO.getCountryCode(),
                    itemDTO.getConvertKgYn(),
                    startDate,
                    endDate,
                    itemDTO.getItemNameHint(),
                    itemDTO.getUnitHint()
                );

                resultItemDTO.setProcessedCount(processedCount);
                resultItemDTO.setSuccess(true);
                resultItemDTO.setStoredItemCode(buildHistoricalItemCode(
                    itemDTO.getMarketType(),
                    itemDTO.getItemCategoryCode(),
                    itemDTO.getItemCode(),
                    itemDTO.getKindCode(),
                    itemDTO.getProductRankCode(),
                    itemDTO.getCountryCode(),
                    itemDTO.getConvertKgYn()
                ));
            } catch (Exception exception) {
                resultItemDTO.setProcessedCount(0);
                resultItemDTO.setSuccess(false);
                resultItemDTO.setErrorMessage(exception.getMessage());
                resultItemDTO.setStoredItemCode(buildHistoricalItemCode(
                    itemDTO.getMarketType(),
                    itemDTO.getItemCategoryCode(),
                    itemDTO.getItemCode(),
                    itemDTO.getKindCode(),
                    itemDTO.getProductRankCode(),
                    itemDTO.getCountryCode(),
                    itemDTO.getConvertKgYn()
                ));

                logger.error(
                    "KAMIS 기본 품목 백필 실패 - displayName={}, itemCode={}, kindCode={}, productRankCode={}",
                    itemDTO.getDisplayName(),
                    itemDTO.getItemCode(),
                    itemDTO.getKindCode(),
                    itemDTO.getProductRankCode(),
                    exception
                );
            }

            resultList.add(resultItemDTO);
        }

        return resultList;
    }

    @Override
    public String getLatestSnapshotDate() {
        return priceSnapshotDAO.selectLatestSnapshotDate();
    }

    @Override
    public List<PriceSnapshotDTO> getPriceSnapshotList(String itemName, String marketType, String snapshotDate, Integer limit) {
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
    public List<PriceSnapshotDTO> getPriceSnapshotTrend(String itemCode, String marketType, Integer limit) {
        if (itemCode == null || itemCode.isBlank()) {
            throw new IllegalArgumentException("itemCode는 필수입니다.");
        }

        String resolvedMarketType = normalizeRequiredMarketType(marketType == null || marketType.isBlank() ? MARKET_TYPE_RETAIL : marketType);
        int resolvedLimit = resolveLimit(limit, 30, 800);

        return priceSnapshotDAO.selectPriceSnapshotTrend(itemCode.trim(), resolvedMarketType, resolvedLimit);
    }

    private int mergePriceSnapshotList(List<PriceSnapshotDTO> priceSnapshotList) {
        int processedCount = 0;

        for (PriceSnapshotDTO priceSnapshotDTO : priceSnapshotList) {
            processedCount += priceSnapshotDAO.mergePriceSnapshot(priceSnapshotDTO);
        }

        return processedCount;
    }

    private List<PriceSnapshotDTO> fetchDailyPriceSnapshotListFromKamis() {
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

            List<PriceSnapshotDTO> priceSnapshotList = new ArrayList<PriceSnapshotDTO>();
            for (JsonNode itemNode : priceNode) {
                PriceSnapshotDTO priceSnapshotDTO = new PriceSnapshotDTO();
                priceSnapshotDTO.setItemCode(trimToNull(itemNode.path("productno").asText()));
                priceSnapshotDTO.setItemName(resolveItemName(itemNode));
                priceSnapshotDTO.setMarketType(resolveMarketType(itemNode));
                priceSnapshotDTO.setUnit(trimToNull(itemNode.path("unit").asText()));
                priceSnapshotDTO.setAvgPrice(toBigDecimal(itemNode.path("dpr1")));
                priceSnapshotDTO.setMinPrice(null);
                priceSnapshotDTO.setMaxPrice(null);
                priceSnapshotDTO.setChangeRate(toBigDecimal(itemNode.path("value")));
                priceSnapshotDTO.setSnapshotDate(resolveSnapshotDate(itemNode));
                priceSnapshotDTO.setSourceName(SOURCE_NAME_DAILY);

                if (priceSnapshotDTO.getItemName() == null || priceSnapshotDTO.getUnit() == null || priceSnapshotDTO.getSnapshotDate() == null) {
                    continue;
                }
                if (priceSnapshotDTO.getAvgPrice() == null) {
                    continue;
                }

                priceSnapshotList.add(priceSnapshotDTO);
            }

            return priceSnapshotList;
        } catch (IOException exception) {
            throw new IllegalStateException("KAMIS 시세 응답을 해석하지 못했습니다.", exception);
        }
    }

    private List<PriceSnapshotDTO> fetchHistoricalPriceSnapshotListFromKamis(PriceBackfillRequest priceBackfillRequest) {
        try {
            String responseBody = requestPeriodPriceList(priceBackfillRequest);
            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode dataNode = root.path("data");

            String errorCode = dataNode.path("error_code").asText();
            if ("001".equals(errorCode)) {
                logger.warn(
                    "KAMIS 기간 시세 데이터 없음 - marketType={}, itemCategoryCode={}, itemCode={}, kindCode={}, productRankCode={}, startDate={}, endDate={}",
                    priceBackfillRequest.getMarketType(),
                    priceBackfillRequest.getItemCategoryCode(),
                    priceBackfillRequest.getItemCode(),
                    priceBackfillRequest.getKindCode(),
                    priceBackfillRequest.getProductRankCode(),
                    priceBackfillRequest.getStartDate(),
                    priceBackfillRequest.getEndDate()
                );
                return Collections.emptyList();
            }
            if (!"000".equals(errorCode)) {
                throw new IllegalStateException("KAMIS 기간 API 응답 오류입니다. errorCode=" + errorCode);
            }

            JsonNode itemNode = dataNode.path("item");
            if (!itemNode.isArray()) {
                return Collections.emptyList();
            }

            HistoricalMetadata historicalMetadata = resolveHistoricalMetadata(itemNode, priceBackfillRequest);
            Map<String, PriceSnapshotDTO> historicalSnapshotMap = buildAverageSnapshotMap(itemNode, priceBackfillRequest, historicalMetadata);

            if (historicalSnapshotMap.isEmpty()) {
                historicalSnapshotMap = buildFallbackAverageSnapshotMap(itemNode, priceBackfillRequest, historicalMetadata);
            }

            return new ArrayList<PriceSnapshotDTO>(historicalSnapshotMap.values());
        } catch (IOException exception) {
            throw new IllegalStateException("KAMIS 기간 시세 응답을 해석하지 못했습니다.", exception);
        }
    }

    private Map<String, PriceSnapshotDTO> buildAverageSnapshotMap(
        JsonNode itemNode,
        PriceBackfillRequest priceBackfillRequest,
        HistoricalMetadata historicalMetadata
    ) {
        Map<String, PriceRange> priceRangeMap = buildHistoricalPriceRangeMap(itemNode);
        Map<String, PriceSnapshotDTO> historicalSnapshotMap = new LinkedHashMap<String, PriceSnapshotDTO>();

        for (JsonNode rowNode : itemNode) {
            if (!isAverageRow(rowNode)) {
                continue;
            }

            String snapshotDate = resolveHistoricalSnapshotDate(rowNode);
            BigDecimal avgPrice = toBigDecimal(rowNode.path("price"));
            if (snapshotDate == null || avgPrice == null) {
                continue;
            }

            PriceRange priceRange = priceRangeMap.get(snapshotDate);
            historicalSnapshotMap.put(
                snapshotDate,
                createHistoricalSnapshotDTO(
                    priceBackfillRequest,
                    historicalMetadata,
                    snapshotDate,
                    avgPrice,
                    priceRange == null ? null : priceRange.getMinPrice(),
                    priceRange == null ? null : priceRange.getMaxPrice()
                )
            );
        }

        return historicalSnapshotMap;
    }

    private Map<String, PriceSnapshotDTO> buildFallbackAverageSnapshotMap(
        JsonNode itemNode,
        PriceBackfillRequest priceBackfillRequest,
        HistoricalMetadata historicalMetadata
    ) {
        Map<String, BigDecimal> totalPriceMap = new LinkedHashMap<String, BigDecimal>();
        Map<String, Integer> countMap = new LinkedHashMap<String, Integer>();
        Map<String, PriceRange> priceRangeMap = new LinkedHashMap<String, PriceRange>();

        for (JsonNode rowNode : itemNode) {
            String snapshotDate = resolveHistoricalSnapshotDate(rowNode);
            BigDecimal price = toBigDecimal(rowNode.path("price"));
            if (snapshotDate == null || price == null) {
                continue;
            }

            totalPriceMap.merge(snapshotDate, price, BigDecimal::add);
            countMap.merge(snapshotDate, Integer.valueOf(1), Integer::sum);
            accumulatePriceRange(priceRangeMap, snapshotDate, price);
        }

        Map<String, PriceSnapshotDTO> historicalSnapshotMap = new LinkedHashMap<String, PriceSnapshotDTO>();
        for (Map.Entry<String, BigDecimal> entry : totalPriceMap.entrySet()) {
            String snapshotDate = entry.getKey();
            int count = countMap.get(snapshotDate).intValue();
            BigDecimal avgPrice = entry.getValue().divide(BigDecimal.valueOf(count), 2, RoundingMode.HALF_UP);
            PriceRange priceRange = priceRangeMap.get(snapshotDate);

            historicalSnapshotMap.put(
                snapshotDate,
                createHistoricalSnapshotDTO(
                    priceBackfillRequest,
                    historicalMetadata,
                    snapshotDate,
                    avgPrice,
                    priceRange == null ? null : priceRange.getMinPrice(),
                    priceRange == null ? null : priceRange.getMaxPrice()
                )
            );
        }

        return historicalSnapshotMap;
    }

    private PriceSnapshotDTO createHistoricalSnapshotDTO(
        PriceBackfillRequest priceBackfillRequest,
        HistoricalMetadata historicalMetadata,
        String snapshotDate,
        BigDecimal avgPrice,
        BigDecimal minPrice,
        BigDecimal maxPrice
    ) {
        PriceSnapshotDTO priceSnapshotDTO = new PriceSnapshotDTO();
        priceSnapshotDTO.setItemCode(priceBackfillRequest.getStoredItemCode());
        priceSnapshotDTO.setItemName(historicalMetadata.getItemName());
        priceSnapshotDTO.setMarketType(priceBackfillRequest.getMarketType());
        priceSnapshotDTO.setUnit(historicalMetadata.getUnit());
        priceSnapshotDTO.setAvgPrice(avgPrice);
        priceSnapshotDTO.setMinPrice(minPrice);
        priceSnapshotDTO.setMaxPrice(maxPrice);
        priceSnapshotDTO.setChangeRate(null);
        priceSnapshotDTO.setSnapshotDate(snapshotDate);
        priceSnapshotDTO.setSourceName(priceBackfillRequest.getSourceName());
        return priceSnapshotDTO;
    }

    private HistoricalMetadata resolveHistoricalMetadata(JsonNode itemNode, PriceBackfillRequest priceBackfillRequest) {
        String itemName = trimToNull(priceBackfillRequest.getItemNameHint());
        String unit = trimToNull(priceBackfillRequest.getUnitHint());

        for (JsonNode rowNode : itemNode) {
            if (itemName == null) {
                itemName = trimToNull(rowNode.path("itemname").asText());
            }
            if (unit == null) {
                unit = trimToNull(rowNode.path("kindname").asText());
            }

            if (itemName != null && unit != null) {
                break;
            }
        }

        if (itemName == null) {
            itemName = priceBackfillRequest.getItemNameHint();
        }
        if (unit == null) {
            unit = priceBackfillRequest.getUnitHint();
        }
        if (itemName == null) {
            itemName = priceBackfillRequest.getItemCode();
        }
        if (unit == null) {
            unit = priceBackfillRequest.getKindCode();
        }

        return new HistoricalMetadata(itemName, unit);
    }

    private Map<String, PriceRange> buildHistoricalPriceRangeMap(JsonNode itemNode) {
        Map<String, PriceRange> priceRangeMap = new LinkedHashMap<String, PriceRange>();

        for (JsonNode rowNode : itemNode) {
            if (isAverageRow(rowNode) || isNormalYearRow(rowNode)) {
                continue;
            }

            String snapshotDate = resolveHistoricalSnapshotDate(rowNode);
            BigDecimal price = toBigDecimal(rowNode.path("price"));
            if (snapshotDate == null || price == null) {
                continue;
            }

            accumulatePriceRange(priceRangeMap, snapshotDate, price);
        }

        return priceRangeMap;
    }

    private void accumulatePriceRange(Map<String, PriceRange> priceRangeMap, String snapshotDate, BigDecimal price) {
        PriceRange priceRange = priceRangeMap.get(snapshotDate);
        if (priceRange == null) {
            priceRangeMap.put(snapshotDate, new PriceRange(price, price));
            return;
        }

        BigDecimal minPrice = priceRange.getMinPrice();
        BigDecimal maxPrice = priceRange.getMaxPrice();

        if (minPrice == null || price.compareTo(minPrice) < 0) {
            minPrice = price;
        }
        if (maxPrice == null || price.compareTo(maxPrice) > 0) {
            maxPrice = price;
        }

        priceRangeMap.put(snapshotDate, new PriceRange(minPrice, maxPrice));
    }

    private boolean isAverageRow(JsonNode rowNode) {
        String countyName = trimToNull(rowNode.path("countyname").asText());
        String marketName = trimToNull(rowNode.path("marketname").asText());
        if ("평균".equals(countyName)) {
            return true;
        }
        return countyName == null && marketName == null;
    }

    private boolean isNormalYearRow(JsonNode rowNode) {
        String countyName = trimToNull(rowNode.path("countyname").asText());
        return "평년".equals(countyName);
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

    private List<PriceSnapshotBackfillItemDTO> loadDefaultBackfillItemList() {
        ClassPathResource classPathResource = new ClassPathResource(DEFAULT_BACKFILL_ITEM_RESOURCE_PATH);

        try (BufferedReader bufferedReader = new BufferedReader(new InputStreamReader(classPathResource.getInputStream(), StandardCharsets.UTF_8))) {
            List<PriceSnapshotBackfillItemDTO> backfillItemList = new ArrayList<PriceSnapshotBackfillItemDTO>();
            String line = null;
            boolean headerSkipped = false;

            while ((line = bufferedReader.readLine()) != null) {
                String normalizedLine = line.trim();
                if (normalizedLine.isEmpty() || normalizedLine.startsWith("#")) {
                    continue;
                }
                if (!headerSkipped) {
                    headerSkipped = true;
                    continue;
                }

                String[] tokenArray = normalizedLine.split(",", -1);
                if (tokenArray.length != 8 && tokenArray.length != 10) {
                    throw new IllegalStateException("기본 시세 백필 품목 목록 형식이 올바르지 않습니다. line=" + normalizedLine);
                }

                PriceSnapshotBackfillItemDTO backfillItemDTO = new PriceSnapshotBackfillItemDTO();
                backfillItemDTO.setDisplayName(tokenArray[0].trim());
                backfillItemDTO.setMarketType(tokenArray[1].trim());
                backfillItemDTO.setItemCategoryCode(tokenArray[2].trim());
                backfillItemDTO.setItemCode(tokenArray[3].trim());
                backfillItemDTO.setKindCode(tokenArray[4].trim());
                backfillItemDTO.setProductRankCode(tokenArray[5].trim());
                backfillItemDTO.setCountryCode(tokenArray[6].trim());
                backfillItemDTO.setConvertKgYn(tokenArray[7].trim());
                backfillItemDTO.setItemNameHint(tokenArray.length >= 9 ? trimToNull(tokenArray[8]) : deriveItemNameHint(backfillItemDTO.getDisplayName()));
                backfillItemDTO.setUnitHint(tokenArray.length >= 10 ? trimToNull(tokenArray[9]) : null);
                backfillItemList.add(backfillItemDTO);
            }

            return backfillItemList;
        } catch (IOException exception) {
            throw new IllegalStateException("기본 시세 백필 품목 목록을 읽지 못했습니다.", exception);
        }
    }

    private String requestPeriodPriceList(PriceBackfillRequest priceBackfillRequest) {
        String action = MARKET_TYPE_RETAIL.equals(priceBackfillRequest.getMarketType())
            ? "periodRetailProductList"
            : "periodWholesaleProductList";

        UriComponentsBuilder uriComponentsBuilder = UriComponentsBuilder
            .fromHttpUrl(kamisBaseUrl)
            .queryParam("action", action)
            .queryParam("p_startday", priceBackfillRequest.getStartDate())
            .queryParam("p_endday", priceBackfillRequest.getEndDate())
            .queryParam("p_itemcategorycode", priceBackfillRequest.getItemCategoryCode())
            .queryParam("p_itemcode", priceBackfillRequest.getItemCode())
            .queryParam("p_kindcode", priceBackfillRequest.getKindCode())
            .queryParam("p_productrankcode", priceBackfillRequest.getProductRankCode())
            .queryParam("p_countrycode", priceBackfillRequest.getCountryCode())
            .queryParam("p_convert_kg_yn", priceBackfillRequest.getConvertKgYn())
            .queryParam("p_cert_key", kamisCertKey)
            .queryParam("p_cert_id", kamisCertId)
            .queryParam("p_returntype", "json");

        String requestUrl = uriComponentsBuilder.build(true).toUriString();

        logger.info(
            "KAMIS 시세 기간 조회 요청 - action={}, marketType={}, itemCategoryCode={}, itemCode={}, kindCode={}, productRankCode={}, countryCode={}, startDate={}, endDate={}",
            action,
            priceBackfillRequest.getMarketType(),
            priceBackfillRequest.getItemCategoryCode(),
            priceBackfillRequest.getItemCode(),
            priceBackfillRequest.getKindCode(),
            priceBackfillRequest.getProductRankCode(),
            priceBackfillRequest.getCountryCode(),
            priceBackfillRequest.getStartDate(),
            priceBackfillRequest.getEndDate()
        );

        String responseBody = restTemplate.getForObject(requestUrl, String.class);
        if (responseBody == null || responseBody.isBlank()) {
            throw new IllegalStateException("KAMIS 기간 시세 응답이 비어 있습니다.");
        }
        return responseBody;
    }

    private RestTemplate createRestTemplate() {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(5000);
        requestFactory.setReadTimeout(10000);
        return new RestTemplate(requestFactory);
    }

    private PriceBackfillRequest createPriceBackfillRequest(
        String marketType,
        String itemCategoryCode,
        String itemCode,
        String kindCode,
        String productRankCode,
        String countryCode,
        String convertKgYn,
        String startDate,
        String endDate,
        String itemNameHint,
        String unitHint
    ) {
        String resolvedMarketType = normalizeRequiredMarketType(marketType == null || marketType.isBlank() ? MARKET_TYPE_RETAIL : marketType);
        String resolvedItemCategoryCode = requireText(itemCategoryCode, "itemCategoryCode");
        String resolvedItemCode = requireText(itemCode, "itemCode");
        String resolvedKindCode = requireText(kindCode, "kindCode");
        String resolvedProductRankCode = requireText(productRankCode, "productRankCode");
        String resolvedCountryCode = trimToNull(countryCode);
        if (resolvedCountryCode == null) {
            resolvedCountryCode = DEFAULT_COUNTRY_CODE;
        }
        String resolvedConvertKgYn = normalizeConvertKgYn(convertKgYn);

        LocalDate resolvedEndDate = parseBackfillDateOrDefault(endDate, LocalDate.now());
        LocalDate resolvedStartDate = parseBackfillDateOrDefault(startDate, resolvedEndDate.minusDays(DEFAULT_BACKFILL_DAYS - 1L));

        if (resolvedStartDate.isAfter(resolvedEndDate)) {
            throw new IllegalArgumentException("startDate는 endDate보다 늦을 수 없습니다.");
        }

        long totalDays = ChronoUnit.DAYS.between(resolvedStartDate, resolvedEndDate) + 1L;
        if (totalDays > MAX_BACKFILL_DAYS) {
            throw new IllegalArgumentException("KAMIS 기간 API는 최대 1년(365일)까지만 조회할 수 있습니다.");
        }

        String sourceName = MARKET_TYPE_RETAIL.equals(resolvedMarketType)
            ? SOURCE_NAME_PERIOD_RETAIL
            : SOURCE_NAME_PERIOD_WHOLESALE;

        String storedItemCode = buildHistoricalItemCode(
            resolvedMarketType,
            resolvedItemCategoryCode,
            resolvedItemCode,
            resolvedKindCode,
            resolvedProductRankCode,
            resolvedCountryCode,
            resolvedConvertKgYn
        );

        return new PriceBackfillRequest(
            resolvedMarketType,
            resolvedItemCategoryCode,
            resolvedItemCode,
            resolvedKindCode,
            resolvedProductRankCode,
            resolvedCountryCode,
            resolvedConvertKgYn,
            resolvedStartDate.format(SNAPSHOT_DATE_FORMATTER),
            resolvedEndDate.format(SNAPSHOT_DATE_FORMATTER),
            storedItemCode,
            sourceName,
            trimToNull(itemNameHint),
            trimToNull(unitHint)
        );
    }

    private String buildHistoricalItemCode(
        String marketType,
        String itemCategoryCode,
        String itemCode,
        String kindCode,
        String productRankCode,
        String countryCode,
        String convertKgYn
    ) {
        return marketType
            + "_"
            + itemCategoryCode
            + "_"
            + itemCode
            + "_"
            + normalizeStoredCodeSegment(kindCode)
            + "_"
            + productRankCode
            + "_"
            + countryCode
            + "_"
            + convertKgYn;
    }

    private List<String> splitKindCodeList(String kindCode) {
        String normalizedKindCode = requireText(kindCode, "kindCode");
        String[] tokenArray = normalizedKindCode.split("\\|");
        List<String> kindCodeList = new ArrayList<String>();

        for (String token : tokenArray) {
            String normalizedToken = trimToNull(token);
            if (normalizedToken != null) {
                kindCodeList.add(normalizedToken);
            }
        }

        if (kindCodeList.isEmpty()) {
            throw new IllegalArgumentException("kindCode는 필수입니다.");
        }
        return kindCodeList;
    }

    private String normalizeStoredCodeSegment(String value) {
        String normalizedValue = trimToNull(value);
        if (normalizedValue == null) {
            return "";
        }

        return normalizedValue
            .replace(MULTI_KIND_CODE_DELIMITER, "-")
            .replace(",", "-")
            .replace(" ", "");
    }

    private PriceSnapshotBackfillItemDTO copyBackfillItem(PriceSnapshotBackfillItemDTO sourceDTO) {
        PriceSnapshotBackfillItemDTO copiedDTO = new PriceSnapshotBackfillItemDTO();
        copiedDTO.setDisplayName(sourceDTO.getDisplayName());
        copiedDTO.setMarketType(sourceDTO.getMarketType());
        copiedDTO.setItemCategoryCode(sourceDTO.getItemCategoryCode());
        copiedDTO.setItemCode(sourceDTO.getItemCode());
        copiedDTO.setKindCode(sourceDTO.getKindCode());
        copiedDTO.setProductRankCode(sourceDTO.getProductRankCode());
        copiedDTO.setCountryCode(sourceDTO.getCountryCode());
        copiedDTO.setConvertKgYn(sourceDTO.getConvertKgYn());
        copiedDTO.setItemNameHint(sourceDTO.getItemNameHint());
        copiedDTO.setUnitHint(sourceDTO.getUnitHint());
        return copiedDTO;
    }

    private String deriveItemNameHint(String displayName) {
        String normalizedDisplayName = trimToNull(displayName);
        if (normalizedDisplayName == null) {
            return null;
        }

        int bracketIndex = normalizedDisplayName.indexOf('(');
        if (bracketIndex < 0) {
            return normalizedDisplayName;
        }

        return trimToNull(normalizedDisplayName.substring(0, bracketIndex));
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

    private String resolveHistoricalSnapshotDate(JsonNode itemNode) {
        String year = trimToNull(itemNode.path("yyyy").asText());
        String regday = trimToNull(itemNode.path("regday").asText());

        if (year == null || regday == null) {
            return null;
        }

        try {
            if (regday.matches("\\d{2}/\\d{2}")) {
                return LocalDate.parse(year + "/" + regday, REGDAY_SLASH_FORMATTER).format(SNAPSHOT_DATE_FORMATTER);
            }
            if (regday.matches("\\d{2}-\\d{2}")) {
                return LocalDate.parse(year + "-" + regday, REGDAY_DASH_FORMATTER).format(SNAPSHOT_DATE_FORMATTER);
            }
            if (regday.matches("\\d{4}-\\d{2}-\\d{2}")) {
                return LocalDate.parse(regday, SNAPSHOT_DATE_FORMATTER).format(SNAPSHOT_DATE_FORMATTER);
            }
            if (regday.matches("\\d{4}/\\d{2}/\\d{2}")) {
                return LocalDate.parse(regday, REGDAY_SLASH_FORMATTER).format(SNAPSHOT_DATE_FORMATTER);
            }
        } catch (DateTimeParseException exception) {
            throw new IllegalArgumentException("KAMIS 기간 시세 날짜 형식이 올바르지 않습니다. regday=" + regday, exception);
        }

        throw new IllegalArgumentException("KAMIS 기간 시세 날짜 형식이 올바르지 않습니다. regday=" + regday);
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

    private String normalizeConvertKgYn(String convertKgYn) {
        String value = trimToNull(convertKgYn);
        if (value == null) {
            return DEFAULT_CONVERT_KG_YN;
        }

        String normalizedValue = value.toUpperCase(Locale.ROOT);
        if ("Y".equals(normalizedValue) || "N".equals(normalizedValue)) {
            return normalizedValue;
        }

        throw new IllegalArgumentException("convertKgYn은 Y 또는 N 이어야 합니다.");
    }

    private LocalDate parseBackfillDateOrDefault(String value, LocalDate defaultDate) {
        String normalizedValue = trimToNull(value);
        if (normalizedValue == null) {
            return defaultDate;
        }

        try {
            return LocalDate.parse(normalizedValue, SNAPSHOT_DATE_FORMATTER);
        } catch (DateTimeParseException exception) {
            throw new IllegalArgumentException("날짜는 yyyy-MM-dd 형식이어야 합니다.", exception);
        }
    }

    private int resolveLimit(Integer limit, int defaultValue, int maxValue) {
        if (limit == null || limit.intValue() <= 0) {
            return defaultValue;
        }
        return Math.min(limit.intValue(), maxValue);
    }

    private String requireText(String value, String fieldName) {
        String normalizedValue = trimToNull(value);
        if (normalizedValue == null) {
            throw new IllegalArgumentException(fieldName + "는 필수입니다.");
        }
        return normalizedValue;
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

    private static final class HistoricalMetadata {

        private final String itemName;
        private final String unit;

        private HistoricalMetadata(String itemName, String unit) {
            this.itemName = itemName;
            this.unit = unit;
        }

        private String getItemName() {
            return itemName;
        }

        private String getUnit() {
            return unit;
        }
    }

    private static final class PriceRange {

        private final BigDecimal minPrice;
        private final BigDecimal maxPrice;

        private PriceRange(BigDecimal minPrice, BigDecimal maxPrice) {
            this.minPrice = minPrice;
            this.maxPrice = maxPrice;
        }

        private BigDecimal getMinPrice() {
            return minPrice;
        }

        private BigDecimal getMaxPrice() {
            return maxPrice;
        }
    }

    private static final class PriceBackfillRequest {

        private final String marketType;
        private final String itemCategoryCode;
        private final String itemCode;
        private final String kindCode;
        private final String productRankCode;
        private final String countryCode;
        private final String convertKgYn;
        private final String startDate;
        private final String endDate;
        private final String storedItemCode;
        private final String sourceName;
        private final String itemNameHint;
        private final String unitHint;

        private PriceBackfillRequest(
            String marketType,
            String itemCategoryCode,
            String itemCode,
            String kindCode,
            String productRankCode,
            String countryCode,
            String convertKgYn,
            String startDate,
            String endDate,
            String storedItemCode,
            String sourceName,
            String itemNameHint,
            String unitHint
        ) {
            this.marketType = marketType;
            this.itemCategoryCode = itemCategoryCode;
            this.itemCode = itemCode;
            this.kindCode = kindCode;
            this.productRankCode = productRankCode;
            this.countryCode = countryCode;
            this.convertKgYn = convertKgYn;
            this.startDate = startDate;
            this.endDate = endDate;
            this.storedItemCode = storedItemCode;
            this.sourceName = sourceName;
            this.itemNameHint = itemNameHint;
            this.unitHint = unitHint;
        }

        private String getMarketType() {
            return marketType;
        }

        private String getItemCategoryCode() {
            return itemCategoryCode;
        }

        private String getItemCode() {
            return itemCode;
        }

        private String getKindCode() {
            return kindCode;
        }

        private String getProductRankCode() {
            return productRankCode;
        }

        private String getCountryCode() {
            return countryCode;
        }

        private String getConvertKgYn() {
            return convertKgYn;
        }

        private String getStartDate() {
            return startDate;
        }

        private String getEndDate() {
            return endDate;
        }

        private String getStoredItemCode() {
            return storedItemCode;
        }

        private String getSourceName() {
            return sourceName;
        }

        private String getItemNameHint() {
            return itemNameHint;
        }

        private String getUnitHint() {
            return unitHint;
        }
    }
}
