package com.app.service;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.app.dao.CartDao;
import com.app.dao.ProductDao;
import com.app.dto.CartDto;
import com.app.dto.CartItemDto;
import com.app.dto.ProductDto;

@Service
public class CartServiceImpl implements CartService {

    @Autowired
    private CartDao cartDao;

    @Autowired
    private ProductDao productDao;

    @Override
    public CartDto getMyCart(Long userNo) {
        Long cartNo = getOrCreateCartNo(userNo);
        return buildCartResponse(cartNo, userNo);
    }

    @Override
    public CartDto addCartItem(Long userNo, Long productNo, Integer quantity) {
        int safeQuantity = quantity == null ? 1 : quantity;
        if (safeQuantity < 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Quantity must be at least 1.");
        }

        ProductDto product = requireProduct(productNo);
        CartItemDto existingItem = cartDao.findCartItem(userNo, productNo);
        Long cartNo = getOrCreateCartNo(userNo);
        int nextQuantity = safeQuantity;

        if (existingItem != null) {
            nextQuantity = existingItem.getQuantity() + safeQuantity;
        }

        validateStock(product, nextQuantity);

        if (existingItem == null) {
            cartDao.insertCartItem(cartNo, productNo, safeQuantity);
        } else {
            cartDao.updateCartItemQuantity(cartNo, productNo, nextQuantity);
        }

        return buildCartResponse(cartNo, userNo);
    }

    @Override
    public CartDto updateCartItem(Long userNo, Long productNo, Integer quantity) {
        Long cartNo = getOrCreateCartNo(userNo);
        if (quantity == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Quantity is required.");
        }

        if (quantity <= 0) {
            cartDao.deleteCartItem(cartNo, productNo);
            return buildCartResponse(cartNo, userNo);
        }

        ProductDto product = requireProduct(productNo);
        validateStock(product, quantity);
        cartDao.updateCartItemQuantity(cartNo, productNo, quantity);
        return buildCartResponse(cartNo, userNo);
    }

    @Override
    public CartDto removeCartItem(Long userNo, Long productNo) {
        Long cartNo = getOrCreateCartNo(userNo);
        cartDao.deleteCartItem(cartNo, productNo);
        return buildCartResponse(cartNo, userNo);
    }

    @Override
    public CartDto clearCart(Long userNo) {
        Long cartNo = getOrCreateCartNo(userNo);
        cartDao.deleteAllCartItems(cartNo);
        return buildCartResponse(cartNo, userNo);
    }

    private Long getOrCreateCartNo(Long userNo) {
        Long cartNo = cartDao.findCartNoByUser(userNo);
        if (cartNo != null) {
            return cartNo;
        }

        cartDao.insertCart(userNo);
        Long createdCartNo = cartDao.findCartNoByUser(userNo);
        if (createdCartNo == null) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to initialize cart.");
        }
        return createdCartNo;
    }

    private ProductDto requireProduct(Long productNo) {
        ProductDto product = productDao.findProduct(productNo);
        if (product == null || !"SELLING".equals(product.getSaleStatus())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Product is not available.");
        }
        return product;
    }

    private void validateStock(ProductDto product, int quantity) {
        long stockQty = product.getStockQty() == null ? 0L : product.getStockQty();
        if (quantity > stockQty) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Not enough stock.");
        }
    }

    private CartDto buildCartResponse(Long cartNo, Long userNo) {
        List<CartItemDto> items = cartDao.findCartItems(userNo);

        int totalQuantity = 0;
        BigDecimal totalAmount = BigDecimal.ZERO;
        for (CartItemDto item : items) {
            int quantity = item.getQuantity() == null ? 0 : item.getQuantity();
            totalQuantity += quantity;
            totalAmount = totalAmount.add(
                safe(item.getSalePrice()).multiply(BigDecimal.valueOf(quantity))
            );
        }

        CartDto response = new CartDto();
        response.setCartNo(cartNo);
        response.setItems(items);
        response.setTotalQuantity(totalQuantity);
        response.setTotalAmount(totalAmount);
        return response;
    }

    private BigDecimal safe(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}
