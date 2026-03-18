package com.app.dao;

import com.app.dto.SignupRequestDto;
import com.app.dto.UpdateUserProfileRequestDto;
import com.app.dto.UserDto;
import com.app.dto.UserProfileDto;

public interface UserDao {

    UserDto findByUserIdOrEmail(String keyword);

    UserDto findByEmailAndPhone(String email, String phone);

    UserDto findByEmail(String email);

    UserDto findByUserNo(Long userNo);

    int countByUserId(String userId);

    int insertUser(SignupRequestDto request);

    UserProfileDto findMyProfile(Long userNo);

    int countByEmail(String email, Long userNo);

    int countByNickname(String nickname, Long userNo);

    int updateMyProfile(Long userNo, UpdateUserProfileRequestDto request);

    int updateTemporaryPassword(Long userNo, String encodedPassword);

    int updatePasswordAndClearTemporary(Long userNo, String encodedPassword);
}
