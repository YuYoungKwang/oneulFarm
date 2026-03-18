package com.app.dao;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.mybatis.spring.SqlSessionTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import com.app.dto.OrderDetailInfoDto;
import com.app.dto.OrderItemDetailDto;
import com.app.dto.OrderListItemDto;

@Repository
public class OrderDaoImpl implements OrderDao {

    private static final String NAMESPACE = "orderMapper.";

    @Autowired
    private SqlSessionTemplate sqlSessionTemplate;

    @Override
    public List<OrderListItemDto> findMyOrders(Long userNo) {
        return sqlSessionTemplate.selectList(NAMESPACE + "selectMyOrders", userNo);
    }

    @Override
    public OrderDetailInfoDto findOrderDetailInfo(Long userNo, Long orderNo) {
        Map<String, Object> paramMap = new HashMap<>();
        paramMap.put("userNo", userNo);
        paramMap.put("orderNo", orderNo);
        return sqlSessionTemplate.selectOne(NAMESPACE + "selectOrderDetailInfo", paramMap);
    }

    @Override
    public List<OrderItemDetailDto> findOrderItems(Long orderNo) {
        return sqlSessionTemplate.selectList(NAMESPACE + "selectOrderItems", orderNo);
    }
}
