package com.app.dto;

import java.math.BigDecimal;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class OrderItemResponseDto {

    private Long orderItemNo;
    private Long productNo;
    private String productName;
    private BigDecimal unitPrice;
    private Long quantity;
    private BigDecimal subtotal;
    private BigDecimal marketAvgPrice;
    private BigDecimal savedAmount;
    private BigDecimal savingRate;
    private Boolean reviewExists;
    private Boolean reviewWritable;
    private Long reviewNo;
}
