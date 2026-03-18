package com.app.dao;

import com.app.dto.DashboardSummaryDto;

public interface DashboardDao {

    DashboardSummaryDto findDashboardSummary(Long userNo);
}
