package com.app.dto;

import lombok.Data;

@Data
public class SocialLoginRequestDto {

    private String code;
    private String state;
    private String redirectUri;
}
