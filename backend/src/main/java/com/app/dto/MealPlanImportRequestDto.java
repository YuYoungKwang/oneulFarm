package com.app.dto;

import java.util.List;

public class MealPlanImportRequestDto {

    private String startDate;
    private String endDate;
    private String title;
    private String requestText;
    private String responseId;
    private MealPlanPlanDto plan;
    private List<MealPlanChatResponseDto.SellableIngredientDto> sellableIngredients;

    public String getStartDate() {
        return startDate;
    }

    public void setStartDate(String startDate) {
        this.startDate = startDate;
    }

    public String getEndDate() {
        return endDate;
    }

    public void setEndDate(String endDate) {
        this.endDate = endDate;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getRequestText() {
        return requestText;
    }

    public void setRequestText(String requestText) {
        this.requestText = requestText;
    }

    public String getResponseId() {
        return responseId;
    }

    public void setResponseId(String responseId) {
        this.responseId = responseId;
    }

    public MealPlanPlanDto getPlan() {
        return plan;
    }

    public void setPlan(MealPlanPlanDto plan) {
        this.plan = plan;
    }

    public List<MealPlanChatResponseDto.SellableIngredientDto> getSellableIngredients() {
        return sellableIngredients;
    }

    public void setSellableIngredients(List<MealPlanChatResponseDto.SellableIngredientDto> sellableIngredients) {
        this.sellableIngredients = sellableIngredients;
    }
}
