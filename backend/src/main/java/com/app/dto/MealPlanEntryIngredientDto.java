package com.app.dto;

import java.math.BigDecimal;

public class MealPlanEntryIngredientDto {

    private Long entryIngredientNo;
    private Long entryNo;
    private String ingredientName;
    private BigDecimal amountValue;
    private String unit;
    private String amountText;
    private Long productNo;
    private String productName;

    public Long getEntryIngredientNo() {
        return entryIngredientNo;
    }

    public void setEntryIngredientNo(Long entryIngredientNo) {
        this.entryIngredientNo = entryIngredientNo;
    }

    public Long getEntryNo() {
        return entryNo;
    }

    public void setEntryNo(Long entryNo) {
        this.entryNo = entryNo;
    }

    public String getIngredientName() {
        return ingredientName;
    }

    public void setIngredientName(String ingredientName) {
        this.ingredientName = ingredientName;
    }

    public BigDecimal getAmountValue() {
        return amountValue;
    }

    public void setAmountValue(BigDecimal amountValue) {
        this.amountValue = amountValue;
    }

    public String getUnit() {
        return unit;
    }

    public void setUnit(String unit) {
        this.unit = unit;
    }

    public String getAmountText() {
        return amountText;
    }

    public void setAmountText(String amountText) {
        this.amountText = amountText;
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
}
