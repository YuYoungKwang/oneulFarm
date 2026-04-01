package com.app.dto;

import java.util.ArrayList;
import java.util.List;

public class MealPlanCalendarResponseDto {

    private String month;
    private String startDate;
    private String endDate;
    private List<DayDto> days = new ArrayList<DayDto>();

    public String getMonth() {
        return month;
    }

    public void setMonth(String month) {
        this.month = month;
    }

    public String getStartDate() {
        return startDate;
    }

    public void setStartDate(String startDate) {
        this.startDate = startDate;
    }

    public String getEndDate() {
        return endDate;
    }

    public void setEndDate(String endDate) {
        this.endDate = endDate;
    }

    public List<DayDto> getDays() {
        return days;
    }

    public void setDays(List<DayDto> days) {
        this.days = days;
    }

    public static class DayDto {

        private String date;
        private String dayLabel;
        private List<MealPlanEntryDto> entries = new ArrayList<MealPlanEntryDto>();

        public String getDate() {
            return date;
        }

        public void setDate(String date) {
            this.date = date;
        }

        public String getDayLabel() {
            return dayLabel;
        }

        public void setDayLabel(String dayLabel) {
            this.dayLabel = dayLabel;
        }

        public List<MealPlanEntryDto> getEntries() {
            return entries;
        }

        public void setEntries(List<MealPlanEntryDto> entries) {
            this.entries = entries;
        }
    }
}
