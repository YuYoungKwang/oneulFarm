package com.app.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.app.dao.ReviewDao;
import com.app.dto.ActivityReviewDto;
import com.app.dto.ReviewRequestDto;

@Service
public class ReviewServiceImpl implements ReviewService {

    @Autowired
    private ReviewDao reviewDao;

    @Override
    public List<ActivityReviewDto> getWritableReviews(Long userNo) {
        return reviewDao.findWritableReviews(userNo);
    }

    @Override
    public List<ActivityReviewDto> getMyReviews(Long userNo) {
        return reviewDao.findMyReviews(userNo);
    }

    @Override
    @Transactional
    public ActivityReviewDto createReview(Long userNo, ReviewRequestDto request) {
        validateReviewRequest(request, true);

        ActivityReviewDto target = reviewDao.findWritableReviewTarget(userNo, request.getOrderItemNo());
        if (target == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "리뷰를 작성할 수 있는 주문 상품이 아닙니다.");
        }

        reviewDao.insertReview(userNo, target.getProductNo(), request);

        ActivityReviewDto createdReview = reviewDao.findMyReviewByOrderItem(userNo, request.getOrderItemNo());
        if (createdReview == null) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "리뷰 저장 후 데이터를 다시 불러오지 못했습니다.");
        }

        return createdReview;
    }

    @Override
    @Transactional
    public ActivityReviewDto updateReview(Long userNo, Long reviewNo, ReviewRequestDto request) {
        validateReviewRequest(request, false);

        ActivityReviewDto currentReview = reviewDao.findMyReviewByNo(userNo, reviewNo);
        if (currentReview == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "수정할 리뷰를 찾지 못했습니다.");
        }

        int updatedCount = reviewDao.updateReview(userNo, reviewNo, request);
        if (updatedCount < 1) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "리뷰 수정에 실패했습니다.");
        }

        return reviewDao.findMyReviewByNo(userNo, reviewNo);
    }

    @Override
    @Transactional
    public void deleteReview(Long userNo, Long reviewNo) {
        ActivityReviewDto currentReview = reviewDao.findMyReviewByNo(userNo, reviewNo);
        if (currentReview == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "삭제할 리뷰를 찾지 못했습니다.");
        }

        int deletedCount = reviewDao.deleteReview(userNo, reviewNo);
        if (deletedCount < 1) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "리뷰 삭제에 실패했습니다.");
        }
    }

    private void validateReviewRequest(ReviewRequestDto request, boolean orderItemRequired) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "리뷰 정보를 입력해 주세요.");
        }

        if (orderItemRequired && request.getOrderItemNo() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "리뷰를 작성할 주문 상품 정보가 없습니다.");
        }

        Integer rating = request.getRating();
        if (rating == null || rating < 1 || rating > 5) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "별점은 1점부터 5점까지 입력할 수 있습니다.");
        }

        String content = request.getContent() == null ? "" : request.getContent().trim();
        if (content.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "리뷰 내용을 입력해 주세요.");
        }

        request.setContent(content);
    }
}
