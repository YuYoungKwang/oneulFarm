package com.app.dao;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.mybatis.spring.SqlSessionTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import com.app.dto.ActivityReviewDto;
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
        Map<String, Object> params = new HashMap<>();
        params.put("userNo", userNo);
        params.put("orderItemNo", orderItemNo);
        return sqlSessionTemplate.selectOne(NAMESPACE + "selectWritableReviewTarget", params);
    }

    @Override
    public ActivityReviewDto findMyReviewByNo(Long userNo, Long reviewNo) {
        Map<String, Object> params = new HashMap<>();
        params.put("userNo", userNo);
        params.put("reviewNo", reviewNo);
        return sqlSessionTemplate.selectOne(NAMESPACE + "selectMyReviewByNo", params);
    }

    @Override
    public ActivityReviewDto findMyReviewByOrderItem(Long userNo, Long orderItemNo) {
        Map<String, Object> params = new HashMap<>();
        params.put("userNo", userNo);
        params.put("orderItemNo", orderItemNo);
        return sqlSessionTemplate.selectOne(NAMESPACE + "selectMyReviewByOrderItem", params);
    }

    @Override
    public int insertReview(Long userNo, Long productNo, ReviewRequestDto request) {
        Map<String, Object> params = new HashMap<>();
        params.put("userNo", userNo);
        params.put("productNo", productNo);
        params.put("orderItemNo", request.getOrderItemNo());
        params.put("rating", request.getRating());
        params.put("content", request.getContent());
        return sqlSessionTemplate.insert(NAMESPACE + "insertReview", params);
    }

    @Override
    public int updateReview(Long userNo, Long reviewNo, ReviewRequestDto request) {
        Map<String, Object> params = new HashMap<>();
        params.put("userNo", userNo);
        params.put("reviewNo", reviewNo);
        params.put("rating", request.getRating());
        params.put("content", request.getContent());
        return sqlSessionTemplate.update(NAMESPACE + "updateReview", params);
    }

    @Override
    public int deleteReviewImages(Long reviewNo) {
        return sqlSessionTemplate.delete(NAMESPACE + "deleteReviewImages", reviewNo);
    }

    @Override
    public int insertReviewImage(
        Long reviewNo,
        String imageName,
        String imageExt,
        String mimeType,
        Long imageSize,
        byte[] imageData
    ) {
        Map<String, Object> params = new HashMap<>();
        params.put("reviewNo", reviewNo);
        params.put("imageName", imageName);
        params.put("imageExt", imageExt);
        params.put("mimeType", mimeType);
        params.put("imageSize", imageSize);
        params.put("imageData", imageData);
        return sqlSessionTemplate.insert(NAMESPACE + "insertReviewImage", params);
    }

    @Override
    public int deleteReview(Long userNo, Long reviewNo) {
        Map<String, Object> params = new HashMap<>();
        params.put("userNo", userNo);
        params.put("reviewNo", reviewNo);
        return sqlSessionTemplate.update(NAMESPACE + "deleteReview", params);
    }
}
