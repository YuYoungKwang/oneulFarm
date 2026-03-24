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
    private String productName;
    private String origin;
    private String purchaseUnit;
    private BigDecimal purchaseQty;
    private BigDecimal purchasePrice;
    private LocalDate purchaseDate;
    private String supplierName;
    private String status;
    private LocalDateTime createdAt;
}
