package com.app.dto;

public class ProductSearchKeywordMapDto {

    private Long mapNo;
    private Long categoryNo;
    private String categoryName;
    private Long productNo;
    private String productName;
    private String representKeyword;
    private Integer priority;
    private String isActive;

    public Long getMapNo() {
        return mapNo;
    }

    public void setMapNo(Long mapNo) {
        this.mapNo = mapNo;
    }

    public Long getCategoryNo() {
        return categoryNo;
    }

    public void setCategoryNo(Long categoryNo) {
        this.categoryNo = categoryNo;
    }

    public String getCategoryName() {
        return categoryName;
    }

    public void setCategoryName(String categoryName) {
        this.categoryName = categoryName;
    }

    public Long getProductNo() {
        return productNo;
    }

    public void setProductNo(Long productNo) {
        this.productNo = productNo;
    }

    public String getProductName() {
        return productName;
    }

    public void setProductName(String productName) {
        this.productName = productName;
    }

    public String getRepresentKeyword() {
        return representKeyword;
    }

    public void setRepresentKeyword(String representKeyword) {
        this.representKeyword = representKeyword;
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
