package com.app.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CartItemDto {

    private Long cartItemNo;
    private Long cartNo;
    private Long cartGroupNo;
    private Long productNo;
    private String productName;
    private String origin;
    private String unit;
    private BigDecimal packageWeight;
    private BigDecimal salePrice;
    private Long stockQty;
    private String saleStatus;
    private Long imageNo;
    private BigDecimal avgPrice;
    private BigDecimal savingRate;
    private BigDecimal savedAmount;
    private Integer quantity;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
