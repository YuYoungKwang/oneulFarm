package com.app.dto;

public class MealPlanChatSessionRequestDto {

    private String chatTitle;
    private String lastMessageText;
    private String chatJson;
    private String previousResponseId;
    private Integer messageCount;
    private Boolean fallbackMode;

    public String getChatTitle() {
        return chatTitle;
    }

    public void setChatTitle(String chatTitle) {
        this.chatTitle = chatTitle;
    }

    public String getLastMessageText() {
        return lastMessageText;
    }

    public void setLastMessageText(String lastMessageText) {
        this.lastMessageText = lastMessageText;
    }

    public String getChatJson() {
        return chatJson;
    }

    public void setChatJson(String chatJson) {
        this.chatJson = chatJson;
    }

    public String getPreviousResponseId() {
        return previousResponseId;
    }

    public void setPreviousResponseId(String previousResponseId) {
        this.previousResponseId = previousResponseId;
    }

    public Integer getMessageCount() {
        return messageCount;
    }

    public void setMessageCount(Integer messageCount) {
        this.messageCount = messageCount;
    }

    public Boolean getFallbackMode() {
        return fallbackMode;
    }

    public void setFallbackMode(Boolean fallbackMode) {
        this.fallbackMode = fallbackMode;
    }
}
