package com.app.dto;

import java.math.BigDecimal;

public class DashboardPatternSummaryDto {

    private BigDecimal averagePurchaseUnitPrice;
    private BigDecimal averageSavingRate;

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
}
