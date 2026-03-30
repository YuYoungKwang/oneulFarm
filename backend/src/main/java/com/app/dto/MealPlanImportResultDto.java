package com.app.dto;

public class MealPlanImportResultDto {

    private Long planNo;
    private String title;
    private String startDate;
    private String endDate;
    private Integer importedEntryCount;
    private Integer importedIngredientCount;

    public Long getPlanNo() {
        return planNo;
    }

    public void setPlanNo(Long planNo) {
        this.planNo = planNo;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
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

    public Integer getImportedEntryCount() {
        return importedEntryCount;
    }

    public void setImportedEntryCount(Integer importedEntryCount) {
        this.importedEntryCount = importedEntryCount;
    }

    public Integer getImportedIngredientCount() {
        return importedIngredientCount;
    }

    public void setImportedIngredientCount(Integer importedIngredientCount) {
        this.importedIngredientCount = importedIngredientCount;
    }
}
