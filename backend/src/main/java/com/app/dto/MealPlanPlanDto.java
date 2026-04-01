package com.app.dto;

import java.math.BigDecimal;
import java.util.List;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MealPlanPlanDto {

    private String goalSummary;
    private Integer servings;
    private Integer days;
    private List<DayDto> daysList;
    private List<String> removalNotes;

    @Getter
    @Setter
    public static class DayDto {

        private String dayLabel;
        private List<MealDto> meals;
    }

    @Getter
    @Setter
    public static class MealDto {

        private String mealType;
        private String menuName;
        private String description;
        private List<IngredientDto> ingredients;
    }

    @Getter
    @Setter
    public static class IngredientDto {

        private String ingredientName;
        private BigDecimal amountValue;
        private String unit;
        private String amountText;
        private String note;
    }
}
