package com.app.dto;

public class PriceSnapshotBackfillItemDTO {

    private String displayName;
    private String marketType;
    private String itemCategoryCode;
    private String itemCode;
    private String kindCode;
    private String productRankCode;
    private String countryCode;
    private String convertKgYn;
    private String itemNameHint;
    private String unitHint;
    private String storedItemCode;
    private int processedCount;
    private boolean success;
    private String errorMessage;

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public String getMarketType() {
        return marketType;
    }

    public void setMarketType(String marketType) {
        this.marketType = marketType;
    }

    public String getItemCategoryCode() {
        return itemCategoryCode;
    }

    public void setItemCategoryCode(String itemCategoryCode) {
        this.itemCategoryCode = itemCategoryCode;
    }

    public String getItemCode() {
        return itemCode;
    }

    public void setItemCode(String itemCode) {
        this.itemCode = itemCode;
    }

    public String getKindCode() {
        return kindCode;
    }

    public void setKindCode(String kindCode) {
        this.kindCode = kindCode;
    }

    public String getProductRankCode() {
        return productRankCode;
    }

    public void setProductRankCode(String productRankCode) {
        this.productRankCode = productRankCode;
    }

    public String getCountryCode() {
        return countryCode;
    }

    public void setCountryCode(String countryCode) {
        this.countryCode = countryCode;
    }

    public String getConvertKgYn() {
        return convertKgYn;
    }

    public void setConvertKgYn(String convertKgYn) {
        this.convertKgYn = convertKgYn;
    }

    public String getItemNameHint() {
        return itemNameHint;
    }

    public void setItemNameHint(String itemNameHint) {
        this.itemNameHint = itemNameHint;
    }

    public String getUnitHint() {
        return unitHint;
    }

    public void setUnitHint(String unitHint) {
        this.unitHint = unitHint;
    }

    public String getStoredItemCode() {
        return storedItemCode;
    }

    public void setStoredItemCode(String storedItemCode) {
        this.storedItemCode = storedItemCode;
    }

    public int getProcessedCount() {
        return processedCount;
    }

    public void setProcessedCount(int processedCount) {
        this.processedCount = processedCount;
    }

    public boolean isSuccess() {
        return success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public void setErrorMessage(String errorMessage) {
        this.errorMessage = errorMessage;
    }
}
