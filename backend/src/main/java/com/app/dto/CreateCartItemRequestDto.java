package com.app.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateCartItemRequestDto {

    private Long productNo;
    private Integer quantity;
}
