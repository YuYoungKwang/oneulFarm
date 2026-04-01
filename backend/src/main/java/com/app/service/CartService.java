package com.app.service;

import com.app.dto.CartDto;

import com.app.dto.CartItemDto;

public interface CartService {

    CartDto getMyCart(Long userNo);

    CartDto addCartItem(Long userNo, CartItemDto requestDto);

    CartDto updateCartItem(Long userNo, Long cartItemNo, Integer quantity);

    CartDto removeCartItem(Long userNo, Long cartItemNo);

    CartDto clearCart(Long userNo);
}
