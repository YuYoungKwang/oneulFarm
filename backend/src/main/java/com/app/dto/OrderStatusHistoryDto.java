package com.app.dto;

import java.time.LocalDateTime;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class OrderStatusHistoryDto {

    private Long orderStatusHistoryNo;
    private Long orderNo;
    private String prevOrderStatus;
    private String nextOrderStatus;
    private String changedByType;
    private Long changedByUserNo;
    private String changeReason;
    private LocalDateTime changedAt;
}
