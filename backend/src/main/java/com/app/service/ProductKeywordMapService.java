package com.app.service;

import java.util.List;

import com.app.dto.ProductDto;
import com.app.dto.ProductKeywordProfileDto;

public interface ProductKeywordMapService {

    ProductKeywordProfileDto getKeywordProfile(ProductDto product);

    ProductKeywordProfileDto getKeywordProfile(Long productNo);

    List<String> getSearchKeywords(ProductDto product);

    List<String> getAllowedRecipeCategories(ProductDto product);
}
