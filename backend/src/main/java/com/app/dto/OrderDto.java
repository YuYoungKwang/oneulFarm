package com.app.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class OrderDto {

    private Long orderNo;
    private Long userNo;
    private String orderId;
    private LocalDateTime orderedAt;
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

    private String deliveryMessage;
    private String displayProductName;
    private Long itemCount;
    private BigDecimal totalSavedAmount;
    private List<Long> previewImageNos;

    private String paymentMethod;
    private String paymentKey;
    private String paymentProvider;
    private String paymentStatus;
    private BigDecimal paidAmount;
    private LocalDateTime paidAt;

    private String normalizedOrderStatus;
    private String cancelStatus;
    private String purchaseConfirmStatus;
    private LocalDateTime purchaseConfirmedAt;

    private String deliveryStatus;
    private String normalizedDeliveryStatus;
    private String courierName;
    private String carrierCode;
    private String carrierName;
    private String trackingNo;
    private String waybillStatus;
    private LocalDateTime waybillAssignedAt;
    private LocalDateTime pickedUpAt;
    private LocalDateTime inTransitAt;
    private LocalDateTime shippedAt;
    private LocalDateTime deliveredAt;
    private Boolean legacyStatusNeedsReview;

    private List<OrderItemDto> items;
}
