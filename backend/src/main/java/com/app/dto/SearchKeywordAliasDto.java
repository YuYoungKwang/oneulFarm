package com.app.dto;

public class SearchKeywordAliasDto {

    private Long aliasNo;
    private String representKeyword;
    private String searchKeyword;
    private Integer priority;
    private String isActive;

    public Long getAliasNo() {
        return aliasNo;
    }

    public void setAliasNo(Long aliasNo) {
        this.aliasNo = aliasNo;
    }

    public String getRepresentKeyword() {
        return representKeyword;
    }

    public void setRepresentKeyword(String representKeyword) {
        this.representKeyword = representKeyword;
    }

    public String getSearchKeyword() {
        return searchKeyword;
    }

    public void setSearchKeyword(String searchKeyword) {
        this.searchKeyword = searchKeyword;
    }

    public Integer getPriority() {
        return priority;
    }

    public void setPriority(Integer priority) {
        this.priority = priority;
    }

    public String getIsActive() {
        return isActive;
    }

    public void setIsActive(String isActive) {
        this.isActive = isActive;
    }
}
