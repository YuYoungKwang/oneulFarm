package com.app.service;

import java.security.SecureRandom;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.app.dao.SocialAccountDao;
import com.app.dao.UserDao;
import com.app.dto.SocialAccountDto;
import com.app.dto.SocialLoginProfileDto;
import com.app.dto.SocialLoginRequestDto;
import com.app.dto.UserDto;

@Service
public class AuthServiceImpl implements AuthService {

    private static final Set<String> SUPPORTED_SOCIAL_PROVIDERS = Set.of("KAKAO", "NAVER", "GOOGLE");
    private static final String TEMP_PASSWORD_SOURCE =
        "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
    private static final int TEMP_PASSWORD_LENGTH = 10;

    private final UserDao userDao;
    private final SocialAccountDao socialAccountDao;
    private final MailService mailService;
    private final JwtTokenService jwtTokenService;
    private final SocialLoginProviderService socialLoginProviderService;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private final SecureRandom secureRandom = new SecureRandom();

    public AuthServiceImpl(
        UserDao userDao,
        SocialAccountDao socialAccountDao,
        MailService mailService,
        JwtTokenService jwtTokenService,
        SocialLoginProviderService socialLoginProviderService
    ) {
        this.userDao = userDao;
        this.socialAccountDao = socialAccountDao;
        this.mailService = mailService;
        this.jwtTokenService = jwtTokenService;
        this.socialLoginProviderService = socialLoginProviderService;
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
    @Transactional
    public Map<String, Object> socialLogin(String provider, SocialLoginRequestDto request) {
        String normalizedProvider = normalizeSocialProvider(provider);
        SocialLoginRequestDto normalizedRequest = validateSocialLoginRequest(request);
        SocialLoginProfileDto profile = socialLoginProviderService.fetchUserProfile(
            normalizedProvider,
            normalizedRequest
        );

        UserDto linkedUser = socialAccountDao.findLinkedUser(normalizedProvider, profile.getProviderUserId());
        if (linkedUser != null) {
            validateActiveUser(linkedUser, "Only active users can sign in.");
            return buildAuthPayload(linkedUser);
        }

        String email = normalize(profile.getEmail());
        if (isBlank(email)) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "The social account did not provide an email address."
            );
        }

        UserDto existingUser = userDao.findByEmail(email);
        if (existingUser != null) {
            validateActiveUser(existingUser, "Only active users can connect a social account.");
            socialAccountDao.insertSocialAccount(buildSocialAccount(existingUser.getUserNo(), normalizedProvider, profile));
            return buildAuthPayload(existingUser);
        }

        UserDto newUser = buildSocialSignupUser(normalizedProvider, profile);
        userDao.insertUser(newUser);

        UserDto createdUser = userDao.findByUserIdOrEmail(newUser.getUserId());
        if (createdUser == null) {
            throw new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Failed to complete social signup."
            );
        }

        socialAccountDao.insertSocialAccount(buildSocialAccount(createdUser.getUserNo(), normalizedProvider, profile));
        return buildAuthPayload(createdUser);
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

    private SocialLoginRequestDto validateSocialLoginRequest(SocialLoginRequestDto request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Social login request is empty.");
        }

        request.setCode(normalize(request.getCode()));
        request.setState(normalize(request.getState()));
        request.setRedirectUri(normalize(request.getRedirectUri()));

        if (isBlank(request.getCode())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Authorization code is required.");
        }

        return request;
    }

    private String normalizeSocialProvider(String provider) {
        String normalizedProvider = normalize(provider);
        if (isBlank(normalizedProvider)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Social provider is required.");
        }

        normalizedProvider = normalizedProvider.toUpperCase(Locale.ROOT);
        if (!SUPPORTED_SOCIAL_PROVIDERS.contains(normalizedProvider)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported social provider.");
        }

        return normalizedProvider;
    }

    private SocialAccountDto buildSocialAccount(
        Long userNo,
        String provider,
        SocialLoginProfileDto profile
    ) {
        SocialAccountDto account = new SocialAccountDto();
        account.setUserNo(userNo);
        account.setProvider(provider);
        account.setProviderUserId(profile.getProviderUserId());
        account.setProviderEmail(normalize(profile.getEmail()));
        return account;
    }

    private UserDto buildSocialSignupUser(String provider, SocialLoginProfileDto profile) {
        UserDto user = new UserDto();
        user.setUserId(generateUniqueUserId(provider, profile));
        user.setEmail(normalize(profile.getEmail()));
        user.setPassword(passwordEncoder.encode(generateTemporaryPassword()));
        user.setNickname(generateUniqueNickname(provider, profile));
        user.setPhone(generatePlaceholderPhone(profile.getProviderUserId()));
        return user;
    }

    private String generateUniqueUserId(String provider, SocialLoginProfileDto profile) {
        String providerPrefix = provider.toLowerCase(Locale.ROOT);
        String email = normalize(profile.getEmail());
        String emailLocalPart = isBlank(email) ? "" : email.split("@")[0];
        String base = sanitizeIdentifier(emailLocalPart);
        if (isBlank(base)) {
            base = sanitizeIdentifier(profile.getProviderUserId());
        }
        if (isBlank(base)) {
            base = "user";
        }

        String candidateBase = trimToLength(providerPrefix + "_" + base, 50);
        String candidate = candidateBase;
        int suffix = 1;
        while (userDao.countByUserId(candidate) > 0) {
            String numericSuffix = String.valueOf(suffix++);
            candidate = trimToLength(candidateBase, 50 - numericSuffix.length()) + numericSuffix;
        }
        return candidate;
    }

    private String generateUniqueNickname(String provider, SocialLoginProfileDto profile) {
        String base = sanitizeNickname(profile.getNickname());
        if (isBlank(base)) {
            String email = normalize(profile.getEmail());
            if (!isBlank(email)) {
                base = sanitizeNickname(email.split("@")[0]);
            }
        }
        if (isBlank(base)) {
            base = provider.substring(0, 1) + provider.substring(1).toLowerCase(Locale.ROOT) + "User";
        }

        String candidateBase = trimToLength(base, 50);
        String candidate = candidateBase;
        int suffix = 1;
        while (userDao.countByNickname(candidate, -1L) > 0) {
            String numericSuffix = String.valueOf(suffix++);
            candidate = trimToLength(candidateBase, 50 - numericSuffix.length()) + numericSuffix;
        }
        return candidate;
    }

    private String generatePlaceholderPhone(String providerUserId) {
        String digits = providerUserId == null ? "" : providerUserId.replaceAll("\\D", "");
        if (digits.length() < 8) {
            digits = String.format("%08d", Math.abs((providerUserId == null ? 0 : providerUserId.hashCode()) % 100000000));
        } else {
            digits = digits.substring(digits.length() - 8);
        }

        return "000-" + digits.substring(0, 4) + "-" + digits.substring(4);
    }

    private String sanitizeIdentifier(String value) {
        return trimToLength(
            normalize(value == null ? "" : value.replaceAll("[^A-Za-z0-9._-]", "").toLowerCase(Locale.ROOT)),
            50
        );
    }

    private String sanitizeNickname(String value) {
        return trimToLength(
            normalize(value == null ? "" : value.replaceAll("[\\p{Cntrl}]", "").trim()),
            50
        );
    }

    private String trimToLength(String value, int maxLength) {
        if (value == null) {
            return null;
        }
        return value.length() <= maxLength ? value : value.substring(0, maxLength);
    }

    private void validateActiveUser(UserDto user, String message) {
        if (!"ACTIVE".equalsIgnoreCase(user.getStatus())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, message);
        }
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
