package com.app.dao;

import java.util.HashMap;
import java.util.Map;

import org.mybatis.spring.SqlSessionTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import com.app.dto.ChangePasswordRequestDto;
import com.app.dto.CurrentPasswordRequestDto;
import com.app.dto.UpdateUserProfileRequestDto;
import com.app.dto.UserDto;
import com.app.dto.UserProfileDto;

@Repository
public class UserDaoImpl implements UserDao {

    private static final String NAMESPACE = "userMapper.";

    @Autowired
    private SqlSessionTemplate sqlSessionTemplate;

    @Override
    public UserDto findByUserIdOrEmail(String keyword) {
        return sqlSessionTemplate.selectOne(NAMESPACE + "selectByUserIdOrEmail", keyword);
    }

    @Override
    public UserDto findByEmailAndPhone(String email, String phone) {
        Map<String, Object> params = new HashMap<>();
        params.put("email", email);
        params.put("phone", phone);
        return sqlSessionTemplate.selectOne(NAMESPACE + "selectByEmailAndPhone", params);
    }

    @Override
    public UserDto findByEmail(String email) {
        return sqlSessionTemplate.selectOne(NAMESPACE + "selectByEmail", email);
    }

    @Override
    public UserDto findByUserNo(Long userNo) {
        return sqlSessionTemplate.selectOne(NAMESPACE + "selectByUserNo", userNo);
    }

    @Override
    public int countByUserId(String userId) {
        Integer count = sqlSessionTemplate.selectOne(NAMESPACE + "countByUserId", userId);
        return count == null ? 0 : count;
    }

    @Override
    public int insertUser(UserDto request) {
        return sqlSessionTemplate.insert(NAMESPACE + "insertUser", request);
    }

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

    @Override
    public int updateProfileImage(Long userNo, UserDto user) {
        Map<String, Object> params = new HashMap<>();
        params.put("userNo", userNo);
        params.put("profileImageUrl", user.getProfileImageUrl());
        params.put("profileImageName", user.getProfileImageName());
        params.put("profileImageExt", user.getProfileImageExt());
        params.put("profileImageMimeType", user.getProfileImageMimeType());
        params.put("profileImageSize", user.getProfileImageSize());
        return sqlSessionTemplate.update(NAMESPACE + "updateProfileImage", params);
    }

    @Override
    public int countByPassword(Long userNo, String password) {
        Map<String, Object> params = new HashMap<>();
        params.put("userNo", userNo);
        params.put("password", password);
        Integer count = sqlSessionTemplate.selectOne(NAMESPACE + "countByPassword", params);
        return count == null ? 0 : count;
    }

    @Override
    public int updatePassword(Long userNo, ChangePasswordRequestDto request) {
        Map<String, Object> params = new HashMap<>();
        params.put("userNo", userNo);
        params.put("newPassword", request.getNewPassword());
        return sqlSessionTemplate.update(NAMESPACE + "updatePassword", params);
    }

    @Override
    public int updateStatusToWithdrawn(Long userNo, CurrentPasswordRequestDto request) {
        Map<String, Object> params = new HashMap<>();
        params.put("userNo", userNo);
        params.put("currentPassword", request.getCurrentPassword());
        return sqlSessionTemplate.update(NAMESPACE + "updateStatusToWithdrawn", params);
    }

    @Override
    public int updateTemporaryPassword(Long userNo, String encodedPassword) {
        Map<String, Object> params = new HashMap<>();
        params.put("userNo", userNo);
        params.put("password", encodedPassword);
        return sqlSessionTemplate.update(NAMESPACE + "updateTemporaryPassword", params);
    }

    @Override
    public int updatePasswordAndClearTemporary(Long userNo, String encodedPassword) {
        Map<String, Object> params = new HashMap<>();
        params.put("userNo", userNo);
        params.put("password", encodedPassword);
        return sqlSessionTemplate.update(NAMESPACE + "updatePasswordAndClearTemporary", params);
    }
}
