package com.app.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.app.common.ApiResponse;
import com.app.dto.TossPaymentConfigDto;
import com.app.dto.TossPaymentConfirmRequestDto;
import com.app.dto.TossPaymentConfirmResponseDto;
import com.app.service.TossPaymentService;

@RestController
@RequestMapping(value = "/api/payments/toss", produces = MediaType.APPLICATION_JSON_VALUE)
public class TossPaymentController {

    @Autowired
    private TossPaymentService tossPaymentService;

    @GetMapping("/config")
    public ApiResponse<TossPaymentConfigDto> getConfig() {
        return ApiResponse.success(tossPaymentService.getConfig(), "Toss Payments config loaded.");
    }

    @PostMapping(value = "/confirm", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ApiResponse<TossPaymentConfirmResponseDto> confirmPayment(
        @RequestBody TossPaymentConfirmRequestDto request
    ) {
        return ApiResponse.success(tossPaymentService.confirmPayment(request), "Toss payment confirmed.");
    }
}
