package com.app.dto;

public class FindUserIdResponseDto {

    private String userId;

    public FindUserIdResponseDto() {
    }

    public FindUserIdResponseDto(String userId) {
        this.userId = userId;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }
}
