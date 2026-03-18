package com.app.service;

import java.util.List;

import com.app.dto.DashboardPatternResponseDto;
import com.app.dto.DashboardSummaryDto;
import com.app.dto.MonthlySavingDto;
import com.app.dto.ProductSavingDto;

public interface DashboardService {

    DashboardSummaryDto getDashboardSummary(Long userNo);

    List<MonthlySavingDto> getMonthlySavings(Long userNo);

    List<ProductSavingDto> getProductSavings(Long userNo);

    DashboardPatternResponseDto getDashboardPatterns(Long userNo);
}
