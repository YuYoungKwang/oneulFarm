package com.app.dto;

import java.math.BigDecimal;

public class MonthlySavingDto {

    private String yearMonth;
    private BigDecimal savedAmount;

    public String getYearMonth() {
        return yearMonth;
    }

    public void setYearMonth(String yearMonth) {
        this.yearMonth = yearMonth;
    }

    public BigDecimal getSavedAmount() {
        return savedAmount;
    }

    public void setSavedAmount(BigDecimal savedAmount) {
        this.savedAmount = savedAmount;
    }
}
