package com.app.dto;

import java.util.List;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CartGroupRequestDto {

    private Long recipeNo;
    private String groupName;
    private List<CartItemRequestDto> items;
}
