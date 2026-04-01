package com.app.dao;

import com.app.dto.SocialAccountDto;
import com.app.dto.UserDto;

public interface SocialAccountDao {

    UserDto findLinkedUser(String provider, String providerUserId);

    int insertSocialAccount(SocialAccountDto account);
}
