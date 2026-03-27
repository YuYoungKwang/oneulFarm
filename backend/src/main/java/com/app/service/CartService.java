package com.app.service;

import com.app.dto.CartDto;
import com.app.dto.CartGroupRequestDto;

public interface CartService {

    CartDto getMyCart(Long userNo);

    CartDto addCartItem(Long userNo, Long productNo, Integer quantity);

    CartDto addRecipeCartGroup(Long userNo, CartGroupRequestDto request);

    CartDto updateCartItem(Long userNo, Long cartItemNo, Integer quantity);

    CartDto removeCartItem(Long userNo, Long cartItemNo);

    CartDto clearCart(Long userNo);
}
