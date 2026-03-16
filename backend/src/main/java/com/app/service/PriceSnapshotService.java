package com.app.service;

import java.util.List;

import com.app.dto.PriceSnapshot;

public interface PriceSnapshotService {

    int syncPriceSnapshot();

    String getLatestSnapshotDate();

    List<PriceSnapshot> getPriceSnapshotList(String itemName, String marketType, String snapshotDate, Integer limit);

    List<PriceSnapshot> getPriceSnapshotTrend(String itemCode, String marketType, Integer limit);
}
