package com.app.dao;

import java.util.List;
import java.util.Map;

import com.app.dto.DeliveryDto;
import com.app.dto.OrderDto;
import com.app.dto.OrderItemDto;
import com.app.dto.PaymentDto;

public interface OrderDao {

    List<OrderDto> findMyOrders(Long userNo);

    List<OrderDto> findMyOrders(Map<String, Object> params);

    OrderDto findOrderDetail(Long userNo, Long orderNo);

    List<OrderItemDto> findOrderItems(Long orderNo);

    int countOrdersByOrderIdPrefix(String orderIdPrefix);

    int insertOrder(OrderDto order);

    Long findOrderNoByOrderId(String orderId);

    int insertOrderItem(OrderItemDto item);

    int insertPayment(PaymentDto payment);

    int insertDelivery(DeliveryDto delivery);

    int updateOrderStatus(Long orderNo, String orderStatus);

    int updateDeliveryForShipping(Long orderNo, String trackingNo);

    int updateDeliveryForDelivered(Long orderNo);

    int decreaseProductStock(Long productNo, Integer quantity);
}
