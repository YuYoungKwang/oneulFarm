package com.app.dto;

import java.util.List;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class OrderDetailResponseDto {

    private OrderInfoDto orderInfo;
    private OrderDeliveryInfoDto deliveryInfo;
    private OrderPaymentInfoDto paymentInfo;
    private OrderAmountSummaryDto amountSummary;
    private List<OrderItemResponseDto> items;
}
