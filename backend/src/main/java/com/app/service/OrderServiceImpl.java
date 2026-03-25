package com.app.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.app.common.OrderCompatibilityUtils;
import com.app.common.OrderWorkflowRuntimeStore;
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

    @Autowired
    private OrderWorkflowRuntimeStore orderWorkflowRuntimeStore;

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
            hydrateOrderRuntimeState(response);
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
        hydrateOrderRuntimeState(response);
        return response;
    }

    @Override
    public OrderDto getMyOrderTracking(Long userNo, Long orderNo) {
        OrderDto response = getMyOrderDetail(userNo, orderNo);
        response.setItems(null);
        return response;
    }

    @Override
    @Transactional
    public OrderDto createOrder(Long userNo, OrderDto request) {
        validateCreateOrderRequest(request);

        String requestedOrderId = trimToNull(request.getOrderId());
        if (requestedOrderId != null) {
            Long existingOrderNo = orderDao.findOrderNoByOrderId(requestedOrderId);
            if (existingOrderNo != null) {
                return getMyOrderDetail(userNo, existingOrderNo);
            }
        }

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

        String orderId = requestedOrderId != null ? requestedOrderId : generateUniqueOrderId();

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

    @Override
    @Transactional
    public OrderDto requestCancel(Long userNo, Long orderNo) {
        OrderDto currentOrder = getMyOrderDetail(userNo, orderNo);
        if (!Boolean.TRUE.equals(currentOrder.getCancelRequestAvailable())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cancel request is not available for this order.");
        }

        orderWorkflowRuntimeStore.markCancelRequested(orderNo);
        return getMyOrderDetail(userNo, orderNo);
    }

    @Override
    @Transactional
    public OrderDto confirmPurchase(Long userNo, Long orderNo) {
        OrderDto currentOrder = getMyOrderDetail(userNo, orderNo);
        if (!Boolean.TRUE.equals(currentOrder.getPurchaseConfirmAvailable())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Purchase confirmation is not available for this order.");
        }

        orderWorkflowRuntimeStore.markPurchaseConfirmed(orderNo);
        return getMyOrderDetail(userNo, orderNo);
    }

    private boolean isReviewWritable(String deliveryStatus, Long reviewNo) {
        return "DELIVERED".equals(deliveryStatus) && reviewNo == null;
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

    private void hydrateOrderRuntimeState(OrderDto order) {
        orderWorkflowRuntimeStore.apply(order);
        OrderCompatibilityUtils.hydrateOrderCompatibility(order);
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

    private String generateUniqueOrderId() {
        for (int attempt = 0; attempt < 10; attempt++) {
            String candidate = buildOrderIdCandidate();
            if (orderDao.findOrderNoByOrderId(candidate) == null) {
                return candidate;
            }
        }

        throw new ResponseStatusException(
            HttpStatus.INTERNAL_SERVER_ERROR,
            "Failed to generate unique order id."
        );
    }

    private String buildOrderIdCandidate() {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmssSSS"));
        int randomSuffix = ThreadLocalRandom.current().nextInt(1000, 10000);
        return "OFT-" + timestamp + "-" + randomSuffix;
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
