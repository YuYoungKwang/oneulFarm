package com.app.dto;

import lombok.Data;

@Data
public class SignupRequestDto {
    private String userId;
    private String email;
    private String password;
    private String nickname;
    private String phone;
}