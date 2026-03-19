package com.app.service;

import java.security.SecureRandom;
import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.app.dao.UserDao;
import com.app.dto.UserDto;

@Service
public class AuthServiceImpl implements AuthService {

    private static final String TEMP_PASSWORD_SOURCE =
        "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
    private static final int TEMP_PASSWORD_LENGTH = 10;

    private final UserDao userDao;
    private final MailService mailService;
    private final JwtTokenService jwtTokenService;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private final SecureRandom secureRandom = new SecureRandom();

    public AuthServiceImpl(UserDao userDao, MailService mailService, JwtTokenService jwtTokenService) {
        this.userDao = userDao;
        this.mailService = mailService;
        this.jwtTokenService = jwtTokenService;
    }

    @Override
    @Transactional
    public Map<String, Object> signup(UserDto request) {
        validateSignupRequest(request);
        String rawPassword = request.getPassword();

        if (userDao.countByUserId(request.getUserId()) > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "User ID is already in use.");
        }

        if (userDao.countByEmail(request.getEmail(), -1L) > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is already in use.");
        }

        if (userDao.countByNickname(request.getNickname(), -1L) > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nickname is already in use.");
        }

        request.setPassword(passwordEncoder.encode(rawPassword));
        userDao.insertUser(request);

        UserDto createdUser = userDao.findByUserIdOrEmail(request.getUserId());
        if (createdUser == null) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to complete signup.");
        }

        return buildAuthPayload(createdUser);
    }

    @Override
    public Map<String, Object> login(UserDto request) {
        validateLoginRequest(request);

        UserDto user = userDao.findByUserIdOrEmail(request.getUserId());
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User ID or email is incorrect.");
        }

        if (!matchesStoredPassword(request.getPassword(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Password is incorrect.");
        }

        if (!"ACTIVE".equalsIgnoreCase(user.getStatus())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only active users can sign in.");
        }

        return buildAuthPayload(user);
    }

    @Override
    public Map<String, Object> findUserId(UserDto request) {
        validateFindUserIdRequest(request);

        UserDto user = userDao.findByEmailAndPhone(request.getEmail(), request.getPhone());
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No matching user was found.");
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("userId", user.getUserId());
        return response;
    }

    @Override
    public void sendTemporaryPassword(UserDto request) {
        validateResetPasswordRequest(request);

        UserDto user = userDao.findByEmail(request.getEmail());
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No user found for that email.");
        }

        if (!"ACTIVE".equalsIgnoreCase(user.getStatus())) {
            throw new ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "Only active users can receive a temporary password."
            );
        }

        String temporaryPassword = generateTemporaryPassword();
        String encodedPassword = passwordEncoder.encode(temporaryPassword);

        userDao.updateTemporaryPassword(user.getUserNo(), encodedPassword);
        mailService.sendTemporaryPasswordEmail(user.getEmail(), temporaryPassword);
    }

    @Override
    public Map<String, Object> changePassword(Long userNo, Map<String, String> request) {
        Map<String, String> normalizedRequest = validateChangePasswordRequest(request);

        UserDto user = userDao.findByUserNo(userNo);
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User was not found.");
        }

        String currentPassword = normalizedRequest.get("currentPassword");
        String newPassword = normalizedRequest.get("newPassword");

        if (!matchesStoredPassword(currentPassword, user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current password is incorrect.");
        }

        if (matchesStoredPassword(newPassword, user.getPassword())) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "New password must be different from the current password."
            );
        }

        String encodedPassword = passwordEncoder.encode(newPassword);
        userDao.updatePasswordAndClearTemporary(userNo, encodedPassword);

        UserDto updatedUser = userDao.findByUserNo(userNo);
        return buildAuthPayload(updatedUser);
    }

    @Override
    public Map<String, Object> checkUserId(String userId) {
        String normalizedUserId = normalize(userId);
        if (isBlank(normalizedUserId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "User ID is required.");
        }
        return buildDuplicatePayload(normalizedUserId, userDao.countByUserId(normalizedUserId) == 0);
    }

    @Override
    public Map<String, Object> checkEmail(String email) {
        String normalizedEmail = normalize(email);
        if (isBlank(normalizedEmail)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is required.");
        }
        return buildDuplicatePayload(normalizedEmail, userDao.countByEmail(normalizedEmail, -1L) == 0);
    }

    @Override
    public Map<String, Object> checkNickname(String nickname) {
        String normalizedNickname = normalize(nickname);
        if (isBlank(normalizedNickname)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nickname is required.");
        }
        return buildDuplicatePayload(normalizedNickname, userDao.countByNickname(normalizedNickname, -1L) == 0);
    }

    private void validateSignupRequest(UserDto request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Signup request is empty.");
        }

        request.setUserId(normalize(request.getUserId()));
        request.setEmail(normalize(request.getEmail()));
        request.setPassword(normalize(request.getPassword()));
        request.setNickname(normalize(request.getNickname()));
        request.setPhone(normalize(request.getPhone()));

        if (isBlank(request.getUserId())
            || isBlank(request.getEmail())
            || isBlank(request.getPassword())
            || isBlank(request.getNickname())
            || isBlank(request.getPhone())) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "User ID, email, password, nickname, and phone are required."
            );
        }
    }

    private void validateLoginRequest(UserDto request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Login request is empty.");
        }

        request.setUserId(normalize(request.getUserId()));
        request.setPassword(normalize(request.getPassword()));

        if (isBlank(request.getUserId()) || isBlank(request.getPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "User ID and password are required.");
        }
    }

    private void validateFindUserIdRequest(UserDto request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "User ID lookup request is empty.");
        }

        request.setEmail(normalize(request.getEmail()));
        request.setPhone(normalize(request.getPhone()));

        if (isBlank(request.getEmail()) || isBlank(request.getPhone())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email and phone are required.");
        }
    }

    private void validateResetPasswordRequest(UserDto request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Reset password request is empty.");
        }

        request.setEmail(normalize(request.getEmail()));

        if (isBlank(request.getEmail())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is required.");
        }

        if (!request.getEmail().toLowerCase().endsWith("@naver.com")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only @naver.com is allowed.");
        }
    }

    private Map<String, String> validateChangePasswordRequest(Map<String, String> request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Change password request is empty.");
        }

        String currentPassword = normalize(request.get("currentPassword"));
        String newPassword = normalize(request.get("newPassword"));
        String newPasswordConfirm = normalize(request.get("newPasswordConfirm"));

        if (isBlank(currentPassword) || isBlank(newPassword) || isBlank(newPasswordConfirm)) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Current password, new password, and password confirmation are required."
            );
        }

        if (!newPassword.equals(newPasswordConfirm)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password confirmation does not match.");
        }

        Map<String, String> normalizedRequest = new LinkedHashMap<>();
        normalizedRequest.put("currentPassword", currentPassword);
        normalizedRequest.put("newPassword", newPassword);
        normalizedRequest.put("newPasswordConfirm", newPasswordConfirm);
        return normalizedRequest;
    }

    private String generateTemporaryPassword() {
        StringBuilder builder = new StringBuilder(TEMP_PASSWORD_LENGTH);
        for (int index = 0; index < TEMP_PASSWORD_LENGTH; index++) {
            int randomIndex = secureRandom.nextInt(TEMP_PASSWORD_SOURCE.length());
            builder.append(TEMP_PASSWORD_SOURCE.charAt(randomIndex));
        }
        return builder.toString();
    }

    private Map<String, Object> buildAuthPayload(UserDto user) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("userNo", user.getUserNo());
        payload.put("userId", user.getUserId());
        payload.put("email", user.getEmail());
        payload.put("nickname", user.getNickname());
        payload.put("phone", user.getPhone());
        payload.put("role", user.getRole());
        payload.put("status", user.getStatus());
        payload.put("accessToken", jwtTokenService.generateAccessToken(user));
        payload.put("passwordChangeRequired", "Y".equalsIgnoreCase(user.getTempPasswordYn()));
        return payload;
    }

    private Map<String, Object> buildDuplicatePayload(String value, boolean available) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("value", value);
        payload.put("available", available);
        return payload;
    }

    private boolean matchesStoredPassword(String rawPassword, String storedPassword) {
        if (isBlank(rawPassword) || isBlank(storedPassword)) {
            return false;
        }

        if (isBcryptPassword(storedPassword)) {
            return passwordEncoder.matches(rawPassword, storedPassword);
        }

        return rawPassword.equals(storedPassword);
    }

    private boolean isBcryptPassword(String password) {
        return password != null
            && (password.startsWith("$2a$") || password.startsWith("$2b$") || password.startsWith("$2y$"));
    }

    private String normalize(String value) {
        return value == null ? null : value.trim();
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
