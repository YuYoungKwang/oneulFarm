package com.app.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PaymentCommandDto {

    private Long orderNo;
    private String paymentMethod;
    private String paymentStatus;
    private String paymentKey;
    private BigDecimal paidAmount;
    private LocalDateTime paidAt;
}
