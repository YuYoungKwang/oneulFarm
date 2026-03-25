package com.app.dao;

import java.util.HashMap;
import java.util.Map;

import org.mybatis.spring.SqlSessionTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import com.app.dto.SocialAccountDto;
import com.app.dto.UserDto;

@Repository
public class SocialAccountDaoImpl implements SocialAccountDao {

    private static final String NAMESPACE = "socialAccountMapper.";

    @Autowired
    private SqlSessionTemplate sqlSessionTemplate;

    @Override
    public UserDto findLinkedUser(String provider, String providerUserId) {
        Map<String, Object> params = new HashMap<>();
        params.put("provider", provider);
        params.put("providerUserId", providerUserId);
        return sqlSessionTemplate.selectOne(NAMESPACE + "selectLinkedUser", params);
    }

    @Override
    public int insertSocialAccount(SocialAccountDto account) {
        return sqlSessionTemplate.insert(NAMESPACE + "insertSocialAccount", account);
    }
}
