package com.app.controller;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.app.common.ApiResponse;
import com.app.dto.MealPlanCalendarResponseDto;
import com.app.dto.MealPlanEntryDto;
import com.app.dto.MealPlanEntryRequestDto;
import com.app.dto.MealPlanImportRequestDto;
import com.app.dto.MealPlanImportResultDto;
import com.app.service.MealPlanCalendarService;

@RestController
@RequestMapping(value = "/api/users/me/meal-plans", produces = MediaType.APPLICATION_JSON_VALUE)
public class MealPlanCalendarController {

    private final MealPlanCalendarService mealPlanCalendarService;

    public MealPlanCalendarController(MealPlanCalendarService mealPlanCalendarService) {
        this.mealPlanCalendarService = mealPlanCalendarService;
    }

    @GetMapping("/calendar")
    public ApiResponse<MealPlanCalendarResponseDto> getCalendar(
        @RequestHeader("X-USER-NO") Long userNo,
        @RequestParam(value = "month", required = false) String month
    ) {
        return ApiResponse.success(
            mealPlanCalendarService.getCalendar(userNo, month),
            "Meal plan calendar loaded."
        );
    }

    @PostMapping(value = "/import-ai", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ApiResponse<MealPlanImportResultDto> importAiPlan(
        @RequestHeader("X-USER-NO") Long userNo,
        @RequestBody MealPlanImportRequestDto requestDto
    ) {
        return ApiResponse.success(
            mealPlanCalendarService.importAiPlan(userNo, requestDto),
            "AI meal plan imported."
        );
    }

    @PostMapping(value = "/entries", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ApiResponse<MealPlanEntryDto> createEntry(
        @RequestHeader("X-USER-NO") Long userNo,
        @RequestBody MealPlanEntryRequestDto requestDto
    ) {
        return ApiResponse.success(
            mealPlanCalendarService.createEntry(userNo, requestDto),
            "Meal plan entry created."
        );
    }

    @PatchMapping(value = "/entries/{entryNo}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ApiResponse<MealPlanEntryDto> updateEntry(
        @RequestHeader("X-USER-NO") Long userNo,
        @PathVariable("entryNo") Long entryNo,
        @RequestBody MealPlanEntryRequestDto requestDto
    ) {
        return ApiResponse.success(
            mealPlanCalendarService.updateEntry(userNo, entryNo, requestDto),
            "Meal plan entry updated."
        );
    }

    @DeleteMapping("/entries/{entryNo}")
    public ApiResponse<Void> deleteEntry(
        @RequestHeader("X-USER-NO") Long userNo,
        @PathVariable("entryNo") Long entryNo
    ) {
        mealPlanCalendarService.deleteEntry(userNo, entryNo);
        return ApiResponse.success(null, "Meal plan entry deleted.");
    }

    @DeleteMapping("/{planNo}")
    public ApiResponse<Void> deletePlan(
        @RequestHeader("X-USER-NO") Long userNo,
        @PathVariable("planNo") Long planNo
    ) {
        mealPlanCalendarService.deletePlan(userNo, planNo);
        return ApiResponse.success(null, "Meal plan deleted.");
    }

    @PostMapping(value = "/entries/from-recipe", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ApiResponse<MealPlanEntryDto> createEntryFromRecipe(
        @RequestHeader("X-USER-NO") Long userNo,
        @RequestBody MealPlanEntryRequestDto requestDto
    ) {
        return ApiResponse.success(
            mealPlanCalendarService.createEntryFromRecipe(userNo, requestDto),
            "Recipe entry created."
        );
    }
}
