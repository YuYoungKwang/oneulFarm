package com.app.controller;

import java.io.IOException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import com.app.common.ApiResponse;
import com.app.dto.RecipeDTO;
import com.app.dto.ReviewDto;
import com.app.dto.ReviewImageDto;
import com.app.service.RecipeService;
import com.app.service.ReviewService;

@RestController
@RequestMapping(value = "/api", produces = MediaType.APPLICATION_JSON_VALUE)
public class RecipeController {

    private final RecipeService recipeService;
    private final ReviewService reviewService;

    public RecipeController(RecipeService recipeService, ReviewService reviewService) {
        this.recipeService = recipeService;
        this.reviewService = reviewService;
    }

    @GetMapping("/recipes")
    public ApiResponse<Map<String, Object>> getRecipeList(
        @RequestParam(value = "keyword", required = false) String keyword,
        @RequestParam(value = "ingredientKeyword", required = false) String ingredientKeyword,
        @RequestParam(value = "sort", required = false) String sort,
        @RequestParam(value = "limit", required = false) Integer limit,
        @RequestParam(value = "page", required = false) Integer page,
        @RequestParam(value = "pageSize", required = false) Integer pageSize
    ) {
        int resolvedPage = resolvePage(page);
        int resolvedPageSize = resolvePageSize(pageSize != null ? pageSize : limit);
        int totalCount = recipeService.getRecipeListCount(keyword, ingredientKeyword);
        List<RecipeDTO> recipeList = recipeService.getRecipeList(
            keyword,
            ingredientKeyword,
            sort,
            Integer.valueOf(resolvedPageSize),
            Integer.valueOf(resolvedPage)
        );
        int totalPages = totalCount == 0 ? 0 : (int) Math.ceil((double) totalCount / (double) resolvedPageSize);

        Map<String, Object> data = new LinkedHashMap<String, Object>();
        data.put("count", Integer.valueOf(totalCount));
        data.put("currentCount", Integer.valueOf(recipeList.size()));
        data.put("keyword", keyword);
        data.put("ingredientKeyword", ingredientKeyword);
        data.put("sort", sort);
        data.put("page", Integer.valueOf(resolvedPage));
        data.put("pageSize", Integer.valueOf(resolvedPageSize));
        data.put("totalCount", Integer.valueOf(totalCount));
        data.put("totalPages", Integer.valueOf(totalPages));
        data.put("recipeList", recipeList);

        return ApiResponse.success(data, "레시피 목록 조회 성공");
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
    public ResponseEntity<ApiResponse<RecipeDTO>> getRecipeDetail(@PathVariable Long recipeNo) {
        RecipeDTO recipeDTO = recipeService.getRecipeDetail(recipeNo);
        if (recipeDTO == null) {
            return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(ApiResponse.failure("레시피를 찾을 수 없습니다."));
        }

        return ResponseEntity.ok(ApiResponse.success(recipeDTO, "레시피 상세 조회 성공"));
    }

    @PostMapping(value = "/recipes/{recipeNo}/reviews", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<ReviewDto> createRecipeReview(
        @RequestHeader("X-USER-NO") Long userNo,
        @PathVariable Long recipeNo,
        @RequestParam("rating") Integer rating,
        @RequestParam("content") String content,
        @RequestParam(value = "images", required = false) List<MultipartFile> imageFileList
    ) {
        ReviewDto reviewDto = buildRecipeReviewDto(recipeNo, rating, content, imageFileList);
        ReviewDto createdReview = reviewService.createRecipeReview(userNo, reviewDto);
        return ApiResponse.success(createdReview, "레시피 리뷰 작성 성공");
    }

    @PostMapping(value = "/recipes/{recipeNo}/reviews/{reviewNo}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<ReviewDto> updateRecipeReview(
        @RequestHeader("X-USER-NO") Long userNo,
        @PathVariable Long recipeNo,
        @PathVariable Long reviewNo,
        @RequestParam("rating") Integer rating,
        @RequestParam("content") String content,
        @RequestParam(value = "images", required = false) List<MultipartFile> imageFileList
    ) {
        ReviewDto reviewDto = buildRecipeReviewDto(recipeNo, rating, content, imageFileList);
        ReviewDto updatedReview = reviewService.updateRecipeReview(userNo, reviewNo, reviewDto);
        return ApiResponse.success(updatedReview, "레시피 리뷰 수정 성공");
    }

    @DeleteMapping("/recipes/{recipeNo}/reviews/{reviewNo}")
    public ApiResponse<Void> deleteRecipeReview(
        @RequestHeader("X-USER-NO") Long userNo,
        @PathVariable Long recipeNo,
        @PathVariable Long reviewNo
    ) {
        ReviewDto reviewDto = reviewService.getRecipeReviews(recipeNo)
            .stream()
            .filter(item -> reviewNo.equals(item.getReviewNo()))
            .findFirst()
            .orElse(null);

        if (reviewDto == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "삭제할 레시피 리뷰를 찾을 수 없습니다.");
        }

        reviewService.deleteRecipeReview(userNo, reviewNo);
        return ApiResponse.success(null, "레시피 리뷰 삭제 성공");
    }

    private ReviewDto buildRecipeReviewDto(
        Long recipeNo,
        Integer rating,
        String content,
        List<MultipartFile> imageFileList
    ) {
        ReviewDto reviewDto = new ReviewDto();
        reviewDto.setRecipeNo(recipeNo);
        reviewDto.setRating(rating);
        reviewDto.setContent(content);
        reviewDto.setImageList(buildReviewImageList(imageFileList));
        return reviewDto;
    }

    private List<ReviewImageDto> buildReviewImageList(List<MultipartFile> imageFileList) {
        List<ReviewImageDto> reviewImageList = new ArrayList<ReviewImageDto>();
        if (imageFileList == null) {
            return reviewImageList;
        }

        for (MultipartFile imageFile : imageFileList) {
            if (imageFile == null || imageFile.isEmpty()) {
                continue;
            }

            String mimeType = trimToNull(imageFile.getContentType());
            if (mimeType == null || !mimeType.toLowerCase(Locale.ROOT).startsWith("image/")) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "리뷰 이미지는 이미지 파일만 업로드할 수 있습니다.");
            }

            ReviewImageDto reviewImageDto = new ReviewImageDto();
            reviewImageDto.setImageName(resolveImageName(imageFile.getOriginalFilename()));
            reviewImageDto.setImageExt(extractImageExtension(imageFile.getOriginalFilename()));
            reviewImageDto.setMimeType(mimeType);
            reviewImageDto.setImageSize(Long.valueOf(imageFile.getSize()));
            reviewImageDto.setImageData(readImageBytes(imageFile));
            reviewImageList.add(reviewImageDto);
        }

        return reviewImageList;
    }

    private String resolveImageName(String originalFilename) {
        String trimmedName = trimToNull(originalFilename);
        return trimmedName == null ? "review-image" : trimmedName;
    }

    private String extractImageExtension(String originalFilename) {
        String trimmedName = trimToNull(originalFilename);
        if (trimmedName == null || !trimmedName.contains(".")) {
            return null;
        }

        return trimmedName.substring(trimmedName.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
    }

    private byte[] readImageBytes(MultipartFile imageFile) {
        try {
            return imageFile.getBytes();
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "리뷰 이미지 파일을 읽을 수 없습니다.");
        }
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }

        String trimmedValue = value.trim();
        return trimmedValue.isEmpty() ? null : trimmedValue;
    }

    private int resolvePage(Integer page) {
        if (page == null || page.intValue() <= 0) {
            return 1;
        }
        return page.intValue();
    }

    private int resolvePageSize(Integer pageSize) {
        if (pageSize == null || pageSize.intValue() <= 0) {
            return 12;
        }
        return Math.min(pageSize.intValue(), 60);
    }
}
