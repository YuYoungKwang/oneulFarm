package com.app.dto;

import java.time.LocalDateTime;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class OrderInfoDto {

    private Long orderNo;
    private String orderId;
    private LocalDateTime orderedAt;
    private String orderStatus;
}
