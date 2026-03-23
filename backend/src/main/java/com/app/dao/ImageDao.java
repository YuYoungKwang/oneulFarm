package com.app.dao;

public interface ImageDao {

    byte[] findBannerImage(Long bannerNo);

    byte[] findProductImage(Long imageNo);

    byte[] findReviewImage(Long reviewImageNo);

    String findBannerMimeType(Long bannerNo);

    String findProductMimeType(Long imageNo);

    String findReviewMimeType(Long reviewImageNo);
}
