package com.app.service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.app.dao.OrderDao;
import com.app.dto.OrderAmountSummaryDto;
import com.app.dto.OrderDeliveryInfoDto;
import com.app.dto.OrderDetailInfoDto;
import com.app.dto.OrderDetailResponseDto;
import com.app.dto.OrderInfoDto;
import com.app.dto.OrderItemDetailDto;
import com.app.dto.OrderItemResponseDto;
import com.app.dto.OrderListItemDto;
import com.app.dto.OrderListResponseDto;
import com.app.dto.OrderPaymentInfoDto;

@Service
public class OrderServiceImpl implements OrderService {

    @Autowired
    private OrderDao orderDao;

    @Override
    public List<OrderListResponseDto> getMyOrders(Long userNo) {
        List<OrderListItemDto> orderItems = orderDao.findMyOrders(userNo);
        List<OrderListResponseDto> responses = new ArrayList<>();

        for (OrderListItemDto item : orderItems) {
            OrderListResponseDto response = new OrderListResponseDto();
            response.setOrderNo(item.getOrderNo());
            response.setOrderId(item.getOrderId());
            response.setOrderedAt(item.getOrderedAt());
            response.setOrderStatus(item.getOrderStatus());
            response.setDeliveryStatus(item.getDeliveryStatus());
            response.setDisplayProductName(buildDisplayProductName(item.getFirstProductName(), item.getItemCount()));
            response.setItemCount(item.getItemCount());
            response.setFinalAmount(defaultAmount(item.getFinalAmount()));
            response.setTotalSavedAmount(defaultAmount(item.getTotalSavedAmount()));
            responses.add(response);
        }

        return responses;
    }

    @Override
    public OrderDetailResponseDto getMyOrderDetail(Long userNo, Long orderNo) {
        OrderDetailInfoDto orderDetailInfo = orderDao.findOrderDetailInfo(userNo, orderNo);
        if (orderDetailInfo == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "주문 정보를 찾을 수 없습니다.");
        }

        List<OrderItemDetailDto> rawItems = orderDao.findOrderItems(orderNo);
        List<OrderItemResponseDto> itemResponses = new ArrayList<>();

        for (OrderItemDetailDto rawItem : rawItems) {
            OrderItemResponseDto itemResponse = new OrderItemResponseDto();
            itemResponse.setOrderItemNo(rawItem.getOrderItemNo());
            itemResponse.setProductNo(rawItem.getProductNo());
            itemResponse.setProductName(rawItem.getProductName());
            itemResponse.setUnitPrice(defaultAmount(rawItem.getUnitPrice()));
            itemResponse.setQuantity(rawItem.getQuantity());
            itemResponse.setSubtotal(defaultAmount(rawItem.getSubtotal()));
            itemResponse.setMarketAvgPrice(defaultAmount(rawItem.getMarketAvgPrice()));
            itemResponse.setSavedAmount(defaultAmount(rawItem.getSavedAmount()));
            itemResponse.setSavingRate(defaultAmount(rawItem.getSavingRate()));
            itemResponse.setReviewNo(rawItem.getReviewNo());
            itemResponse.setReviewExists(rawItem.getReviewNo() != null);
            itemResponse.setReviewWritable(isReviewWritable(orderDetailInfo.getDeliveryStatus(), rawItem.getReviewNo()));
            itemResponses.add(itemResponse);
        }

        OrderDetailResponseDto response = new OrderDetailResponseDto();
        response.setOrderInfo(buildOrderInfo(orderDetailInfo));
        response.setDeliveryInfo(buildDeliveryInfo(orderDetailInfo));
        response.setPaymentInfo(buildPaymentInfo(orderDetailInfo));
        response.setAmountSummary(buildAmountSummary(orderDetailInfo, rawItems));
        response.setItems(itemResponses);
        return response;
    }

    private String buildDisplayProductName(String firstProductName, Long itemCount) {
        long safeItemCount = itemCount == null ? 0L : itemCount;
        if (safeItemCount <= 1) {
            return firstProductName;
        }
        return firstProductName + " 외 " + (safeItemCount - 1) + "건";
    }

    private boolean isReviewWritable(String deliveryStatus, Long reviewNo) {
        return "DELIVERED".equals(deliveryStatus) && reviewNo == null;
    }

    private BigDecimal defaultAmount(BigDecimal amount) {
        return amount == null ? BigDecimal.ZERO : amount;
    }

    private OrderInfoDto buildOrderInfo(OrderDetailInfoDto raw) {
        OrderInfoDto orderInfo = new OrderInfoDto();
        orderInfo.setOrderNo(raw.getOrderNo());
        orderInfo.setOrderId(raw.getOrderId());
        orderInfo.setOrderedAt(raw.getOrderedAt());
        orderInfo.setOrderStatus(raw.getOrderStatus());
        return orderInfo;
    }

    private OrderDeliveryInfoDto buildDeliveryInfo(OrderDetailInfoDto raw) {
        OrderDeliveryInfoDto deliveryInfo = new OrderDeliveryInfoDto();
        deliveryInfo.setRecipientName(raw.getRecipientName());
        deliveryInfo.setRecipientPhone(raw.getRecipientPhone());
        deliveryInfo.setZipCode(raw.getZipCode());
        deliveryInfo.setAddress1(raw.getAddress1());
        deliveryInfo.setAddress2(raw.getAddress2());
        deliveryInfo.setDeliveryStatus(raw.getDeliveryStatus());
        deliveryInfo.setCourierName(raw.getCourierName());
        deliveryInfo.setTrackingNo(raw.getTrackingNo());
        deliveryInfo.setDeliveredAt(raw.getDeliveredAt());
        return deliveryInfo;
    }

    private OrderPaymentInfoDto buildPaymentInfo(OrderDetailInfoDto raw) {
        OrderPaymentInfoDto paymentInfo = new OrderPaymentInfoDto();
        paymentInfo.setPaymentMethod(raw.getPaymentMethod());
        paymentInfo.setPaymentStatus(raw.getPaymentStatus());
        paymentInfo.setPaidAt(raw.getPaidAt());
        paymentInfo.setPaidAmount(defaultAmount(raw.getPaidAmount()));
        return paymentInfo;
    }

    private OrderAmountSummaryDto buildAmountSummary(OrderDetailInfoDto raw, List<OrderItemDetailDto> items) {
        OrderAmountSummaryDto amountSummary = new OrderAmountSummaryDto();
        amountSummary.setTotalAmount(defaultAmount(raw.getTotalAmount()));
        amountSummary.setDiscountAmount(defaultAmount(raw.getDiscountAmount()));
        amountSummary.setDeliveryFee(defaultAmount(raw.getDeliveryFee()));
        amountSummary.setFinalAmount(defaultAmount(raw.getFinalAmount()));
        amountSummary.setTotalSavedAmount(sumTotalSavedAmount(items));
        return amountSummary;
    }

    private BigDecimal sumTotalSavedAmount(List<OrderItemDetailDto> items) {
        BigDecimal totalSavedAmount = BigDecimal.ZERO;
        for (OrderItemDetailDto item : items) {
            totalSavedAmount = totalSavedAmount.add(defaultAmount(item.getSavedAmount()));
        }
        return totalSavedAmount;
    }
}
