package com.app.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.app.common.ApiResponse;
import com.app.dto.DashboardPatternResponseDto;
import com.app.dto.DashboardSummaryDto;
import com.app.dto.MonthlySavingDto;
import com.app.dto.ProductSavingDto;
import com.app.service.DashboardService;

@RestController
@RequestMapping(value = "/api/dashboard", produces = MediaType.APPLICATION_JSON_VALUE)
public class DashboardController {

    @Autowired
    private DashboardService dashboardService;

    @GetMapping("/summary")
    public ApiResponse<DashboardSummaryDto> getDashboardSummary(
        @RequestHeader("X-USER-NO") Long userNo
    ) {
        return ApiResponse.success(dashboardService.getDashboardSummary(userNo), "dashboard summary fetched");
    }

    @GetMapping("/monthly-savings")
    public ApiResponse<List<MonthlySavingDto>> getMonthlySavings(
        @RequestHeader("X-USER-NO") Long userNo
    ) {
        return ApiResponse.success(dashboardService.getMonthlySavings(userNo), "monthly savings fetched");
    }

    @GetMapping("/product-savings")
    public ApiResponse<List<ProductSavingDto>> getProductSavings(
        @RequestHeader("X-USER-NO") Long userNo
    ) {
        return ApiResponse.success(dashboardService.getProductSavings(userNo), "product savings fetched");
    }

    @GetMapping("/patterns")
    public ApiResponse<DashboardPatternResponseDto> getDashboardPatterns(
        @RequestHeader("X-USER-NO") Long userNo
    ) {
        return ApiResponse.success(dashboardService.getDashboardPatterns(userNo), "dashboard patterns fetched");
    }
}
