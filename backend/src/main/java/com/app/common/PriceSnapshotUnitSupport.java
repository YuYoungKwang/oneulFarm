package com.app.common;

import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class PriceSnapshotUnitSupport {

    private static final Pattern WEIGHT_UNIT_PATTERN =
        Pattern.compile("([0-9]+(?:\\.[0-9]+)?)\\s*(kg|g)", Pattern.CASE_INSENSITIVE);

    private PriceSnapshotUnitSupport() {
    }

    public static String normalizeConvertedRetailWeightUnit(String itemCode, String snapshotUnit) {
        String normalizedItemCode = trimToNull(itemCode);
        String normalizedSnapshotUnit = trimToNull(snapshotUnit);
        if (normalizedSnapshotUnit == null) {
            return null;
        }
        if (!isConvertedRetailItemCode(normalizedItemCode)) {
            return normalizedSnapshotUnit;
        }
        if (containsWeightUnit(normalizedSnapshotUnit)) {
            return "1kg";
        }
        return normalizedSnapshotUnit;
    }

    private static boolean isConvertedRetailItemCode(String itemCode) {
        if (itemCode == null) {
            return false;
        }
        String upperItemCode = itemCode.toUpperCase(Locale.ROOT);
        return upperItemCode.startsWith("RETAIL_") && upperItemCode.endsWith("_Y");
    }

    private static boolean containsWeightUnit(String snapshotUnit) {
        Matcher matcher = WEIGHT_UNIT_PATTERN.matcher(snapshotUnit.replace(" ", ""));
        return matcher.find();
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmedValue = value.trim();
        if (trimmedValue.isEmpty()) {
            return null;
        }
        return trimmedValue;
    }
}
