package com.app.dto;

public class RecipeStepImageDTO {

    private Long stepImageNo;
    private Long stepNo;
    private String imageUrl;
    private Integer sortOrder;

    public Long getStepImageNo() {
        return stepImageNo;
    }

    public void setStepImageNo(Long stepImageNo) {
        this.stepImageNo = stepImageNo;
    }

    public Long getStepNo() {
        return stepNo;
    }

    public void setStepNo(Long stepNo) {
        this.stepNo = stepNo;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public Integer getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(Integer sortOrder) {
        this.sortOrder = sortOrder;
    }
}
