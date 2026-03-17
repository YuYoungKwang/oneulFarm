package com.app.dao;

import java.util.List;

import com.app.dto.OrderDetailInfoDto;
import com.app.dto.OrderItemDetailDto;
import com.app.dto.OrderListItemDto;

public interface OrderDao {

    List<OrderListItemDto> findMyOrders(Long userNo);

    OrderDetailInfoDto findOrderDetailInfo(Long userNo, Long orderNo);

    List<OrderItemDetailDto> findOrderItems(Long orderNo);
}
