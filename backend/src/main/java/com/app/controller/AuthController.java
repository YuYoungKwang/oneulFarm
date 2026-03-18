package com.app.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.app.common.ApiResponse;
import com.app.dto.ChangePasswordRequestDto;
import com.app.dto.DuplicateCheckResponseDto;
import com.app.dto.FindUserIdRequestDto;
import com.app.dto.FindUserIdResponseDto;
import com.app.dto.LoginRequestDto;
import com.app.dto.LoginResponseDto;
import com.app.dto.ResetPasswordRequestDto;
import com.app.dto.SignupRequestDto;
import com.app.service.AuthService;

@RestController
@RequestMapping(value = "/api/auth", produces = MediaType.APPLICATION_JSON_VALUE)
public class AuthController {

    @Autowired
    private AuthService authService;

    @PostMapping(value = "/signup", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ApiResponse<String> signup(@RequestBody SignupRequestDto request) {
        authService.signup(request);
        return ApiResponse.success("OK", "회원가입 성공");
    }

    @PostMapping(value = "/login", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ApiResponse<LoginResponseDto> login(@RequestBody LoginRequestDto request) {
        return ApiResponse.success(authService.login(request), "로그인 성공");
    }

    @PostMapping(value = "/find-userid", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ApiResponse<FindUserIdResponseDto> findUserId(@RequestBody FindUserIdRequestDto request) {
        return ApiResponse.success(authService.findUserId(request), "아이디 찾기 성공");
    }

    @PostMapping(value = "/reset-password", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ApiResponse<String> resetPassword(@RequestBody ResetPasswordRequestDto request) {
        authService.sendTemporaryPassword(request);
        return ApiResponse.success("OK", "임시 비밀번호를 이메일로 전송했습니다.");
    }

    @PatchMapping(value = "/password", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ApiResponse<LoginResponseDto> changePassword(
        @RequestHeader("X-USER-NO") Long userNo,
        @RequestBody ChangePasswordRequestDto request
    ) {
        return ApiResponse.success(authService.changePassword(userNo, request), "비밀번호 변경 성공");
    }

    @GetMapping("/check-userid")
    public ApiResponse<DuplicateCheckResponseDto> checkUserId(@RequestParam String userId) {
        return ApiResponse.success(authService.checkUserId(userId), "아이디 중복 확인 성공");
    }

    @GetMapping("/check-email")
    public ApiResponse<DuplicateCheckResponseDto> checkEmail(@RequestParam String email) {
        return ApiResponse.success(authService.checkEmail(email), "이메일 중복 확인 성공");
    }

    @GetMapping("/check-nickname")
    public ApiResponse<DuplicateCheckResponseDto> checkNickname(@RequestParam String nickname) {
        return ApiResponse.success(authService.checkNickname(nickname), "닉네임 중복 확인 성공");
    }
}
