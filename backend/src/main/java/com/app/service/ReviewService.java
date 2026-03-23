package com.app.service;

import java.util.List;

import org.springframework.web.multipart.MultipartFile;

import com.app.dto.ActivityReviewDto;
import com.app.dto.ReviewRequestDto;

public interface ReviewService {

    List<ActivityReviewDto> getWritableReviews(Long userNo);

    List<ActivityReviewDto> getMyReviews(Long userNo);

    ActivityReviewDto createReview(Long userNo, ReviewRequestDto request, MultipartFile reviewImage);

    ActivityReviewDto updateReview(Long userNo, Long reviewNo, ReviewRequestDto request, MultipartFile reviewImage);

    void deleteReview(Long userNo, Long reviewNo);
}
