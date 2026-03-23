package com.app.dao;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.mybatis.spring.SqlSessionTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import com.app.dto.ActivityReviewDto;
import com.app.dto.ReviewDto;
import com.app.dto.ReviewImageDto;
import com.app.dto.ReviewRequestDto;

@Repository
public class ReviewDaoImpl implements ReviewDao {

    private static final String NAMESPACE = "reviewMapper.";

    @Autowired
    private SqlSessionTemplate sqlSessionTemplate;

    @Override
    public List<ActivityReviewDto> findWritableReviews(Long userNo) {
        return sqlSessionTemplate.selectList(NAMESPACE + "selectWritableReviews", userNo);
    }

    @Override
    public List<ActivityReviewDto> findMyReviews(Long userNo) {
        return sqlSessionTemplate.selectList(NAMESPACE + "selectMyReviews", userNo);
    }

    @Override
    public ActivityReviewDto findWritableReviewTarget(Long userNo, Long orderItemNo) {
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("userNo", userNo);
        params.put("orderItemNo", orderItemNo);
        return sqlSessionTemplate.selectOne(NAMESPACE + "selectWritableReviewTarget", params);
    }

    @Override
    public ActivityReviewDto findMyReviewByNo(Long userNo, Long reviewNo) {
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("userNo", userNo);
        params.put("reviewNo", reviewNo);
        return sqlSessionTemplate.selectOne(NAMESPACE + "selectMyReviewByNo", params);
    }

    @Override
    public ActivityReviewDto findMyReviewByOrderItem(Long userNo, Long orderItemNo) {
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("userNo", userNo);
        params.put("orderItemNo", orderItemNo);
        return sqlSessionTemplate.selectOne(NAMESPACE + "selectMyReviewByOrderItem", params);
    }

    @Override
    public int insertReview(Long userNo, Long productNo, ReviewRequestDto request) {
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("userNo", userNo);
        params.put("productNo", productNo);
        params.put("orderItemNo", request.getOrderItemNo());
        params.put("rating", request.getRating());
        params.put("content", request.getContent());
        return sqlSessionTemplate.insert(NAMESPACE + "insertReview", params);
    }

    @Override
    public int updateReview(Long userNo, Long reviewNo, ReviewRequestDto request) {
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("userNo", userNo);
        params.put("reviewNo", reviewNo);
        params.put("rating", request.getRating());
        params.put("content", request.getContent());
        return sqlSessionTemplate.update(NAMESPACE + "updateReview", params);
    }

    @Override
    public int deleteReview(Long userNo, Long reviewNo) {
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("userNo", userNo);
        params.put("reviewNo", reviewNo);
        return sqlSessionTemplate.update(NAMESPACE + "deleteReview", params);
    }

    @Override
    public List<ReviewDto> findRecipeReviews(Long recipeNo) {
        return sqlSessionTemplate.selectList(NAMESPACE + "selectRecipeReviews", recipeNo);
    }

    @Override
    public List<ReviewImageDto> findRecipeReviewImages(Long recipeNo) {
        return sqlSessionTemplate.selectList(NAMESPACE + "selectRecipeReviewImages", recipeNo);
    }

    @Override
    public List<ReviewImageDto> findReviewImagesByReviewNo(Long reviewNo) {
        return sqlSessionTemplate.selectList(NAMESPACE + "selectReviewImagesByReviewNo", reviewNo);
    }

    @Override
    public ReviewDto findRecipeReviewByNo(Long reviewNo) {
        return sqlSessionTemplate.selectOne(NAMESPACE + "selectRecipeReviewByNo", reviewNo);
    }

    @Override
    public ReviewDto findRecipeReviewByUserAndRecipe(Long userNo, Long recipeNo) {
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("userNo", userNo);
        params.put("recipeNo", recipeNo);
        return sqlSessionTemplate.selectOne(NAMESPACE + "selectRecipeReviewByUserAndRecipe", params);
    }

    @Override
    public int insertRecipeReview(ReviewDto reviewDto) {
        return sqlSessionTemplate.insert(NAMESPACE + "insertRecipeReview", reviewDto);
    }

    @Override
    public int insertReviewImage(ReviewImageDto reviewImageDto) {
        return sqlSessionTemplate.insert(NAMESPACE + "insertReviewImage", reviewImageDto);
    }

    @Override
    public int deleteReviewImagesByReviewNo(Long reviewNo) {
        return sqlSessionTemplate.delete(NAMESPACE + "deleteReviewImagesByReviewNo", reviewNo);
    }

    @Override
    public int updateRecipeReview(ReviewDto reviewDto) {
        return sqlSessionTemplate.update(NAMESPACE + "updateRecipeReview", reviewDto);
    }

    @Override
    public int deleteRecipeReview(ReviewDto reviewDto) {
        return sqlSessionTemplate.update(NAMESPACE + "deleteRecipeReview", reviewDto);
    }
}
