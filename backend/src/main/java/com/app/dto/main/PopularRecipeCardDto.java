package com.app.dto.main;

import java.util.ArrayList;
import java.util.List;

public class PopularRecipeCardDto {

    private Long recipeNo;
    private String recipeName;
    private String summary = "";
    private List<String> matchedIngredients = new ArrayList<String>();
    private String imageUrl = "";

    public Long getRecipeNo() {
        return recipeNo;
    }

    public void setRecipeNo(Long recipeNo) {
        this.recipeNo = recipeNo;
    }

    public String getRecipeName() {
        return recipeName;
    }

    public void setRecipeName(String recipeName) {
        this.recipeName = recipeName;
    }

    public String getSummary() {
        return summary;
    }

    public void setSummary(String summary) {
        this.summary = summary == null ? "" : summary;
    }

    public List<String> getMatchedIngredients() {
        return matchedIngredients;
    }

    public void setMatchedIngredients(List<String> matchedIngredients) {
        this.matchedIngredients = matchedIngredients == null ? new ArrayList<String>() : matchedIngredients;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl == null ? "" : imageUrl;
    }
}
