package com.app.service;

import com.app.dto.MealPlanCalendarResponseDto;
import com.app.dto.MealPlanEntryDto;
import com.app.dto.MealPlanEntryRequestDto;
import com.app.dto.MealPlanImportRequestDto;
import com.app.dto.MealPlanImportResultDto;

public interface MealPlanCalendarService {

    MealPlanCalendarResponseDto getCalendar(Long userNo, String month);

    MealPlanImportResultDto importAiPlan(Long userNo, MealPlanImportRequestDto requestDto);

    MealPlanEntryDto createEntry(Long userNo, MealPlanEntryRequestDto requestDto);

    MealPlanEntryDto updateEntry(Long userNo, Long entryNo, MealPlanEntryRequestDto requestDto);

    void deleteEntry(Long userNo, Long entryNo);

    void deletePlan(Long userNo, Long planNo);

    MealPlanEntryDto createEntryFromRecipe(Long userNo, MealPlanEntryRequestDto requestDto);
}
