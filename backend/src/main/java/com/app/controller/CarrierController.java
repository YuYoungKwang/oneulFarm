package com.app.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.app.common.ApiResponse;
import com.app.dto.OrderDto;
import com.app.service.CarrierService;

@RestController
@RequestMapping(value = "/api/carrier/orders", produces = MediaType.APPLICATION_JSON_VALUE)
public class CarrierController {

    @Autowired
    private CarrierService carrierService;

    @GetMapping
    public ApiResponse<List<OrderDto>> getOrders() {
        return ApiResponse.success(carrierService.getOrders(), "Carrier orders loaded.");
    }

    @GetMapping("/{orderNo}")
    public ApiResponse<OrderDto> getOrderDetail(
        @PathVariable Long orderNo
    ) {
        return ApiResponse.success(carrierService.getOrderDetail(orderNo), "Carrier order detail loaded.");
    }

    @PatchMapping("/{orderNo}/waybill")
    public ApiResponse<OrderDto> assignWaybill(
        @PathVariable Long orderNo,
        @RequestBody(required = false) OrderDto request
    ) {
        return ApiResponse.success(carrierService.assignWaybill(orderNo, request), "Waybill assigned.");
    }

    @PatchMapping("/{orderNo}/pickup")
    public ApiResponse<OrderDto> pickupOrder(
        @PathVariable Long orderNo,
        @RequestBody(required = false) OrderDto request
    ) {
        return ApiResponse.success(carrierService.pickupOrder(orderNo, request), "Order picked up.");
    }

    @PatchMapping("/{orderNo}/transit")
    public ApiResponse<OrderDto> transitOrder(
        @PathVariable Long orderNo
    ) {
        return ApiResponse.success(carrierService.transitOrder(orderNo), "Order moved to in transit.");
    }

    @PatchMapping("/{orderNo}/deliver")
    public ApiResponse<OrderDto> deliverOrder(
        @PathVariable Long orderNo
    ) {
        return ApiResponse.success(carrierService.deliverOrder(orderNo), "Order delivered.");
    }
}
