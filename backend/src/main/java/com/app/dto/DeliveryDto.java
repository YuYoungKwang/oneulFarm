package com.app.dto;

import java.time.LocalDateTime;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class DeliveryDto {

    private Long deliveryNo;
    private Long orderNo;
    private String courierName;
    private String carrierCode;
    private String carrierName;
    private String trackingNo;
    private String deliveryStatus;
    private String waybillStatus;
    private LocalDateTime waybillAssignedAt;
    private LocalDateTime pickedUpAt;
    private LocalDateTime inTransitAt;
    private LocalDateTime shippedAt;
    private LocalDateTime deliveredAt;
    private LocalDateTime updatedAt;
}
