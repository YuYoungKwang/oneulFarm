package com.app.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.app.dao.ImageDao;

@Service
public class ImageServiceImpl implements ImageService {

    @Autowired
    private ImageDao imageDao;

    @Override
    public byte[] getBannerImage(Long bannerNo) {
        return imageDao.findBannerImage(bannerNo);
    }

    @Override
    public byte[] getProductImage(Long imageNo) {
        return imageDao.findProductImage(imageNo);
    }

    @Override
    public String getBannerMimeType(Long bannerNo) {
        return imageDao.findBannerMimeType(bannerNo);
    }

    @Override
    public String getProductMimeType(Long imageNo) {
        return imageDao.findProductMimeType(imageNo);
    }
}