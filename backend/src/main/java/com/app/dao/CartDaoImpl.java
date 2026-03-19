package com.app.dao;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.mybatis.spring.SqlSessionTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import com.app.dto.CartItemDto;

@Repository
public class CartDaoImpl implements CartDao {

    private static final String NAMESPACE = "cartMapper.";

    @Autowired
    private SqlSessionTemplate sqlSessionTemplate;

    @Override
    public Long findCartNoByUser(Long userNo) {
        return sqlSessionTemplate.selectOne(NAMESPACE + "selectCartNoByUser", userNo);
    }

    @Override
    public int insertCart(Long userNo) {
        return sqlSessionTemplate.insert(NAMESPACE + "insertCart", userNo);
    }

    @Override
    public List<CartItemDto> findCartItems(Long userNo) {
        return sqlSessionTemplate.selectList(NAMESPACE + "selectCartItems", userNo);
    }

    @Override
    public CartItemDto findCartItem(Long userNo, Long productNo) {
        Map<String, Object> params = new HashMap<>();
        params.put("userNo", userNo);
        params.put("productNo", productNo);
        return sqlSessionTemplate.selectOne(NAMESPACE + "selectCartItem", params);
    }

    @Override
    public int insertCartItem(Long cartNo, Long productNo, Integer quantity) {
        Map<String, Object> params = new HashMap<>();
        params.put("cartNo", cartNo);
        params.put("productNo", productNo);
        params.put("quantity", quantity);
        return sqlSessionTemplate.insert(NAMESPACE + "insertCartItem", params);
    }

    @Override
    public int updateCartItemQuantity(Long cartNo, Long productNo, Integer quantity) {
        Map<String, Object> params = new HashMap<>();
        params.put("cartNo", cartNo);
        params.put("productNo", productNo);
        params.put("quantity", quantity);
        return sqlSessionTemplate.update(NAMESPACE + "updateCartItemQuantity", params);
    }

    @Override
    public int deleteCartItem(Long cartNo, Long productNo) {
        Map<String, Object> params = new HashMap<>();
        params.put("cartNo", cartNo);
        params.put("productNo", productNo);
        return sqlSessionTemplate.delete(NAMESPACE + "deleteCartItem", params);
    }

    @Override
    public int deleteAllCartItems(Long cartNo) {
        return sqlSessionTemplate.delete(NAMESPACE + "deleteAllCartItems", cartNo);
    }
}
