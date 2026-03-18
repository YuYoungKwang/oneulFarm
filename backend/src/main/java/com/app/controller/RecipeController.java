package com.app.controller;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.app.dto.RecipeDTO;
import com.app.service.RecipeService;

@RestController
@RequestMapping("/api")
public class RecipeController {

    private static final Logger logger = LoggerFactory.getLogger(RecipeController.class);

    private final RecipeService recipeService;

    public RecipeController(RecipeService recipeService) {
        this.recipeService = recipeService;
    }

    @GetMapping("/recipes")
    public ResponseEntity<Map<String, Object>> getRecipeList(
        @RequestParam(value = "keyword", required = false) String keyword,
        @RequestParam(value = "limit", required = false) Integer limit
    ) {
        try {
            List<RecipeDTO> recipeList = recipeService.getRecipeList(keyword, limit);

            Map<String, Object> data = new LinkedHashMap<String, Object>();
            data.put("count", Integer.valueOf(recipeList.size()));
            data.put("recipes", recipeList);

            return success(data, "레시피 목록 조회 성공");
        } catch (IllegalArgumentException exception) {
            return error(HttpStatus.BAD_REQUEST, "INVALID_RECIPE_REQUEST", exception.getMessage());
        } catch (Exception exception) {
            return error(HttpStatus.INTERNAL_SERVER_ERROR, "RECIPE_LIST_ERROR", "레시피 목록 조회 중 오류가 발생했습니다.");
        }
    }

    @GetMapping("/recipes/{recipeNo}")
    public ResponseEntity<Map<String, Object>> getRecipeDetail(@PathVariable("recipeNo") Long recipeNo) {
        try {
            Map<String, Object> recipeDetail = recipeService.getRecipeDetail(recipeNo);
            return success(recipeDetail, "레시피 상세 조회 성공");
        } catch (IllegalArgumentException exception) {
            return error(HttpStatus.BAD_REQUEST, "INVALID_RECIPE_DETAIL_REQUEST", exception.getMessage());
        } catch (Exception exception) {
            return error(HttpStatus.INTERNAL_SERVER_ERROR, "RECIPE_DETAIL_ERROR", "레시피 상세 조회 중 오류가 발생했습니다.");
        }
    }

    @PostMapping("/admin/recipes/sync")
    public ResponseEntity<Map<String, Object>> syncRecipe(
        @RequestParam(value = "keyword", required = false) String keyword,
        @RequestParam(value = "limit", required = false) Integer limit
    ) {
        try {
            int processedCount = recipeService.syncRecipe(keyword, limit);

            Map<String, Object> data = new LinkedHashMap<String, Object>();
            data.put("processedCount", Integer.valueOf(processedCount));
            data.put("keyword", keyword);

            return success(data, "레시피 수집 및 저장 성공");
        } catch (IllegalArgumentException exception) {
            return error(HttpStatus.BAD_REQUEST, "INVALID_RECIPE_SYNC_REQUEST", exception.getMessage());
        } catch (Exception exception) {
            logger.error("레시피 수집 및 저장 중 오류가 발생했습니다.", exception);
            return error(HttpStatus.INTERNAL_SERVER_ERROR, "RECIPE_SYNC_ERROR", buildDetailedErrorMessage("레시피 수집 및 저장 중 오류가 발생했습니다.", exception));
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

    private String buildDetailedErrorMessage(String baseMessage, Exception exception) {
        if (exception == null || exception.getMessage() == null || exception.getMessage().isBlank()) {
            return baseMessage;
        }
        return baseMessage + " - " + exception.getMessage();
    }
}
