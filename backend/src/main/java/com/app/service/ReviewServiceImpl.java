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
    private static final int MAX_REVIEW_IMAGE_COUNT = 3;

    @Autowired
    private ReviewDao reviewDao;

    @Autowired
    private RecipeDAO recipeDAO;

    @Override
    public List<ActivityReviewDto> getWritableReviews(Long userNo) {
        List<ActivityReviewDto> reviewList = reviewDao.findWritableReviews(userNo);
        attachActivityReviewImages(reviewList);
        return reviewList;
    }

    @Override
    public List<ActivityReviewDto> getMyReviews(Long userNo) {
        List<ActivityReviewDto> reviewList = reviewDao.findMyReviews(userNo);
        attachActivityReviewImages(reviewList);
        return reviewList;
    }

    @Override
    @Transactional
    public ActivityReviewDto createReview(Long userNo, ReviewRequestDto request, List<MultipartFile> reviewImages) {
        validateReviewRequest(request, true);

        List<MultipartFile> normalizedReviewImages = normalizeReviewImages(reviewImages);
        validateReviewImages(normalizedReviewImages, normalizedReviewImages.size());

        ActivityReviewDto target = reviewDao.findWritableReviewTarget(userNo, request.getOrderItemNo());
        if (target == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "리뷰를 작성할 수 있는 주문 상품이 아닙니다.");
        }

        reviewDao.insertReview(userNo, target.getProductNo(), request);

        ActivityReviewDto createdReview = reviewDao.findMyReviewByOrderItem(userNo, request.getOrderItemNo());
        if (createdReview == null) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "리뷰 저장 후 데이터를 다시 불러오지 못했습니다.");
        }

        syncReviewImages(createdReview.getReviewNo(), normalizedReviewImages, Collections.<Long>emptyList(), false);

        ActivityReviewDto response = reviewDao.findMyReviewByNo(userNo, createdReview.getReviewNo());
        attachActivityReviewImages(Collections.singletonList(response));
        return response;
    }

    @Override
    @Transactional
    public ActivityReviewDto updateReview(Long userNo, Long reviewNo, ReviewRequestDto request, List<MultipartFile> reviewImages) {
        validateReviewRequest(request, false);

        ActivityReviewDto currentReview = reviewDao.findMyReviewByNo(userNo, reviewNo);
        if (currentReview == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "수정할 리뷰를 찾을 수 없습니다.");
        }

        List<MultipartFile> normalizedReviewImages = normalizeReviewImages(reviewImages);
        List<ReviewImageDto> currentImages = reviewDao.findReviewImagesByReviewNo(reviewNo);
        List<Long> removeImageNos = request.getRemoveImageNos() == null
            ? Collections.<Long>emptyList()
            : request.getRemoveImageNos();

        int remainingImageCount = Boolean.TRUE.equals(request.getRemoveImage())
            ? 0
            : Math.max(currentImages.size() - removeImageNos.size(), 0);
        validateReviewImages(normalizedReviewImages, remainingImageCount + normalizedReviewImages.size());

        int updatedCount = reviewDao.updateReview(userNo, reviewNo, request);
        if (updatedCount < 1) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "리뷰 수정에 실패했습니다.");
        }

        syncReviewImages(reviewNo, normalizedReviewImages, removeImageNos, Boolean.TRUE.equals(request.getRemoveImage()));

        ActivityReviewDto response = reviewDao.findMyReviewByNo(userNo, reviewNo);
        attachActivityReviewImages(Collections.singletonList(response));
        return response;
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
        if (imageList != null && imageList.size() > MAX_REVIEW_IMAGE_COUNT) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "리뷰 이미지는 최대 3장까지 등록할 수 있습니다.");
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

    private void attachActivityReviewImages(List<ActivityReviewDto> reviewList) {
        if (reviewList == null || reviewList.isEmpty()) {
            return;
        }

        for (ActivityReviewDto reviewDto : reviewList) {
            if (reviewDto == null) {
                continue;
            }

            if (reviewDto.getReviewNo() == null) {
                reviewDto.setImageList(new ArrayList<ReviewImageDto>());
                continue;
            }

            List<ReviewImageDto> imageList = reviewDao.findReviewImagesByReviewNo(reviewDto.getReviewNo());
            for (ReviewImageDto reviewImageDto : imageList) {
                reviewImageDto.setImageUrl("/api/image/review/" + reviewImageDto.getReviewImageNo());
            }
            reviewDto.setImageList(imageList);

            if (reviewDto.getReviewImageNo() == null && !imageList.isEmpty()) {
                reviewDto.setReviewImageNo(imageList.get(0).getReviewImageNo());
            }
        }
    }

    private List<MultipartFile> normalizeReviewImages(List<MultipartFile> reviewImages) {
        if (reviewImages == null || reviewImages.isEmpty()) {
            return Collections.emptyList();
        }

        List<MultipartFile> normalizedReviewImages = new ArrayList<MultipartFile>();
        for (MultipartFile reviewImage : reviewImages) {
            if (reviewImage != null && !reviewImage.isEmpty() && reviewImage.getSize() > 0L) {
                normalizedReviewImages.add(reviewImage);
            }
        }
        return normalizedReviewImages;
    }

    private void validateReviewImages(List<MultipartFile> reviewImages, int finalImageCount) {
        if (finalImageCount > MAX_REVIEW_IMAGE_COUNT) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "리뷰 이미지는 최대 3장까지 등록할 수 있습니다.");
        }

        if (reviewImages == null || reviewImages.isEmpty()) {
            return;
        }

        for (MultipartFile reviewImage : reviewImages) {
            String contentType = reviewImage.getContentType();
            if (contentType == null || !contentType.toLowerCase(Locale.ROOT).startsWith("image/")) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "리뷰 이미지는 이미지 파일만 등록할 수 있습니다.");
            }

            if (reviewImage.getSize() > MAX_REVIEW_IMAGE_SIZE) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "리뷰 이미지는 5MB 이하만 등록할 수 있습니다.");
            }
        }
    }

    private void syncReviewImages(
        Long reviewNo,
        List<MultipartFile> reviewImages,
        List<Long> removeImageNos,
        boolean removeAllImages
    ) {
        List<ReviewImageDto> currentImages = reviewDao.findReviewImagesByReviewNo(reviewNo);

        if (removeAllImages) {
            reviewDao.deleteReviewImages(reviewNo);
            currentImages = new ArrayList<ReviewImageDto>();
        } else if (removeImageNos != null && !removeImageNos.isEmpty()) {
            List<Long> ownedImageNos = new ArrayList<Long>();
            for (ReviewImageDto currentImage : currentImages) {
                ownedImageNos.add(currentImage.getReviewImageNo());
            }

            for (Long reviewImageNo : removeImageNos) {
                if (ownedImageNos.contains(reviewImageNo)) {
                    reviewDao.deleteReviewImage(reviewImageNo);
                }
            }

            List<ReviewImageDto> remainingImages = new ArrayList<ReviewImageDto>();
            for (ReviewImageDto currentImage : currentImages) {
                if (!removeImageNos.contains(currentImage.getReviewImageNo())) {
                    remainingImages.add(currentImage);
                }
            }
            currentImages = remainingImages;
        }

        if (reviewImages == null || reviewImages.isEmpty()) {
            return;
        }

        int nextSortOrder = 1;
        for (ReviewImageDto currentImage : currentImages) {
            if (currentImage.getSortOrder() != null && currentImage.getSortOrder().intValue() >= nextSortOrder) {
                nextSortOrder = currentImage.getSortOrder().intValue() + 1;
            }
        }

        for (MultipartFile reviewImage : reviewImages) {
            try {
                reviewDao.insertReviewImage(
                    reviewNo,
                    reviewImage.getOriginalFilename(),
                    extractFileExtension(reviewImage.getOriginalFilename()),
                    reviewImage.getContentType(),
                    reviewImage.getSize(),
                    nextSortOrder,
                    reviewImage.getBytes()
                );
                nextSortOrder += 1;
            } catch (IOException exception) {
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "리뷰 이미지를 저장하지 못했습니다.");
            }
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
