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
        order.setTrackingAvailable(order.getTrackingNo() != null || normalizedDeliveryStatus != null);

        if ("CANCELED".equals(legacyOrderStatus)) {
            order.setLegacyStatusNeedsReview(Boolean.TRUE);
            order.setCancelStatus(null);
        } else if (order.getCancelStatus() == null) {
            order.setLegacyStatusNeedsReview(Boolean.FALSE);
            order.setCancelStatus("NONE");
        }

        if (order.getPurchaseConfirmStatus() == null
            && "DELIVERED".equals(normalizedDeliveryStatus)
            && !"CANCEL_ACCEPTED".equals(order.getCancelStatus())) {
            order.setPurchaseConfirmStatus("PURCHASE_PENDING");
        }

        order.setCancelRequestAvailable(isCancelRequestAvailable(order.getNormalizedOrderStatus(), normalizedDeliveryStatus, order.getCancelStatus()));
        order.setPurchaseConfirmAvailable(isPurchaseConfirmAvailable(normalizedDeliveryStatus, order.getPurchaseConfirmStatus(), order.getCancelStatus()));
        order.setRejectAvailable(isRejectAvailable(legacyOrderStatus, normalizedDeliveryStatus, order.getTrackingNo(), order.getCancelStatus()));
        order.setCancelAcceptAvailable(isCancelAcceptAvailable(order.getCancelStatus(), normalizedDeliveryStatus));
        order.setCancelRejectAvailable(isCancelRejectAvailable(order.getCancelStatus(), normalizedDeliveryStatus));
        order.setShipAvailable(isShipAvailable(legacyOrderStatus, normalizedDeliveryStatus, order.getCancelStatus()));
        order.setDeliverAvailable(isDeliverAvailable(legacyOrderStatus, normalizedDeliveryStatus, order.getCancelStatus()));
        order.setWaybillAssignable(isWaybillAssignable(normalizedDeliveryStatus, order.getTrackingNo(), order.getCancelStatus()));
        order.setPickupAvailable(isPickupAvailable(normalizedDeliveryStatus, order.getTrackingNo(), order.getCancelStatus()));
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

    public static boolean isCancelRequestAvailable(String normalizedOrderStatus, String normalizedDeliveryStatus, String cancelStatus) {
        if (!"NONE".equals(cancelStatus)) {
            return false;
        }
        if (!"PAYMENT_COMPLETED".equals(normalizedOrderStatus) && !"ORDER_ACCEPTED".equals(normalizedOrderStatus)) {
            return false;
        }
        return normalizedDeliveryStatus == null
            || "NOT_STARTED".equals(normalizedDeliveryStatus);
    }

    public static boolean isPurchaseConfirmAvailable(String normalizedDeliveryStatus, String purchaseConfirmStatus, String cancelStatus) {
        if ("CANCEL_REQUESTED".equals(cancelStatus) || "CANCEL_ACCEPTED".equals(cancelStatus)) {
            return false;
        }
        return "DELIVERED".equals(normalizedDeliveryStatus)
            && !"PURCHASE_CONFIRMED".equals(purchaseConfirmStatus);
    }

    public static boolean isRejectAvailable(String legacyOrderStatus, String normalizedDeliveryStatus, String trackingNo, String cancelStatus) {
        if (!"NONE".equals(cancelStatus) && !"CANCEL_REJECTED".equals(cancelStatus)) {
            return false;
        }
        if (!"CREATED".equals(legacyOrderStatus) && !"PAID".equals(legacyOrderStatus)) {
            return false;
        }
        if (trackingNo != null) {
            return false;
        }
        return normalizedDeliveryStatus == null || "NOT_STARTED".equals(normalizedDeliveryStatus);
    }

    public static boolean isCancelAcceptAvailable(String cancelStatus, String normalizedDeliveryStatus) {
        if (!"CANCEL_REQUESTED".equals(cancelStatus)) {
            return false;
        }
        return normalizedDeliveryStatus == null
            || "NOT_STARTED".equals(normalizedDeliveryStatus)
            || "WAYBILL_ASSIGNED".equals(normalizedDeliveryStatus);
    }

    public static boolean isCancelRejectAvailable(String cancelStatus, String normalizedDeliveryStatus) {
        if (!"CANCEL_REQUESTED".equals(cancelStatus)) {
            return false;
        }
        return normalizedDeliveryStatus == null
            || "NOT_STARTED".equals(normalizedDeliveryStatus)
            || "WAYBILL_ASSIGNED".equals(normalizedDeliveryStatus);
    }

    public static boolean isShipAvailable(String legacyOrderStatus, String normalizedDeliveryStatus, String cancelStatus) {
        if ("CANCEL_REQUESTED".equals(cancelStatus) || "CANCEL_ACCEPTED".equals(cancelStatus)) {
            return false;
        }
        if (!"CREATED".equals(legacyOrderStatus) && !"PAID".equals(legacyOrderStatus)) {
            return false;
        }
        return normalizedDeliveryStatus == null || "NOT_STARTED".equals(normalizedDeliveryStatus);
    }

    public static boolean isDeliverAvailable(String legacyOrderStatus, String normalizedDeliveryStatus, String cancelStatus) {
        if ("CANCEL_REQUESTED".equals(cancelStatus) || "CANCEL_ACCEPTED".equals(cancelStatus)) {
            return false;
        }
        return "SHIPPING".equals(legacyOrderStatus) || "IN_TRANSIT".equals(normalizedDeliveryStatus);
    }

    public static boolean isWaybillAssignable(String normalizedDeliveryStatus, String trackingNo, String cancelStatus) {
        if ("CANCEL_REQUESTED".equals(cancelStatus) || "CANCEL_ACCEPTED".equals(cancelStatus)) {
            return false;
        }
        return trackingNo == null
            && (normalizedDeliveryStatus == null || "NOT_STARTED".equals(normalizedDeliveryStatus));
    }

    public static boolean isPickupAvailable(String normalizedDeliveryStatus, String trackingNo, String cancelStatus) {
        if ("CANCEL_REQUESTED".equals(cancelStatus) || "CANCEL_ACCEPTED".equals(cancelStatus)) {
            return false;
        }
        return trackingNo != null && "WAYBILL_ASSIGNED".equals(normalizedDeliveryStatus);
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
