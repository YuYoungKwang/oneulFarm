package com.app.dto;

import java.math.BigDecimal;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class TossPaymentConfirmResponseDto {

    private String paymentKey;
    private String orderId;
    private String method;
    private String status;
    private BigDecimal totalAmount;
    private String approvedAt;
}
