package com.app.controller;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.app.common.ApiResponse;
import com.app.service.NaverDataLabService;

@RestController
@RequestMapping(value = "/api/recommendations", produces = MediaType.APPLICATION_JSON_VALUE)
public class RecommendController {

    private final NaverDataLabService naverDataLabService;

    public RecommendController(NaverDataLabService naverDataLabService) {
        this.naverDataLabService = naverDataLabService;
    }

    @PostMapping("/popular-searches")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getPopularSearches(
        @RequestBody(required = false) Map<String, Object> requestBody
    ) {
        try {
            List<String> keywordList = extractKeywordList(
                requestBody == null ? null : requestBody.get("keywords")
            );
            String startDate = readString(requestBody, "startDate");
            String endDate = readString(requestBody, "endDate");
            String timeUnit = readString(requestBody, "timeUnit");

            Map<String, Object> data = naverDataLabService.getPopularSearchData(
                keywordList,
                startDate,
                endDate,
                timeUnit
            );

            return ResponseEntity.ok(ApiResponse.success(data, "popular searches fetched"));
        } catch (IllegalArgumentException exception) {
            return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.failure(exception.getMessage()));
        } catch (IllegalStateException exception) {
            return ResponseEntity
                .status(HttpStatus.BAD_GATEWAY)
                .body(ApiResponse.failure(exception.getMessage()));
        } catch (Exception exception) {
            return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.failure("Failed to load popular search data."));
        }
    }

    private List<String> extractKeywordList(Object keywordObject) {
        if (!(keywordObject instanceof List<?>)) {
            throw new IllegalArgumentException("keywords must be provided as an array.");
        }

        List<String> keywordList = new ArrayList<String>();
        for (Object value : (List<?>) keywordObject) {
            if (value == null) {
                continue;
            }

            keywordList.add(String.valueOf(value));
        }

        return keywordList;
    }

    private String readString(Map<String, Object> requestBody, String key) {
        if (requestBody == null) {
            return null;
        }

        Object value = requestBody.get(key);
        if (value == null) {
            return null;
        }

        return String.valueOf(value);
    }
}
