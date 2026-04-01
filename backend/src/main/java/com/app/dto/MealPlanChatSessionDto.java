package com.app.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;

public class MealPlanChatSessionDto {

    private Long chatNo;
    private Long userNo;
    private String chatTitle;
    private String lastMessageText;
    private String chatJson;
    private String previousResponseId;
    private Integer messageCount;
    private String fallbackFlag;
    private String createdAt;
    private String updatedAt;

    public Long getChatNo() {
        return chatNo;
    }

    public void setChatNo(Long chatNo) {
        this.chatNo = chatNo;
    }

    public Long getUserNo() {
        return userNo;
    }

    public void setUserNo(Long userNo) {
        this.userNo = userNo;
    }

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

    public boolean isFallbackMode() {
        return "Y".equalsIgnoreCase(fallbackFlag);
    }

    public void setFallbackMode(boolean fallbackMode) {
        this.fallbackFlag = fallbackMode ? "Y" : "N";
    }

    @JsonIgnore
    public String getFallbackFlag() {
        return fallbackFlag;
    }

    public void setFallbackFlag(String fallbackFlag) {
        this.fallbackFlag = fallbackFlag;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public String getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(String updatedAt) {
        this.updatedAt = updatedAt;
    }
}
