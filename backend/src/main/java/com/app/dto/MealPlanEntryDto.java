package com.app.dto;

import java.util.ArrayList;
import java.util.List;

public class MealPlanEntryDto {

    private Long entryNo;
    private Long planNo;
    private String planTitle;
    private Long userNo;
    private String mealDate;
    private String mealType;
    private String entryTitle;
    private String entryDescription;
    private String sourceType;
    private Long recipeNo;
    private String recipeName;
    private Integer servings;
    private Integer displayOrder;
    private String imageUrl;
    private List<MealPlanEntryIngredientDto> ingredientList = new ArrayList<MealPlanEntryIngredientDto>();

    public Long getEntryNo() {
        return entryNo;
    }

    public void setEntryNo(Long entryNo) {
        this.entryNo = entryNo;
    }

    public Long getPlanNo() {
        return planNo;
    }

    public void setPlanNo(Long planNo) {
        this.planNo = planNo;
    }

    public String getPlanTitle() {
        return planTitle;
    }

    public void setPlanTitle(String planTitle) {
        this.planTitle = planTitle;
    }

    public Long getUserNo() {
        return userNo;
    }

    public void setUserNo(Long userNo) {
        this.userNo = userNo;
    }

    public String getMealDate() {
        return mealDate;
    }

    public void setMealDate(String mealDate) {
        this.mealDate = mealDate;
    }

    public String getMealType() {
        return mealType;
    }

    public void setMealType(String mealType) {
        this.mealType = mealType;
    }

    public String getEntryTitle() {
        return entryTitle;
    }

    public void setEntryTitle(String entryTitle) {
        this.entryTitle = entryTitle;
    }

    public String getEntryDescription() {
        return entryDescription;
    }

    public void setEntryDescription(String entryDescription) {
        this.entryDescription = entryDescription;
    }

    public String getSourceType() {
        return sourceType;
    }

    public void setSourceType(String sourceType) {
        this.sourceType = sourceType;
    }

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

    public Integer getServings() {
        return servings;
    }

    public void setServings(Integer servings) {
        this.servings = servings;
    }

    public Integer getDisplayOrder() {
        return displayOrder;
    }

    public void setDisplayOrder(Integer displayOrder) {
        this.displayOrder = displayOrder;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public List<MealPlanEntryIngredientDto> getIngredientList() {
        return ingredientList;
    }

    public void setIngredientList(List<MealPlanEntryIngredientDto> ingredientList) {
        this.ingredientList = ingredientList;
    }
}
