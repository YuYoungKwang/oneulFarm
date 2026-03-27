package com.app.service;

import com.app.dto.MealPlanChatRequestDto;
import com.app.dto.MealPlanChatResponseDto;

public interface MealPlanChatService {

    MealPlanChatResponseDto chat(MealPlanChatRequestDto requestDto);
}
