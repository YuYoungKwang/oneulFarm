package com.app.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.app.common.ApiResponse;
import com.app.dto.ChangePasswordRequestDto;
import com.app.dto.DuplicateCheckResponseDto;
import com.app.dto.UpdateUserProfileRequestDto;
import com.app.dto.UserProfileDto;
import com.app.service.UserService;

@RestController
@RequestMapping(value = "/api/users", produces = MediaType.APPLICATION_JSON_VALUE)
public class UserController {

    @Autowired
    private UserService userService;

    @GetMapping("/me")
    public ApiResponse<UserProfileDto> getMyProfile(
        @RequestHeader("X-USER-NO") Long userNo
    ) {
        return ApiResponse.success(userService.getMyProfile(userNo), "회원정보 조회 성공");
    }

    @PatchMapping(value = "/me", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ApiResponse<UserProfileDto> updateMyProfile(
        @RequestHeader("X-USER-NO") Long userNo,
        @RequestBody UpdateUserProfileRequestDto request
    ) {
        return ApiResponse.success(userService.updateMyProfile(userNo, request), "회원정보 수정 성공");
    }

    @PatchMapping(value = "/me/password", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ApiResponse<Void> changePassword(
        @RequestHeader("X-USER-NO") Long userNo,
        @RequestBody ChangePasswordRequestDto request
    ) {
        userService.changePassword(userNo, request);
        return ApiResponse.success(null, "비밀번호 변경 성공");
    }

    @GetMapping("/check-email")
    public ApiResponse<DuplicateCheckResponseDto> checkEmail(
        @RequestHeader("X-USER-NO") Long userNo,
        @RequestParam String email
    ) {
        return ApiResponse.success(userService.checkEmail(userNo, email), "이메일 중복 확인 성공");
    }

    @GetMapping("/check-nickname")
    public ApiResponse<DuplicateCheckResponseDto> checkNickname(
        @RequestHeader("X-USER-NO") Long userNo,
        @RequestParam String nickname
    ) {
        return ApiResponse.success(userService.checkNickname(userNo, nickname), "닉네임 중복 확인 성공");
    }
}
