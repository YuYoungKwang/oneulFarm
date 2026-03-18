package com.app.service;

import java.math.BigDecimal;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.app.dao.UserDao;
import com.app.dto.ChangePasswordRequestDto;
import com.app.dto.CurrentPasswordRequestDto;
import com.app.dto.DuplicateCheckResponseDto;
import com.app.dto.UpdateUserProfileRequestDto;
import com.app.dto.UserProfileDto;

@Service
public class UserServiceImpl implements UserService {

    @Autowired
    private UserDao userDao;

    @Override
    public UserProfileDto getMyProfile(Long userNo) {
        UserProfileDto profile = userDao.findMyProfile(userNo);
        if (profile == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "사용자 정보를 찾을 수 없습니다.");
        }

        if (profile.getTotalSavedAmount() == null) {
            profile.setTotalSavedAmount(BigDecimal.ZERO);
        }

        return profile;
    }

    @Override
    public UserProfileDto updateMyProfile(Long userNo, UpdateUserProfileRequestDto request) {
        validateProfileRequest(request);

        if (userDao.countByEmail(request.getEmail(), userNo) > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이미 사용 중인 이메일입니다.");
        }

        if (userDao.countByNickname(request.getNickname(), userNo) > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이미 사용 중인 닉네임입니다.");
        }

        int updatedCount = userDao.updateMyProfile(userNo, request);
        if (updatedCount == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "사용자 정보를 찾을 수 없습니다.");
        }

        return getMyProfile(userNo);
    }

    @Override
    @Transactional
    public void changePassword(Long userNo, ChangePasswordRequestDto request) {
        validatePasswordRequest(request);

        if (userDao.countByPassword(userNo, request.getCurrentPassword()) == 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "현재 비밀번호가 일치하지 않습니다.");
        }

        int updatedCount = userDao.updatePassword(userNo, request);
        if (updatedCount == 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "비밀번호 변경에 실패했습니다.");
        }
    }

    @Override
    @Transactional
    public void withdrawMyAccount(Long userNo, CurrentPasswordRequestDto request) {
        validateWithdrawRequest(request);

        if (userDao.countByPassword(userNo, request.getCurrentPassword()) == 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "현재 비밀번호가 일치하지 않습니다.");
        }

        int updatedCount = userDao.updateStatusToWithdrawn(userNo, request);
        if (updatedCount == 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "회원 탈퇴 처리에 실패했습니다.");
        }
    }

    @Override
    public DuplicateCheckResponseDto checkEmail(Long userNo, String email) {
        String normalizedEmail = normalize(email);
        return new DuplicateCheckResponseDto(normalizedEmail, userDao.countByEmail(normalizedEmail, userNo) == 0);
    }

    @Override
    public DuplicateCheckResponseDto checkNickname(Long userNo, String nickname) {
        String normalizedNickname = normalize(nickname);
        return new DuplicateCheckResponseDto(normalizedNickname, userDao.countByNickname(normalizedNickname, userNo) == 0);
    }

    private void validateProfileRequest(UpdateUserProfileRequestDto request) {
        if (request == null
            || isBlank(request.getNickname())
            || isBlank(request.getEmail())
            || isBlank(request.getPhone())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "닉네임, 이메일, 연락처는 필수입니다.");
        }

        request.setNickname(normalize(request.getNickname()));
        request.setEmail(normalize(request.getEmail()));
        request.setPhone(normalize(request.getPhone()));
    }

    private void validatePasswordRequest(ChangePasswordRequestDto request) {
        if (request == null
            || isBlank(request.getCurrentPassword())
            || isBlank(request.getNewPassword())
            || isBlank(request.getConfirmPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "현재 비밀번호와 새 비밀번호를 모두 입력해 주세요.");
        }

        request.setCurrentPassword(request.getCurrentPassword().trim());
        request.setNewPassword(request.getNewPassword().trim());
        request.setConfirmPassword(request.getConfirmPassword().trim());

        if (request.getNewPassword().length() < 8) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "새 비밀번호는 8자 이상이어야 합니다.");
        }

        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "새 비밀번호와 비밀번호 확인이 일치하지 않습니다.");
        }

        if (request.getCurrentPassword().equals(request.getNewPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "새 비밀번호는 현재 비밀번호와 달라야 합니다.");
        }
    }

    private void validateWithdrawRequest(CurrentPasswordRequestDto request) {
        if (request == null || isBlank(request.getCurrentPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "회원 탈퇴를 위해 현재 비밀번호를 입력해 주세요.");
        }

        request.setCurrentPassword(request.getCurrentPassword().trim());
    }

    private String normalize(String value) {
        return value == null ? null : value.trim();
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
