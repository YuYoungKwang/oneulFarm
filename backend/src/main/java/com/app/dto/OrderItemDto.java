package com.app.dto;

import java.math.BigDecimal;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class OrderItemDto {

    private Long orderItemNo;
    private Long orderNo;
    private Long productNo;
    private Long imageNo;
    private String productName;
    private BigDecimal unitPrice;
    private Integer quantity;
    private BigDecimal subtotal;
    private BigDecimal marketAvgPrice;
    private BigDecimal savedAmount;
    private BigDecimal savingRate;
    private Boolean reviewExists;
    private Boolean reviewWritable;
    private Long reviewNo;
}
