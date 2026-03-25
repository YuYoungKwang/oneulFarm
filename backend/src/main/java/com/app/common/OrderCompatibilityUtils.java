package com.app.common;

import java.time.LocalDateTime;

import com.app.dto.OrderDto;

public final class OrderCompatibilityUtils {

    private OrderCompatibilityUtils() {
    }

    public static void hydrateOrderCompatibility(OrderDto order) {
        if (order == null) {
            return;
        }

        String legacyOrderStatus = trimToNull(order.getOrderStatus());
        String normalizedDeliveryStatus = resolveNormalizedDeliveryStatus(order.getDeliveryStatus(), order.getTrackingNo());

        order.setNormalizedOrderStatus(resolveNormalizedOrderStatus(legacyOrderStatus));
        order.setNormalizedDeliveryStatus(normalizedDeliveryStatus);
        order.setCarrierName(trimToNull(order.getCourierName()));
        order.setCarrierCode(resolveCarrierCode(order.getCarrierName()));
        order.setWaybillStatus(order.getTrackingNo() == null ? "NOT_ASSIGNED" : "ASSIGNED");
        order.setWaybillAssignedAt(resolveWaybillAssignedAt(order));
        order.setPickedUpAt(null);
        order.setInTransitAt(resolveInTransitAt(order));

        if ("CANCELED".equals(legacyOrderStatus)) {
            order.setLegacyStatusNeedsReview(Boolean.TRUE);
            order.setCancelStatus(null);
        } else if (order.getCancelStatus() == null) {
            order.setLegacyStatusNeedsReview(Boolean.FALSE);
            order.setCancelStatus("NONE");
        }

        if (order.getPurchaseConfirmStatus() == null && "DELIVERED".equals(normalizedDeliveryStatus)) {
            order.setPurchaseConfirmStatus("PURCHASE_PENDING");
        }
    }

    public static String resolveNormalizedOrderStatus(String legacyOrderStatus) {
        if (legacyOrderStatus == null) {
            return null;
        }

        switch (legacyOrderStatus) {
            case "CREATED":
            case "PAID":
                return "PAYMENT_COMPLETED";
            case "SHIPPING":
            case "COMPLETED":
                return "ORDER_ACCEPTED";
            case "PAYMENT_COMPLETED":
            case "ORDER_ACCEPTED":
            case "ORDER_REJECTED":
                return legacyOrderStatus;
            case "CANCELED":
            default:
                return null;
        }
    }

    public static String resolveNormalizedDeliveryStatus(String legacyDeliveryStatus, String trackingNo) {
        if (legacyDeliveryStatus == null) {
            return trackingNo == null ? null : "WAYBILL_ASSIGNED";
        }

        switch (legacyDeliveryStatus) {
            case "READY":
                return trackingNo == null ? "NOT_STARTED" : "WAYBILL_ASSIGNED";
            case "SHIPPING":
                return "IN_TRANSIT";
            case "DELIVERED":
                return "DELIVERED";
            case "NOT_STARTED":
            case "WAYBILL_ASSIGNED":
            case "PICKED_UP":
            case "IN_TRANSIT":
                return legacyDeliveryStatus;
            default:
                return legacyDeliveryStatus;
        }
    }

    public static String resolveCarrierCode(String carrierName) {
        String normalizedCarrierName = trimToNull(carrierName);
        if (normalizedCarrierName == null) {
            return null;
        }

        String upperCarrierName = normalizedCarrierName.toUpperCase();
        if (upperCarrierName.contains("CJ")) {
            return "CJ";
        }
        if (upperCarrierName.contains("LOGEN")) {
            return "LOGEN";
        }
        if (upperCarrierName.contains("HANJIN") || normalizedCarrierName.contains("한진")) {
            return "HANJIN";
        }
        return null;
    }

    public static LocalDateTime resolveWaybillAssignedAt(OrderDto order) {
        if (order.getWaybillAssignedAt() != null) {
            return order.getWaybillAssignedAt();
        }
        if (order.getTrackingNo() == null) {
            return null;
        }
        if (order.getShippedAt() != null) {
            return order.getShippedAt();
        }
        return order.getOrderedAt();
    }

    public static LocalDateTime resolveInTransitAt(OrderDto order) {
        if (order.getInTransitAt() != null) {
            return order.getInTransitAt();
        }
        if ("SHIPPING".equals(order.getDeliveryStatus()) || "DELIVERED".equals(order.getDeliveryStatus())) {
            return order.getShippedAt();
        }
        return null;
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
