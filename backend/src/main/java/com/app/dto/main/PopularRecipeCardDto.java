package com.app.dto.main;

import java.util.ArrayList;
import java.util.List;

public class PopularRecipeCardDto {

    private Long recipeNo;
    private String recipeName;
    private String summary = "";
    private String categoryLabel = "";
    private String sourceKeyword = "";
    private boolean datalabDriven;
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

    public String getCategoryLabel() {
        return categoryLabel;
    }

    public void setCategoryLabel(String categoryLabel) {
        this.categoryLabel = categoryLabel == null ? "" : categoryLabel;
    }

    public String getSourceKeyword() {
        return sourceKeyword;
    }

    public void setSourceKeyword(String sourceKeyword) {
        this.sourceKeyword = sourceKeyword == null ? "" : sourceKeyword;
    }

    public boolean isDatalabDriven() {
        return datalabDriven;
    }

    public void setDatalabDriven(boolean datalabDriven) {
        this.datalabDriven = datalabDriven;
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
