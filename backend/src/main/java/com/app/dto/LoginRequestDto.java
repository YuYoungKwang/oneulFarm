package com.app.dto;

import lombok.Data;

@Data
public class LoginRequestDto {
    private String userId; // 또는 email로 로그인
    private String password;
}