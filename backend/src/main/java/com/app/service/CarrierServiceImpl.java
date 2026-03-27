package com.app.service;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.app.common.OrderCompatibilityUtils;
import com.app.common.OrderWorkflowRuntimeStore;
import com.app.dao.AdminDao;
import com.app.dao.OrderDao;
import com.app.dto.OrderDto;
import com.app.dto.OrderItemDto;

@Service
public class CarrierServiceImpl implements CarrierService {

    @Autowired
    private AdminDao adminDao;

    @Autowired
    private OrderDao orderDao;

    @Autowired
    private OrderWorkflowRuntimeStore orderWorkflowRuntimeStore;

    @Override
    public List<OrderDto> getOrders() {
        orderDao.autoConfirmEligiblePurchases();
        List<OrderDto> orders = adminDao.findAdminOrders();
        for (OrderDto order : orders) {
            hydrateOrderSummary(order);
        }
        return orders;
    }

    @Override
    public OrderDto getOrderDetail(Long orderNo) {
        orderDao.autoConfirmEligiblePurchases();
        OrderDto order = adminDao.findAdminOrderDetail(orderNo);
        if (order == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Carrier order not found.");
        }

        List<OrderItemDto> items = orderDao.findOrderItems(orderNo);
        BigDecimal totalSavedAmount = BigDecimal.ZERO;
        for (OrderItemDto item : items) {
            item.setUnitPrice(defaultAmount(item.getUnitPrice()));
            item.setSubtotal(defaultAmount(item.getSubtotal()));
            item.setMarketAvgPrice(defaultAmount(item.getMarketAvgPrice()));
            item.setSavedAmount(defaultAmount(item.getSavedAmount()));
            item.setSavingRate(defaultAmount(item.getSavingRate()));
            totalSavedAmount = totalSavedAmount.add(defaultAmount(item.getSavedAmount()));
        }

        order.setItems(items);
        order.setTotalAmount(defaultAmount(order.getTotalAmount()));
        order.setDiscountAmount(defaultAmount(order.getDiscountAmount()));
        order.setDeliveryFee(defaultAmount(order.getDeliveryFee()));
        order.setFinalAmount(defaultAmount(order.getFinalAmount()));
        order.setPaidAmount(defaultAmount(order.getPaidAmount()));
        order.setTotalSavedAmount(totalSavedAmount);
        hydrateOrderRuntimeState(order);
        order.setTrackingHistories(orderDao.findDeliveryTrackingHistories(orderNo));
        order.setOrderStatusHistories(orderDao.findOrderStatusHistories(orderNo));
        return order;
    }

    @Override
    @Transactional
    public OrderDto assignWaybill(Long orderNo, OrderDto request) {
        OrderDto currentOrder = getOrderDetail(orderNo);
        if (!Boolean.TRUE.equals(currentOrder.getWaybillAssignable())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Waybill cannot be assigned in the current state.");
        }

        String trackingNo = trimToNull(request == null ? null : request.getTrackingNo());
        String courierName = trimToNull(request == null ? null : request.getCourierName());
        if (courierName == null) {
            courierName = "oneulFarm";
        }
        if (trackingNo == null) {
            trackingNo = "TRK-" + currentOrder.getOrderId();
        }

        adminDao.updateAdminDeliveryTracking(orderNo, trackingNo, courierName);
        orderDao.insertOrderStatusHistory(
            orderNo,
            currentOrder.getOrderStatus(),
            currentOrder.getOrderStatus(),
            "CARRIER",
            null,
            "배송사가 송장번호를 등록했습니다."
        );
        orderDao.insertDeliveryTrackingHistory(
            orderNo,
            OrderCompatibilityUtils.resolveCarrierCode(courierName),
            trackingNo,
            "WAYBILL_ASSIGNED",
            "송장번호를 발급하고 배송 접수를 준비했습니다.",
            null
        );
        return getOrderDetail(orderNo);
    }

    @Override
    @Transactional
    public OrderDto pickupOrder(Long orderNo, OrderDto request) {
        OrderDto currentOrder = getOrderDetail(orderNo);
        if (!Boolean.TRUE.equals(currentOrder.getPickupAvailable())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Order cannot be picked up in the current state.");
        }

        String trackingNo = trimToNull(request == null ? null : request.getTrackingNo());
        String courierName = trimToNull(request == null ? null : request.getCourierName());
        if (courierName == null) {
            courierName = currentOrder.getCourierName() == null ? "oneulFarm" : currentOrder.getCourierName();
        }
        String resolvedTrackingNo = trackingNo == null
            ? currentOrder.getTrackingNo()
            : trackingNo;
        if (resolvedTrackingNo == null) {
            resolvedTrackingNo = "TRK-" + currentOrder.getOrderId();
        }

        adminDao.updateAdminDeliveryForPickup(orderNo, resolvedTrackingNo, courierName);
        orderDao.insertOrderStatusHistory(
            orderNo,
            currentOrder.getOrderStatus(),
            currentOrder.getOrderStatus(),
            "CARRIER",
            null,
            "배송사가 집하 완료 처리했습니다."
        );
        orderDao.insertDeliveryTrackingHistory(
            orderNo,
            OrderCompatibilityUtils.resolveCarrierCode(courierName),
            resolvedTrackingNo,
            "PICKED_UP",
            "집하를 완료하고 배송 허브로 이동 중입니다.",
            null
        );
        return getOrderDetail(orderNo);
    }

    @Override
    @Transactional
    public OrderDto transitOrder(Long orderNo) {
        OrderDto currentOrder = getOrderDetail(orderNo);
        if (!Boolean.TRUE.equals(currentOrder.getTransitAvailable())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Order cannot be moved to in transit in the current state.");
        }

        String courierName = currentOrder.getCourierName() == null ? "oneulFarm" : currentOrder.getCourierName();
        String trackingNo = currentOrder.getTrackingNo();
        if (trackingNo == null) {
            trackingNo = "TRK-" + currentOrder.getOrderId();
        }

        adminDao.updateAdminOrderStatus(orderNo, "SHIPPING");
        adminDao.updateAdminDeliveryForShipping(orderNo, trackingNo, courierName);
        orderDao.insertOrderStatusHistory(orderNo, currentOrder.getOrderStatus(), "SHIPPING", "CARRIER", null, "배송사가 배송 중 처리했습니다.");
        orderDao.insertDeliveryTrackingHistory(
            orderNo,
            currentOrder.getCarrierCode(),
            trackingNo,
            "IN_TRANSIT",
            "고객 배송지로 이동 중입니다.",
            null
        );
        return getOrderDetail(orderNo);
    }

    @Override
    @Transactional
    public OrderDto deliverOrder(Long orderNo) {
        OrderDto currentOrder = getOrderDetail(orderNo);
        if (!Boolean.TRUE.equals(currentOrder.getDeliverAvailable())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Order cannot be marked delivered in the current state.");
        }

        adminDao.updateAdminOrderStatus(orderNo, "COMPLETED");
        adminDao.updateAdminDeliveryForDelivered(orderNo);
        orderDao.insertOrderStatusHistory(orderNo, currentOrder.getOrderStatus(), "COMPLETED", "CARRIER", null, "배송사가 배송 완료 처리했습니다.");
        orderDao.insertDeliveryTrackingHistory(
            orderNo,
            currentOrder.getCarrierCode(),
            currentOrder.getTrackingNo(),
            "DELIVERED",
            "배송이 완료되었습니다.",
            null
        );
        return getOrderDetail(orderNo);
    }

    private void hydrateOrderSummary(OrderDto order) {
        order.setFinalAmount(defaultAmount(order.getFinalAmount()));
        order.setTotalSavedAmount(defaultAmount(order.getTotalSavedAmount()));
        order.setPaidAmount(defaultAmount(order.getPaidAmount()));
        hydrateOrderRuntimeState(order);
    }

    private void hydrateOrderRuntimeState(OrderDto order) {
        orderWorkflowRuntimeStore.apply(order);
        OrderCompatibilityUtils.hydrateOrderCompatibility(order);
    }

    private BigDecimal defaultAmount(BigDecimal amount) {
        return amount == null ? BigDecimal.ZERO : amount;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }

        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
