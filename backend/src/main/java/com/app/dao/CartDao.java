package com.app.dao;

import java.util.List;

import com.app.dto.CartItemDto;

public interface CartDao {

    Long findCartNoByUser(Long userNo);

    int insertCart(Long userNo);

    List<CartItemDto> findCartItems(Long userNo);

    CartItemDto findCartItem(Long cartNo, Long cartGroupNo, Long productNo);

    Long findCartGroupNo(Long cartNo, String groupKey);

    int insertCartGroup(Long cartNo, String groupKey, String groupType, Long recipeNo, String groupName);

    int insertCartItem(Long cartNo, Long cartGroupNo, Long productNo, Integer quantity);

    int updateCartItemQuantity(Long cartNo, Long cartItemNo, Integer quantity);

    int deleteCartItem(Long cartNo, Long cartItemNo);

    int deleteCartItemsByGroup(Long cartNo, Long cartGroupNo);

    int deleteCartGroup(Long cartNo, Long cartGroupNo);

    int deleteAllCartItems(Long cartNo);

    int deleteAllCartGroups(Long cartNo);

    int deleteEmptyCartGroups(Long cartNo);
}
