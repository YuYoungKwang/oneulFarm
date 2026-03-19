package com.app.controller;

import java.util.Map;

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
import com.app.dto.UserDto;
import com.app.service.AuthService;

@RestController
@RequestMapping(value = "/api/auth", produces = MediaType.APPLICATION_JSON_VALUE)
public class AuthController {

    @Autowired
    private AuthService authService;

    @PostMapping(value = "/signup", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ApiResponse<Map<String, Object>> signup(@RequestBody UserDto request) {
        return ApiResponse.success(authService.signup(request), "Signup completed.");
    }

    @PostMapping(value = "/login", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ApiResponse<Map<String, Object>> login(@RequestBody UserDto request) {
        return ApiResponse.success(authService.login(request), "Login completed.");
    }

    @PostMapping(value = "/find-userid", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ApiResponse<Map<String, Object>> findUserId(@RequestBody UserDto request) {
        return ApiResponse.success(authService.findUserId(request), "User ID lookup completed.");
    }

    @PostMapping(value = "/reset-password", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ApiResponse<String> resetPassword(@RequestBody UserDto request) {
        authService.sendTemporaryPassword(request);
        return ApiResponse.success("OK", "Temporary password sent.");
    }

    @PatchMapping(value = "/password", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ApiResponse<Map<String, Object>> changePassword(
        @RequestHeader("X-USER-NO") Long userNo,
        @RequestBody Map<String, String> request
    ) {
        return ApiResponse.success(authService.changePassword(userNo, request), "Password changed.");
    }

    @GetMapping("/check-userid")
    public ApiResponse<Map<String, Object>> checkUserId(@RequestParam String userId) {
        return ApiResponse.success(authService.checkUserId(userId), "User ID check completed.");
    }

    @GetMapping("/check-email")
    public ApiResponse<Map<String, Object>> checkEmail(@RequestParam String email) {
        return ApiResponse.success(authService.checkEmail(email), "Email check completed.");
    }

    @GetMapping("/check-nickname")
    public ApiResponse<Map<String, Object>> checkNickname(@RequestParam String nickname) {
        return ApiResponse.success(authService.checkNickname(nickname), "Nickname check completed.");
    }
}
