package com.app.dto;

import java.math.BigDecimal;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CartItemDto {

    private Long cartItemNo;
    private Long cartNo;
    private Long productNo;
    private String productName;
    private BigDecimal salePrice;
    private Long stockQty;
    private String saleStatus;
    private BigDecimal avgPrice;
    private BigDecimal savingRate;
    private BigDecimal savedAmount;
    private Integer quantity;
}
