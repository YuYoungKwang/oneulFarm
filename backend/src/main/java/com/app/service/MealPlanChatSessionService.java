package com.app.service;

import java.util.List;

import com.app.dto.MealPlanChatSessionDto;
import com.app.dto.MealPlanChatSessionRequestDto;

public interface MealPlanChatSessionService {

    List<MealPlanChatSessionDto> getChatSessions(Long userNo);

    MealPlanChatSessionDto createChatSession(Long userNo, MealPlanChatSessionRequestDto requestDto);

    MealPlanChatSessionDto updateChatSession(Long userNo, Long chatNo, MealPlanChatSessionRequestDto requestDto);

    void deleteChatSession(Long userNo, Long chatNo);
}
