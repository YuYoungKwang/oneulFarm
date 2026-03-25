package com.app.service;

import java.util.List;

import com.app.dto.OrderDto;

public interface OrderService {

    List<OrderDto> getMyOrders(Long userNo);

    List<OrderDto> getMyOrders(Long userNo, String deliveryStatus, String dateFrom, String dateTo);

    OrderDto getMyOrderDetail(Long userNo, Long orderNo);

    OrderDto getMyOrderTracking(Long userNo, Long orderNo);

    OrderDto createOrder(Long userNo, OrderDto request);

    OrderDto advanceOrderStatus(Long userNo, Long orderNo);
}
