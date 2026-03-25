package com.app.service;

import com.app.dto.SocialLoginProfileDto;
import com.app.dto.SocialLoginRequestDto;

public interface SocialLoginProviderService {

    SocialLoginProfileDto fetchUserProfile(String provider, SocialLoginRequestDto request);
}
