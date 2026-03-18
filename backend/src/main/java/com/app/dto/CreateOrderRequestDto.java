package com.app.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateOrderRequestDto {

    private String orderId;
    private String recipientName;
    private String recipientPhone;
    private String zipCode;
    private String address1;
    private String address2;
    private String deliveryMessage;
    private String paymentMethod;
    private String paymentKey;
    private String paymentProvider;
}
