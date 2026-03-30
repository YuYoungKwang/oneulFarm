package com.app.dao;

import java.util.List;

import com.app.dto.PriceSnapshotDTO;

public interface PriceSnapshotDAO {

    int mergePriceSnapshot(PriceSnapshotDTO priceSnapshotDTO);

    String selectLatestSnapshotDate();

    String selectLatestSnapshotDateByMarketType(String marketType);

    List<PriceSnapshotDTO> selectPriceSnapshotList(String itemName, String marketType, String snapshotDate, int limit);

    List<PriceSnapshotDTO> selectLatestPriceSnapshotListByItemName(String itemName, String marketType, int limit);

    PriceSnapshotDTO selectLatestPriceSnapshotByItemCode(String itemCode, String marketType);

    List<PriceSnapshotDTO> selectPriceSnapshotTrend(String itemCode, String marketType, int limit);
}
