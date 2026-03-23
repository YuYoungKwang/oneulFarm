package com.app.service;

import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

import java.math.BigDecimal;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.app.dao.DashboardDao;
import com.app.dto.DashboardPatternResponseDto;
import com.app.dto.DashboardPatternSummaryDto;
import com.app.dto.DashboardSummaryDto;
import com.app.dto.MonthlySavingDto;
import com.app.dto.ProductSavingDto;

@Service
public class DashboardServiceImpl implements DashboardService {

    @Autowired
    private DashboardDao dashboardDao;

    @Override
    public DashboardSummaryDto getDashboardSummary(Long userNo) {
        DashboardSummaryDto summary = dashboardDao.findDashboardSummary(userNo);
        if (summary == null) {
            summary = new DashboardSummaryDto();
        }

        if (summary.getTotalSavedAmount() == null) {
            summary.setTotalSavedAmount(BigDecimal.ZERO);
        }
        if (summary.getMonthlySavedAmount() == null) {
            summary.setMonthlySavedAmount(BigDecimal.ZERO);
        }
        if (summary.getTotalOrderCount() == null) {
            summary.setTotalOrderCount(0L);
        }
        if (summary.getTotalPurchaseAmount() == null) {
            summary.setTotalPurchaseAmount(BigDecimal.ZERO);
        }

        return summary;
    }

    @Override
    public List<MonthlySavingDto> getMonthlySavings(Long userNo) {
        List<MonthlySavingDto> items = dashboardDao.findMonthlySavings(userNo);
        if (items == null) {
            return new ArrayList<>();
        }

        for (MonthlySavingDto item : items) {
            if (item.getSavedAmount() == null) {
                item.setSavedAmount(BigDecimal.ZERO);
            }
        }

        return items;
    }

    @Override
    public List<ProductSavingDto> getProductSavings(Long userNo) {
        List<ProductSavingDto> items = dashboardDao.findProductSavings(userNo);
        if (items == null) {
            return new ArrayList<>();
        }

        for (ProductSavingDto item : items) {
            if (item.getSavedAmount() == null) {
                item.setSavedAmount(BigDecimal.ZERO);
            }
        }

        return items;
    }

    @Override
    public DashboardPatternResponseDto getDashboardPatterns(Long userNo) {
        DashboardPatternResponseDto response = new DashboardPatternResponseDto();
        DashboardPatternSummaryDto summary = dashboardDao.findDashboardPatternSummary(userNo);

        BigDecimal averagePurchaseUnitPrice = summary == null || summary.getAveragePurchaseUnitPrice() == null
            ? BigDecimal.ZERO
            : summary.getAveragePurchaseUnitPrice().setScale(2, RoundingMode.HALF_UP);
        BigDecimal averageSavingRate = summary == null || summary.getAverageSavingRate() == null
            ? BigDecimal.ZERO
            : summary.getAverageSavingRate().setScale(2, RoundingMode.HALF_UP);

        response.setAveragePurchaseUnitPrice(averagePurchaseUnitPrice);
        response.setAverageSavingRate(averageSavingRate);
        response.setTopPurchasedProducts(dashboardDao.findTopPurchasedProducts(userNo));
        response.setRecentPurchasedProducts(dashboardDao.findRecentPurchasedProducts(userNo));
        return response;
    }
}
