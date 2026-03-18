package com.app.service;

import java.util.List;

import com.app.dto.OrderDto;

public interface OrderService {

    List<OrderDto> getMyOrders(Long userNo);

    OrderDto getMyOrderDetail(Long userNo, Long orderNo);

    OrderDto createOrder(Long userNo, OrderDto request);

    OrderDto advanceOrderStatus(Long userNo, Long orderNo);
}
