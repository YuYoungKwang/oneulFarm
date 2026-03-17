package com.app.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.app.common.ApiResponse;
import com.app.dto.OrderDetailResponseDto;
import com.app.dto.OrderListResponseDto;
import com.app.service.OrderService;

@RestController
@RequestMapping(value = "/api/orders", produces = MediaType.APPLICATION_JSON_VALUE)
public class OrderController {

    @Autowired
    private OrderService orderService;

    @GetMapping("/me")
    public ApiResponse<List<OrderListResponseDto>> getMyOrders(
        @RequestHeader("X-USER-NO") Long userNo
    ) {
        return ApiResponse.success(orderService.getMyOrders(userNo), "주문 목록 조회 성공");
    }

    @GetMapping("/me/{orderNo}")
    public ApiResponse<OrderDetailResponseDto> getMyOrderDetail(
        @RequestHeader("X-USER-NO") Long userNo,
        @PathVariable Long orderNo
    ) {
        return ApiResponse.success(orderService.getMyOrderDetail(userNo, orderNo), "주문 상세 조회 성공");
    }
}
