package com.app.dao;

import java.util.List;

import com.app.dto.ProductImageDto;
import com.app.dto.ProductRecipeDto;
import com.app.dto.ProductResponseDto;
import com.app.dto.ProductReviewDto;

public interface ProductDao {

    List<ProductResponseDto> findSellingProducts();

    ProductResponseDto findProduct(Long productNo);

    List<ProductImageDto> findProductImages(Long productNo);

    List<ProductRecipeDto> findProductRecipes(Long productNo);

    List<ProductReviewDto> findProductReviews(Long productNo);
}
