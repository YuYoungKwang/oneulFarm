package com.app.dto;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class DashboardPatternResponseDto {

    private BigDecimal averagePurchaseUnitPrice;
    private BigDecimal averageSavingRate;
    private List<TopPurchasedProductDto> topPurchasedProducts = new ArrayList<>();
    private List<RecentPurchasedProductDto> recentPurchasedProducts = new ArrayList<>();

    public BigDecimal getAveragePurchaseUnitPrice() {
        return averagePurchaseUnitPrice;
    }

    public void setAveragePurchaseUnitPrice(BigDecimal averagePurchaseUnitPrice) {
        this.averagePurchaseUnitPrice = averagePurchaseUnitPrice;
    }

    public BigDecimal getAverageSavingRate() {
        return averageSavingRate;
    }

    public void setAverageSavingRate(BigDecimal averageSavingRate) {
        this.averageSavingRate = averageSavingRate;
    }

    public List<TopPurchasedProductDto> getTopPurchasedProducts() {
        return topPurchasedProducts;
    }

    public void setTopPurchasedProducts(List<TopPurchasedProductDto> topPurchasedProducts) {
        this.topPurchasedProducts = topPurchasedProducts;
    }

    public List<RecentPurchasedProductDto> getRecentPurchasedProducts() {
        return recentPurchasedProducts;
    }

    public void setRecentPurchasedProducts(List<RecentPurchasedProductDto> recentPurchasedProducts) {
        this.recentPurchasedProducts = recentPurchasedProducts;
    }
}
