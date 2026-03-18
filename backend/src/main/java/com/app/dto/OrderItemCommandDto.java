package com.app.dto;

import java.math.BigDecimal;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class OrderItemCommandDto {

    private Long orderNo;
    private Long productNo;
    private String productName;
    private BigDecimal unitPrice;
    private Integer quantity;
    private BigDecimal subtotal;
    private BigDecimal marketAvgPrice;
    private BigDecimal savedAmount;
    private BigDecimal savingRate;
}
