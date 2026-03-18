package com.app.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.app.dao.CartDao;
import com.app.dao.OrderDao;
import com.app.dto.CartProductItemDto;
import com.app.dto.CreateOrderRequestDto;
import com.app.dto.DeliveryCommandDto;
import com.app.dto.OrderCreateCommandDto;
import com.app.dto.OrderDetailResponseDto;
import com.app.dto.OrderItemCommandDto;
import com.app.dto.OrderItemResponseDto;
import com.app.dto.OrderListResponseDto;
import com.app.dto.PaymentCommandDto;

@Service
public class OrderServiceImpl implements OrderService {

    @Autowired
    private OrderDao orderDao;

    @Autowired
    private CartDao cartDao;

    @Override
    public List<OrderListResponseDto> getMyOrders(Long userNo) {
        List<OrderListResponseDto> responses = orderDao.findMyOrders(userNo);

        for (OrderListResponseDto response : responses) {
            response.setFinalAmount(defaultAmount(response.getFinalAmount()));
            response.setTotalSavedAmount(defaultAmount(response.getTotalSavedAmount()));
        }

        return responses;
    }

    @Override
    public OrderDetailResponseDto getMyOrderDetail(Long userNo, Long orderNo) {
        OrderDetailResponseDto response = orderDao.findOrderDetail(userNo, orderNo);
        if (response == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found.");
        }

        List<OrderItemResponseDto> itemResponses = orderDao.findOrderItems(orderNo);

        for (OrderItemResponseDto itemResponse : itemResponses) {
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
        return response;
    }

    @Override
    @Transactional
    public OrderDetailResponseDto createOrder(Long userNo, CreateOrderRequestDto request) {
        validateCreateOrderRequest(request);

        List<CartProductItemDto> cartItems = cartDao.findCartProducts(userNo);
        if (cartItems.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cart is empty.");
        }

        BigDecimal totalAmount = BigDecimal.ZERO;
        for (CartProductItemDto cartItem : cartItems) {
            validateCartItem(cartItem);
            BigDecimal lineAmount = defaultAmount(cartItem.getSalePrice())
                .multiply(BigDecimal.valueOf(cartItem.getQuantity()));
            totalAmount = totalAmount.add(lineAmount);
        }

        String orderId = trimToNull(request.getOrderId());
        if (orderId == null) {
            orderId = buildOrderId();
        }

        OrderCreateCommandDto orderCommand = new OrderCreateCommandDto();
        orderCommand.setUserNo(userNo);
        orderCommand.setOrderId(orderId);
        orderCommand.setOrderStatus("PAID");
        orderCommand.setTotalAmount(totalAmount);
        orderCommand.setDiscountAmount(BigDecimal.ZERO);
        orderCommand.setDeliveryFee(BigDecimal.ZERO);
        orderCommand.setFinalAmount(totalAmount);
        orderCommand.setRecipientName(request.getRecipientName().trim());
        orderCommand.setRecipientPhone(request.getRecipientPhone().trim());
        orderCommand.setZipCode(request.getZipCode().trim());
        orderCommand.setAddress1(request.getAddress1().trim());
        orderCommand.setAddress2(trimToNull(request.getAddress2()));
        orderDao.insertOrder(orderCommand);

        Long orderNo = orderDao.findOrderNoByOrderId(orderId);
        if (orderNo == null) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to create order.");
        }

        for (CartProductItemDto cartItem : cartItems) {
            OrderItemCommandDto itemCommand = new OrderItemCommandDto();
            itemCommand.setOrderNo(orderNo);
            itemCommand.setProductNo(cartItem.getProductNo());
            itemCommand.setProductName(cartItem.getProductName());
            itemCommand.setUnitPrice(defaultAmount(cartItem.getSalePrice()));
            itemCommand.setQuantity(cartItem.getQuantity());
            itemCommand.setSubtotal(
                defaultAmount(cartItem.getSalePrice()).multiply(BigDecimal.valueOf(cartItem.getQuantity()))
            );
            itemCommand.setMarketAvgPrice(defaultAmount(cartItem.getAvgPrice()));
            itemCommand.setSavedAmount(defaultAmount(cartItem.getSavedAmount()));
            itemCommand.setSavingRate(defaultAmount(cartItem.getSavingRate()));
            orderDao.insertOrderItem(itemCommand);
            orderDao.decreaseProductStock(cartItem.getProductNo(), cartItem.getQuantity());
        }

        PaymentCommandDto paymentCommand = new PaymentCommandDto();
        paymentCommand.setOrderNo(orderNo);
        paymentCommand.setPaymentMethod(request.getPaymentMethod().trim());
        paymentCommand.setPaymentStatus("SUCCESS");
        paymentCommand.setPaymentKey(resolvePaymentKey(request.getPaymentKey(), orderId));
        paymentCommand.setPaidAmount(totalAmount);
        paymentCommand.setPaidAt(LocalDateTime.now());
        orderDao.insertPayment(paymentCommand);

        DeliveryCommandDto deliveryCommand = new DeliveryCommandDto();
        deliveryCommand.setOrderNo(orderNo);
        deliveryCommand.setCourierName("oneulFarm");
        deliveryCommand.setTrackingNo(null);
        deliveryCommand.setDeliveryStatus("READY");
        orderDao.insertDelivery(deliveryCommand);

        Long cartNo = cartDao.findCartNoByUser(userNo);
        if (cartNo != null) {
            cartDao.deleteAllCartItems(cartNo);
        }

        return getMyOrderDetail(userNo, orderNo);
    }

    @Override
    @Transactional
    public OrderDetailResponseDto advanceOrderStatus(Long userNo, Long orderNo) {
        OrderDetailResponseDto currentOrder = getMyOrderDetail(userNo, orderNo);
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

    private BigDecimal defaultAmount(BigDecimal amount) {
        return amount == null ? BigDecimal.ZERO : amount;
    }

    private BigDecimal sumTotalSavedAmount(List<OrderItemResponseDto> items) {
        BigDecimal totalSavedAmount = BigDecimal.ZERO;
        for (OrderItemResponseDto item : items) {
            totalSavedAmount = totalSavedAmount.add(defaultAmount(item.getSavedAmount()));
        }
        return totalSavedAmount;
    }

    private void validateCreateOrderRequest(CreateOrderRequestDto request) {
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

    private void validateCartItem(CartProductItemDto cartItem) {
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
}
