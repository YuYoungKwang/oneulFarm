package com.app.dao;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import com.app.dto.DeliveryDto;
import com.app.dto.DeliveryTrackingHistoryDto;
import com.app.dto.OrderDto;
import com.app.dto.OrderItemDto;
import com.app.dto.PaymentDto;

public interface OrderDao {

    List<OrderDto> findMyOrders(Long userNo);

    List<OrderDto> findMyOrders(Map<String, Object> params);

    OrderDto findOrderDetail(Long userNo, Long orderNo);

    List<OrderItemDto> findOrderItems(Long orderNo);

    List<DeliveryTrackingHistoryDto> findDeliveryTrackingHistories(Long orderNo);

    List<Long> findOrderPreviewImageNos(Long orderNo);

    int countOrdersByOrderIdPrefix(String orderIdPrefix);

    int insertOrder(OrderDto order);

    Long findOrderNoByOrderId(String orderId);

    int insertOrderItem(OrderItemDto item);

    int insertPayment(PaymentDto payment);

    int insertDelivery(DeliveryDto delivery);

    int updateOrderStatus(Long orderNo, String orderStatus);

    int updateOrderCancelStatus(Long orderNo, String cancelStatus);

    int updateOrderPurchaseConfirm(Long orderNo, String purchaseConfirmStatus, LocalDateTime purchaseConfirmedAt);

    int autoConfirmEligiblePurchasesByUser(Long userNo);

    int autoConfirmEligiblePurchases();

    int insertOrderCancelRequest(Long orderNo, Long requestedByUserNo, String cancelStatus, String requestReason);

    int updateLatestOrderCancelRequest(Long orderNo, String cancelStatus, Long decidedByUserNo, String decisionReason);

    int insertDeliveryTrackingHistory(
        Long orderNo,
        String carrierCode,
        String trackingNo,
        String trackingStatus,
        String trackingMessage,
        Long recordedByUserNo
    );

    int updateDeliveryForShipping(Long orderNo, String trackingNo);

    int updateDeliveryForDelivered(Long orderNo);

    int decreaseProductStock(Long productNo, Integer quantity);

    int increaseProductStock(Long productNo, Integer quantity);
}
