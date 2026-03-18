package com.app.dto;

import java.time.LocalDateTime;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class DeliveryCommandDto {

    private Long orderNo;
    private String courierName;
    private String trackingNo;
    private String deliveryStatus;
    private LocalDateTime shippedAt;
    private LocalDateTime deliveredAt;
}
