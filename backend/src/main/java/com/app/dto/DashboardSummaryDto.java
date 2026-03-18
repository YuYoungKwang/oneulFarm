package com.app.dto;

import java.math.BigDecimal;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class DashboardSummaryDto {

    private BigDecimal totalSavedAmount;
    private BigDecimal monthlySavedAmount;
    private Long totalOrderCount;
    private BigDecimal totalPurchaseAmount;
}
