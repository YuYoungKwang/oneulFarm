package com.app.service;

import com.app.dto.ChangePasswordRequestDto;
import com.app.dto.DuplicateCheckResponseDto;
import com.app.dto.FindUserIdRequestDto;
import com.app.dto.FindUserIdResponseDto;
import com.app.dto.LoginRequestDto;
import com.app.dto.LoginResponseDto;
import com.app.dto.ResetPasswordRequestDto;
import com.app.dto.SignupRequestDto;

public interface AuthService {

    void signup(SignupRequestDto request);

    LoginResponseDto login(LoginRequestDto request);

    FindUserIdResponseDto findUserId(FindUserIdRequestDto request);

    void sendTemporaryPassword(ResetPasswordRequestDto request);

    LoginResponseDto changePassword(Long userNo, ChangePasswordRequestDto request);

    DuplicateCheckResponseDto checkUserId(String userId);

    DuplicateCheckResponseDto checkEmail(String email);

    DuplicateCheckResponseDto checkNickname(String nickname);
}
