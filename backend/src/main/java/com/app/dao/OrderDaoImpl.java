package com.app.dao;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.mybatis.spring.SqlSessionTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import com.app.dto.DeliveryCommandDto;
import com.app.dto.OrderCreateCommandDto;
import com.app.dto.OrderItemCommandDto;
import com.app.dto.OrderDetailResponseDto;
import com.app.dto.OrderItemResponseDto;
import com.app.dto.OrderListResponseDto;
import com.app.dto.PaymentCommandDto;

@Repository
public class OrderDaoImpl implements OrderDao {

    private static final String NAMESPACE = "orderMapper.";

    @Autowired
    private SqlSessionTemplate sqlSessionTemplate;

    @Override
    public List<OrderListResponseDto> findMyOrders(Long userNo) {
        return sqlSessionTemplate.selectList(NAMESPACE + "selectMyOrders", userNo);
    }

    @Override
    public OrderDetailResponseDto findOrderDetail(Long userNo, Long orderNo) {
        Map<String, Object> params = new HashMap<>();
        params.put("userNo", userNo);
        params.put("orderNo", orderNo);
        return sqlSessionTemplate.selectOne(NAMESPACE + "selectOrderDetail", params);
    }

    @Override
    public List<OrderItemResponseDto> findOrderItems(Long orderNo) {
        return sqlSessionTemplate.selectList(NAMESPACE + "selectOrderItems", orderNo);
    }

    @Override
    public int countOrdersByOrderIdPrefix(String orderIdPrefix) {
        Integer count = sqlSessionTemplate.selectOne(NAMESPACE + "countOrdersByOrderIdPrefix", orderIdPrefix);
        return count == null ? 0 : count;
    }

    @Override
    public int insertOrder(OrderCreateCommandDto command) {
        return sqlSessionTemplate.insert(NAMESPACE + "insertOrder", command);
    }

    @Override
    public Long findOrderNoByOrderId(String orderId) {
        return sqlSessionTemplate.selectOne(NAMESPACE + "selectOrderNoByOrderId", orderId);
    }

    @Override
    public int insertOrderItem(OrderItemCommandDto command) {
        return sqlSessionTemplate.insert(NAMESPACE + "insertOrderItem", command);
    }

    @Override
    public int insertPayment(PaymentCommandDto command) {
        return sqlSessionTemplate.insert(NAMESPACE + "insertPayment", command);
    }

    @Override
    public int insertDelivery(DeliveryCommandDto command) {
        return sqlSessionTemplate.insert(NAMESPACE + "insertDelivery", command);
    }

    @Override
    public int updateOrderStatus(Long orderNo, String orderStatus) {
        Map<String, Object> params = new HashMap<>();
        params.put("orderNo", orderNo);
        params.put("orderStatus", orderStatus);
        return sqlSessionTemplate.update(NAMESPACE + "updateOrderStatus", params);
    }

    @Override
    public int updateDeliveryForShipping(Long orderNo, String trackingNo) {
        Map<String, Object> params = new HashMap<>();
        params.put("orderNo", orderNo);
        params.put("trackingNo", trackingNo);
        return sqlSessionTemplate.update(NAMESPACE + "updateDeliveryForShipping", params);
    }

    @Override
    public int updateDeliveryForDelivered(Long orderNo) {
        return sqlSessionTemplate.update(NAMESPACE + "updateDeliveryForDelivered", orderNo);
    }

    @Override
    public int decreaseProductStock(Long productNo, Integer quantity) {
        Map<String, Object> params = new HashMap<>();
        params.put("productNo", productNo);
        params.put("quantity", quantity);
        return sqlSessionTemplate.update(NAMESPACE + "decreaseProductStock", params);
    }
}
