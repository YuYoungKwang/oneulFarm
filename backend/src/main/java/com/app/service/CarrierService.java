package com.app.service;

import java.util.List;

import com.app.dto.OrderDto;

public interface CarrierService {

    List<OrderDto> getOrders();

    OrderDto getOrderDetail(Long orderNo);

    OrderDto assignWaybill(Long orderNo, OrderDto request);

    OrderDto pickupOrder(Long orderNo, OrderDto request);

    OrderDto deliverOrder(Long orderNo);
}
