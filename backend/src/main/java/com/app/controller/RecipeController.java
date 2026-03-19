package com.app.controller;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.app.common.ApiResponse;
import com.app.dto.RecipeDetailDTO;
import com.app.dto.RecipeListResponseDTO;
import com.app.service.RecipeService;

@RestController
@RequestMapping(value = "/api", produces = MediaType.APPLICATION_JSON_VALUE)
public class RecipeController {

    private final RecipeService recipeService;

    public RecipeController(RecipeService recipeService) {
        this.recipeService = recipeService;
    }

    @GetMapping("/recipes")
    public ApiResponse<RecipeListResponseDTO> getRecipeList(
        @RequestParam(value = "keyword", required = false) String keyword,
        @RequestParam(value = "ingredientKeyword", required = false) String ingredientKeyword,
        @RequestParam(value = "sort", required = false) String sort,
        @RequestParam(value = "limit", required = false) Integer limit
    ) {
        return ApiResponse.success(
            recipeService.getRecipeList(keyword, ingredientKeyword, sort, limit),
            "레시피 목록 조회 성공"
        );
    }

    @PostMapping("/admin/recipes/sync")
    public ResponseEntity<ApiResponse<Map<String, Object>>> syncRecipe(
        @RequestParam(value = "keyword", required = false) String keyword,
        @RequestParam(value = "limit", required = false) Integer limit
    ) {
        try {
            int processedCount = recipeService.syncRecipe(keyword, limit);

            Map<String, Object> data = new LinkedHashMap<String, Object>();
            data.put("processedCount", Integer.valueOf(processedCount));
            data.put("keyword", keyword);
            data.put("limit", limit);

            return ResponseEntity.ok(ApiResponse.success(data, "레시피 수집 및 저장 성공"));
        } catch (IllegalArgumentException exception) {
            return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.failure(exception.getMessage()));
        } catch (Exception exception) {
            return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.failure("레시피 수집 및 저장 중 오류가 발생했습니다. " + exception.getMessage()));
        }
    }

    @GetMapping("/recipes/{recipeNo}")
    public ResponseEntity<ApiResponse<RecipeDetailDTO>> getRecipeDetail(@PathVariable Long recipeNo) {
        RecipeDetailDTO recipeDetailDTO = recipeService.getRecipeDetail(recipeNo);
        if (recipeDetailDTO == null) {
            return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(ApiResponse.failure("레시피를 찾을 수 없습니다."));
        }

        return ResponseEntity.ok(ApiResponse.success(recipeDetailDTO, "레시피 상세 조회 성공"));
    }
}
