package com.app.dao;

import java.util.List;

import com.app.dto.MealPlanDto;
import com.app.dto.MealPlanEntryDto;
import com.app.dto.MealPlanEntryIngredientDto;

public interface MealPlanDao {

    List<MealPlanEntryDto> findCalendarEntries(Long userNo, String startDate, String endDate);

    List<MealPlanEntryIngredientDto> findCalendarEntryIngredients(Long userNo, String startDate, String endDate);

    MealPlanEntryDto findEntry(Long userNo, Long entryNo);

    List<MealPlanEntryIngredientDto> findEntryIngredients(Long entryNo);

    Long insertMealPlan(MealPlanDto mealPlanDto);

    Long insertEntry(MealPlanEntryDto entryDto);

    int insertEntryIngredient(MealPlanEntryIngredientDto ingredientDto);

    int updateEntry(MealPlanEntryDto entryDto);

    int deleteEntryIngredients(Long entryNo);

    int deleteEntry(Long userNo, Long entryNo);

    int deletePlanEntryIngredients(Long userNo, Long planNo);

    int deletePlanEntries(Long userNo, Long planNo);

    int deletePlan(Long userNo, Long planNo);

    int countEntriesByPlan(Long userNo, Long planNo);
}
