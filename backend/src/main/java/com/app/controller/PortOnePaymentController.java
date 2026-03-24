package com.app.controller;

import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.app.common.ApiResponse;
import com.app.service.PortOnePaymentService;

@RestController
@RequestMapping(value = "/api/payments/portone", produces = MediaType.APPLICATION_JSON_VALUE)
public class PortOnePaymentController {

    @Autowired
    private PortOnePaymentService portOnePaymentService;

    @GetMapping("/config")
    public ApiResponse<Map<String, Object>> getConfig() {
        return ApiResponse.success(portOnePaymentService.getConfig(), "PortOne config loaded.");
    }

    @PostMapping(value = "/complete", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ApiResponse<Map<String, Object>> completePayment(
        @RequestBody Map<String, Object> request
    ) {
        return ApiResponse.success(portOnePaymentService.completePayment(request), "PortOne payment verified.");
    }
}
