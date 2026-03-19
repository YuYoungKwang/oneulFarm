package com.app.dao;

import java.util.List;

import org.mybatis.spring.SqlSessionTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import com.app.dto.ProductImageDto;
import com.app.dto.ProductRecipeDto;
import com.app.dto.ProductDto;
import com.app.dto.ProductReviewDto;

@Repository
public class ProductDaoImpl implements ProductDao {

    private static final String NAMESPACE = "productMapper.";

    @Autowired
    private SqlSessionTemplate sqlSessionTemplate;

    @Override
    public List<ProductDto> findSellingProducts() {
        return sqlSessionTemplate.selectList(NAMESPACE + "selectSellingProducts");
    }

    @Override
    public ProductDto findProduct(Long productNo) {
        return sqlSessionTemplate.selectOne(NAMESPACE + "selectProduct", productNo);
    }

    @Override
    public List<ProductImageDto> findProductImages(Long productNo) {
        return sqlSessionTemplate.selectList(NAMESPACE + "selectProductImages", productNo);
    }

    @Override
    public List<ProductRecipeDto> findProductRecipes(Long productNo) {
        return sqlSessionTemplate.selectList(NAMESPACE + "selectProductRecipes", productNo);
    }

    @Override
    public List<ProductReviewDto> findProductReviews(Long productNo) {
        return sqlSessionTemplate.selectList(NAMESPACE + "selectProductReviews", productNo);
    }
}
