package com.app.dto;

import java.time.LocalDateTime;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class DeliveryTrackingHistoryDto {

    private Long trackingHistoryNo;
    private Long orderNo;
    private Long deliveryNo;
    private String carrierCode;
    private String trackingNo;
    private String trackingStatus;
    private String trackingMessage;
    private Long recordedByUserNo;
    private LocalDateTime recordedAt;
}
