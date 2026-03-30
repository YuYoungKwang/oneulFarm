package com.app.service;

import java.util.List;

import com.app.dto.PriceSnapshotBackfillItemDTO;
import com.app.dto.PriceSnapshotDTO;

public interface PriceSnapshotService {

    int syncPriceSnapshot();

    int backfillPriceSnapshot(
        String marketType,
        String itemCategoryCode,
        String itemCode,
        String kindCode,
        String productRankCode,
        String countryCode,
        String convertKgYn,
        String startDate,
        String endDate
    );

    List<PriceSnapshotBackfillItemDTO> backfillDefaultPriceSnapshotSet(String startDate, String endDate);

    String getLatestSnapshotDate();

    List<PriceSnapshotDTO> getPriceSnapshotList(String itemName, String marketType, String snapshotDate, Integer limit);

    List<PriceSnapshotDTO> getLatestPriceSnapshotListByItemName(String itemName, String marketType, Integer limit);

    PriceSnapshotDTO getLatestPriceSnapshotByItemCode(String itemCode, String marketType);

    List<PriceSnapshotDTO> getPriceSnapshotTrend(String itemCode, String marketType, Integer limit);
}
