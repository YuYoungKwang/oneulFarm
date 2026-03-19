package com.app.dto.main;

public class ProductDto {

    private Long productNo;
    private String productName;
    private int salePrice;
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

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }
}
