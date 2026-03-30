package com.app.service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;

import com.app.common.OrderCompatibilityUtils;
import com.app.dao.AdminDao;
import com.app.dao.OrderDao;
import com.app.dto.OrderDto;

@Service
public class OrderFulfillmentSimulationService {

    private static final long WAYBILL_DELAY_SECONDS = 5L;
    private static final long PICKUP_DELAY_SECONDS = 10L;
    private static final long TRANSIT_DELAY_SECONDS = 15L;
    private static final long DELIVER_DELAY_SECONDS = 20L;

    @Autowired
    private OrderDao orderDao;

    @Autowired
    private AdminDao adminDao;

    public void advanceEligibleOrders() {
        List<OrderDto> targets;
        try {
            targets = orderDao.findFulfillmentSimulationTargets();
        } catch (DataAccessException exception) {
            return;
        }
        LocalDateTime now = LocalDateTime.now();

        for (OrderDto target : targets) {
            try {
                advanceSingleOrder(target, now);
            } catch (RuntimeException ignored) {
                // 시연용 자동 전환이 일부 주문에서 실패해도 전체 조회는 계속 진행한다.
            }
        }
    }

    private void advanceSingleOrder(OrderDto order, LocalDateTime now) {
        if (order == null || order.getFulfillmentStartedAt() == null) {
            return;
        }

        long elapsedSeconds = Duration.between(order.getFulfillmentStartedAt(), now).getSeconds();
        if (elapsedSeconds < WAYBILL_DELAY_SECONDS) {
            return;
        }

        String courierName = trimToNull(order.getCourierName());
        if (courierName == null) {
            courierName = "oneulFarm";
        }

        String trackingNo = trimToNull(order.getTrackingNo());
        if (trackingNo == null) {
            trackingNo = buildDemoTrackingNo(order);
        }

        if (elapsedSeconds >= WAYBILL_DELAY_SECONDS && order.getWaybillAssignedAt() == null) {
            adminDao.updateAdminDeliveryTracking(order.getOrderNo(), trackingNo, courierName);
            orderDao.insertOrderStatusHistory(
                order.getOrderNo(),
                order.getOrderStatus(),
                order.getOrderStatus(),
                "SYSTEM",
                null,
                "시연 자동 배송이 송장을 등록했습니다."
            );
            orderDao.insertDeliveryTrackingHistory(
                order.getOrderNo(),
                resolveCarrierCode(order, courierName),
                trackingNo,
                "WAYBILL_ASSIGNED",
                "시연용 자동 배송이 송장을 발급했습니다.",
                getOriginLocationName(),
                getOriginLocationAddress(),
                null
            );
            order.setTrackingNo(trackingNo);
            order.setCourierName(courierName);
            order.setWaybillAssignedAt(now);
        }

        if (elapsedSeconds >= PICKUP_DELAY_SECONDS && order.getPickedUpAt() == null) {
            adminDao.updateAdminDeliveryForPickup(order.getOrderNo(), trackingNo, courierName);
            orderDao.insertOrderStatusHistory(
                order.getOrderNo(),
                order.getOrderStatus(),
                order.getOrderStatus(),
                "SYSTEM",
                null,
                "시연 자동 배송이 집하 완료 처리했습니다."
            );
            orderDao.insertDeliveryTrackingHistory(
                order.getOrderNo(),
                resolveCarrierCode(order, courierName),
                trackingNo,
                "PICKED_UP",
                "오늘팜 물류센터에서 상품을 집하했습니다.",
                getOriginLocationName(),
                getOriginLocationAddress(),
                null
            );
            order.setTrackingNo(trackingNo);
            order.setCourierName(courierName);
            order.setPickedUpAt(now);
            order.setDeliveryStatus("PICKED_UP");
        }

        if (elapsedSeconds >= TRANSIT_DELAY_SECONDS && order.getInTransitAt() == null) {
            String prevOrderStatus = order.getOrderStatus();
            adminDao.updateAdminOrderStatus(order.getOrderNo(), "SHIPPING");
            adminDao.updateAdminDeliveryForShipping(order.getOrderNo(), trackingNo, courierName);
            orderDao.insertOrderStatusHistory(
                order.getOrderNo(),
                prevOrderStatus,
                "SHIPPING",
                "SYSTEM",
                null,
                "시연 자동 배송이 배송 중으로 전환했습니다."
            );
            orderDao.insertDeliveryTrackingHistory(
                order.getOrderNo(),
                resolveCarrierCode(order, courierName),
                trackingNo,
                "IN_TRANSIT",
                "택배사 허브터미널을 출발해 고객 배송지로 이동 중입니다.",
                getHubLocationName(courierName),
                getHubLocationAddress(courierName),
                null
            );
            order.setTrackingNo(trackingNo);
            order.setCourierName(courierName);
            order.setOrderStatus("SHIPPING");
            order.setInTransitAt(now);
            order.setDeliveryStatus("IN_TRANSIT");
        }

        if (elapsedSeconds >= DELIVER_DELAY_SECONDS && order.getDeliveredAt() == null) {
            String prevOrderStatus = order.getOrderStatus();
            adminDao.updateAdminOrderStatus(order.getOrderNo(), "COMPLETED");
            adminDao.updateAdminDeliveryForDelivered(order.getOrderNo());
            orderDao.insertOrderStatusHistory(
                order.getOrderNo(),
                prevOrderStatus,
                "COMPLETED",
                "SYSTEM",
                null,
                "시연 자동 배송이 배송 완료 처리했습니다."
            );
            orderDao.insertDeliveryTrackingHistory(
                order.getOrderNo(),
                resolveCarrierCode(order, courierName),
                trackingNo,
                "DELIVERED",
                "고객 배송지에 상품을 전달했습니다.",
                getDestinationLocationName(order),
                getDestinationLocationAddress(order),
                null
            );
        }
    }

    private String resolveCarrierCode(OrderDto order, String courierName) {
        String carrierCode = trimToNull(order.getCarrierCode());
        if (carrierCode != null) {
            return carrierCode;
        }
        return OrderCompatibilityUtils.resolveCarrierCode(courierName);
    }

    private String buildDemoTrackingNo(OrderDto order) {
        String safeOrderId = trimToNull(order.getOrderId());
        if (safeOrderId == null) {
            return "DEMO-" + order.getOrderNo();
        }
        String normalized = safeOrderId.replaceAll("[^A-Za-z0-9]", "").toUpperCase();
        if (normalized.length() > 10) {
            normalized = normalized.substring(normalized.length() - 10);
        }
        return "DEMO-" + normalized;
    }

    private String getOriginLocationName() {
        return "오늘팜 성남 물류센터";
    }

    private String getOriginLocationAddress() {
        return "경기도 성남시 수정구 창업로 42 오늘팜 물류센터";
    }

    private String getHubLocationName(String courierName) {
        String carrierCode = OrderCompatibilityUtils.resolveCarrierCode(courierName);
        if ("CJ".equalsIgnoreCase(carrierCode)) {
            return "CJ 동남권 허브터미널";
        }
        if ("LOGEN".equalsIgnoreCase(carrierCode)) {
            return "로젠 중부권 허브터미널";
        }
        if ("HANJIN".equalsIgnoreCase(carrierCode)) {
            return "한진 수도권 허브터미널";
        }
        return "택배사 중간 허브터미널";
    }

    private String getHubLocationAddress(String courierName) {
        String carrierCode = OrderCompatibilityUtils.resolveCarrierCode(courierName);
        if ("CJ".equalsIgnoreCase(carrierCode)) {
            return "경기도 용인시 처인구 백암면 죽양대로 798";
        }
        if ("LOGEN".equalsIgnoreCase(carrierCode)) {
            return "충청북도 청주시 흥덕구 옥산면 중부로 230";
        }
        if ("HANJIN".equalsIgnoreCase(carrierCode)) {
            return "경기도 군포시 번영로 82 한진택배 허브";
        }
        return "경기도 용인시 처인구 백암면 죽양대로 798";
    }

    private String getDestinationLocationName(OrderDto order) {
        String recipientName = trimToNull(order.getRecipientName());
        if (recipientName == null) {
            return "고객 배송지";
        }
        return recipientName + " 님 배송지";
    }

    private String getDestinationLocationAddress(OrderDto order) {
        String address = trimToNull(order.getAddress1());
        String detailAddress = trimToNull(order.getAddress2());
        if (address == null) {
            return "고객 배송지";
        }
        if (detailAddress == null) {
            return address;
        }
        return address + " " + detailAddress;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
