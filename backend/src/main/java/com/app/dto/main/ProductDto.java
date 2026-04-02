package com.app.dto.main;

import java.math.BigDecimal;

public class ProductDto {

    private Long productNo;
    private Long categoryNo;
    private String categoryName;
    private String productName;
    private int salePrice;
    private BigDecimal comparedPrice;
    private BigDecimal priceGap;
    private BigDecimal savingRate;
    private String badgeType;
    private String imageUrl; // /api/image/product/{id}
    private Long imageNo;
    
    public Long getImageNo() {
		return imageNo;
	}

	public void setImageNo(Long imageNo) {
		this.imageNo = imageNo;
	}

	public Long getProductNo() {
        return productNo;
    }

    public void setProductNo(Long productNo) {
        this.productNo = productNo;
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

    public String getProductName() {
        return productName;
    }

    public void setProductName(String productName) {
        this.productName = productName;
    }

	public int getSalePrice() {
        return salePrice;
    }

    public void setSalePrice(int salePrice) {
        this.salePrice = salePrice;
    }

    public BigDecimal getComparedPrice() {
        return comparedPrice;
    }

    public void setComparedPrice(BigDecimal comparedPrice) {
        this.comparedPrice = comparedPrice;
    }

    public BigDecimal getPriceGap() {
        return priceGap;
    }

    public void setPriceGap(BigDecimal priceGap) {
        this.priceGap = priceGap;
    }

    public BigDecimal getSavingRate() {
        return savingRate;
    }

    public void setSavingRate(BigDecimal savingRate) {
        this.savingRate = savingRate;
    }

    public String getBadgeType() {
        return badgeType;
    }

    public void setBadgeType(String badgeType) {
        this.badgeType = badgeType;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }
}
