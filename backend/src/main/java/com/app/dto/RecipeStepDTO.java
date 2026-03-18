package com.app.dto;

import java.util.List;

public class RecipeStepDTO {

    private Long stepNo;
    private Long recipeNo;
    private Integer stepSeq;
    private String description;
    private String primaryImageUrl;
    private List<RecipeStepImageDTO> imageList;

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

    public String getPrimaryImageUrl() {
        return primaryImageUrl;
    }

    public void setPrimaryImageUrl(String primaryImageUrl) {
        this.primaryImageUrl = primaryImageUrl;
    }

    public List<RecipeStepImageDTO> getImageList() {
        return imageList;
    }

    public void setImageList(List<RecipeStepImageDTO> imageList) {
        this.imageList = imageList;
    }
}
