package com.app.dao;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.mybatis.spring.SqlSessionTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import com.app.dto.MealPlanChatSessionDto;

@Repository
public class MealPlanChatDaoImpl implements MealPlanChatDao {

    private static final String NAMESPACE = "mealPlanChatMapper.";

    @Autowired
    private SqlSessionTemplate sqlSessionTemplate;

    @Override
    public List<MealPlanChatSessionDto> findActiveChatSessions(Long userNo) {
        return sqlSessionTemplate.selectList(NAMESPACE + "selectActiveChatSessions", userNo);
    }

    @Override
    public MealPlanChatSessionDto findChatSession(Long userNo, Long chatNo) {
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("userNo", userNo);
        params.put("chatNo", chatNo);
        return sqlSessionTemplate.selectOne(NAMESPACE + "selectChatSession", params);
    }

    @Override
    public Long insertChatSession(MealPlanChatSessionDto chatSessionDto) {
        sqlSessionTemplate.insert(NAMESPACE + "insertChatSession", chatSessionDto);
        return chatSessionDto.getChatNo();
    }

    @Override
    public int updateChatSession(MealPlanChatSessionDto chatSessionDto) {
        return sqlSessionTemplate.update(NAMESPACE + "updateChatSession", chatSessionDto);
    }

    @Override
    public int softDeleteChatSession(Long userNo, Long chatNo) {
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("userNo", userNo);
        params.put("chatNo", chatNo);
        return sqlSessionTemplate.update(NAMESPACE + "softDeleteChatSession", params);
    }
}
