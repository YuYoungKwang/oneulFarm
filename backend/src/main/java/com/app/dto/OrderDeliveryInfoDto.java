package com.app.dto;

import java.time.LocalDateTime;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class OrderDeliveryInfoDto {

    private String recipientName;
    private String recipientPhone;
    private String zipCode;
    private String address1;
    private String address2;
    private String deliveryStatus;
    private String courierName;
    private String trackingNo;
    private LocalDateTime deliveredAt;
}
