package com.app.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.app.dao.ProductDao;
import com.app.dto.PriceSnapshotDTO;
import com.app.dto.ProductDto;
import com.app.dto.ProductImageDto;

@Service
public class ProductServiceImpl implements ProductService {

    private static final Pattern SNAPSHOT_UNIT_PATTERN = Pattern.compile("^([0-9]+(?:\\.[0-9]+)?)?\\s*([A-Za-z\\uAC00-\\uD7A3]+)$");
    private static final Set<String> COUNT_UNIT_SET = Set.of(
        "ea",
        "each",
        "개",
        "포기",
        "단",
        "망",
        "봉",
        "봉지",
        "pack",
        "pk"
    );
    private static final BigDecimal BADGE_THRESHOLD = BigDecimal.valueOf(100L);

    @Autowired
    private ProductDao productDao;

    @Autowired
    private PriceSnapshotService priceSnapshotService;

    @Override
    public List<ProductDto> getProducts() {
        List<ProductDto> products = productDao.findSellingProducts();
        for (ProductDto product : products) {
            applyFallbackPriceInsight(product);
            product.setImages(resolveDisplayImages(product.getProductNo()));
            product.setRecipes(Collections.emptyList());
            product.setReviews(Collections.emptyList());
        }
        return products;
    }

    @Override
    public ProductDto getProduct(Long productNo) {
        ProductDto product = productDao.findProduct(productNo);
        if (product == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found.");
        }

        applyFallbackPriceInsight(product);
        product.setImages(resolveDisplayImages(productNo));
        product.setRecipes(productDao.findProductRecipes(productNo));
        product.setReviews(productDao.findProductReviews(productNo));
        return product;
    }

    private void applyFallbackPriceInsight(ProductDto product) {
        if (product == null) {
            return;
        }

        BigDecimal currentAvgPrice = product.getAvgPrice();
        if (product.getSnapshotNo() != null || (currentAvgPrice != null && currentAvgPrice.compareTo(BigDecimal.ZERO) > 0)) {
            return;
        }

        PriceSnapshotDTO retailSnapshot = findBestRetailSnapshot(product.getProductName());
        if (retailSnapshot == null) {
            return;
        }

        BigDecimal comparablePrice = calculateComparablePrice(product, retailSnapshot);
        BigDecimal displayAvgPrice = comparablePrice != null ? comparablePrice : retailSnapshot.getAvgPrice();
        if (displayAvgPrice == null) {
            return;
        }

        BigDecimal salePrice = scaleMoney(product.getSalePrice());
        BigDecimal priceGap = displayAvgPrice.subtract(salePrice).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
        BigDecimal savingRate = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        String badgeType = null;

        if (displayAvgPrice.compareTo(BigDecimal.ZERO) > 0 && priceGap.compareTo(BADGE_THRESHOLD) >= 0) {
            savingRate = priceGap
                .divide(displayAvgPrice, 6, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100L))
                .setScale(2, RoundingMode.HALF_UP);
            badgeType = "UNDER_AVG";
        }

        product.setSnapshotNo(retailSnapshot.getSnapshotNo());
        product.setItemCode(retailSnapshot.getItemCode());
        product.setItemName(retailSnapshot.getItemName());
        product.setMarketType(retailSnapshot.getMarketType());
        product.setSnapshotUnit(retailSnapshot.getUnit());
        product.setAvgPrice(displayAvgPrice);
        product.setMinPrice(displayAvgPrice);
        product.setMaxPrice(displayAvgPrice);
        product.setChangeRate(retailSnapshot.getChangeRate());
        product.setSnapshotDate(parseSnapshotDate(retailSnapshot.getSnapshotDate()));
        product.setSourceName(retailSnapshot.getSourceName());
        product.setComparedPrice(displayAvgPrice);
        product.setPriceGap(priceGap);
        product.setSavingRate(savingRate);
        product.setBadgeType(badgeType);
    }

    private PriceSnapshotDTO findBestRetailSnapshot(String productName) {
        if (productName == null || productName.isBlank()) {
            return null;
        }

        List<PriceSnapshotDTO> retailSnapshots =
            priceSnapshotService.getPriceSnapshotList(productName, "RETAIL", null, 40);
        if (retailSnapshots == null || retailSnapshots.isEmpty()) {
            return null;
        }

        PriceSnapshotDTO bestSnapshot = null;
        int bestScore = Integer.MIN_VALUE;
        for (PriceSnapshotDTO candidate : retailSnapshots) {
            int score = calculateSnapshotMatchScore(productName, candidate);
            if (bestSnapshot == null || score > bestScore) {
                bestSnapshot = candidate;
                bestScore = score;
            }
        }
        return bestSnapshot;
    }

    private int calculateSnapshotMatchScore(String query, PriceSnapshotDTO candidate) {
        if (candidate == null) {
            return Integer.MIN_VALUE;
        }

        String normalizedQuery = normalizeSearchKey(query);
        String normalizedItemName = normalizeSearchKey(candidate.getItemName());
        if (normalizedItemName.isEmpty()) {
            return Integer.MIN_VALUE;
        }

        int score = 0;
        if (normalizedItemName.equals(normalizedQuery)) {
            score += 1000;
        } else if (normalizedItemName.startsWith(normalizedQuery)) {
            score += 700;
        } else if (normalizedItemName.contains(normalizedQuery)) {
            score += 500;
        }

        String rawItemName = trimToNull(candidate.getItemName());
        if (rawItemName != null && rawItemName.equalsIgnoreCase(query.trim())) {
            score += 150;
        }

        score -= Math.max(normalizedItemName.length() - normalizedQuery.length(), 0);
        return score;
    }

    private BigDecimal calculateComparablePrice(ProductDto product, PriceSnapshotDTO snapshot) {
        Quantity productQuantity = resolveProductQuantity(product);
        Quantity snapshotQuantity = resolveSnapshotQuantity(snapshot == null ? null : snapshot.getUnit());
        if (productQuantity == null || snapshotQuantity == null) {
            return null;
        }
        if (!productQuantity.type.equals(snapshotQuantity.type)) {
            return null;
        }
        if (productQuantity.amount.compareTo(BigDecimal.ZERO) <= 0 || snapshotQuantity.amount.compareTo(BigDecimal.ZERO) <= 0) {
            return null;
        }
        if (snapshot.getAvgPrice() == null) {
            return null;
        }

        return snapshot.getAvgPrice()
            .multiply(productQuantity.amount)
            .divide(snapshotQuantity.amount, 2, RoundingMode.HALF_UP);
    }

    private Quantity resolveProductQuantity(ProductDto product) {
        String productUnit = trimToNull(product.getUnit());
        if (productUnit == null) {
            return null;
        }

        BigDecimal packageWeight = product.getPackageWeight();
        if (packageWeight == null || packageWeight.compareTo(BigDecimal.ZERO) <= 0) {
            packageWeight = BigDecimal.ONE;
        }

        String normalizedUnit = productUnit.toLowerCase(Locale.ROOT);
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

    private Quantity resolveSnapshotQuantity(String snapshotUnit) {
        String normalizedSnapshotUnit = trimToNull(snapshotUnit);
        if (normalizedSnapshotUnit == null) {
            return null;
        }

        Matcher matcher = SNAPSHOT_UNIT_PATTERN.matcher(normalizedSnapshotUnit.replace(" ", ""));
        if (!matcher.matches()) {
            return null;
        }

        String amountToken = trimToNull(matcher.group(1));
        String unitToken = trimToNull(matcher.group(2));
        if (unitToken == null) {
            return null;
        }

        BigDecimal amount = amountToken == null ? BigDecimal.ONE : new BigDecimal(amountToken);
        String normalizedUnit = unitToken.toLowerCase(Locale.ROOT);
        if ("kg".equals(normalizedUnit)) {
            return new Quantity(UnitType.WEIGHT, amount.multiply(BigDecimal.valueOf(1000L)));
        }
        if ("g".equals(normalizedUnit)) {
            return new Quantity(UnitType.WEIGHT, amount);
        }
        if (COUNT_UNIT_SET.contains(normalizedUnit)) {
            return new Quantity(UnitType.COUNT, amount);
        }
        return null;
    }

    private java.time.LocalDate parseSnapshotDate(String snapshotDate) {
        String normalizedDate = trimToNull(snapshotDate);
        if (normalizedDate == null) {
            return null;
        }
        try {
            return java.time.LocalDate.parse(normalizedDate);
        } catch (Exception exception) {
            return null;
        }
    }

    private BigDecimal scaleMoney(BigDecimal value) {
        if (value == null) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        return value.setScale(2, RoundingMode.HALF_UP);
    }

    private String normalizeSearchKey(String value) {
        String trimmedValue = trimToNull(value);
        if (trimmedValue == null) {
            return "";
        }

        return trimmedValue.replaceAll("\\s+", "").toLowerCase(Locale.ROOT);
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
    }

    private List<ProductImageDto> resolveDisplayImages(Long productNo) {
        List<ProductImageDto> images = productDao.findProductImages(productNo);
        if (images == null || images.isEmpty()) {
            return Collections.emptyList();
        }

        List<ProductImageDto> displayImages = new ArrayList<>();
        for (ProductImageDto image : images) {
            if (image == null || image.getImageNo() == null) {
                continue;
            }
            if (image.getImageSize() != null && image.getImageSize() <= 0) {
                continue;
            }
            displayImages.add(image);
        }
        return displayImages;
    }
}
