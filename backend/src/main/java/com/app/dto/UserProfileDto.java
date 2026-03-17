package com.app.dto;

import java.math.BigDecimal;

public class UserProfileDto {

    private Long userNo;
    private String userId;
    private String nickname;
    private String email;
    private String phone;
    private String profileImageUrl;
    private String defaultAddress;
    private BigDecimal totalSavedAmount;

    public Long getUserNo() {
        return userNo;
    }

    public void setUserNo(Long userNo) {
        this.userNo = userNo;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getNickname() {
        return nickname;
    }

    public void setNickname(String nickname) {
        this.nickname = nickname;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getProfileImageUrl() {
        return profileImageUrl;
    }

    public void setProfileImageUrl(String profileImageUrl) {
        this.profileImageUrl = profileImageUrl;
    }

    public String getDefaultAddress() {
        return defaultAddress;
    }

    public void setDefaultAddress(String defaultAddress) {
        this.defaultAddress = defaultAddress;
    }

    public BigDecimal getTotalSavedAmount() {
        return totalSavedAmount;
    }

    public void setTotalSavedAmount(BigDecimal totalSavedAmount) {
        this.totalSavedAmount = totalSavedAmount;
    }
}
