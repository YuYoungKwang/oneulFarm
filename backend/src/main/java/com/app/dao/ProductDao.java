package com.app.dao;

import java.util.List;

import com.app.dto.ProductImageDto;
import com.app.dto.ProductRecipeDto;
import com.app.dto.ProductDto;
import com.app.dto.ProductReviewDto;

public interface ProductDao {

    List<ProductDto> findSellingProducts();

    ProductDto findProduct(Long productNo);

    List<ProductImageDto> findProductImages(Long productNo);

    List<ProductRecipeDto> findProductRecipes(Long productNo);

    List<ProductReviewDto> findProductReviews(Long productNo);
}
