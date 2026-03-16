package com.app.controller;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.app.dto.PriceSnapshot;
import com.app.service.PriceSnapshotService;

@RestController
@RequestMapping("/api")
public class PriceSnapshotController {

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
            List<PriceSnapshot> priceSnapshotList = priceSnapshotService.getPriceSnapshotList(itemName, marketType, snapshotDate, limit);

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
            List<PriceSnapshot> priceSnapshotTrend = priceSnapshotService.getPriceSnapshotTrend(itemCode, marketType, days);

            Map<String, Object> data = new LinkedHashMap<String, Object>();
            data.put("count", priceSnapshotTrend.size());
            data.put("itemCode", itemCode);
            data.put("marketType", marketType == null || marketType.isBlank() ? "RETAIL" : marketType);
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
}
