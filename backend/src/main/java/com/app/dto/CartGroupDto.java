package com.app.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CartGroupDto {

    private Long cartGroupNo;
    private Long cartNo;
    private String groupKey;
    private String groupType;
    private Long recipeNo;
    private String groupName;
    private Integer itemCount;
    private Integer totalQuantity;
    private BigDecimal totalAmount;
    private BigDecimal totalSavedAmount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<CartItemDto> items;
}
