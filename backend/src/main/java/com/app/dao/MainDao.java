package com.app.dao;

import java.util.List;
import java.util.Map;

import com.app.dto.main.BannerDto;
import com.app.dto.main.LinkedRecipeDto;
import com.app.dto.main.PopularRecipeCardDto;
import com.app.dto.main.ProductDto;
import com.app.dto.main.SeasonalProductCardDto;

public interface MainDao {

    List<BannerDto> findMainBanners();

    List<ProductDto> findMainProducts();

    List<SeasonalProductCardDto> findSeasonalRecommendationProducts(Map<String, Object> paramMap);

    List<LinkedRecipeDto> findLinkedRecipesByProductName(Map<String, Object> paramMap);

    List<PopularRecipeCardDto> findPopularRecipes(Map<String, Object> paramMap);

    List<String> findMatchedIngredientsByRecipeNo(Map<String, Object> paramMap);
}
