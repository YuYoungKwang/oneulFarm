package com.app.dao;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.mybatis.spring.SqlSessionTemplate;
import org.springframework.stereotype.Repository;

import com.app.dto.PriceSnapshot;

@Repository
public class PriceSnapshotDAOImpl implements PriceSnapshotDAO {

    private static final String NAMESPACE = "com.app.dao.PriceSnapshotDAO.";

    private final SqlSessionTemplate sqlSessionTemplate;

    public PriceSnapshotDAOImpl(SqlSessionTemplate sqlSessionTemplate) {
        this.sqlSessionTemplate = sqlSessionTemplate;
    }

    @Override
    public int mergePriceSnapshot(PriceSnapshot priceSnapshot) {
        return sqlSessionTemplate.update(NAMESPACE + "mergePriceSnapshot", priceSnapshot);
    }

    @Override
    public String selectLatestSnapshotDate() {
        return sqlSessionTemplate.selectOne(NAMESPACE + "selectLatestSnapshotDate");
    }

    @Override
    public List<PriceSnapshot> selectPriceSnapshotList(String itemName, String marketType, String snapshotDate, int limit) {
        Map<String, Object> parameterMap = new HashMap<String, Object>();
        parameterMap.put("itemName", itemName);
        parameterMap.put("marketType", marketType);
        parameterMap.put("snapshotDate", snapshotDate);
        parameterMap.put("limit", limit);
        return sqlSessionTemplate.selectList(NAMESPACE + "selectPriceSnapshotList", parameterMap);
    }

    @Override
    public List<PriceSnapshot> selectPriceSnapshotTrend(String itemCode, String marketType, int limit) {
        Map<String, Object> parameterMap = new HashMap<String, Object>();
        parameterMap.put("itemCode", itemCode);
        parameterMap.put("marketType", marketType);
        parameterMap.put("limit", limit);
        return sqlSessionTemplate.selectList(NAMESPACE + "selectPriceSnapshotTrend", parameterMap);
    }
}
