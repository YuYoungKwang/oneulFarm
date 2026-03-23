package com.app.dao;

import com.app.dto.ChangePasswordRequestDto;
import com.app.dto.CurrentPasswordRequestDto;
import com.app.dto.UpdateUserProfileRequestDto;
import com.app.dto.UserDto;
import com.app.dto.UserProfileDto;

public interface UserDao {

    UserDto findByUserIdOrEmail(String keyword);

    UserDto findByEmailAndPhone(String email, String phone);

    UserDto findByEmail(String email);

    UserDto findByUserNo(Long userNo);

    int countByUserId(String userId);

    int insertUser(UserDto request);

    UserProfileDto findMyProfile(Long userNo);

    int countByEmail(String email, Long userNo);

    int countByNickname(String nickname, Long userNo);

    int updateMyProfile(Long userNo, UpdateUserProfileRequestDto request);

    int updateProfileImage(Long userNo, UserDto user);

    int countByPassword(Long userNo, String password);

    int updatePassword(Long userNo, ChangePasswordRequestDto request);

    int updateStatusToWithdrawn(Long userNo, CurrentPasswordRequestDto request);

    int updateTemporaryPassword(Long userNo, String encodedPassword);

    int updatePasswordAndClearTemporary(Long userNo, String encodedPassword);
}
