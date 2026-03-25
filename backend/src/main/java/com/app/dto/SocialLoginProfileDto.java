package com.app.dto;

import lombok.Data;

@Data
public class SocialLoginProfileDto {

    private String provider;
    private String providerUserId;
    private String email;
    private String nickname;
}
