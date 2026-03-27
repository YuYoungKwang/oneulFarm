package com.app.dao;

import java.util.List;

import com.app.dto.CartGroupDto;
import com.app.dto.CartItemDto;

public interface CartDao {

    Long findCartNoByUser(Long userNo);

    int insertCart(Long userNo);

    List<CartGroupDto> findCartGroups(Long userNo);

    List<CartItemDto> findCartItems(Long userNo);

    CartGroupDto findCartGroupByKey(Long cartNo, String groupKey);

    CartItemDto findCartGroupItem(Long cartGroupNo, Long productNo);

    CartItemDto findCartItemByNo(Long userNo, Long cartItemNo);

    Integer sumCartProductQuantity(Long userNo, Long productNo);

    int insertCartGroup(Long cartNo, String groupKey, String groupType, Long recipeNo, String groupName);

    int updateCartGroupName(Long cartGroupNo, String groupName);

    int touchCartGroup(Long cartGroupNo);

    int insertCartItem(Long cartNo, Long cartGroupNo, Long productNo, Integer quantity);

    int updateCartItemQuantity(Long cartItemNo, Integer quantity);

    int deleteCartItem(Long cartItemNo);

    int deleteCartGroupIfEmpty(Long cartGroupNo);

    int deleteAllCartItems(Long cartNo);

    int deleteAllCartGroups(Long cartNo);
}
