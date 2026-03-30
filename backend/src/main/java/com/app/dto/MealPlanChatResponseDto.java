package com.app.dto;

import java.math.BigDecimal;
import java.util.List;

public class MealPlanChatResponseDto {

    private String reply;
    private String responseId;
    private String model;
    private boolean fallbackMode;
    private MealPlanPlanDto plan;
    private List<MealPlanPlanDto.IngredientDto> aggregatedIngredients;
    private List<SellableIngredientDto> sellableIngredients;
    private List<UnsellableIngredientDto> unsellableIngredients;
    private String cartPromptMessage;
    private CartPreviewDto cartPreview;

    public String getReply() {
        return reply;
    }

    public void setReply(String reply) {
        this.reply = reply;
    }

    public String getResponseId() {
        return responseId;
    }

    public void setResponseId(String responseId) {
        this.responseId = responseId;
    }

    public String getModel() {
        return model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public boolean isFallbackMode() {
        return fallbackMode;
    }

    public void setFallbackMode(boolean fallbackMode) {
        this.fallbackMode = fallbackMode;
    }

    public MealPlanPlanDto getPlan() {
        return plan;
    }

    public void setPlan(MealPlanPlanDto plan) {
        this.plan = plan;
    }

    public List<MealPlanPlanDto.IngredientDto> getAggregatedIngredients() {
        return aggregatedIngredients;
    }

    public void setAggregatedIngredients(List<MealPlanPlanDto.IngredientDto> aggregatedIngredients) {
        this.aggregatedIngredients = aggregatedIngredients;
    }

    public List<SellableIngredientDto> getSellableIngredients() {
        return sellableIngredients;
    }

    public void setSellableIngredients(List<SellableIngredientDto> sellableIngredients) {
        this.sellableIngredients = sellableIngredients;
    }

    public List<UnsellableIngredientDto> getUnsellableIngredients() {
        return unsellableIngredients;
    }

    public void setUnsellableIngredients(List<UnsellableIngredientDto> unsellableIngredients) {
        this.unsellableIngredients = unsellableIngredients;
    }

    public String getCartPromptMessage() {
        return cartPromptMessage;
    }

    public void setCartPromptMessage(String cartPromptMessage) {
        this.cartPromptMessage = cartPromptMessage;
    }

    public CartPreviewDto getCartPreview() {
        return cartPreview;
    }

    public void setCartPreview(CartPreviewDto cartPreview) {
        this.cartPreview = cartPreview;
    }

    public static class SellableIngredientDto {

        private String ingredientName;
        private String requiredAmountText;
        private String matchSummary;
        private CartCandidateDto cartCandidate;

        public String getIngredientName() {
            return ingredientName;
        }

        public void setIngredientName(String ingredientName) {
            this.ingredientName = ingredientName;
        }

        public String getRequiredAmountText() {
            return requiredAmountText;
        }

        public void setRequiredAmountText(String requiredAmountText) {
            this.requiredAmountText = requiredAmountText;
        }

        public String getMatchSummary() {
            return matchSummary;
        }

        public void setMatchSummary(String matchSummary) {
            this.matchSummary = matchSummary;
        }

        public CartCandidateDto getCartCandidate() {
            return cartCandidate;
        }

        public void setCartCandidate(CartCandidateDto cartCandidate) {
            this.cartCandidate = cartCandidate;
        }
    }

    public static class UnsellableIngredientDto {

        private String ingredientName;
        private String requiredAmountText;
        private String reason;

        public String getIngredientName() {
            return ingredientName;
        }

        public void setIngredientName(String ingredientName) {
            this.ingredientName = ingredientName;
        }

        public String getRequiredAmountText() {
            return requiredAmountText;
        }

        public void setRequiredAmountText(String requiredAmountText) {
            this.requiredAmountText = requiredAmountText;
        }

        public String getReason() {
            return reason;
        }

        public void setReason(String reason) {
            this.reason = reason;
        }
    }

    public static class CartPreviewDto {

        private Integer totalProductKinds;
        private Integer totalQuantity;
        private BigDecimal estimatedTotalPrice;

        public Integer getTotalProductKinds() {
            return totalProductKinds;
        }

        public void setTotalProductKinds(Integer totalProductKinds) {
            this.totalProductKinds = totalProductKinds;
        }

        public Integer getTotalQuantity() {
            return totalQuantity;
        }

        public void setTotalQuantity(Integer totalQuantity) {
            this.totalQuantity = totalQuantity;
        }

        public BigDecimal getEstimatedTotalPrice() {
            return estimatedTotalPrice;
        }

        public void setEstimatedTotalPrice(BigDecimal estimatedTotalPrice) {
            this.estimatedTotalPrice = estimatedTotalPrice;
        }
    }

    public static class CartCandidateDto {

        private Long productNo;
        private String productName;
        private BigDecimal salePrice;
        private String unit;
        private BigDecimal packageWeight;
        private String displayPackageText;
        private BigDecimal requiredAmountValue;
        private String requiredUnit;
        private String requiredAmountText;
        private Integer recommendedQuantity;
        private String coveredAmountText;

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

        public BigDecimal getSalePrice() {
            return salePrice;
        }

        public void setSalePrice(BigDecimal salePrice) {
            this.salePrice = salePrice;
        }

        public String getUnit() {
            return unit;
        }

        public void setUnit(String unit) {
            this.unit = unit;
        }

        public BigDecimal getPackageWeight() {
            return packageWeight;
        }

        public void setPackageWeight(BigDecimal packageWeight) {
            this.packageWeight = packageWeight;
        }

        public String getDisplayPackageText() {
            return displayPackageText;
        }

        public void setDisplayPackageText(String displayPackageText) {
            this.displayPackageText = displayPackageText;
        }

        public BigDecimal getRequiredAmountValue() {
            return requiredAmountValue;
        }

        public void setRequiredAmountValue(BigDecimal requiredAmountValue) {
            this.requiredAmountValue = requiredAmountValue;
        }

        public String getRequiredUnit() {
            return requiredUnit;
        }

        public void setRequiredUnit(String requiredUnit) {
            this.requiredUnit = requiredUnit;
        }

        public String getRequiredAmountText() {
            return requiredAmountText;
        }

        public void setRequiredAmountText(String requiredAmountText) {
            this.requiredAmountText = requiredAmountText;
        }

        public Integer getRecommendedQuantity() {
            return recommendedQuantity;
        }

        public void setRecommendedQuantity(Integer recommendedQuantity) {
            this.recommendedQuantity = recommendedQuantity;
        }

        public String getCoveredAmountText() {
            return coveredAmountText;
        }

        public void setCoveredAmountText(String coveredAmountText) {
            this.coveredAmountText = coveredAmountText;
        }
    }
}
