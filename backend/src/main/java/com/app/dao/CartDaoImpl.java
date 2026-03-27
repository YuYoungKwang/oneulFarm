package com.app.dao;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.mybatis.spring.SqlSessionTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import com.app.dto.CartGroupDto;
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
    public List<CartGroupDto> findCartGroups(Long userNo) {
        return sqlSessionTemplate.selectList(NAMESPACE + "selectCartGroups", userNo);
    }

    @Override
    public CartGroupDto findCartGroupByKey(Long cartNo, String groupKey) {
        Map<String, Object> params = new HashMap<>();
        params.put("cartNo", cartNo);
        params.put("groupKey", groupKey);
        return sqlSessionTemplate.selectOne(NAMESPACE + "selectCartGroupByKey", params);
    }

    @Override
    public CartItemDto findCartGroupItem(Long cartGroupNo, Long productNo) {
        Map<String, Object> params = new HashMap<>();
        params.put("cartGroupNo", cartGroupNo);
        params.put("productNo", productNo);
        return sqlSessionTemplate.selectOne(NAMESPACE + "selectCartGroupItem", params);
    }

    @Override
    public CartItemDto findCartItemByNo(Long userNo, Long cartItemNo) {
        Map<String, Object> params = new HashMap<>();
        params.put("userNo", userNo);
        params.put("cartItemNo", cartItemNo);
        return sqlSessionTemplate.selectOne(NAMESPACE + "selectCartItemByNo", params);
    }

    @Override
    public Integer sumCartProductQuantity(Long userNo, Long productNo) {
        Map<String, Object> params = new HashMap<>();
        params.put("userNo", userNo);
        params.put("productNo", productNo);
        return sqlSessionTemplate.selectOne(NAMESPACE + "sumCartProductQuantity", params);
    }

    @Override
    public int insertCartGroup(Long cartNo, String groupKey, String groupType, Long recipeNo, String groupName) {
        Map<String, Object> params = new HashMap<>();
        params.put("cartNo", cartNo);
        params.put("groupKey", groupKey);
        params.put("groupType", groupType);
        params.put("recipeNo", recipeNo);
        params.put("groupName", groupName);
        return sqlSessionTemplate.insert(NAMESPACE + "insertCartGroup", params);
    }

    @Override
    public int updateCartGroupName(Long cartGroupNo, String groupName) {
        Map<String, Object> params = new HashMap<>();
        params.put("cartGroupNo", cartGroupNo);
        params.put("groupName", groupName);
        return sqlSessionTemplate.update(NAMESPACE + "updateCartGroupName", params);
    }

    @Override
    public int touchCartGroup(Long cartGroupNo) {
        return sqlSessionTemplate.update(NAMESPACE + "touchCartGroup", cartGroupNo);
    }

    @Override
    public int insertCartItem(Long cartNo, Long cartGroupNo, Long productNo, Integer quantity) {
        Map<String, Object> params = new HashMap<>();
        params.put("cartNo", cartNo);
        params.put("cartGroupNo", cartGroupNo);
        params.put("productNo", productNo);
        params.put("quantity", quantity);
        return sqlSessionTemplate.insert(NAMESPACE + "insertCartItem", params);
    }

    @Override
    public int updateCartItemQuantity(Long cartItemNo, Integer quantity) {
        Map<String, Object> params = new HashMap<>();
        params.put("cartItemNo", cartItemNo);
        params.put("quantity", quantity);
        return sqlSessionTemplate.update(NAMESPACE + "updateCartItemQuantity", params);
    }

    @Override
    public int deleteCartItem(Long cartItemNo) {
        return sqlSessionTemplate.delete(NAMESPACE + "deleteCartItem", cartItemNo);
    }

    @Override
    public int deleteCartGroupIfEmpty(Long cartGroupNo) {
        return sqlSessionTemplate.delete(NAMESPACE + "deleteCartGroupIfEmpty", cartGroupNo);
    }

    @Override
    public int deleteAllCartItems(Long cartNo) {
        return sqlSessionTemplate.delete(NAMESPACE + "deleteAllCartItems", cartNo);
    }

    @Override
    public int deleteAllCartGroups(Long cartNo) {
        return sqlSessionTemplate.delete(NAMESPACE + "deleteAllCartGroups", cartNo);
    }
}
