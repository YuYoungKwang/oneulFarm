package com.app.common;

import java.time.LocalDateTime;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

import org.springframework.stereotype.Component;

import com.app.dto.OrderDto;

@Component
public class OrderWorkflowRuntimeStore {

    private final ConcurrentMap<Long, RuntimeState> stateMap = new ConcurrentHashMap<>();

    public void apply(OrderDto order) {
        if (order == null || order.getOrderNo() == null) {
            return;
        }

        RuntimeState runtimeState = stateMap.get(order.getOrderNo());
        if (runtimeState != null) {
            if (runtimeState.cancelStatus != null) {
                order.setCancelStatus(runtimeState.cancelStatus);
            }
            if (runtimeState.purchaseConfirmStatus != null) {
                order.setPurchaseConfirmStatus(runtimeState.purchaseConfirmStatus);
            }
            if (runtimeState.purchaseConfirmedAt != null) {
                order.setPurchaseConfirmedAt(runtimeState.purchaseConfirmedAt);
            }
        }

        applyAutoPurchaseConfirmation(order);
    }

    public void markCancelRequested(Long orderNo) {
        if (orderNo == null) {
            return;
        }

        stateMap.compute(orderNo, (key, current) -> {
            RuntimeState next = current == null ? new RuntimeState() : current;
            next.cancelStatus = "CANCEL_REQUESTED";
            return next;
        });
    }

    public void markPurchaseConfirmed(Long orderNo) {
        if (orderNo == null) {
            return;
        }

        stateMap.compute(orderNo, (key, current) -> {
            RuntimeState next = current == null ? new RuntimeState() : current;
            next.purchaseConfirmStatus = "PURCHASE_CONFIRMED";
            next.purchaseConfirmedAt = LocalDateTime.now();
            return next;
        });
    }

    private void applyAutoPurchaseConfirmation(OrderDto order) {
        if (order.getDeliveredAt() == null) {
            return;
        }

        if ("PURCHASE_CONFIRMED".equals(order.getPurchaseConfirmStatus())
            && order.getPurchaseConfirmedAt() != null) {
            return;
        }

        LocalDateTime autoConfirmedAt = order.getDeliveredAt().plusDays(7);
        if (!autoConfirmedAt.isAfter(LocalDateTime.now())) {
            order.setPurchaseConfirmStatus("PURCHASE_CONFIRMED");
            if (order.getPurchaseConfirmedAt() == null) {
                order.setPurchaseConfirmedAt(autoConfirmedAt);
            }
        }
    }

    private static final class RuntimeState {
        private String cancelStatus;
        private String purchaseConfirmStatus;
        private LocalDateTime purchaseConfirmedAt;
    }
}
