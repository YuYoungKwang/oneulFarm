package com.app.dao;

import java.util.List;

import com.app.dto.CartItemDto;

public interface CartDao {

    Long findCartNoByUser(Long userNo);

    int insertCart(Long userNo);

    List<CartItemDto> findCartItems(Long userNo);

    CartItemDto findCartItem(Long userNo, Long productNo);

    int insertCartItem(Long cartNo, Long productNo, Integer quantity);

    int updateCartItemQuantity(Long cartNo, Long productNo, Integer quantity);

    int deleteCartItem(Long cartNo, Long productNo);

    int deleteAllCartItems(Long cartNo);
}
