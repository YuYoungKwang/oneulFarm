package com.app.dto;

import java.math.BigDecimal;
import java.util.List;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CartDto {

    private Long cartNo;
    private List<CartItemDto> items;
    private Integer totalQuantity;
    private BigDecimal totalAmount;
}
