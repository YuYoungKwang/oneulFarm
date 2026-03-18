package com.app.dao;

import java.util.List;

import org.mybatis.spring.SqlSessionTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import com.app.dto.DashboardPatternSummaryDto;
import com.app.dto.DashboardSummaryDto;
import com.app.dto.MonthlySavingDto;
import com.app.dto.ProductSavingDto;
import com.app.dto.RecentPurchasedProductDto;
import com.app.dto.TopPurchasedProductDto;

@Repository
public class DashboardDaoImpl implements DashboardDao {

    private static final String NAMESPACE = "dashboardMapper.";

    @Autowired
    private SqlSessionTemplate sqlSessionTemplate;

    @Override
    public DashboardSummaryDto findDashboardSummary(Long userNo) {
        return sqlSessionTemplate.selectOne(NAMESPACE + "selectDashboardSummary", userNo);
    }

    @Override
    public List<MonthlySavingDto> findMonthlySavings(Long userNo) {
        return sqlSessionTemplate.selectList(NAMESPACE + "selectMonthlySavings", userNo);
    }

    @Override
    public List<ProductSavingDto> findProductSavings(Long userNo) {
        return sqlSessionTemplate.selectList(NAMESPACE + "selectProductSavings", userNo);
    }

    @Override
    public DashboardPatternSummaryDto findDashboardPatternSummary(Long userNo) {
        return sqlSessionTemplate.selectOne(NAMESPACE + "selectDashboardPatternSummary", userNo);
    }

    @Override
    public List<TopPurchasedProductDto> findTopPurchasedProducts(Long userNo) {
        return sqlSessionTemplate.selectList(NAMESPACE + "selectTopPurchasedProducts", userNo);
    }

    @Override
    public List<RecentPurchasedProductDto> findRecentPurchasedProducts(Long userNo) {
        return sqlSessionTemplate.selectList(NAMESPACE + "selectRecentPurchasedProducts", userNo);
    }
}
