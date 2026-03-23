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
        return toPrimitiveBytes(sqlSessionTemplate.selectOne(NAMESPACE + "selectBannerImage", bannerNo));
    }

    @Override
    public byte[] findProductImage(Long imageNo) {
        return toPrimitiveBytes(sqlSessionTemplate.selectOne(NAMESPACE + "selectProductImage", imageNo));
    }

    @Override
    public byte[] findReviewImage(Long reviewImageNo) {
        return toPrimitiveBytes(sqlSessionTemplate.selectOne(NAMESPACE + "selectReviewImage", reviewImageNo));
    }

    @Override
    public String findBannerMimeType(Long bannerNo) {
        return sqlSessionTemplate.selectOne(NAMESPACE + "selectBannerMimeType", bannerNo);
    }

    @Override
    public String findProductMimeType(Long imageNo) {
        return sqlSessionTemplate.selectOne(NAMESPACE + "selectProductMimeType", imageNo);
    }

    @Override
    public String findReviewMimeType(Long reviewImageNo) {
        return sqlSessionTemplate.selectOne(NAMESPACE + "selectReviewMimeType", reviewImageNo);
    }
    
    private byte[] toPrimitiveBytes(Object imageData) {
        if (imageData == null) {
            return null;
        }

        if (imageData instanceof byte[]) {
            return (byte[]) imageData;
        }

        if (imageData instanceof Byte[]) {
            Byte[] boxedBytes = (Byte[]) imageData;
            byte[] primitiveBytes = new byte[boxedBytes.length];
            for (int index = 0; index < boxedBytes.length; index += 1) {
                primitiveBytes[index] = boxedBytes[index] == null ? 0 : boxedBytes[index];
            }
            return primitiveBytes;
        }

        throw new IllegalStateException("Unsupported image byte type: " + imageData.getClass().getName());
    }
}
