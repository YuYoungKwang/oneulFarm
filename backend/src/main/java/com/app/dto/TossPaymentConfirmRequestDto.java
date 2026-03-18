package com.app.dto;

import java.math.BigDecimal;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class TossPaymentConfirmRequestDto {

    private String paymentKey;
    private String orderId;
    private BigDecimal amount;
}
