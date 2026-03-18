package com.app.dao;

import java.util.HashMap;
import java.util.Map;

import org.mybatis.spring.SqlSessionTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import com.app.dto.UpdateUserProfileRequestDto;
import com.app.dto.UserProfileDto;

@Repository
public class UserDaoImpl implements UserDao {

    private static final String NAMESPACE = "userMapper.";

    @Autowired
    private SqlSessionTemplate sqlSessionTemplate;

    @Override
    public UserProfileDto findMyProfile(Long userNo) {
        return sqlSessionTemplate.selectOne(NAMESPACE + "selectMyProfile", userNo);
    }

    @Override
    public int countByEmail(String email, Long userNo) {
        Map<String, Object> params = new HashMap<>();
        params.put("email", email);
        params.put("userNo", userNo);
        Integer count = sqlSessionTemplate.selectOne(NAMESPACE + "countByEmail", params);
        return count == null ? 0 : count;
    }

    @Override
    public int countByNickname(String nickname, Long userNo) {
        Map<String, Object> params = new HashMap<>();
        params.put("nickname", nickname);
        params.put("userNo", userNo);
        Integer count = sqlSessionTemplate.selectOne(NAMESPACE + "countByNickname", params);
        return count == null ? 0 : count;
    }

    @Override
    public int updateMyProfile(Long userNo, UpdateUserProfileRequestDto request) {
        Map<String, Object> params = new HashMap<>();
        params.put("userNo", userNo);
        params.put("nickname", request.getNickname());
        params.put("email", request.getEmail());
        params.put("phone", request.getPhone());
        return sqlSessionTemplate.update(NAMESPACE + "updateMyProfile", params);
    }
}
