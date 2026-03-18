package com.app.service;

import com.app.dto.CartResponseDto;

public interface CartService {

    CartResponseDto getMyCart(Long userNo);

    CartResponseDto addCartItem(Long userNo, Long productNo, Integer quantity);

    CartResponseDto updateCartItem(Long userNo, Long productNo, Integer quantity);

    CartResponseDto removeCartItem(Long userNo, Long productNo);

    CartResponseDto clearCart(Long userNo);
}
