package com.app.dao;

import java.util.List;

import com.app.dto.DeliveryCommandDto;
import com.app.dto.OrderCreateCommandDto;
import com.app.dto.OrderItemCommandDto;
import com.app.dto.OrderDetailResponseDto;
import com.app.dto.OrderItemResponseDto;
import com.app.dto.OrderListResponseDto;
import com.app.dto.PaymentCommandDto;

public interface OrderDao {

    List<OrderListResponseDto> findMyOrders(Long userNo);

    OrderDetailResponseDto findOrderDetail(Long userNo, Long orderNo);

    List<OrderItemResponseDto> findOrderItems(Long orderNo);

    int countOrdersByOrderIdPrefix(String orderIdPrefix);

    int insertOrder(OrderCreateCommandDto command);

    Long findOrderNoByOrderId(String orderId);

    int insertOrderItem(OrderItemCommandDto command);

    int insertPayment(PaymentCommandDto command);

    int insertDelivery(DeliveryCommandDto command);

    int updateOrderStatus(Long orderNo, String orderStatus);

    int updateDeliveryForShipping(Long orderNo, String trackingNo);

    int updateDeliveryForDelivered(Long orderNo);

    int decreaseProductStock(Long productNo, Integer quantity);
}
