package com.app.dao;

import java.util.List;
import java.util.Map;

import org.mybatis.spring.SqlSessionTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import com.app.dto.main.BannerDto;
import com.app.dto.main.LinkedRecipeDto;
import com.app.dto.main.PopularRecipeCardDto;
import com.app.dto.main.ProductDto;
import com.app.dto.main.SeasonalProductCardDto;

@Repository
public class MainDaoImpl implements MainDao {

    private static final String NAMESPACE = "mainMapper.";

    @Autowired
    private SqlSessionTemplate sqlSessionTemplate;

    @Override
    public List<BannerDto> findMainBanners() {
        return sqlSessionTemplate.selectList(NAMESPACE + "selectMainBanners");
    }

    @Override
    public List<ProductDto> findMainProducts() {
        return sqlSessionTemplate.selectList(NAMESPACE + "selectMainProducts");
    }

    @Override
    public List<SeasonalProductCardDto> findSeasonalRecommendationProducts(Map<String, Object> paramMap) {
        return sqlSessionTemplate.selectList(NAMESPACE + "selectSeasonalRecommendationProducts", paramMap);
    }

    @Override
    public List<LinkedRecipeDto> findLinkedRecipesByProductName(Map<String, Object> paramMap) {
        return sqlSessionTemplate.selectList(NAMESPACE + "selectLinkedRecipesByProductName", paramMap);
    }

    @Override
    public List<PopularRecipeCardDto> findPopularRecipes(Map<String, Object> paramMap) {
        return sqlSessionTemplate.selectList(NAMESPACE + "selectPopularRecipes", paramMap);
    }

    @Override
    public List<String> findMatchedIngredientsByRecipeNo(Map<String, Object> paramMap) {
        return sqlSessionTemplate.selectList(NAMESPACE + "selectMatchedIngredientsByRecipeNo", paramMap);
    }
}
