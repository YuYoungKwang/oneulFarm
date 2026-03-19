package com.app.service;

public interface ImageService {

    byte[] getBannerImage(Long bannerNo);

    byte[] getProductImage(Long imageNo);

    String getBannerMimeType(Long bannerNo);

    String getProductMimeType(Long imageNo);
}
