package com.app.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PackageHistoryDto {

    private Long packageNo;
    private Long batchNo;
    private Long productNo;
    private Integer packagedQty;
    private BigDecimal packagedWeight;
    private BigDecimal totalUsed;
    private BigDecimal salePrice;
    private BigDecimal packagingMaterialCost;
    private BigDecimal packagingLaborCost;
    private BigDecimal otherPackagingCost;
    private BigDecimal finalCostPerKg;
    private BigDecimal finalCostPerPackage;
    private BigDecimal expectedProfitPerUnit;
    private BigDecimal expectedTotalProfit;
    private String saleStatus;
    private LocalDateTime packagedAt;
    private String note;
    private Long userNo;
}
