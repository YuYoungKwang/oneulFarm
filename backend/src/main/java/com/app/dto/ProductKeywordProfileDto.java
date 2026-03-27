package com.app.dto;

import java.util.ArrayList;
import java.util.List;

public class ProductKeywordProfileDto {

    private Long mapNo;
    private Long categoryNo;
    private String categoryName;
    private Long productNo;
    private String productName;
    private String representKeyword;
    private List<String> searchKeywordList = new ArrayList<String>();
    private List<String> allowedRecipeCategoryList = new ArrayList<String>();

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

    public List<String> getSearchKeywordList() {
        return searchKeywordList;
    }

    public void setSearchKeywordList(List<String> searchKeywordList) {
        this.searchKeywordList = searchKeywordList == null ? new ArrayList<String>() : searchKeywordList;
    }

    public List<String> getAllowedRecipeCategoryList() {
        return allowedRecipeCategoryList;
    }

    public void setAllowedRecipeCategoryList(List<String> allowedRecipeCategoryList) {
        this.allowedRecipeCategoryList = allowedRecipeCategoryList == null
            ? new ArrayList<String>()
            : allowedRecipeCategoryList;
    }
}
