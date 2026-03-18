package com.app.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class OrderPaymentInfoDto {

    private String paymentMethod;
    private String paymentStatus;
    private LocalDateTime paidAt;
    private BigDecimal paidAmount;
}
