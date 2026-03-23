package com.app.dao;

public interface ImageDao {

    byte[] findBannerImage(Long bannerNo);

    byte[] findProductImage(Long imageNo);

    String findBannerMimeType(Long bannerNo);

    String findProductMimeType(Long imageNo);
}