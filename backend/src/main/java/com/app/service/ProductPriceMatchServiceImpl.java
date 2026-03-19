package com.app.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.app.dao.ProductPriceMatchDAO;
import com.app.dto.ProductPriceCodeMapDTO;

@Service
public class ProductPriceMatchServiceImpl implements ProductPriceMatchService {

    private static final Logger logger = LoggerFactory.getLogger(ProductPriceMatchServiceImpl.class);

    private static final BigDecimal BADGE_THRESHOLD = BigDecimal.valueOf(100L);
    private static final Pattern SNAPSHOT_UNIT_PATTERN = Pattern.compile("^([0-9]+(?:\\.[0-9]+)?)?\\s*([A-Za-z\\uAC00-\\uD7A3]+)$");
    private static final Set<String> COUNT_UNIT_SET = Set.of(
        "ea",
        "each",
        "\uAC1C",
        "\uD3EC\uAE30",
        "\uB2E8",
        "\uB9DD",
        "\uBD09",
        "\uBD09\uC9C0",
        "pack",
        "pk"
    );

    private final ProductPriceMatchDAO productPriceMatchDAO;

    public ProductPriceMatchServiceImpl(ProductPriceMatchDAO productPriceMatchDAO) {
        this.productPriceMatchDAO = productPriceMatchDAO;
    }

    @Override
    @Transactional
    public ProductPriceMatchRefreshResult refreshProductPriceMatch() {
        int deletedCount = productPriceMatchDAO.deleteProductPriceMatchForSellingProducts();
        List<ProductPriceCodeMapDTO> productPriceCodeMapList = productPriceMatchDAO.selectActiveProductPriceCodeMapList();

        int processedCount = 0;
        int matchedSnapshotCount = 0;
        int badgeCount = 0;
        int skippedCount = 0;

        for (ProductPriceCodeMapDTO productPriceCodeMapDTO : productPriceCodeMapList) {
            if (productPriceCodeMapDTO.getSnapshotNo() == null || productPriceCodeMapDTO.getAvgPrice() == null) {
                skippedCount++;
                continue;
            }

            BigDecimal comparedPrice = calculateComparedPrice(productPriceCodeMapDTO);
            if (comparedPrice == null) {
                skippedCount++;
                logger.warn(
                    "Skip product price match refresh because unit conversion is not supported. productNo={}, productUnit={}, packageWeight={}, snapshotUnit={}",
                    productPriceCodeMapDTO.getProductNo(),
                    productPriceCodeMapDTO.getProductUnit(),
                    productPriceCodeMapDTO.getPackageWeight(),
                    resolveSnapshotUnit(productPriceCodeMapDTO)
                );
                continue;
            }

            matchedSnapshotCount++;
            productPriceCodeMapDTO.setComparedPrice(comparedPrice);
            applyBadgeMetrics(productPriceCodeMapDTO);
            processedCount += productPriceMatchDAO.insertProductPriceMatch(productPriceCodeMapDTO);

            if ("UNDER_AVG".equals(productPriceCodeMapDTO.getBadgeType())) {
                badgeCount++;
            }
        }

        logger.info(
            "Product price match refresh completed. deletedCount={}, processedCount={}, matchedSnapshotCount={}, badgeCount={}, skippedCount={}",
            deletedCount,
            processedCount,
            matchedSnapshotCount,
            badgeCount,
            skippedCount
        );

        return new ProductPriceMatchRefreshResult(
            deletedCount,
            processedCount,
            matchedSnapshotCount,
            badgeCount,
            skippedCount
        );
    }

    private void applyBadgeMetrics(ProductPriceCodeMapDTO productPriceCodeMapDTO) {
        BigDecimal comparedPrice = scaleMoney(productPriceCodeMapDTO.getComparedPrice());
        BigDecimal salePrice = scaleMoney(productPriceCodeMapDTO.getSalePrice());
        BigDecimal rawGap = comparedPrice.subtract(salePrice).setScale(2, RoundingMode.HALF_UP);
        BigDecimal positiveGap = rawGap.max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);

        productPriceCodeMapDTO.setComparedPrice(comparedPrice);
        productPriceCodeMapDTO.setPriceGap(positiveGap);

        if (rawGap.compareTo(BADGE_THRESHOLD) >= 0 && comparedPrice.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal savingRate = rawGap
                .divide(comparedPrice, 6, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100L))
                .setScale(2, RoundingMode.HALF_UP);

            productPriceCodeMapDTO.setSavingRate(savingRate);
            productPriceCodeMapDTO.setBadgeType("UNDER_AVG");
            return;
        }

        productPriceCodeMapDTO.setSavingRate(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
        productPriceCodeMapDTO.setBadgeType(null);
    }

    private BigDecimal calculateComparedPrice(ProductPriceCodeMapDTO productPriceCodeMapDTO) {
        Quantity productQuantity = resolveProductQuantity(productPriceCodeMapDTO);
        Quantity snapshotQuantity = resolveSnapshotQuantity(productPriceCodeMapDTO);
        if (productQuantity == null || snapshotQuantity == null) {
            return null;
        }
        if (!productQuantity.getType().equals(snapshotQuantity.getType())) {
            return null;
        }
        if (productQuantity.getAmount().compareTo(BigDecimal.ZERO) <= 0 || snapshotQuantity.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            return null;
        }

        return productPriceCodeMapDTO.getAvgPrice()
            .multiply(productQuantity.getAmount())
            .divide(snapshotQuantity.getAmount(), 2, RoundingMode.HALF_UP);
    }

    private Quantity resolveProductQuantity(ProductPriceCodeMapDTO productPriceCodeMapDTO) {
        String productUnit = trimToNull(productPriceCodeMapDTO.getProductUnit());
        if (productUnit == null) {
            return null;
        }

        BigDecimal packageWeight = productPriceCodeMapDTO.getPackageWeight();
        if (packageWeight == null || packageWeight.compareTo(BigDecimal.ZERO) <= 0) {
            packageWeight = BigDecimal.ONE;
        }

        String normalizedUnit = productUnit.trim().toLowerCase(Locale.ROOT);
        if ("kg".equals(normalizedUnit)) {
            return new Quantity(UnitType.WEIGHT, packageWeight.multiply(BigDecimal.valueOf(1000L)));
        }
        if ("g".equals(normalizedUnit)) {
            return new Quantity(UnitType.WEIGHT, packageWeight);
        }
        if (COUNT_UNIT_SET.contains(normalizedUnit)) {
            return new Quantity(UnitType.COUNT, packageWeight);
        }

        return null;
    }

    private Quantity resolveSnapshotQuantity(ProductPriceCodeMapDTO productPriceCodeMapDTO) {
        String snapshotUnit = resolveSnapshotUnit(productPriceCodeMapDTO);
        if (snapshotUnit == null) {
            return null;
        }

        String normalizedSnapshotUnit = snapshotUnit.replace(" ", "");
        Matcher matcher = SNAPSHOT_UNIT_PATTERN.matcher(normalizedSnapshotUnit);
        if (!matcher.matches()) {
            return null;
        }

        String amountToken = trimToNull(matcher.group(1));
        String unitToken = trimToNull(matcher.group(2));
        if (unitToken == null) {
            return null;
        }

        BigDecimal amount = amountToken == null ? BigDecimal.ONE : new BigDecimal(amountToken);
        String normalizedUnitToken = unitToken.toLowerCase(Locale.ROOT);

        if ("kg".equals(normalizedUnitToken)) {
            return new Quantity(UnitType.WEIGHT, amount.multiply(BigDecimal.valueOf(1000L)));
        }
        if ("g".equals(normalizedUnitToken)) {
            return new Quantity(UnitType.WEIGHT, amount);
        }
        if (COUNT_UNIT_SET.contains(normalizedUnitToken)) {
            return new Quantity(UnitType.COUNT, amount);
        }

        return null;
    }

    private String resolveSnapshotUnit(ProductPriceCodeMapDTO productPriceCodeMapDTO) {
        String snapshotUnit = trimToNull(productPriceCodeMapDTO.getSnapshotUnit());
        if (snapshotUnit != null) {
            return snapshotUnit;
        }
        return trimToNull(productPriceCodeMapDTO.getUnitHint());
    }

    private BigDecimal scaleMoney(BigDecimal value) {
        if (value == null) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        return value.setScale(2, RoundingMode.HALF_UP);
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }

        String trimmedValue = value.trim();
        if (trimmedValue.isEmpty()) {
            return null;
        }
        return trimmedValue;
    }

    private enum UnitType {
        WEIGHT,
        COUNT
    }

    private static final class Quantity {

        private final UnitType type;
        private final BigDecimal amount;

        private Quantity(UnitType type, BigDecimal amount) {
            this.type = type;
            this.amount = amount;
        }

        private UnitType getType() {
            return type;
        }

        private BigDecimal getAmount() {
            return amount;
        }
    }
}
