package com.app.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CartItemResponseDto {

    private Long cartItemNo;
    private Long productNo;
    private Integer quantity;
}
