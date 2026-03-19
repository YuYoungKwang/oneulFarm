package com.app.dto;

import java.math.BigDecimal;
import java.util.List;

public class RecipeDetailDTO {

    private Long recipeNo;
    private String externalRecipeId;
    private String recipeName;
    private String description;
    private String cookTime;
    private String difficulty;
    private BigDecimal calories;
    private String imageUrl;
    private String sourceName;
    private List<RecipeIngredientDTO> ingredientList;
    private List<RecipeStepDTO> stepList;

    public Long getRecipeNo() {
        return recipeNo;
    }

    public void setRecipeNo(Long recipeNo) {
        this.recipeNo = recipeNo;
    }

    public String getExternalRecipeId() {
        return externalRecipeId;
    }

    public void setExternalRecipeId(String externalRecipeId) {
        this.externalRecipeId = externalRecipeId;
    }

    public String getRecipeName() {
        return recipeName;
    }

    public void setRecipeName(String recipeName) {
        this.recipeName = recipeName;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getCookTime() {
        return cookTime;
    }

    public void setCookTime(String cookTime) {
        this.cookTime = cookTime;
    }

    public String getDifficulty() {
        return difficulty;
    }

    public void setDifficulty(String difficulty) {
        this.difficulty = difficulty;
    }

    public BigDecimal getCalories() {
        return calories;
    }

    public void setCalories(BigDecimal calories) {
        this.calories = calories;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public String getSourceName() {
        return sourceName;
    }

    public void setSourceName(String sourceName) {
        this.sourceName = sourceName;
    }

    public List<RecipeIngredientDTO> getIngredientList() {
        return ingredientList;
    }

    public void setIngredientList(List<RecipeIngredientDTO> ingredientList) {
        this.ingredientList = ingredientList;
    }

    public List<RecipeStepDTO> getStepList() {
        return stepList;
    }

    public void setStepList(List<RecipeStepDTO> stepList) {
        this.stepList = stepList;
    }
}
