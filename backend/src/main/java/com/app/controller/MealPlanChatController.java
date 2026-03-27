package com.app.controller;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.app.common.ApiResponse;
import com.app.dto.MealPlanChatRequestDto;
import com.app.dto.MealPlanChatResponseDto;
import com.app.service.MealPlanChatService;

@RestController
@RequestMapping(value = "/api/meal-plan", produces = MediaType.APPLICATION_JSON_VALUE)
public class MealPlanChatController {

    private final MealPlanChatService mealPlanChatService;

    public MealPlanChatController(MealPlanChatService mealPlanChatService) {
        this.mealPlanChatService = mealPlanChatService;
    }

    @PostMapping("/chat")
    public ResponseEntity<ApiResponse<Map<String, Object>>> chat(
        @RequestBody(required = false) MealPlanChatRequestDto requestDto
    ) {
        try {
            MealPlanChatResponseDto responseDto = mealPlanChatService.chat(requestDto);
            Map<String, Object> data = new LinkedHashMap<String, Object>();
            data.put("reply", responseDto.getReply());
            data.put("responseId", responseDto.getResponseId());
            data.put("model", responseDto.getModel());
            data.put("fallbackMode", Boolean.valueOf(responseDto.isFallbackMode()));
            return ResponseEntity.ok(ApiResponse.success(data, "\uB9DE\uCDA4 \uC2DD\uB2E8 \uC751\uB2F5 \uC0DD\uC131 \uC644\uB8CC"));
        } catch (IllegalArgumentException exception) {
            return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.failure(exception.getMessage()));
        } catch (Exception exception) {
            return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.failure("\uB9DE\uCDA4 \uC2DD\uB2E8 \uC751\uB2F5\uC744 \uC0DD\uC131\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4."));
        }
    }
}
