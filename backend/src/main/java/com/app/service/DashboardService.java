package com.app.service;

import com.app.dto.DashboardSummaryDto;

public interface DashboardService {

    DashboardSummaryDto getDashboardSummary(Long userNo);
}
