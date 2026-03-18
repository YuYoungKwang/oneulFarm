package com.app.service;

import java.security.SecureRandom;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.app.dao.UserDao;
import com.app.dto.ChangePasswordRequestDto;
import com.app.dto.DuplicateCheckResponseDto;
import com.app.dto.FindUserIdRequestDto;
import com.app.dto.FindUserIdResponseDto;
import com.app.dto.LoginRequestDto;
import com.app.dto.LoginResponseDto;
import com.app.dto.ResetPasswordRequestDto;
import com.app.dto.SignupRequestDto;
import com.app.dto.UserDto;

@Service
public class AuthServiceImpl implements AuthService {

    private static final String TEMP_PASSWORD_SOURCE = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
    private static final int TEMP_PASSWORD_LENGTH = 10;

    private final UserDao userDao;
    private final MailService mailService;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private final SecureRandom secureRandom = new SecureRandom();

    public AuthServiceImpl(UserDao userDao, MailService mailService) {
        this.userDao = userDao;
        this.mailService = mailService;
    }

    @Override
    public void signup(SignupRequestDto request) {
        validateSignupRequest(request);

        if (userDao.countByUserId(request.getUserId()) > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이미 사용 중인 아이디입니다.");
        }

        if (userDao.countByEmail(request.getEmail(), -1L) > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이미 사용 중인 이메일입니다.");
        }

        if (userDao.countByNickname(request.getNickname(), -1L) > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이미 사용 중인 닉네임입니다.");
        }

        request.setPassword(passwordEncoder.encode(request.getPassword()));
        userDao.insertUser(request);
    }

    @Override
    public LoginResponseDto login(LoginRequestDto request) {
        validateLoginRequest(request);

        UserDto user = userDao.findByUserIdOrEmail(request.getUserId());
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "아이디 또는 이메일이 올바르지 않습니다.");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "비밀번호가 올바르지 않습니다.");
        }

        if (!"ACTIVE".equalsIgnoreCase(user.getStatus())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "활성 상태의 계정만 로그인할 수 있습니다.");
        }

        return LoginResponseDto.from(user);
    }

    @Override
    public FindUserIdResponseDto findUserId(FindUserIdRequestDto request) {
        validateFindUserIdRequest(request);

        UserDto user = userDao.findByEmailAndPhone(request.getEmail(), request.getPhone());
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "일치하는 회원 정보를 찾을 수 없습니다.");
        }

        return new FindUserIdResponseDto(user.getUserId());
    }

    @Override
    public void sendTemporaryPassword(ResetPasswordRequestDto request) {
        validateResetPasswordRequest(request);

        UserDto user = userDao.findByEmail(request.getEmail());
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "가입된 이메일을 찾을 수 없습니다.");
        }

        if (!"ACTIVE".equalsIgnoreCase(user.getStatus())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "활성 상태의 계정만 임시 비밀번호를 발급할 수 있습니다.");
        }

        String temporaryPassword = generateTemporaryPassword();
        String encodedPassword = passwordEncoder.encode(temporaryPassword);

        userDao.updateTemporaryPassword(user.getUserNo(), encodedPassword);
        mailService.sendTemporaryPasswordEmail(user.getEmail(), temporaryPassword);
    }

    @Override
    public LoginResponseDto changePassword(Long userNo, ChangePasswordRequestDto request) {
        validateChangePasswordRequest(request);

        UserDto user = userDao.findByUserNo(userNo);
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "회원 정보를 찾을 수 없습니다.");
        }

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "현재 비밀번호가 올바르지 않습니다.");
        }

        if (passwordEncoder.matches(request.getNewPassword(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "새 비밀번호는 현재 비밀번호와 다르게 입력해 주세요.");
        }

        String encodedPassword = passwordEncoder.encode(request.getNewPassword());
        userDao.updatePasswordAndClearTemporary(userNo, encodedPassword);

        UserDto updatedUser = userDao.findByUserNo(userNo);
        return LoginResponseDto.from(updatedUser);
    }

    @Override
    public DuplicateCheckResponseDto checkUserId(String userId) {
        String normalizedUserId = normalize(userId);
        if (isBlank(normalizedUserId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "아이디를 입력해 주세요.");
        }
        return new DuplicateCheckResponseDto(normalizedUserId, userDao.countByUserId(normalizedUserId) == 0);
    }

    @Override
    public DuplicateCheckResponseDto checkEmail(String email) {
        String normalizedEmail = normalize(email);
        if (isBlank(normalizedEmail)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이메일을 입력해 주세요.");
        }
        return new DuplicateCheckResponseDto(normalizedEmail, userDao.countByEmail(normalizedEmail, -1L) == 0);
    }

    @Override
    public DuplicateCheckResponseDto checkNickname(String nickname) {
        String normalizedNickname = normalize(nickname);
        if (isBlank(normalizedNickname)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "닉네임을 입력해 주세요.");
        }
        return new DuplicateCheckResponseDto(normalizedNickname, userDao.countByNickname(normalizedNickname, -1L) == 0);
    }

    private void validateSignupRequest(SignupRequestDto request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "회원가입 정보가 비어 있습니다.");
        }

        request.setUserId(normalize(request.getUserId()));
        request.setEmail(normalize(request.getEmail()));
        request.setPassword(normalize(request.getPassword()));
        request.setNickname(normalize(request.getNickname()));
        request.setPhone(normalize(request.getPhone()));

        if (isBlank(request.getUserId()) || isBlank(request.getEmail()) || isBlank(request.getPassword())
            || isBlank(request.getNickname()) || isBlank(request.getPhone())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "아이디, 이메일, 비밀번호, 닉네임, 연락처는 필수입니다.");
        }
    }

    private void validateLoginRequest(LoginRequestDto request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "로그인 정보가 비어 있습니다.");
        }

        request.setUserId(normalize(request.getUserId()));
        request.setPassword(normalize(request.getPassword()));

        if (isBlank(request.getUserId()) || isBlank(request.getPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "아이디와 비밀번호를 입력해 주세요.");
        }
    }

    private void validateFindUserIdRequest(FindUserIdRequestDto request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "아이디 찾기 정보가 비어 있습니다.");
        }

        request.setEmail(normalize(request.getEmail()));
        request.setPhone(normalize(request.getPhone()));

        if (isBlank(request.getEmail()) || isBlank(request.getPhone())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이메일과 연락처를 입력해 주세요.");
        }
    }

    private void validateResetPasswordRequest(ResetPasswordRequestDto request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "비밀번호 찾기 정보가 비어 있습니다.");
        }

        request.setEmail(normalize(request.getEmail()));

        if (isBlank(request.getEmail())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이메일을 입력해 주세요.");
        }

        if (!request.getEmail().toLowerCase().endsWith("@naver.com")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "네이버 이메일만 사용할 수 있습니다.");
        }
    }

    private void validateChangePasswordRequest(ChangePasswordRequestDto request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "비밀번호 변경 정보가 비어 있습니다.");
        }

        request.setCurrentPassword(normalize(request.getCurrentPassword()));
        request.setNewPassword(normalize(request.getNewPassword()));
        request.setNewPasswordConfirm(normalize(request.getNewPasswordConfirm()));

        if (isBlank(request.getCurrentPassword()) || isBlank(request.getNewPassword()) || isBlank(request.getNewPasswordConfirm())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "현재 비밀번호와 새 비밀번호를 모두 입력해 주세요.");
        }

        if (!request.getNewPassword().equals(request.getNewPasswordConfirm())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "새 비밀번호 확인이 일치하지 않습니다.");
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

    private String normalize(String value) {
        return value == null ? null : value.trim();
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
