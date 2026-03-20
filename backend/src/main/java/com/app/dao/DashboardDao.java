package com.app.dao;

import java.util.List;

import com.app.dto.DashboardPatternSummaryDto;
import com.app.dto.DashboardSummaryDto;
import com.app.dto.MonthlySavingDto;
import com.app.dto.ProductSavingDto;
import com.app.dto.RecentPurchasedProductDto;
import com.app.dto.TopPurchasedProductDto;

public interface DashboardDao {

    DashboardSummaryDto findDashboardSummary(Long userNo);

    List<MonthlySavingDto> findMonthlySavings(Long userNo);

    List<ProductSavingDto> findProductSavings(Long userNo);

    DashboardPatternSummaryDto findDashboardPatternSummary(Long userNo);

    List<TopPurchasedProductDto> findTopPurchasedProducts(Long userNo);

    List<RecentPurchasedProductDto> findRecentPurchasedProducts(Long userNo);
}
