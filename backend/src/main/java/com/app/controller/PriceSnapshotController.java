package com.app.controller;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.app.dto.PriceSnapshotBackfillItemDTO;
import com.app.dto.PriceSnapshotDTO;
import com.app.service.PriceSnapshotService;

@RestController
@RequestMapping("/api")
public class PriceSnapshotController {

    private static final String MARKET_TYPE_RETAIL = "RETAIL";
    private static final String MARKET_TYPE_WHOLESALE = "WHOLESALE";
    private static final String DEFAULT_COUNTRY_CODE = "1101";
    private static final String DEFAULT_CONVERT_KG_YN = "Y";
    private static final int DEFAULT_BACKFILL_DAYS = 365;

    private final PriceSnapshotService priceSnapshotService;

    public PriceSnapshotController(PriceSnapshotService priceSnapshotService) {
        this.priceSnapshotService = priceSnapshotService;
    }

    @GetMapping("/prices")
    public ResponseEntity<Map<String, Object>> getPriceSnapshotList(
        @RequestParam(value = "itemName", required = false) String itemName,
        @RequestParam(value = "marketType", required = false) String marketType,
        @RequestParam(value = "snapshotDate", required = false) String snapshotDate,
        @RequestParam(value = "limit", required = false) Integer limit
    ) {
        try {
            List<PriceSnapshotDTO> priceSnapshotList = priceSnapshotService.getPriceSnapshotList(itemName, marketType, snapshotDate, limit);

            Map<String, Object> data = new LinkedHashMap<String, Object>();
            data.put("count", priceSnapshotList.size());
            data.put("snapshotDate", priceSnapshotList.isEmpty() ? snapshotDate : priceSnapshotList.get(0).getSnapshotDate());
            data.put("prices", priceSnapshotList);

            return success(data, "시세 목록 조회 성공");
        } catch (IllegalArgumentException exception) {
            return error(HttpStatus.BAD_REQUEST, "INVALID_PRICE_REQUEST", exception.getMessage());
        } catch (Exception exception) {
            return error(HttpStatus.INTERNAL_SERVER_ERROR, "PRICE_LIST_ERROR", "시세 목록 조회 중 오류가 발생했습니다.");
        }
    }

    @GetMapping("/prices/trend")
    public ResponseEntity<Map<String, Object>> getPriceSnapshotTrend(
        @RequestParam(value = "itemCode") String itemCode,
        @RequestParam(value = "marketType", required = false) String marketType,
        @RequestParam(value = "days", required = false) Integer days
    ) {
        try {
            List<PriceSnapshotDTO> priceSnapshotTrend = priceSnapshotService.getPriceSnapshotTrend(itemCode, marketType, days);

            Map<String, Object> data = new LinkedHashMap<String, Object>();
            data.put("count", priceSnapshotTrend.size());
            data.put("itemCode", itemCode);
            data.put("marketType", marketType == null || marketType.isBlank() ? MARKET_TYPE_RETAIL : marketType);
            data.put("trend", priceSnapshotTrend);

            return success(data, "시세 추이 조회 성공");
        } catch (IllegalArgumentException exception) {
            return error(HttpStatus.BAD_REQUEST, "INVALID_PRICE_TREND_REQUEST", exception.getMessage());
        } catch (Exception exception) {
            return error(HttpStatus.INTERNAL_SERVER_ERROR, "PRICE_TREND_ERROR", "시세 추이 조회 중 오류가 발생했습니다.");
        }
    }

    @PostMapping("/admin/prices/sync")
    public ResponseEntity<Map<String, Object>> syncPriceSnapshot() {
        try {
            int processedCount = priceSnapshotService.syncPriceSnapshot();

            Map<String, Object> data = new LinkedHashMap<String, Object>();
            data.put("processedCount", processedCount);
            data.put("latestSnapshotDate", priceSnapshotService.getLatestSnapshotDate());

            return success(data, "시세 수집 및 저장 성공");
        } catch (IllegalArgumentException exception) {
            return error(HttpStatus.BAD_REQUEST, "INVALID_PRICE_SYNC_REQUEST", exception.getMessage());
        } catch (Exception exception) {
            return error(HttpStatus.INTERNAL_SERVER_ERROR, "PRICE_SYNC_ERROR", "시세 수집 및 저장 중 오류가 발생했습니다.");
        }
    }

    @PostMapping("/admin/prices/backfill")
    public ResponseEntity<Map<String, Object>> backfillPriceSnapshot(
        @RequestParam(value = "marketType", required = false) String marketType,
        @RequestParam(value = "itemCategoryCode") String itemCategoryCode,
        @RequestParam(value = "itemCode") String itemCode,
        @RequestParam(value = "kindCode") String kindCode,
        @RequestParam(value = "productRankCode") String productRankCode,
        @RequestParam(value = "countryCode", required = false) String countryCode,
        @RequestParam(value = "convertKgYn", required = false) String convertKgYn,
        @RequestParam(value = "startDate", required = false) String startDate,
        @RequestParam(value = "endDate", required = false) String endDate
    ) {
        try {
            String resolvedMarketType = normalizeMarketType(marketType);
            String resolvedCountryCode = normalizeCountryCode(countryCode);
            String resolvedConvertKgYn = normalizeConvertKgYn(convertKgYn);
            String resolvedEndDate = resolveEndDate(endDate);
            String resolvedStartDate = resolveStartDate(startDate, resolvedEndDate);

            int processedCount = priceSnapshotService.backfillPriceSnapshot(
                resolvedMarketType,
                itemCategoryCode,
                itemCode,
                kindCode,
                productRankCode,
                resolvedCountryCode,
                resolvedConvertKgYn,
                resolvedStartDate,
                resolvedEndDate
            );

            Map<String, Object> data = new LinkedHashMap<String, Object>();
            data.put("processedCount", processedCount);
            data.put("marketType", resolvedMarketType);
            data.put("itemCategoryCode", itemCategoryCode);
            data.put("itemCode", itemCode);
            data.put("kindCode", kindCode);
            data.put("productRankCode", productRankCode);
            data.put("countryCode", resolvedCountryCode);
            data.put("convertKgYn", resolvedConvertKgYn);
            data.put("startDate", resolvedStartDate);
            data.put("endDate", resolvedEndDate);
            data.put("storedItemCode", buildStoredItemCode(
                resolvedMarketType,
                itemCategoryCode,
                itemCode,
                kindCode,
                productRankCode,
                resolvedCountryCode,
                resolvedConvertKgYn
            ));
            data.put("latestSnapshotDate", priceSnapshotService.getLatestSnapshotDate());

            return success(data, "시세 1년 백필 성공");
        } catch (IllegalArgumentException exception) {
            return error(HttpStatus.BAD_REQUEST, "INVALID_PRICE_BACKFILL_REQUEST", exception.getMessage());
        } catch (Exception exception) {
            return error(HttpStatus.INTERNAL_SERVER_ERROR, "PRICE_BACKFILL_ERROR", "시세 기간 백필 중 오류가 발생했습니다.");
        }
    }

    @PostMapping("/admin/prices/backfill/default-set")
    public ResponseEntity<Map<String, Object>> backfillDefaultPriceSnapshotSet(
        @RequestParam(value = "startDate", required = false) String startDate,
        @RequestParam(value = "endDate", required = false) String endDate
    ) {
        try {
            String resolvedEndDate = resolveEndDate(endDate);
            String resolvedStartDate = resolveStartDate(startDate, resolvedEndDate);
            List<PriceSnapshotBackfillItemDTO> resultItemList = priceSnapshotService.backfillDefaultPriceSnapshotSet(resolvedStartDate, resolvedEndDate);

            int successCount = 0;
            int failureCount = 0;
            int processedCount = 0;

            for (PriceSnapshotBackfillItemDTO itemDTO : resultItemList) {
                processedCount += itemDTO.getProcessedCount();
                if (itemDTO.isSuccess()) {
                    successCount++;
                } else {
                    failureCount++;
                }
            }

            Map<String, Object> data = new LinkedHashMap<String, Object>();
            data.put("startDate", resolvedStartDate);
            data.put("endDate", resolvedEndDate);
            data.put("itemCount", resultItemList.size());
            data.put("successCount", successCount);
            data.put("failureCount", failureCount);
            data.put("processedCount", processedCount);
            data.put("items", resultItemList);
            data.put("latestSnapshotDate", priceSnapshotService.getLatestSnapshotDate());

            return success(data, "기본 시세 품목 세트 백필 성공");
        } catch (IllegalArgumentException exception) {
            return error(HttpStatus.BAD_REQUEST, "INVALID_PRICE_DEFAULT_BACKFILL_REQUEST", exception.getMessage());
        } catch (Exception exception) {
            return error(HttpStatus.INTERNAL_SERVER_ERROR, "PRICE_DEFAULT_BACKFILL_ERROR", "기본 시세 품목 세트 백필 중 오류가 발생했습니다.");
        }
    }

    private ResponseEntity<Map<String, Object>> success(Map<String, Object> data, String message) {
        Map<String, Object> body = new LinkedHashMap<String, Object>();
        body.put("success", Boolean.TRUE);
        body.put("data", data);
        body.put("message", message);
        return ResponseEntity.ok(body);
    }

    private ResponseEntity<Map<String, Object>> error(HttpStatus status, String errorCode, String message) {
        Map<String, Object> body = new LinkedHashMap<String, Object>();
        body.put("success", Boolean.FALSE);
        body.put("errorCode", errorCode);
        body.put("message", message);
        return ResponseEntity.status(status).body(body);
    }

    private String normalizeMarketType(String marketType) {
        if (marketType == null || marketType.isBlank()) {
            return MARKET_TYPE_RETAIL;
        }

        String normalizedValue = marketType.trim().toUpperCase(Locale.ROOT);
        if (MARKET_TYPE_RETAIL.equals(normalizedValue) || MARKET_TYPE_WHOLESALE.equals(normalizedValue)) {
            return normalizedValue;
        }

        throw new IllegalArgumentException("marketType은 RETAIL 또는 WHOLESALE 이어야 합니다.");
    }

    private String normalizeCountryCode(String countryCode) {
        if (countryCode == null || countryCode.isBlank()) {
            return DEFAULT_COUNTRY_CODE;
        }
        return countryCode.trim();
    }

    private String normalizeConvertKgYn(String convertKgYn) {
        if (convertKgYn == null || convertKgYn.isBlank()) {
            return DEFAULT_CONVERT_KG_YN;
        }

        String normalizedValue = convertKgYn.trim().toUpperCase(Locale.ROOT);
        if ("Y".equals(normalizedValue) || "N".equals(normalizedValue)) {
            return normalizedValue;
        }

        throw new IllegalArgumentException("convertKgYn은 Y 또는 N 이어야 합니다.");
    }

    private String resolveEndDate(String endDate) {
        if (endDate == null || endDate.isBlank()) {
            return LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE);
        }
        return parseDate(endDate).format(DateTimeFormatter.ISO_LOCAL_DATE);
    }

    private String resolveStartDate(String startDate, String resolvedEndDate) {
        if (startDate == null || startDate.isBlank()) {
            return LocalDate.parse(resolvedEndDate).minusDays(DEFAULT_BACKFILL_DAYS - 1L).format(DateTimeFormatter.ISO_LOCAL_DATE);
        }
        return parseDate(startDate).format(DateTimeFormatter.ISO_LOCAL_DATE);
    }

    private LocalDate parseDate(String value) {
        try {
            return LocalDate.parse(value.trim(), DateTimeFormatter.ISO_LOCAL_DATE);
        } catch (DateTimeParseException exception) {
            throw new IllegalArgumentException("날짜는 yyyy-MM-dd 형식이어야 합니다.", exception);
        }
    }

    private String buildStoredItemCode(
        String marketType,
        String itemCategoryCode,
        String itemCode,
        String kindCode,
        String productRankCode,
        String countryCode,
        String convertKgYn
    ) {
        String normalizedKindCode = kindCode == null ? "" : kindCode.trim().replace("|", "-");

        return marketType
            + "_"
            + itemCategoryCode
            + "_"
            + itemCode
            + "_"
            + normalizedKindCode
            + "_"
            + productRankCode
            + "_"
            + countryCode
            + "_"
            + convertKgYn;
    }
}
