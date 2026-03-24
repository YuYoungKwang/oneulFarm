package com.app.common;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class ProduceStandardWeightSupport {

    private static final Pattern SNAPSHOT_UNIT_PATTERN =
        Pattern.compile("^([0-9]+(?:\\.[0-9]+)?)?\\s*([A-Za-z\\uAC00-\\uD7A3]+)$");

    private static final Map<String, BigDecimal> STANDARD_WEIGHT_GRAMS = new LinkedHashMap<>();

    static {
        STANDARD_WEIGHT_GRAMS.put("양배추", new BigDecimal("3300"));
        STANDARD_WEIGHT_GRAMS.put("배추", new BigDecimal("3200"));
        STANDARD_WEIGHT_GRAMS.put("브로콜리", new BigDecimal("320"));
        STANDARD_WEIGHT_GRAMS.put("애호박", new BigDecimal("350"));
        STANDARD_WEIGHT_GRAMS.put("참외", new BigDecimal("280"));
        STANDARD_WEIGHT_GRAMS.put("오이", new BigDecimal("230"));
        STANDARD_WEIGHT_GRAMS.put("수박", new BigDecimal("8000"));
        STANDARD_WEIGHT_GRAMS.put("무", new BigDecimal("1800"));
    }

    private ProduceStandardWeightSupport() {
    }

    public static BigDecimal resolveProductAmountInGram(String itemName, String unit, BigDecimal quantity) {
        if (quantity == null || quantity.compareTo(BigDecimal.ZERO) <= 0) {
            return null;
        }

        String normalizedUnit = trimToNull(unit);
        if (normalizedUnit == null) {
            return null;
        }

        String lowerUnit = normalizedUnit.toLowerCase(Locale.ROOT);
        if ("kg".equals(lowerUnit)) {
            return quantity.multiply(BigDecimal.valueOf(1000L));
        }
        if ("g".equals(lowerUnit)) {
            return quantity;
        }

        BigDecimal standardWeight = resolveStandardWeightGram(itemName);
        if (standardWeight == null) {
            return null;
        }

        return quantity.multiply(standardWeight);
    }

    public static BigDecimal resolveSnapshotAmountInGram(String itemName, String snapshotUnit) {
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
        return resolveProductAmountInGram(itemName, unitToken, amount);
    }

    public static BigDecimal resolveStandardWeightGram(String itemName) {
        String normalizedItemName = normalizeItemName(itemName);
        if (normalizedItemName == null) {
            return null;
        }

        for (Map.Entry<String, BigDecimal> entry : STANDARD_WEIGHT_GRAMS.entrySet()) {
            if (normalizedItemName.contains(entry.getKey())) {
                return entry.getValue();
            }
        }
        return null;
    }

    private static String normalizeItemName(String itemName) {
        String trimmedItemName = trimToNull(itemName);
        if (trimmedItemName == null) {
            return null;
        }
        return trimmedItemName.replaceAll("\\s+", "");
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }

        String trimmedValue = value.trim();
        return trimmedValue.isEmpty() ? null : trimmedValue;
    }
}
