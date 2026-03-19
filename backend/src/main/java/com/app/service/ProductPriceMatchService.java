package com.app.service;

public interface ProductPriceMatchService {

    ProductPriceMatchRefreshResult refreshProductPriceMatch();

    final class ProductPriceMatchRefreshResult {

        private final int deletedCount;
        private final int processedCount;
        private final int matchedSnapshotCount;
        private final int badgeCount;
        private final int skippedCount;

        public ProductPriceMatchRefreshResult(
            int deletedCount,
            int processedCount,
            int matchedSnapshotCount,
            int badgeCount,
            int skippedCount
        ) {
            this.deletedCount = deletedCount;
            this.processedCount = processedCount;
            this.matchedSnapshotCount = matchedSnapshotCount;
            this.badgeCount = badgeCount;
            this.skippedCount = skippedCount;
        }

        public int getDeletedCount() {
            return deletedCount;
        }

        public int getProcessedCount() {
            return processedCount;
        }

        public int getMatchedSnapshotCount() {
            return matchedSnapshotCount;
        }

        public int getBadgeCount() {
            return badgeCount;
        }

        public int getSkippedCount() {
            return skippedCount;
        }
    }
}
