package com.app.dto.main;

public class LinkedRecipeDto {

    private Long recipeNo;
    private String recipeName;
    private String imageUrl = "";
    private String matchedIngredient = "";

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

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl == null ? "" : imageUrl;
    }

    public String getMatchedIngredient() {
        return matchedIngredient;
    }

    public void setMatchedIngredient(String matchedIngredient) {
        this.matchedIngredient = matchedIngredient == null ? "" : matchedIngredient;
    }
}
