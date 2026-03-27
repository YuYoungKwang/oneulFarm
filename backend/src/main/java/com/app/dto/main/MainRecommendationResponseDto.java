package com.app.dto.main;

import java.util.ArrayList;
import java.util.List;

public class MainRecommendationResponseDto {

    private List<HeroSlideDto> heroSlides = new ArrayList<HeroSlideDto>();
    private List<SeasonalProductCardDto> seasonalProducts = new ArrayList<SeasonalProductCardDto>();
    private List<PopularRecipeCardDto> popularRecipes = new ArrayList<PopularRecipeCardDto>();

    public List<HeroSlideDto> getHeroSlides() {
        return heroSlides;
    }

    public void setHeroSlides(List<HeroSlideDto> heroSlides) {
        this.heroSlides = heroSlides == null ? new ArrayList<HeroSlideDto>() : heroSlides;
    }

    public List<SeasonalProductCardDto> getSeasonalProducts() {
        return seasonalProducts;
    }

    public void setSeasonalProducts(List<SeasonalProductCardDto> seasonalProducts) {
        this.seasonalProducts = seasonalProducts == null
            ? new ArrayList<SeasonalProductCardDto>()
            : seasonalProducts;
    }

    public List<PopularRecipeCardDto> getPopularRecipes() {
        return popularRecipes;
    }

    public void setPopularRecipes(List<PopularRecipeCardDto> popularRecipes) {
        this.popularRecipes = popularRecipes == null ? new ArrayList<PopularRecipeCardDto>() : popularRecipes;
    }
}
