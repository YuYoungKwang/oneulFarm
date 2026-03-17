package com.app.service;

import java.math.BigDecimal;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.app.dao.DashboardDao;
import com.app.dto.DashboardSummaryDto;

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
}
