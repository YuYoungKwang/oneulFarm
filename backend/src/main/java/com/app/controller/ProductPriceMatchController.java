package com.app.controller;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.app.service.ProductPriceMatchService;
import com.app.service.ProductPriceMatchService.ProductPriceMatchRefreshResult;

@RestController
@RequestMapping("/api")
public class ProductPriceMatchController {

    private final ProductPriceMatchService productPriceMatchService;

    public ProductPriceMatchController(ProductPriceMatchService productPriceMatchService) {
        this.productPriceMatchService = productPriceMatchService;
    }

    @PostMapping("/admin/product-price-match/sync")
    public ResponseEntity<Map<String, Object>> syncProductPriceMatch() {
        try {
            ProductPriceMatchRefreshResult refreshResult = productPriceMatchService.refreshProductPriceMatch();

            Map<String, Object> data = new LinkedHashMap<String, Object>();
            data.put("deletedCount", refreshResult.getDeletedCount());
            data.put("processedCount", refreshResult.getProcessedCount());
            data.put("matchedSnapshotCount", refreshResult.getMatchedSnapshotCount());
            data.put("badgeCount", refreshResult.getBadgeCount());
            data.put("skippedCount", refreshResult.getSkippedCount());

            return success(data, "Product price match sync completed.");
        } catch (IllegalArgumentException exception) {
            return error(HttpStatus.BAD_REQUEST, "INVALID_PRODUCT_PRICE_MATCH_REQUEST", exception.getMessage());
        } catch (Exception exception) {
            return error(HttpStatus.INTERNAL_SERVER_ERROR, "PRODUCT_PRICE_MATCH_SYNC_ERROR", "Product price match sync failed.");
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
