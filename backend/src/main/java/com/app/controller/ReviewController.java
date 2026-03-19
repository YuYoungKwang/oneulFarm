package com.app.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.app.common.ApiResponse;
import com.app.dto.ActivityReviewDto;
import com.app.dto.ReviewRequestDto;
import com.app.service.ReviewService;

@RestController
@RequestMapping(value = "/api/reviews", produces = MediaType.APPLICATION_JSON_VALUE)
public class ReviewController {

    @Autowired
    private ReviewService reviewService;

    @GetMapping("/me/writable")
    public ApiResponse<List<ActivityReviewDto>> getWritableReviews(
        @RequestHeader("X-USER-NO") Long userNo
    ) {
        return ApiResponse.success(reviewService.getWritableReviews(userNo), "작성 가능한 리뷰 목록 조회 성공");
    }

    @GetMapping("/me")
    public ApiResponse<List<ActivityReviewDto>> getMyReviews(
        @RequestHeader("X-USER-NO") Long userNo
    ) {
        return ApiResponse.success(reviewService.getMyReviews(userNo), "내 리뷰 목록 조회 성공");
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ApiResponse<ActivityReviewDto> createReview(
        @RequestHeader("X-USER-NO") Long userNo,
        @RequestBody ReviewRequestDto request
    ) {
        return ApiResponse.success(reviewService.createReview(userNo, request), "리뷰 작성 성공");
    }

    @PatchMapping(value = "/{reviewNo}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ApiResponse<ActivityReviewDto> updateReview(
        @RequestHeader("X-USER-NO") Long userNo,
        @PathVariable("reviewNo") Long reviewNo,
        @RequestBody ReviewRequestDto request
    ) {
        return ApiResponse.success(reviewService.updateReview(userNo, reviewNo, request), "리뷰 수정 성공");
    }

    @DeleteMapping("/{reviewNo}")
    public ApiResponse<Void> deleteReview(
        @RequestHeader("X-USER-NO") Long userNo,
        @PathVariable("reviewNo") Long reviewNo
    ) {
        reviewService.deleteReview(userNo, reviewNo);
        return ApiResponse.success(null, "리뷰 삭제 성공");
    }
}
