package com.app.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.app.dao.CartDao;
import com.app.dao.OrderDao;
import com.app.dto.CartItemDto;
import com.app.dto.DeliveryDto;
import com.app.dto.OrderDto;
import com.app.dto.OrderItemDto;
import com.app.dto.PaymentDto;

@Service
public class OrderServiceImpl implements OrderService {

    @Autowired
    private OrderDao orderDao;

    @Autowired
    private CartDao cartDao;

    @Override
    public List<OrderDto> getMyOrders(Long userNo) {
        return getMyOrders(userNo, null, null, null);
    }

    @Override
    public List<OrderDto> getMyOrders(Long userNo, String deliveryStatus, String dateFrom, String dateTo) {
        Map<String, Object> params = buildOrderFilterParams(userNo, deliveryStatus, dateFrom, dateTo);
        List<OrderDto> responses = orderDao.findMyOrders(params);

        for (OrderDto response : responses) {
            response.setFinalAmount(defaultAmount(response.getFinalAmount()));
            response.setTotalSavedAmount(defaultAmount(response.getTotalSavedAmount()));
            response.setPreviewImageNos(orderDao.findOrderPreviewImageNos(response.getOrderNo()));
            hydrateOrderCompatibility(response);
        }

        return responses;
    }

    @Override
    public OrderDto getMyOrderDetail(Long userNo, Long orderNo) {
        OrderDto response = orderDao.findOrderDetail(userNo, orderNo);
        if (response == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found.");
        }

        List<OrderItemDto> itemResponses = orderDao.findOrderItems(orderNo);

        for (OrderItemDto itemResponse : itemResponses) {
            itemResponse.setUnitPrice(defaultAmount(itemResponse.getUnitPrice()));
            itemResponse.setSubtotal(defaultAmount(itemResponse.getSubtotal()));
            itemResponse.setMarketAvgPrice(defaultAmount(itemResponse.getMarketAvgPrice()));
            itemResponse.setSavedAmount(defaultAmount(itemResponse.getSavedAmount()));
            itemResponse.setSavingRate(defaultAmount(itemResponse.getSavingRate()));
            itemResponse.setReviewExists(itemResponse.getReviewNo() != null);
            itemResponse.setReviewWritable(isReviewWritable(response.getDeliveryStatus(), itemResponse.getReviewNo()));
        }

        response.setPaidAmount(defaultAmount(response.getPaidAmount()));
        response.setTotalAmount(defaultAmount(response.getTotalAmount()));
        response.setDiscountAmount(defaultAmount(response.getDiscountAmount()));
        response.setDeliveryFee(defaultAmount(response.getDeliveryFee()));
        response.setFinalAmount(defaultAmount(response.getFinalAmount()));
        response.setTotalSavedAmount(sumTotalSavedAmount(itemResponses));
        response.setItems(itemResponses);
        hydrateOrderCompatibility(response);
        return response;
    }

    @Override
    @Transactional
    public OrderDto createOrder(Long userNo, OrderDto request) {
        validateCreateOrderRequest(request);

        List<CartItemDto> cartItems = cartDao.findCartItems(userNo);
        if (cartItems.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cart is empty.");
        }

        BigDecimal totalAmount = BigDecimal.ZERO;
        for (CartItemDto cartItem : cartItems) {
            validateCartItem(cartItem);
            BigDecimal lineAmount = defaultAmount(cartItem.getSalePrice())
                .multiply(BigDecimal.valueOf(cartItem.getQuantity()));
            totalAmount = totalAmount.add(lineAmount);
        }

        String orderId = trimToNull(request.getOrderId());
        if (orderId == null) {
            orderId = buildOrderId();
        }

        OrderDto order = new OrderDto();
        order.setUserNo(userNo);
        order.setOrderId(orderId);
        order.setOrderStatus("PAID");
        order.setTotalAmount(totalAmount);
        order.setDiscountAmount(BigDecimal.ZERO);
        order.setDeliveryFee(BigDecimal.ZERO);
        order.setFinalAmount(totalAmount);
        order.setRecipientName(request.getRecipientName().trim());
        order.setRecipientPhone(request.getRecipientPhone().trim());
        order.setZipCode(request.getZipCode().trim());
        order.setAddress1(request.getAddress1().trim());
        order.setAddress2(trimToNull(request.getAddress2()));
        orderDao.insertOrder(order);

        Long orderNo = orderDao.findOrderNoByOrderId(orderId);
        if (orderNo == null) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to create order.");
        }

        for (CartItemDto cartItem : cartItems) {
            OrderItemDto item = new OrderItemDto();
            item.setOrderNo(orderNo);
            item.setProductNo(cartItem.getProductNo());
            item.setProductName(cartItem.getProductName());
            item.setUnitPrice(defaultAmount(cartItem.getSalePrice()));
            item.setQuantity(cartItem.getQuantity());
            item.setSubtotal(
                defaultAmount(cartItem.getSalePrice()).multiply(BigDecimal.valueOf(cartItem.getQuantity()))
            );
            item.setMarketAvgPrice(defaultAmount(cartItem.getAvgPrice()));
            item.setSavedAmount(defaultAmount(cartItem.getSavedAmount()));
            item.setSavingRate(defaultAmount(cartItem.getSavingRate()));
            orderDao.insertOrderItem(item);
            orderDao.decreaseProductStock(cartItem.getProductNo(), cartItem.getQuantity());
        }

        PaymentDto payment = new PaymentDto();
        payment.setOrderNo(orderNo);
        payment.setPaymentMethod(request.getPaymentMethod().trim());
        payment.setPaymentStatus("SUCCESS");
        payment.setPaymentKey(resolvePaymentKey(request.getPaymentKey(), orderId));
        payment.setPaidAmount(totalAmount);
        payment.setPaidAt(LocalDateTime.now());
        orderDao.insertPayment(payment);

        DeliveryDto delivery = new DeliveryDto();
        delivery.setOrderNo(orderNo);
        delivery.setCourierName("oneulFarm");
        delivery.setTrackingNo(null);
        delivery.setDeliveryStatus("READY");
        orderDao.insertDelivery(delivery);

        Long cartNo = cartDao.findCartNoByUser(userNo);
        if (cartNo != null) {
            cartDao.deleteAllCartItems(cartNo);
        }

        return getMyOrderDetail(userNo, orderNo);
    }

    @Override
    @Transactional
    public OrderDto advanceOrderStatus(Long userNo, Long orderNo) {
        OrderDto currentOrder = getMyOrderDetail(userNo, orderNo);
        String currentStatus = currentOrder.getOrderStatus();

        if ("PAID".equals(currentStatus)) {
            orderDao.updateOrderStatus(orderNo, "SHIPPING");
            orderDao.updateDeliveryForShipping(orderNo, "TRK-" + currentOrder.getOrderId());
            return getMyOrderDetail(userNo, orderNo);
        }

        if ("SHIPPING".equals(currentStatus)) {
            orderDao.updateOrderStatus(orderNo, "COMPLETED");
            orderDao.updateDeliveryForDelivered(orderNo);
            return getMyOrderDetail(userNo, orderNo);
        }

        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Order status cannot be advanced.");
    }

    private boolean isReviewWritable(String deliveryStatus, Long reviewNo) {
        return "DELIVERED".equals(deliveryStatus) && reviewNo == null;
    }

    private void hydrateOrderCompatibility(OrderDto order) {
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

    private String resolveNormalizedOrderStatus(String legacyOrderStatus) {
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

    private String resolveNormalizedDeliveryStatus(String legacyDeliveryStatus, String trackingNo) {
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

    private String resolveCarrierCode(String carrierName) {
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

    private LocalDateTime resolveWaybillAssignedAt(OrderDto order) {
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

    private LocalDateTime resolveInTransitAt(OrderDto order) {
        if (order.getInTransitAt() != null) {
            return order.getInTransitAt();
        }
        if ("SHIPPING".equals(order.getDeliveryStatus()) || "DELIVERED".equals(order.getDeliveryStatus())) {
            return order.getShippedAt();
        }
        return null;
    }

    private BigDecimal defaultAmount(BigDecimal amount) {
        return amount == null ? BigDecimal.ZERO : amount;
    }

    private BigDecimal sumTotalSavedAmount(List<OrderItemDto> items) {
        BigDecimal totalSavedAmount = BigDecimal.ZERO;
        for (OrderItemDto item : items) {
            totalSavedAmount = totalSavedAmount.add(defaultAmount(item.getSavedAmount()));
        }
        return totalSavedAmount;
    }

    private void validateCreateOrderRequest(OrderDto request) {
        if (request == null
            || isBlank(request.getRecipientName())
            || isBlank(request.getRecipientPhone())
            || isBlank(request.getZipCode())
            || isBlank(request.getAddress1())
            || isBlank(request.getPaymentMethod())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Required order fields are missing.");
        }

        if (!"CARD".equals(request.getPaymentMethod())
            && !"BANK".equals(request.getPaymentMethod())
            && !"EASY_PAY".equals(request.getPaymentMethod())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported payment method.");
        }
    }

    private void validateCartItem(CartItemDto cartItem) {
        if (!"SELLING".equals(cartItem.getSaleStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Product is not available for order.");
        }

        long stockQty = cartItem.getStockQty() == null ? 0L : cartItem.getStockQty();
        int quantity = cartItem.getQuantity() == null ? 0 : cartItem.getQuantity();
        if (quantity < 1 || quantity > stockQty) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cart contains invalid quantity.");
        }
    }

    private String buildOrderId() {
        String dateKey = LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE);
        int nextSequence = orderDao.countOrdersByOrderIdPrefix("OFT-" + dateKey + "-") + 1;
        return "OFT-" + dateKey + "-" + String.format("%03d", nextSequence);
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private String resolvePaymentKey(String paymentKey, String orderId) {
        String resolvedPaymentKey = trimToNull(paymentKey);
        return resolvedPaymentKey == null ? "PAY-" + orderId : resolvedPaymentKey;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }

        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private Map<String, Object> buildOrderFilterParams(Long userNo, String deliveryStatus, String dateFrom, String dateTo) {
        Map<String, Object> params = new HashMap<>();
        params.put("userNo", userNo);

        String normalizedStatus = trimToNull(deliveryStatus);
        if (normalizedStatus != null && !"ALL".equalsIgnoreCase(normalizedStatus)) {
            params.put("deliveryStatus", normalizedStatus);
        }

        LocalDate fromDate = parseDate(dateFrom, "시작일 형식이 올바르지 않습니다.");
        LocalDate toDate = parseDate(dateTo, "종료일 형식이 올바르지 않습니다.");

        if (fromDate != null && toDate != null && fromDate.isAfter(toDate)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "시작일은 종료일보다 늦을 수 없습니다.");
        }

        if (fromDate != null) {
            params.put("dateFrom", fromDate.atStartOfDay());
        }

        if (toDate != null) {
            params.put("dateTo", toDate.plusDays(1).atStartOfDay());
        }

        return params;
    }

    private LocalDate parseDate(String value, String errorMessage) {
        String normalized = trimToNull(value);
        if (normalized == null) {
            return null;
        }

        try {
            return LocalDate.parse(normalized);
        } catch (Exception exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, errorMessage);
        }
    }
}
