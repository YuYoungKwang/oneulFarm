package com.app.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PurchaseBatchDto {

    private Long batchNo;
    private Long productNo;
    private Long categoryNo;
    private String categoryName;
    private String productName;
    private String origin;
    private String purchaseUnit;
    private BigDecimal purchaseQty;
    private BigDecimal purchasePrice;
    private BigDecimal referenceUnitPrice;
    private BigDecimal referenceTotalPrice;
    private LocalDate referenceSnapshotDate;
    private String grade;
    private String supplierType;
    private BigDecimal actualUnitPrice;
    private BigDecimal actualPurchaseAmount;
    private BigDecimal logisticsCost;
    private BigDecimal commissionRate;
    private BigDecimal commissionCost;
    private BigDecimal otherPurchaseCost;
    private BigDecimal discardRate;
    private BigDecimal discardQty;
    private BigDecimal sellableQty;
    private BigDecimal remainingQty;
    private BigDecimal totalPurchaseCost;
    private BigDecimal actualCostPerKg;
    private LocalDate purchaseDate;
    private String supplierName;
    private String status;
    private LocalDateTime createdAt;
}
