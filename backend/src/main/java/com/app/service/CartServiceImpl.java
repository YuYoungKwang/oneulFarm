package com.app.service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.app.dao.CartDao;
import com.app.dao.ProductDao;
import com.app.dto.CartDto;
import com.app.dto.CartGroupDto;
import com.app.dto.CartGroupRequestDto;
import com.app.dto.CartItemDto;
import com.app.dto.CartItemRequestDto;
import com.app.dto.ProductDto;

@Service
public class CartServiceImpl implements CartService {

    private static final String GROUP_TYPE_PRODUCT = "PRODUCT";
    private static final String GROUP_TYPE_RECIPE = "RECIPE";

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
    @Transactional
    public CartDto addCartItem(Long userNo, Long productNo, Integer quantity) {
        int safeQuantity = normalizeQuantity(quantity);
        ProductDto product = requireProduct(productNo);
        Long cartNo = getOrCreateCartNo(userNo);

        CartGroupDto group = getOrCreateCartGroup(
            cartNo,
            buildProductGroupKey(productNo),
            GROUP_TYPE_PRODUCT,
            null,
            product.getProductName()
        );
        CartItemDto existingItem = cartDao.findCartGroupItem(group.getCartGroupNo(), productNo);

        validateStock(product, getCurrentProductQuantity(userNo, productNo) + safeQuantity);

        if (existingItem == null) {
            cartDao.insertCartItem(cartNo, group.getCartGroupNo(), productNo, safeQuantity);
        } else {
            cartDao.updateCartItemQuantity(
                existingItem.getCartItemNo(),
                existingItem.getQuantity() + safeQuantity
            );
            cartDao.touchCartGroup(group.getCartGroupNo());
        }

        return buildCartResponse(cartNo, userNo);
    }

    @Override
    @Transactional
    public CartDto addRecipeCartGroup(Long userNo, CartGroupRequestDto request) {
        if (request == null || request.getRecipeNo() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Recipe information is required.");
        }

        Map<Long, Integer> quantityByProduct = aggregateRecipeItems(request.getItems());
        if (quantityByProduct.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Recipe cart items are required.");
        }

        Long cartNo = getOrCreateCartNo(userNo);
        CartGroupDto group = getOrCreateCartGroup(
            cartNo,
            buildRecipeGroupKey(request.getRecipeNo()),
            GROUP_TYPE_RECIPE,
            request.getRecipeNo(),
            resolveRecipeGroupName(request.getGroupName())
        );

        if (request.getGroupName() != null && !request.getGroupName().trim().isEmpty()) {
            cartDao.updateCartGroupName(group.getCartGroupNo(), request.getGroupName().trim());
        }

        for (Map.Entry<Long, Integer> entry : quantityByProduct.entrySet()) {
            Long productNo = entry.getKey();
            Integer quantity = entry.getValue();
            ProductDto product = requireProduct(productNo);
            CartItemDto existingItem = cartDao.findCartGroupItem(group.getCartGroupNo(), productNo);

            validateStock(product, getCurrentProductQuantity(userNo, productNo) + quantity);

            if (existingItem == null) {
                cartDao.insertCartItem(cartNo, group.getCartGroupNo(), productNo, quantity);
            } else {
                cartDao.updateCartItemQuantity(
                    existingItem.getCartItemNo(),
                    existingItem.getQuantity() + quantity
                );
            }
        }

        cartDao.touchCartGroup(group.getCartGroupNo());
        return buildCartResponse(cartNo, userNo);
    }

    @Override
    @Transactional
    public CartDto updateCartItem(Long userNo, Long cartItemNo, Integer quantity) {
        Long cartNo = getOrCreateCartNo(userNo);
        CartItemDto existingItem = requireCartItem(userNo, cartItemNo);

        if (quantity == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Quantity is required.");
        }

        if (quantity <= 0) {
            cartDao.deleteCartItem(cartItemNo);
            cleanupEmptyGroup(existingItem.getCartGroupNo());
            return buildCartResponse(cartNo, userNo);
        }

        ProductDto product = requireProduct(existingItem.getProductNo());
        int currentQuantity = getCurrentProductQuantity(userNo, existingItem.getProductNo());
        int nextTotalQuantity = Math.max(currentQuantity - safe(existingItem.getQuantity()), 0) + quantity;
        validateStock(product, nextTotalQuantity);

        cartDao.updateCartItemQuantity(cartItemNo, quantity);
        cartDao.touchCartGroup(existingItem.getCartGroupNo());
        return buildCartResponse(cartNo, userNo);
    }

    @Override
    @Transactional
    public CartDto removeCartItem(Long userNo, Long cartItemNo) {
        Long cartNo = getOrCreateCartNo(userNo);
        CartItemDto existingItem = requireCartItem(userNo, cartItemNo);
        cartDao.deleteCartItem(cartItemNo);
        cleanupEmptyGroup(existingItem.getCartGroupNo());
        return buildCartResponse(cartNo, userNo);
    }

    @Override
    @Transactional
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

    private ProductDto requireProduct(Long productNo) {
        ProductDto product = productDao.findProduct(productNo);
        if (product == null || !"SELLING".equals(product.getSaleStatus())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Product is not available.");
        }
        return product;
    }

    private CartItemDto requireCartItem(Long userNo, Long cartItemNo) {
        CartItemDto existingItem = cartDao.findCartItemByNo(userNo, cartItemNo);
        if (existingItem == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Cart item not found.");
        }
        return existingItem;
    }

    private CartGroupDto getOrCreateCartGroup(
        Long cartNo,
        String groupKey,
        String groupType,
        Long recipeNo,
        String groupName
    ) {
        CartGroupDto existingGroup = cartDao.findCartGroupByKey(cartNo, groupKey);
        if (existingGroup != null) {
            if (groupName != null && !groupName.trim().isEmpty()) {
                cartDao.updateCartGroupName(existingGroup.getCartGroupNo(), groupName.trim());
                existingGroup.setGroupName(groupName.trim());
            }
            return existingGroup;
        }

        cartDao.insertCartGroup(cartNo, groupKey, groupType, recipeNo, groupName);
        CartGroupDto createdGroup = cartDao.findCartGroupByKey(cartNo, groupKey);
        if (createdGroup == null) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to initialize cart group.");
        }
        return createdGroup;
    }

    private Map<Long, Integer> aggregateRecipeItems(List<CartItemRequestDto> requestItems) {
        Map<Long, Integer> quantityByProduct = new LinkedHashMap<>();
        List<CartItemRequestDto> sourceItems = requestItems == null ? new ArrayList<>() : requestItems;

        for (CartItemRequestDto item : sourceItems) {
            Long productNo = item == null ? null : item.getProductNo();
            if (productNo == null) {
                continue;
            }

            int safeQuantity = normalizeQuantity(item.getQuantity());
            quantityByProduct.put(productNo, quantityByProduct.getOrDefault(productNo, 0) + safeQuantity);
        }

        return quantityByProduct;
    }

    private void validateStock(ProductDto product, int quantity) {
        long stockQty = product.getStockQty() == null ? 0L : product.getStockQty();
        if (quantity > stockQty) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Not enough stock.");
        }
    }

    private int getCurrentProductQuantity(Long userNo, Long productNo) {
        Integer quantity = cartDao.sumCartProductQuantity(userNo, productNo);
        return quantity == null ? 0 : quantity;
    }

    private void cleanupEmptyGroup(Long cartGroupNo) {
        if (cartGroupNo != null) {
            cartDao.deleteCartGroupIfEmpty(cartGroupNo);
        }
    }

    private CartDto buildCartResponse(Long cartNo, Long userNo) {
        List<CartGroupDto> groups = cartDao.findCartGroups(userNo);
        List<CartItemDto> items = cartDao.findCartItems(userNo);
        Map<Long, List<CartItemDto>> itemsByGroup = new LinkedHashMap<>();

        int totalQuantity = 0;
        BigDecimal totalAmount = BigDecimal.ZERO;
        for (CartItemDto item : items) {
            itemsByGroup.computeIfAbsent(item.getCartGroupNo(), unused -> new ArrayList<>()).add(item);

            int quantity = safe(item.getQuantity());
            totalQuantity += quantity;
            totalAmount = totalAmount.add(safe(item.getSalePrice()).multiply(BigDecimal.valueOf(quantity)));
        }

        for (CartGroupDto group : groups) {
            List<CartItemDto> groupItems = itemsByGroup.getOrDefault(group.getCartGroupNo(), new ArrayList<>());
            group.setItems(groupItems);
            group.setItemCount(groupItems.size());

            int groupQuantity = 0;
            BigDecimal groupAmount = BigDecimal.ZERO;
            BigDecimal groupSavedAmount = BigDecimal.ZERO;
            for (CartItemDto item : groupItems) {
                int quantity = safe(item.getQuantity());
                groupQuantity += quantity;
                groupAmount = groupAmount.add(safe(item.getSalePrice()).multiply(BigDecimal.valueOf(quantity)));
                groupSavedAmount = groupSavedAmount.add(safe(item.getSavedAmount()));
            }

            group.setTotalQuantity(groupQuantity);
            group.setTotalAmount(groupAmount);
            group.setTotalSavedAmount(groupSavedAmount);
        }

        CartDto response = new CartDto();
        response.setCartNo(cartNo);
        response.setGroups(groups);
        response.setItems(items);
        response.setTotalQuantity(totalQuantity);
        response.setTotalAmount(totalAmount);
        return response;
    }

    private int normalizeQuantity(Integer quantity) {
        int safeQuantity = quantity == null ? 1 : quantity;
        if (safeQuantity < 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Quantity must be at least 1.");
        }
        return safeQuantity;
    }

    private int safe(Integer value) {
        return value == null ? 0 : value;
    }

    private BigDecimal safe(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private String buildProductGroupKey(Long productNo) {
        return "PRODUCT:" + productNo;
    }

    private String buildRecipeGroupKey(Long recipeNo) {
        return "RECIPE:" + recipeNo;
    }

    private String resolveRecipeGroupName(String groupName) {
        if (groupName == null || groupName.trim().isEmpty()) {
            return "레시피 묶음";
        }
        return groupName.trim();
    }
}
