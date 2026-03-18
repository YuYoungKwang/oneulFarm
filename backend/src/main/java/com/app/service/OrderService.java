package com.app.service;

import java.util.List;

import com.app.dto.OrderDetailResponseDto;
import com.app.dto.OrderListResponseDto;

public interface OrderService {

    List<OrderListResponseDto> getMyOrders(Long userNo);

    OrderDetailResponseDto getMyOrderDetail(Long userNo, Long orderNo);
}
