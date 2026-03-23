package com.app.service;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import com.app.dao.RecipeDAO;
import com.app.dao.ReviewDao;
import com.app.dto.ActivityReviewDto;
import com.app.dto.RecipeDTO;
import com.app.dto.ReviewDto;
import com.app.dto.ReviewImageDto;
import com.app.dto.ReviewRequestDto;

@Service
public class ReviewServiceImpl implements ReviewService {

    private static final long MAX_REVIEW_IMAGE_SIZE = 5L * 1024L * 1024L;

    @Autowired
    private ReviewDao reviewDao;

    @Autowired
    private RecipeDAO recipeDAO;

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
    public ActivityReviewDto createReview(Long userNo, ReviewRequestDto request, MultipartFile reviewImage) {
        validateReviewRequest(request, true);
        validateReviewImage(reviewImage);

        ActivityReviewDto target = reviewDao.findWritableReviewTarget(userNo, request.getOrderItemNo());
        if (target == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "리뷰를 작성할 수 있는 주문 상품이 아닙니다.");
        }

        reviewDao.insertReview(userNo, target.getProductNo(), request);

        ActivityReviewDto createdReview = reviewDao.findMyReviewByOrderItem(userNo, request.getOrderItemNo());
        if (createdReview == null) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "리뷰 저장 후 데이터를 다시 불러오지 못했습니다.");
        }

        syncReviewImage(createdReview.getReviewNo(), reviewImage, false);
        return reviewDao.findMyReviewByNo(userNo, createdReview.getReviewNo());
    }

    @Override
    @Transactional
    public ActivityReviewDto updateReview(Long userNo, Long reviewNo, ReviewRequestDto request, MultipartFile reviewImage) {
        validateReviewRequest(request, false);
        validateReviewImage(reviewImage);

        ActivityReviewDto currentReview = reviewDao.findMyReviewByNo(userNo, reviewNo);
        if (currentReview == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "수정할 리뷰를 찾을 수 없습니다.");
        }

        int updatedCount = reviewDao.updateReview(userNo, reviewNo, request);
        if (updatedCount < 1) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "리뷰 수정에 실패했습니다.");
        }

        syncReviewImage(reviewNo, reviewImage, Boolean.TRUE.equals(request.getRemoveImage()));
        return reviewDao.findMyReviewByNo(userNo, reviewNo);
    }

    @Override
    @Transactional
    public void deleteReview(Long userNo, Long reviewNo) {
        ActivityReviewDto currentReview = reviewDao.findMyReviewByNo(userNo, reviewNo);
        if (currentReview == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "삭제할 리뷰를 찾을 수 없습니다.");
        }

        reviewDao.deleteReviewImages(reviewNo);

        int deletedCount = reviewDao.deleteReview(userNo, reviewNo);
        if (deletedCount < 1) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "리뷰 삭제에 실패했습니다.");
        }
    }

    @Override
    public List<ReviewDto> getRecipeReviews(Long recipeNo) {
        List<ReviewDto> reviewList = reviewDao.findRecipeReviews(recipeNo);
        attachReviewImages(reviewList, reviewDao.findRecipeReviewImages(recipeNo));
        return reviewList;
    }

    @Override
    @Transactional
    public ReviewDto createRecipeReview(Long userNo, ReviewDto reviewDto) {
        validateRecipeReviewRequest(reviewDto);
        validateRecipeExists(reviewDto.getRecipeNo());

        ReviewDto existingReview = reviewDao.findRecipeReviewByUserAndRecipe(userNo, reviewDto.getRecipeNo());
        if (existingReview != null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이미 작성한 레시피 리뷰가 있습니다.");
        }

        reviewDto.setUserNo(userNo);
        reviewDao.insertRecipeReview(reviewDto);
        saveReviewImages(reviewDto.getReviewNo(), reviewDto.getImageList());

        return buildRecipeReviewResponse(reviewDto.getReviewNo());
    }

    @Override
    @Transactional
    public ReviewDto updateRecipeReview(Long userNo, Long reviewNo, ReviewDto reviewDto) {
        validateRecipeReviewRequest(reviewDto);
        validateRecipeExists(reviewDto.getRecipeNo());

        ReviewDto currentReview = reviewDao.findRecipeReviewByNo(reviewNo);
        if (currentReview == null || !userNo.equals(currentReview.getUserNo())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "수정할 레시피 리뷰를 찾을 수 없습니다.");
        }

        if (!reviewDto.getRecipeNo().equals(currentReview.getRecipeNo())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "레시피 리뷰 대상이 올바르지 않습니다.");
        }

        reviewDto.setReviewNo(reviewNo);
        reviewDto.setUserNo(userNo);

        int updatedCount = reviewDao.updateRecipeReview(reviewDto);
        if (updatedCount < 1) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "레시피 리뷰 수정에 실패했습니다.");
        }

        if (reviewDto.getImageList() != null && !reviewDto.getImageList().isEmpty()) {
            reviewDao.deleteReviewImagesByReviewNo(reviewNo);
            saveReviewImages(reviewNo, reviewDto.getImageList());
        }

        return buildRecipeReviewResponse(reviewNo);
    }

    @Override
    @Transactional
    public void deleteRecipeReview(Long userNo, Long reviewNo) {
        ReviewDto currentReview = reviewDao.findRecipeReviewByNo(reviewNo);
        if (currentReview == null || !userNo.equals(currentReview.getUserNo())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "삭제할 레시피 리뷰를 찾을 수 없습니다.");
        }

        reviewDao.deleteReviewImagesByReviewNo(reviewNo);

        ReviewDto deleteTarget = new ReviewDto();
        deleteTarget.setReviewNo(reviewNo);
        deleteTarget.setUserNo(userNo);
        deleteTarget.setRecipeNo(currentReview.getRecipeNo());

        int deletedCount = reviewDao.deleteRecipeReview(deleteTarget);
        if (deletedCount < 1) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "레시피 리뷰 삭제에 실패했습니다.");
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

    private void validateRecipeExists(Long recipeNo) {
        if (recipeNo == null || recipeNo.longValue() <= 0L) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "recipeNo는 필수입니다.");
        }

        RecipeDTO recipeDTO = recipeDAO.selectRecipeDetail(recipeNo);
        if (recipeDTO == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "레시피를 찾을 수 없습니다.");
        }
    }

    private void validateRecipeReviewRequest(ReviewDto reviewDto) {
        if (reviewDto == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "리뷰 정보를 입력해 주세요.");
        }

        if (reviewDto.getRecipeNo() == null || reviewDto.getRecipeNo().longValue() <= 0L) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "레시피 정보가 없습니다.");
        }

        Integer rating = reviewDto.getRating();
        if (rating == null || rating.intValue() < 1 || rating.intValue() > 5) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "별점은 1점부터 5점까지 입력할 수 있습니다.");
        }

        String content = reviewDto.getContent() == null ? "" : reviewDto.getContent().trim();
        if (content.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "리뷰 내용을 입력해 주세요.");
        }

        reviewDto.setContent(content);

        List<ReviewImageDto> imageList = reviewDto.getImageList();
        if (imageList != null && imageList.size() > 3) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "리뷰 이미지는 최대 3장까지 업로드할 수 있습니다.");
        }
    }

    private void saveReviewImages(Long reviewNo, List<ReviewImageDto> imageList) {
        if (reviewNo == null || imageList == null || imageList.isEmpty()) {
            return;
        }

        for (int index = 0; index < imageList.size(); index += 1) {
            ReviewImageDto reviewImageDto = imageList.get(index);
            reviewImageDto.setReviewNo(reviewNo);
            reviewImageDto.setSortOrder(Integer.valueOf(index + 1));
            reviewDao.insertReviewImage(reviewImageDto);
        }
    }

    private ReviewDto buildRecipeReviewResponse(Long reviewNo) {
        ReviewDto reviewDto = reviewDao.findRecipeReviewByNo(reviewNo);
        if (reviewDto == null) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "레시피 리뷰를 다시 불러오지 못했습니다.");
        }

        attachReviewImages(Collections.singletonList(reviewDto), reviewDao.findReviewImagesByReviewNo(reviewNo));
        return reviewDto;
    }

    private void attachReviewImages(List<ReviewDto> reviewList, List<ReviewImageDto> reviewImageList) {
        if (reviewList == null || reviewList.isEmpty()) {
            return;
        }

        Map<Long, List<ReviewImageDto>> reviewImageMap = new LinkedHashMap<Long, List<ReviewImageDto>>();
        if (reviewImageList != null) {
            for (ReviewImageDto reviewImageDto : reviewImageList) {
                reviewImageDto.setImageUrl("/api/image/review/" + reviewImageDto.getReviewImageNo());
                reviewImageMap
                    .computeIfAbsent(reviewImageDto.getReviewNo(), key -> new ArrayList<ReviewImageDto>())
                    .add(reviewImageDto);
            }
        }

        for (ReviewDto reviewDto : reviewList) {
            List<ReviewImageDto> imageList = reviewImageMap.get(reviewDto.getReviewNo());
            reviewDto.setImageList(imageList == null ? new ArrayList<ReviewImageDto>() : imageList);
        }
    }

    private void validateReviewImage(MultipartFile reviewImage) {
        if (reviewImage == null || reviewImage.isEmpty()) {
            return;
        }

        String contentType = reviewImage.getContentType();
        if (contentType == null || !contentType.toLowerCase(Locale.ROOT).startsWith("image/")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "리뷰 이미지는 이미지 파일만 등록할 수 있습니다.");
        }

        if (reviewImage.getSize() > MAX_REVIEW_IMAGE_SIZE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "리뷰 이미지는 5MB 이하만 등록할 수 있습니다.");
        }
    }

    private void syncReviewImage(Long reviewNo, MultipartFile reviewImage, boolean removeImage) {
        boolean hasNewImage = reviewImage != null && !reviewImage.isEmpty();

        if (!removeImage && !hasNewImage) {
            return;
        }

        reviewDao.deleteReviewImages(reviewNo);

        if (!hasNewImage) {
            return;
        }

        try {
            reviewDao.insertReviewImage(
                reviewNo,
                reviewImage.getOriginalFilename(),
                extractFileExtension(reviewImage.getOriginalFilename()),
                reviewImage.getContentType(),
                reviewImage.getSize(),
                reviewImage.getBytes()
            );
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "리뷰 이미지를 저장하지 못했습니다.");
        }
    }

    private String extractFileExtension(String fileName) {
        if (fileName == null) {
            return "";
        }

        int index = fileName.lastIndexOf('.');
        if (index < 0 || index == fileName.length() - 1) {
            return "";
        }

        return fileName.substring(index).toLowerCase(Locale.ROOT);
    }
}
