package com.app.dto;

import java.math.BigDecimal;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class OrderCreateCommandDto {

    private Long userNo;
    private String orderId;
    private String orderStatus;
    private BigDecimal totalAmount;
    private BigDecimal discountAmount;
    private BigDecimal deliveryFee;
    private BigDecimal finalAmount;
    private String recipientName;
    private String recipientPhone;
    private String zipCode;
    private String address1;
    private String address2;
}
