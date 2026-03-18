package com.app.dao;

import java.util.List;

import com.app.dto.PriceSnapshot;

public interface PriceSnapshotDAO {

    int mergePriceSnapshot(PriceSnapshot priceSnapshot);

    String selectLatestSnapshotDate();

    List<PriceSnapshot> selectPriceSnapshotList(String itemName, String marketType, String snapshotDate, int limit);

    List<PriceSnapshot> selectPriceSnapshotTrend(String itemCode, String marketType, int limit);
}
