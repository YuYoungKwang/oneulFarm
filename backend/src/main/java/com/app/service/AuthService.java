package com.app.service;

import java.util.Map;

import com.app.dto.SocialLoginRequestDto;
import com.app.dto.UserDto;

public interface AuthService {

    Map<String, Object> signup(UserDto request);

    Map<String, Object> login(UserDto request);

    Map<String, Object> socialLogin(String provider, SocialLoginRequestDto request);

    Map<String, Object> findUserId(UserDto request);

    void sendTemporaryPassword(UserDto request);

    Map<String, Object> changePassword(Long userNo, Map<String, String> request);

    Map<String, Object> checkUserId(String userId);

    Map<String, Object> checkEmail(String email);

    Map<String, Object> checkNickname(String nickname);
}
