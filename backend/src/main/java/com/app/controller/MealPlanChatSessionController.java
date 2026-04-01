package com.app.controller;

import java.util.List;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.app.common.ApiResponse;
import com.app.dto.MealPlanChatSessionDto;
import com.app.dto.MealPlanChatSessionRequestDto;
import com.app.service.MealPlanChatSessionService;

@RestController
@RequestMapping(value = "/api/users/me/meal-plan-chats", produces = MediaType.APPLICATION_JSON_VALUE)
public class MealPlanChatSessionController {

    private final MealPlanChatSessionService mealPlanChatSessionService;

    public MealPlanChatSessionController(MealPlanChatSessionService mealPlanChatSessionService) {
        this.mealPlanChatSessionService = mealPlanChatSessionService;
    }

    @GetMapping
    public ApiResponse<List<MealPlanChatSessionDto>> getChatSessions(
        @RequestHeader("X-USER-NO") Long userNo
    ) {
        return ApiResponse.success(
            mealPlanChatSessionService.getChatSessions(userNo),
            "Meal plan chat sessions loaded."
        );
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ApiResponse<MealPlanChatSessionDto> createChatSession(
        @RequestHeader("X-USER-NO") Long userNo,
        @RequestBody MealPlanChatSessionRequestDto requestDto
    ) {
        return ApiResponse.success(
            mealPlanChatSessionService.createChatSession(userNo, requestDto),
            "Meal plan chat session created."
        );
    }

    @PatchMapping(value = "/{chatNo}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ApiResponse<MealPlanChatSessionDto> updateChatSession(
        @RequestHeader("X-USER-NO") Long userNo,
        @PathVariable("chatNo") Long chatNo,
        @RequestBody MealPlanChatSessionRequestDto requestDto
    ) {
        return ApiResponse.success(
            mealPlanChatSessionService.updateChatSession(userNo, chatNo, requestDto),
            "Meal plan chat session updated."
        );
    }

    @DeleteMapping("/{chatNo}")
    public ApiResponse<Void> deleteChatSession(
        @RequestHeader("X-USER-NO") Long userNo,
        @PathVariable("chatNo") Long chatNo
    ) {
        mealPlanChatSessionService.deleteChatSession(userNo, chatNo);
        return ApiResponse.success(null, "Meal plan chat session deleted.");
    }
}
