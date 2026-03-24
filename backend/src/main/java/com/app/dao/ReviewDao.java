package com.app.dao;

import java.util.List;

import com.app.dto.ActivityReviewDto;
import com.app.dto.ReviewDto;
import com.app.dto.ReviewImageDto;
import com.app.dto.ReviewRequestDto;

public interface ReviewDao {

    List<ActivityReviewDto> findWritableReviews(Long userNo);

    List<ActivityReviewDto> findMyReviews(Long userNo);

    ActivityReviewDto findWritableReviewTarget(Long userNo, Long orderItemNo);

    ActivityReviewDto findMyReviewByNo(Long userNo, Long reviewNo);

    ActivityReviewDto findMyReviewByOrderItem(Long userNo, Long orderItemNo);

    int insertReview(Long userNo, Long productNo, ReviewRequestDto request);

    int updateReview(Long userNo, Long reviewNo, ReviewRequestDto request);

    int deleteReviewImages(Long reviewNo);

    int insertReviewImage(
        Long reviewNo,
        String imageName,
        String imageExt,
        String mimeType,
        Long imageSize,
        Integer sortOrder,
        byte[] imageData
    );

    int deleteReviewImage(Long reviewImageNo);

    int deleteReview(Long userNo, Long reviewNo);

    List<ReviewDto> findRecipeReviews(Long recipeNo);

    List<ReviewImageDto> findRecipeReviewImages(Long recipeNo);

    List<ReviewImageDto> findReviewImagesByReviewNo(Long reviewNo);

    ReviewDto findRecipeReviewByNo(Long reviewNo);

    ReviewDto findRecipeReviewByUserAndRecipe(Long userNo, Long recipeNo);

    int insertRecipeReview(ReviewDto reviewDto);

    int insertReviewImage(ReviewImageDto reviewImageDto);

    int deleteReviewImagesByReviewNo(Long reviewNo);

    int updateRecipeReview(ReviewDto reviewDto);

    int deleteRecipeReview(ReviewDto reviewDto);
}
