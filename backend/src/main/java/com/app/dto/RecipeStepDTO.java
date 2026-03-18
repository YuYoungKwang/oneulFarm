package com.app.dto;

public class RecipeStepDTO {

    private Long stepNo;
    private Long recipeNo;
    private Integer stepSeq;
    private String description;

    public Long getStepNo() {
        return stepNo;
    }

    public void setStepNo(Long stepNo) {
        this.stepNo = stepNo;
    }

    public Long getRecipeNo() {
        return recipeNo;
    }

    public void setRecipeNo(Long recipeNo) {
        this.recipeNo = recipeNo;
    }

    public Integer getStepSeq() {
        return stepSeq;
    }

    public void setStepSeq(Integer stepSeq) {
        this.stepSeq = stepSeq;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }
}
