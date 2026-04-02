package com.app.dao;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.sql.DataSource;

import org.mybatis.spring.SqlSessionTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import com.app.dto.CartItemDto;

@Repository
public class CartDaoImpl implements CartDao {

    private static final String NAMESPACE = "cartMapper.";

    @Autowired
    private SqlSessionTemplate sqlSessionTemplate;

    @Autowired
    private DataSource dataSource;

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
    public CartItemDto findCartItem(Long cartNo, Long cartGroupNo, Long productNo) {
        Map<String, Object> params = new HashMap<>();
        params.put("cartNo", cartNo);
        params.put("cartGroupNo", cartGroupNo);
        params.put("productNo", productNo);
        return sqlSessionTemplate.selectOne(NAMESPACE + "selectCartItem", params);
    }

    @Override
    public Long findCartGroupNo(Long cartNo, String groupKey) {
        List<Long> cartGroupNoList = jdbcTemplate().query(
            "SELECT CART_GROUP_NO FROM OFT_CART_GROUP WHERE CART_NO = ? AND GROUP_KEY = ? FETCH FIRST 1 ROWS ONLY",
            (resultSet, rowNum) -> Long.valueOf(resultSet.getLong(1)),
            cartNo,
            groupKey
        );
        return cartGroupNoList.isEmpty() ? null : cartGroupNoList.get(0);
    }

    @Override
    public int insertCartGroup(Long cartNo, String groupKey, String groupType, Long recipeNo, String groupName) {
        return jdbcTemplate().update(
            "INSERT INTO OFT_CART_GROUP (CART_NO, GROUP_KEY, GROUP_TYPE, RECIPE_NO, GROUP_NAME) VALUES (?, ?, ?, ?, ?)",
            cartNo,
            groupKey,
            groupType,
            recipeNo,
            groupName
        );
    }

    @Override
    public int insertCartItem(Long cartNo, Long cartGroupNo, Long productNo, Integer quantity) {
        return jdbcTemplate().update(
            "INSERT INTO OFT_CART_ITEM (CART_NO, CART_GROUP_NO, PRODUCT_NO, QUANTITY) VALUES (?, ?, ?, ?)",
            cartNo,
            cartGroupNo,
            productNo,
            quantity
        );
    }

    @Override
    public int updateCartItemQuantity(Long cartNo, Long cartItemNo, Integer quantity) {
        Map<String, Object> params = new HashMap<>();
        params.put("cartNo", cartNo);
        params.put("cartItemNo", cartItemNo);
        params.put("quantity", quantity);
        return sqlSessionTemplate.update(NAMESPACE + "updateCartItemQuantity", params);
    }

    @Override
    public int deleteCartItem(Long cartNo, Long cartItemNo) {
        Map<String, Object> params = new HashMap<>();
        params.put("cartNo", cartNo);
        params.put("cartItemNo", cartItemNo);
        return sqlSessionTemplate.delete(NAMESPACE + "deleteCartItem", params);
    }

    @Override
    public int deleteCartItemsByGroup(Long cartNo, Long cartGroupNo) {
        return jdbcTemplate().update(
            "DELETE FROM OFT_CART_ITEM WHERE CART_NO = ? AND CART_GROUP_NO = ?",
            cartNo,
            cartGroupNo
        );
    }

    @Override
    public int deleteCartGroup(Long cartNo, Long cartGroupNo) {
        return jdbcTemplate().update(
            "DELETE FROM OFT_CART_GROUP WHERE CART_NO = ? AND CART_GROUP_NO = ?",
            cartNo,
            cartGroupNo
        );
    }

    @Override
    public int deleteAllCartItems(Long cartNo) {
        return sqlSessionTemplate.delete(NAMESPACE + "deleteAllCartItems", cartNo);
    }

    @Override
    public int deleteAllCartGroups(Long cartNo) {
        return jdbcTemplate().update(
            "DELETE FROM OFT_CART_GROUP WHERE CART_NO = ?",
            cartNo
        );
    }

    @Override
    public int deleteEmptyCartGroups(Long cartNo) {
        return jdbcTemplate().update(
            "DELETE FROM OFT_CART_GROUP cg WHERE cg.CART_NO = ? AND NOT EXISTS (" +
                "SELECT 1 FROM OFT_CART_ITEM ci WHERE ci.CART_GROUP_NO = cg.CART_GROUP_NO" +
            ")",
            cartNo
        );
    }

    private JdbcTemplate jdbcTemplate() {
        return new JdbcTemplate(dataSource);
    }
}
