package com.app.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ProductDto {

    private Long productNo;
    private Long categoryNo;
    private String categoryName;
    private String productName;
    private String origin;
    private String unit;
    private BigDecimal packageWeight;
    private BigDecimal salePrice;
    private Long stockQty;
    private String description;
    private String isSeasonal;
    private String saleStatus;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private Long snapshotNo;
    private String itemCode;
    private String itemName;
    private String marketType;
    private String snapshotUnit;
    private BigDecimal avgPrice;
    private BigDecimal minPrice;
    private BigDecimal maxPrice;
    private BigDecimal changeRate;
    private LocalDate snapshotDate;
    private String sourceName;

    private Long matchNo;
    private BigDecimal comparedPrice;
    private BigDecimal priceGap;
    private BigDecimal savingRate;
    private String badgeType;

    private Long reviewCount;
    private BigDecimal averageRating;

    private List<ProductImageDto> images;
    private List<ProductRecipeDto> recipes;
    private List<ProductReviewDto> reviews;
}
