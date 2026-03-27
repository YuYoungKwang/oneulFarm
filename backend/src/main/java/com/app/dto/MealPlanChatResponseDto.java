package com.app.dto;

public class MealPlanChatResponseDto {

    private String reply;
    private String responseId;
    private String model;
    private boolean fallbackMode;

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
}
