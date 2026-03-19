package com.app.dao;

import org.mybatis.spring.SqlSessionTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

@Repository
public class ImageDaoImpl implements ImageDao {

    private static final String NAMESPACE = "imageMapper.";

    @Autowired
    private SqlSessionTemplate sqlSessionTemplate;

    @Override
    public byte[] findBannerImage(Long bannerNo) {
        return sqlSessionTemplate.selectOne(NAMESPACE + "selectBannerImage", bannerNo);
    }

    @Override
    public byte[] findProductImage(Long imageNo) {
        return sqlSessionTemplate.selectOne(NAMESPACE + "selectProductImage", imageNo);
    }

    @Override
    public String findBannerMimeType(Long bannerNo) {
        return sqlSessionTemplate.selectOne(NAMESPACE + "selectBannerMimeType", bannerNo);
    }

    @Override
    public String findProductMimeType(Long imageNo) {
        return sqlSessionTemplate.selectOne(NAMESPACE + "selectProductMimeType", imageNo);
    }
}