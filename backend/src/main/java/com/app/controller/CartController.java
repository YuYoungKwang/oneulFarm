package com.app.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.app.common.ApiResponse;
import com.app.dto.CartResponseDto;
import com.app.dto.CreateCartItemRequestDto;
import com.app.dto.UpdateCartItemRequestDto;
import com.app.service.CartService;

@RestController
@RequestMapping(value = "/api/cart", produces = MediaType.APPLICATION_JSON_VALUE)
public class CartController {

    @Autowired
    private CartService cartService;

    @GetMapping("/me")
    public ApiResponse<CartResponseDto> getMyCart(
        @RequestHeader("X-USER-NO") Long userNo
    ) {
        return ApiResponse.success(cartService.getMyCart(userNo), "Cart loaded.");
    }

    @PostMapping(value = "/me/items", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ApiResponse<CartResponseDto> addCartItem(
        @RequestHeader("X-USER-NO") Long userNo,
        @RequestBody CreateCartItemRequestDto request
    ) {
        return ApiResponse.success(
            cartService.addCartItem(userNo, request.getProductNo(), request.getQuantity()),
            "Cart item added."
        );
    }

    @PatchMapping(value = "/me/items/{productNo}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ApiResponse<CartResponseDto> updateCartItem(
        @RequestHeader("X-USER-NO") Long userNo,
        @PathVariable Long productNo,
        @RequestBody UpdateCartItemRequestDto request
    ) {
        return ApiResponse.success(
            cartService.updateCartItem(userNo, productNo, request.getQuantity()),
            "Cart updated."
        );
    }

    @DeleteMapping("/me/items/{productNo}")
    public ApiResponse<CartResponseDto> removeCartItem(
        @RequestHeader("X-USER-NO") Long userNo,
        @PathVariable Long productNo
    ) {
        return ApiResponse.success(cartService.removeCartItem(userNo, productNo), "Cart item removed.");
    }

    @DeleteMapping("/me/items")
    public ApiResponse<CartResponseDto> clearCart(
        @RequestHeader("X-USER-NO") Long userNo
    ) {
        return ApiResponse.success(cartService.clearCart(userNo), "Cart cleared.");
    }
}
