package com.app.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.app.common.ApiResponse;
import com.app.dto.OrderDto;
import com.app.service.OrderService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

@RestController
@RequestMapping(value = "/api/orders", produces = MediaType.APPLICATION_JSON_VALUE)
public class OrderController {

    private static final ObjectMapper OBJECT_MAPPER =
        new ObjectMapper().registerModule(new JavaTimeModule());

    @Autowired
    private OrderService orderService;

    @GetMapping("/me")
    public ApiResponse<List<OrderDto>> getMyOrders(
        @RequestHeader("X-USER-NO") Long userNo,
        @RequestParam(value = "deliveryStatus", required = false) String deliveryStatus,
        @RequestParam(value = "dateFrom", required = false) String dateFrom,
        @RequestParam(value = "dateTo", required = false) String dateTo
    ) {
        return ApiResponse.success(
            orderService.getMyOrders(userNo, deliveryStatus, dateFrom, dateTo),
            "Orders loaded."
        );
    }

    @GetMapping("/me/{orderNo}")
    public ResponseEntity<String> getMyOrderDetail(
        @RequestHeader("X-USER-NO") Long userNo,
        @PathVariable("orderNo") Long orderNo
    ) throws Exception {
        ApiResponse<OrderDto> response =
            ApiResponse.success(orderService.getMyOrderDetail(userNo, orderNo), "Order detail loaded.");
        return ResponseEntity.ok(OBJECT_MAPPER.writeValueAsString(response));
    }

    @GetMapping("/me/{orderNo}/tracking")
    public ApiResponse<OrderDto> getMyOrderTracking(
        @RequestHeader("X-USER-NO") Long userNo,
        @PathVariable("orderNo") Long orderNo
    ) {
        return ApiResponse.success(
            orderService.getMyOrderTracking(userNo, orderNo),
            "Order tracking loaded."
        );
    }

    @PostMapping(value = "/me", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ApiResponse<OrderDto> createMyOrder(
        @RequestHeader("X-USER-NO") Long userNo,
        @RequestBody OrderDto request
    ) {
        return ApiResponse.success(orderService.createOrder(userNo, request), "Order created.");
    }

    @PatchMapping("/me/{orderNo}/advance")
    public ApiResponse<OrderDto> advanceMyOrderStatus(
        @RequestHeader("X-USER-NO") Long userNo,
        @PathVariable("orderNo") Long orderNo
    ) {
        return ApiResponse.success(orderService.advanceOrderStatus(userNo, orderNo), "Order status advanced.");
    }

    @PatchMapping("/me/{orderNo}/cancel-request")
    public ApiResponse<OrderDto> requestMyOrderCancel(
        @RequestHeader("X-USER-NO") Long userNo,
        @PathVariable("orderNo") Long orderNo
    ) {
        return ApiResponse.success(
            orderService.requestCancel(userNo, orderNo),
            "Cancel request submitted."
        );
    }

    @PatchMapping("/me/{orderNo}/purchase-confirm")
    public ApiResponse<OrderDto> confirmMyOrderPurchase(
        @RequestHeader("X-USER-NO") Long userNo,
        @PathVariable("orderNo") Long orderNo
    ) {
        return ApiResponse.success(
            orderService.confirmPurchase(userNo, orderNo),
            "Purchase confirmed."
        );
    }
}
