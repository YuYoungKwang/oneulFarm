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

    @Value("${batch.priceSnapshotDailyEnabled:true}")
    private boolean priceSnapshotDailyEnabled;

    public PriceSnapshotBatchScheduler(PriceSnapshotService priceSnapshotService) {
        this.priceSnapshotService = priceSnapshotService;
    }

    @Scheduled(
        cron = "${batch.priceSnapshotDailyCron:0 0 9 * * *}",
        zone = "${batch.priceSnapshotDailyZone:Asia/Seoul}"
    )
    public void syncDailyPriceSnapshot() {
        if (!priceSnapshotDailyEnabled) {
            logger.info("KAMIS 일일 시세 배치가 비활성화되어 실행하지 않습니다.");
            return;
        }

        try {
            logger.info("KAMIS 일일 시세 배치 시작");
            int processedCount = priceSnapshotService.syncPriceSnapshot();
            logger.info("KAMIS 일일 시세 배치 완료 - processedCount={}", processedCount);
        } catch (Exception exception) {
            logger.error("KAMIS 일일 시세 배치 실행 실패", exception);
        }
    }
}
