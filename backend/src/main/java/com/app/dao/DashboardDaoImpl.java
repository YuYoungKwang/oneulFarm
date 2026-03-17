package com.app.dao;

import org.mybatis.spring.SqlSessionTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import com.app.dto.DashboardSummaryDto;

@Repository
public class DashboardDaoImpl implements DashboardDao {

    private static final String NAMESPACE = "dashboardMapper.";

    @Autowired
    private SqlSessionTemplate sqlSessionTemplate;

    @Override
    public DashboardSummaryDto findDashboardSummary(Long userNo) {
        return sqlSessionTemplate.selectOne(NAMESPACE + "selectDashboardSummary", userNo);
    }
}
