package com.app.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class PriceSnapshotBatchScheduler {

    private static final Logger logger = LoggerFactory.getLogger(PriceSnapshotBatchScheduler.class);

    private final PriceSnapshotService priceSnapshotService;
    private final ProductPriceMatchService productPriceMatchService;

    @Value("${batch.priceSnapshotDailyEnabled:true}")
    private boolean priceSnapshotDailyEnabled;

    public PriceSnapshotBatchScheduler(
        PriceSnapshotService priceSnapshotService,
        ProductPriceMatchService productPriceMatchService
    ) {
        this.priceSnapshotService = priceSnapshotService;
        this.productPriceMatchService = productPriceMatchService;
    }

    @Scheduled(
        cron = "${batch.priceSnapshotDailyCron:0 0 9 * * *}",
        zone = "${batch.priceSnapshotDailyZone:Asia/Seoul}"
    )
    public void syncDailyPriceSnapshot() {
        if (!priceSnapshotDailyEnabled) {
            logger.info("Daily KAMIS price batch is disabled.");
            return;
        }

        try {
            logger.info("Daily KAMIS price batch started.");
            int processedCount = priceSnapshotService.syncPriceSnapshot();
            ProductPriceMatchService.ProductPriceMatchRefreshResult refreshResult = productPriceMatchService.refreshProductPriceMatch();
            logger.info(
                "Daily KAMIS price batch completed. processedCount={}, matchProcessedCount={}, badgeCount={}",
                processedCount,
                refreshResult.getProcessedCount(),
                refreshResult.getBadgeCount()
            );
        } catch (Exception exception) {
            logger.error("Daily KAMIS price batch failed.", exception);
        }
    }
}
