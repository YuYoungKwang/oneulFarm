package com.app.dto;

import java.util.List;

public class RecipeListResponseDTO {

    private int count;
    private String keyword;
    private String ingredientKeyword;
    private String sort;
    private List<RecipeDTO> recipeList;

    public int getCount() {
        return count;
    }

    public void setCount(int count) {
        this.count = count;
    }

    public String getKeyword() {
        return keyword;
    }

    public void setKeyword(String keyword) {
        this.keyword = keyword;
    }

    public String getIngredientKeyword() {
        return ingredientKeyword;
    }

    public void setIngredientKeyword(String ingredientKeyword) {
        this.ingredientKeyword = ingredientKeyword;
    }

    public String getSort() {
        return sort;
    }

    public void setSort(String sort) {
        this.sort = sort;
    }

    public List<RecipeDTO> getRecipeList() {
        return recipeList;
    }

    public void setRecipeList(List<RecipeDTO> recipeList) {
        this.recipeList = recipeList;
    }
}
