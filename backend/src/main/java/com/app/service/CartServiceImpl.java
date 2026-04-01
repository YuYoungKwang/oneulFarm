package com.app.service;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.dao.DataIntegrityViolationException;
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
    public CartDto addCartItem(Long userNo, CartItemDto requestDto) {
        Long productNo = requestDto == null ? null : requestDto.getProductNo();
        int safeQuantity = requestDto == null || requestDto.getQuantity() == null ? 1 : requestDto.getQuantity();
        if (safeQuantity < 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Quantity must be at least 1.");
        }

        ProductDto product = requireProduct(productNo);
        Long cartNo = getOrCreateCartNo(userNo);
        Long cartGroupNo = getOrCreateCartGroupNo(cartNo, product, requestDto);
        CartItemDto existingItem = cartDao.findCartItem(cartNo, cartGroupNo, productNo);
        int nextQuantity = safeQuantity;

        if (existingItem != null) {
            nextQuantity = existingItem.getQuantity() + safeQuantity;
        }

        validateStock(product, nextQuantity);

        if (existingItem == null) {
            cartDao.insertCartItem(cartNo, cartGroupNo, productNo, safeQuantity);
        } else {
            cartDao.updateCartItemQuantity(cartNo, existingItem.getCartItemNo(), nextQuantity);
        }

        return buildCartResponse(cartNo, userNo);
    }

    @Override
    public CartDto updateCartItem(Long userNo, Long cartItemNo, Integer quantity) {
        Long cartNo = getOrCreateCartNo(userNo);
        if (quantity == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Quantity is required.");
        }

        CartItemDto currentItem = requireCartItem(userNo, cartItemNo);

        if (quantity <= 0) {
            cartDao.deleteCartItem(cartNo, cartItemNo);
            cartDao.deleteEmptyCartGroups(cartNo);
            return buildCartResponse(cartNo, userNo);
        }

        ProductDto product = requireProduct(currentItem.getProductNo());
        validateStock(product, quantity);
        cartDao.updateCartItemQuantity(cartNo, cartItemNo, quantity);
        return buildCartResponse(cartNo, userNo);
    }

    @Override
    public CartDto removeCartItem(Long userNo, Long cartItemNo) {
        Long cartNo = getOrCreateCartNo(userNo);
        requireCartItem(userNo, cartItemNo);
        cartDao.deleteCartItem(cartNo, cartItemNo);
        cartDao.deleteEmptyCartGroups(cartNo);
        return buildCartResponse(cartNo, userNo);
    }

    @Override
    public CartDto removeCartGroup(Long userNo, Long cartGroupNo) {
        Long cartNo = getOrCreateCartNo(userNo);
        if (cartGroupNo == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cart group not found.");
        }

        boolean hasTargetGroup = false;
        for (CartItemDto item : cartDao.findCartItems(userNo)) {
            if (item != null && cartGroupNo.equals(item.getCartGroupNo())) {
                hasTargetGroup = true;
                break;
            }
        }

        if (!hasTargetGroup) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Cart group not found.");
        }

        cartDao.deleteCartItemsByGroup(cartNo, cartGroupNo);
        cartDao.deleteCartGroup(cartNo, cartGroupNo);
        cartDao.deleteEmptyCartGroups(cartNo);
        return buildCartResponse(cartNo, userNo);
    }

    @Override
    public CartDto clearCart(Long userNo) {
        Long cartNo = getOrCreateCartNo(userNo);
        cartDao.deleteAllCartItems(cartNo);
        cartDao.deleteAllCartGroups(cartNo);
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

    private Long getOrCreateCartGroupNo(Long cartNo, ProductDto product, CartItemDto requestDto) {
        String groupType = resolveGroupType(requestDto);
        String groupKey = resolveGroupKey(product, requestDto, groupType);
        String groupName = resolveGroupName(product, requestDto, groupType);
        Long recipeNo = "RECIPE".equals(groupType) ? requestDto.getRecipeNo() : null;
        Long cartGroupNo = cartDao.findCartGroupNo(cartNo, groupKey);
        if (cartGroupNo != null) {
            return cartGroupNo;
        }

        try {
            cartDao.insertCartGroup(
                cartNo,
                groupKey,
                groupType,
                recipeNo,
                groupName
            );
        } catch (DataIntegrityViolationException exception) {
            // Another request may have created the same group first.
        }

        Long createdCartGroupNo = cartDao.findCartGroupNo(cartNo, groupKey);
        if (createdCartGroupNo == null) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to initialize cart group.");
        }
        return createdCartGroupNo;
    }

    private String resolveGroupType(CartItemDto requestDto) {
        String groupType = requestDto == null ? null : trimToNull(requestDto.getGroupType());
        if ("RECIPE".equalsIgnoreCase(groupType)) {
            return "RECIPE";
        }
        return "PRODUCT";
    }

    private String resolveGroupKey(ProductDto product, CartItemDto requestDto, String groupType) {
        String explicitGroupKey = requestDto == null ? null : trimToNull(requestDto.getGroupKey());
        if (explicitGroupKey != null) {
            return explicitGroupKey;
        }
        if ("RECIPE".equals(groupType) && requestDto != null && requestDto.getRecipeNo() != null) {
            return "RECIPE:" + requestDto.getRecipeNo();
        }
        return "PRODUCT:" + product.getProductNo();
    }

    private String resolveGroupName(ProductDto product, CartItemDto requestDto, String groupType) {
        String explicitGroupName = requestDto == null ? null : trimToNull(requestDto.getGroupName());
        if (explicitGroupName != null) {
            return explicitGroupName;
        }
        if ("RECIPE".equals(groupType) && requestDto != null && requestDto.getRecipeNo() != null) {
            return "레시피 " + requestDto.getRecipeNo();
        }
        return product.getProductName();
    }

    private CartItemDto requireCartItem(Long userNo, Long cartItemNo) {
        List<CartItemDto> items = cartDao.findCartItems(userNo);
        for (CartItemDto item : items) {
            if (item != null && cartItemNo != null && cartItemNo.equals(item.getCartItemNo())) {
                return item;
            }
        }
        throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Cart item not found.");
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

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmedValue = value.trim();
        return trimmedValue.isEmpty() ? null : trimmedValue;
    }
}
