package com.app.dto;

public class MealPlanDto {

    private Long planNo;
    private Long userNo;
    private String planTitle;
    private String sourceType;
    private String requestText;
    private String planSummary;
    private String startDate;
    private String endDate;
    private String aiResponseId;

    public Long getPlanNo() {
        return planNo;
    }

    public void setPlanNo(Long planNo) {
        this.planNo = planNo;
    }

    public Long getUserNo() {
        return userNo;
    }

    public void setUserNo(Long userNo) {
        this.userNo = userNo;
    }

    public String getPlanTitle() {
        return planTitle;
    }

    public void setPlanTitle(String planTitle) {
        this.planTitle = planTitle;
    }

    public String getSourceType() {
        return sourceType;
    }

    public void setSourceType(String sourceType) {
        this.sourceType = sourceType;
    }

    public String getRequestText() {
        return requestText;
    }

    public void setRequestText(String requestText) {
        this.requestText = requestText;
    }

    public String getPlanSummary() {
        return planSummary;
    }

    public void setPlanSummary(String planSummary) {
        this.planSummary = planSummary;
    }

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

    public String getAiResponseId() {
        return aiResponseId;
    }

    public void setAiResponseId(String aiResponseId) {
        this.aiResponseId = aiResponseId;
    }
}
