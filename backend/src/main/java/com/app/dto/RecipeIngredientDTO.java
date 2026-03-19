package com.app.dto;

public class RecipeIngredientDTO {

    private Long ingredientNo;
    private Long recipeNo;
    private String ingredientName;
    private String amount;

    public Long getIngredientNo() {
        return ingredientNo;
    }

    public void setIngredientNo(Long ingredientNo) {
        this.ingredientNo = ingredientNo;
    }

    public Long getRecipeNo() {
        return recipeNo;
    }

    public void setRecipeNo(Long recipeNo) {
        this.recipeNo = recipeNo;
    }

    public String getIngredientName() {
        return ingredientName;
    }

    public void setIngredientName(String ingredientName) {
        this.ingredientName = ingredientName;
    }

    public String getAmount() {
        return amount;
    }

    public void setAmount(String amount) {
        this.amount = amount;
    }
}
