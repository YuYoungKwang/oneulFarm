package com.app.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class OrderListResponseDto {

    private Long orderNo;
    private String orderId;
    private LocalDateTime orderedAt;
    private String orderStatus;
    private String deliveryStatus;
    private String displayProductName;
    private Long itemCount;
    private BigDecimal finalAmount;
    private BigDecimal totalSavedAmount;
}
