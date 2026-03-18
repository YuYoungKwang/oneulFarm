package com.app.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class OrderDetailInfoDto {

    private Long orderNo;
    private String orderId;
    private LocalDateTime orderedAt;
    private String orderStatus;
    private String recipientName;
    private String recipientPhone;
    private String zipCode;
    private String address1;
    private String address2;
    private String deliveryStatus;
    private String courierName;
    private String trackingNo;
    private LocalDateTime deliveredAt;
    private String paymentMethod;
    private String paymentStatus;
    private LocalDateTime paidAt;
    private BigDecimal paidAmount;
    private BigDecimal totalAmount;
    private BigDecimal discountAmount;
    private BigDecimal deliveryFee;
    private BigDecimal finalAmount;
}
