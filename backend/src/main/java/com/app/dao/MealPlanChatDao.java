package com.app.dao;

import java.util.List;

import com.app.dto.MealPlanChatSessionDto;

public interface MealPlanChatDao {

    List<MealPlanChatSessionDto> findActiveChatSessions(Long userNo);

    MealPlanChatSessionDto findChatSession(Long userNo, Long chatNo);

    Long insertChatSession(MealPlanChatSessionDto chatSessionDto);

    int updateChatSession(MealPlanChatSessionDto chatSessionDto);

    int softDeleteChatSession(Long userNo, Long chatNo);
}
