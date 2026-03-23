package com.app.service;

import java.util.List;

import com.app.dto.ActivityReviewDto;
import com.app.dto.ReviewDto;
import com.app.dto.ReviewRequestDto;

public interface ReviewService {

    List<ActivityReviewDto> getWritableReviews(Long userNo);

    List<ActivityReviewDto> getMyReviews(Long userNo);

    ActivityReviewDto createReview(Long userNo, ReviewRequestDto request);

    ActivityReviewDto updateReview(Long userNo, Long reviewNo, ReviewRequestDto request);

    void deleteReview(Long userNo, Long reviewNo);

    List<ReviewDto> getRecipeReviews(Long recipeNo);

    ReviewDto createRecipeReview(Long userNo, ReviewDto reviewDto);

    ReviewDto updateRecipeReview(Long userNo, Long reviewNo, ReviewDto reviewDto);

    void deleteRecipeReview(Long userNo, Long reviewNo);
}
