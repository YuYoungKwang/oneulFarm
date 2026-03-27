package com.app.dto;

public class KeywordRecipeCategoryMapDto {

    private Long categoryMapNo;
    private String representKeyword;
    private String recipeCategory;
    private Integer priority;
    private String isActive;

    public Long getCategoryMapNo() {
        return categoryMapNo;
    }

    public void setCategoryMapNo(Long categoryMapNo) {
        this.categoryMapNo = categoryMapNo;
    }

    public String getRepresentKeyword() {
        return representKeyword;
    }

    public void setRepresentKeyword(String representKeyword) {
        this.representKeyword = representKeyword;
    }

    public String getRecipeCategory() {
        return recipeCategory;
    }

    public void setRecipeCategory(String recipeCategory) {
        this.recipeCategory = recipeCategory;
    }

    public Integer getPriority() {
        return priority;
    }

    public void setPriority(Integer priority) {
        this.priority = priority;
    }

    public String getIsActive() {
        return isActive;
    }

    public void setIsActive(String isActive) {
        this.isActive = isActive;
    }
}
