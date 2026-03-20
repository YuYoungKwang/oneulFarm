package com.app.dao;

import java.util.List;

import com.app.dto.ActivityReviewDto;
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
        byte[] imageData
    );

    int deleteReview(Long userNo, Long reviewNo);
}
