package com.app.dao;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.mybatis.spring.SqlSessionTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import com.app.dto.DeliveryDto;
import com.app.dto.OrderDto;
import com.app.dto.OrderItemDto;
import com.app.dto.PaymentDto;

@Repository
public class OrderDaoImpl implements OrderDao {

    private static final String NAMESPACE = "orderMapper.";

    @Autowired
    private SqlSessionTemplate sqlSessionTemplate;

    @Override
    public List<OrderDto> findMyOrders(Long userNo) {
        return sqlSessionTemplate.selectList(NAMESPACE + "selectMyOrders", userNo);
    }

    @Override
    public List<OrderDto> findMyOrders(Map<String, Object> params) {
        return sqlSessionTemplate.selectList(NAMESPACE + "selectMyOrders", params);
    }

    @Override
    public OrderDto findOrderDetail(Long userNo, Long orderNo) {
        Map<String, Object> params = new HashMap<>();
        params.put("userNo", userNo);
        params.put("orderNo", orderNo);
        return sqlSessionTemplate.selectOne(NAMESPACE + "selectOrderDetail", params);
    }

    @Override
    public List<OrderItemDto> findOrderItems(Long orderNo) {
        return sqlSessionTemplate.selectList(NAMESPACE + "selectOrderItems", orderNo);
    }

    @Override
    public int countOrdersByOrderIdPrefix(String orderIdPrefix) {
        Integer count = sqlSessionTemplate.selectOne(NAMESPACE + "countOrdersByOrderIdPrefix", orderIdPrefix);
        return count == null ? 0 : count;
    }

    @Override
    public int insertOrder(OrderDto order) {
        return sqlSessionTemplate.insert(NAMESPACE + "insertOrder", order);
    }

    @Override
    public Long findOrderNoByOrderId(String orderId) {
        return sqlSessionTemplate.selectOne(NAMESPACE + "selectOrderNoByOrderId", orderId);
    }

    @Override
    public int insertOrderItem(OrderItemDto item) {
        return sqlSessionTemplate.insert(NAMESPACE + "insertOrderItem", item);
    }

    @Override
    public int insertPayment(PaymentDto payment) {
        return sqlSessionTemplate.insert(NAMESPACE + "insertPayment", payment);
    }

    @Override
    public int insertDelivery(DeliveryDto delivery) {
        return sqlSessionTemplate.insert(NAMESPACE + "insertDelivery", delivery);
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
