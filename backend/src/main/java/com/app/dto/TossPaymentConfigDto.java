package com.app.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class TossPaymentConfigDto {

    private String provider;
    private String clientKey;
    private boolean clientKeyConfigured;
    private boolean secretKeyConfigured;
    private boolean ready;
    private String mode;
}
