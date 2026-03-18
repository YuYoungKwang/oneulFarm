package com.app.service;

import java.math.BigDecimal;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.app.dao.UserDao;
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
        validateRequest(request);

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
    public DuplicateCheckResponseDto checkEmail(Long userNo, String email) {
        String normalizedEmail = normalize(email);
        return new DuplicateCheckResponseDto(normalizedEmail, userDao.countByEmail(normalizedEmail, userNo) == 0);
    }

    @Override
    public DuplicateCheckResponseDto checkNickname(Long userNo, String nickname) {
        String normalizedNickname = normalize(nickname);
        return new DuplicateCheckResponseDto(normalizedNickname, userDao.countByNickname(normalizedNickname, userNo) == 0);
    }

    private void validateRequest(UpdateUserProfileRequestDto request) {
        if (isBlank(request.getNickname()) || isBlank(request.getEmail()) || isBlank(request.getPhone())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "닉네임, 이메일, 연락처는 필수입니다.");
        }

        request.setNickname(normalize(request.getNickname()));
        request.setEmail(normalize(request.getEmail()));
        request.setPhone(normalize(request.getPhone()));
    }

    private String normalize(String value) {
        return value == null ? null : value.trim();
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
