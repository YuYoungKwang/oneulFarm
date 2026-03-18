package com.app.service;

import com.app.dto.DuplicateCheckResponseDto;
import com.app.dto.UpdateUserProfileRequestDto;
import com.app.dto.UserProfileDto;

public interface UserService {

    UserProfileDto getMyProfile(Long userNo);

    UserProfileDto updateMyProfile(Long userNo, UpdateUserProfileRequestDto request);

    DuplicateCheckResponseDto checkEmail(Long userNo, String email);

    DuplicateCheckResponseDto checkNickname(Long userNo, String nickname);
}
