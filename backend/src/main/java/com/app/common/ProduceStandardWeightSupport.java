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
        STANDARD_WEIGHT_GRAMS.put("\uC591\uBC30\uCD94", new BigDecimal("3300"));
        STANDARD_WEIGHT_GRAMS.put("\uBC30\uCD94", new BigDecimal("3200"));
        STANDARD_WEIGHT_GRAMS.put("\uBE0C\uB85C\uCF5C\uB9AC", new BigDecimal("320"));
        STANDARD_WEIGHT_GRAMS.put("\uC560\uD638\uBC15", new BigDecimal("350"));
        STANDARD_WEIGHT_GRAMS.put("\uCC38\uC678", new BigDecimal("280"));
        STANDARD_WEIGHT_GRAMS.put("\uC624\uC774", new BigDecimal("230"));
        STANDARD_WEIGHT_GRAMS.put("\uC218\uBC15", new BigDecimal("8000"));
        STANDARD_WEIGHT_GRAMS.put("\uBB34", new BigDecimal("1800"));
        STANDARD_WEIGHT_GRAMS.put("\uC0AC\uACFC", new BigDecimal("330"));
        STANDARD_WEIGHT_GRAMS.put("\uBC30", new BigDecimal("800"));
        STANDARD_WEIGHT_GRAMS.put("\uAC10\uADE4", new BigDecimal("100"));
        STANDARD_WEIGHT_GRAMS.put("\uD30C\uC778\uC560\uD50C", new BigDecimal("2000"));
        STANDARD_WEIGHT_GRAMS.put("\uB9DD\uACE0", new BigDecimal("400"));
        STANDARD_WEIGHT_GRAMS.put("\uC544\uBCF4\uCE74\uB3C4", new BigDecimal("200"));
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
