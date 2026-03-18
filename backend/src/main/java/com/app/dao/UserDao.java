package com.app.dao;

import com.app.dto.ChangePasswordRequestDto;
import com.app.dto.CurrentPasswordRequestDto;
import com.app.dto.UpdateUserProfileRequestDto;
import com.app.dto.UserProfileDto;

public interface UserDao {

    UserProfileDto findMyProfile(Long userNo);

    int countByEmail(String email, Long userNo);

    int countByNickname(String nickname, Long userNo);

    int updateMyProfile(Long userNo, UpdateUserProfileRequestDto request);

    int countByPassword(Long userNo, String password);

    int updatePassword(Long userNo, ChangePasswordRequestDto request);

    int updateStatusToWithdrawn(Long userNo, CurrentPasswordRequestDto request);
}
