package com.app.service;

public interface ImageService {

    byte[] getBannerImage(Long bannerNo);

    byte[] getProductImage(Long imageNo);

    byte[] getReviewImage(Long reviewImageNo);

    String getBannerMimeType(Long bannerNo);

    String getProductMimeType(Long imageNo);

    String getReviewMimeType(Long reviewImageNo);
}
