package com.app.dto.main;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class SeasonalProductCardDto {

    // 주의: com.app.dto.ProductDto 와 이름 충돌이 있으므로 com.app.dto.main.ProductDto 사용
    private ProductDto product = new ProductDto();
    private List<String> badges = new ArrayList<String>();
    private String summary = "";
    private BigDecimal avgPrice;
    private List<LinkedRecipeDto> linkedRecipes = new ArrayList<LinkedRecipeDto>();
    private Integer rank = Integer.valueOf(0);
    private String rankKeyword = "";
    private BigDecimal rankScore;
    private BigDecimal latestRatio;
    private BigDecimal averageRatio;
    private BigDecimal changeRatio;
    private String trendDirection = "";

    public ProductDto getProduct() {
        return product;
    }

    public void setProduct(ProductDto product) {
        this.product = product == null ? new ProductDto() : product;
    }

    public List<String> getBadges() {
        return badges;
    }

    public void setBadges(List<String> badges) {
        this.badges = badges == null ? new ArrayList<String>() : badges;
    }

    public String getSummary() {
        return summary;
    }

    public void setSummary(String summary) {
        this.summary = summary == null ? "" : summary;
    }

    public BigDecimal getAvgPrice() {
        return avgPrice;
    }

    public void setAvgPrice(BigDecimal avgPrice) {
        this.avgPrice = avgPrice;
    }

    public List<LinkedRecipeDto> getLinkedRecipes() {
        return linkedRecipes;
    }

    public void setLinkedRecipes(List<LinkedRecipeDto> linkedRecipes) {
        this.linkedRecipes = linkedRecipes == null ? new ArrayList<LinkedRecipeDto>() : linkedRecipes;
    }

    public Integer getRank() {
        return rank;
    }

    public void setRank(Integer rank) {
        this.rank = rank == null ? Integer.valueOf(0) : rank;
    }

    public String getRankKeyword() {
        return rankKeyword;
    }

    public void setRankKeyword(String rankKeyword) {
        this.rankKeyword = rankKeyword == null ? "" : rankKeyword;
    }

    public BigDecimal getRankScore() {
        return rankScore;
    }

    public void setRankScore(BigDecimal rankScore) {
        this.rankScore = rankScore;
    }

    public BigDecimal getLatestRatio() {
        return latestRatio;
    }

    public void setLatestRatio(BigDecimal latestRatio) {
        this.latestRatio = latestRatio;
    }

    public BigDecimal getAverageRatio() {
        return averageRatio;
    }

    public void setAverageRatio(BigDecimal averageRatio) {
        this.averageRatio = averageRatio;
    }

    public BigDecimal getChangeRatio() {
        return changeRatio;
    }

    public void setChangeRatio(BigDecimal changeRatio) {
        this.changeRatio = changeRatio;
    }

    public String getTrendDirection() {
        return trendDirection;
    }

    public void setTrendDirection(String trendDirection) {
        this.trendDirection = trendDirection == null ? "" : trendDirection;
    }
}
