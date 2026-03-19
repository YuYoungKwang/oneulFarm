package com.app.service;

import com.app.dto.CartDto;

public interface CartService {

    CartDto getMyCart(Long userNo);

    CartDto addCartItem(Long userNo, Long productNo, Integer quantity);

    CartDto updateCartItem(Long userNo, Long productNo, Integer quantity);

    CartDto removeCartItem(Long userNo, Long productNo);

    CartDto clearCart(Long userNo);
}
