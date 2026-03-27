package com.app.service;

import java.math.BigDecimal;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.app.common.OrderCompatibilityUtils;
import com.app.common.OrderWorkflowRuntimeStore;
import com.app.dao.AdminDao;
import com.app.dao.OrderDao;
import com.app.dao.UserDao;
import com.app.dto.MainBannerDto;
import com.app.dto.OrderDto;
import com.app.dto.OrderItemDto;
import com.app.dto.PackageHistoryDto;
import com.app.dto.ProductCategoryDto;
import com.app.dto.ProductPriceCodeMapDTO;
import com.app.dto.ProductDto;
import com.app.dto.ProductImageDto;
import com.app.dto.ProductRecipeDto;
import com.app.dto.PurchaseBatchDto;
import com.app.dto.PriceSnapshotDTO;
import com.app.dto.UserDto;
import com.app.dto.UserProfileDto;
import com.app.dto.UserDto;
import org.springframework.web.multipart.MultipartFile;

@Service
public class AdminServiceImpl implements AdminService {

    @Autowired
    private AdminDao adminDao;

    @Autowired
    private OrderDao orderDao;

    @Autowired
    private UserDao userDao;

    @Autowired
    private PriceSnapshotService priceSnapshotService;

    @Autowired
    private ProductPriceMatchService productPriceMatchService;

    @Autowired
    private OrderWorkflowRuntimeStore orderWorkflowRuntimeStore;

    @Override
    public List<ProductCategoryDto> getProductCategories() {
        return adminDao.findProductCategories();
    }

    @Override
    public List<ProductDto> getProducts() {
        List<ProductDto> products = adminDao.findAdminProducts();
        for (ProductDto product : products) {
            hydrateProductDefaults(product);
        }
        return products;
    }

    @Override
    @Transactional
    public ProductDto saveProduct(ProductDto request) {
        validateProductRequest(request);
        normalizeProductRequest(request);

        if (request.getProductNo() == null) {
            adminDao.insertAdminProduct(request);
            if (request.getProductNo() == null) {
                ProductDto newestProduct = adminDao.findNewestAdminProduct(request);
                if (newestProduct != null) {
                    request.setProductNo(newestProduct.getProductNo());
                }
            }
        } else {
            int updatedCount = adminDao.updateAdminProduct(request);
            if (updatedCount == 0) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found.");
            }
        }

        ProductDto savedProduct = adminDao.findAdminProduct(request.getProductNo());
        if (savedProduct == null) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to save product.");
        }
        hydrateProductDefaults(savedProduct);
        return savedProduct;
    }

    @Override
    @Transactional
    public List<ProductImageDto> saveProductImages(Long productNo, List<MultipartFile> files) {
        ProductDto product = adminDao.findAdminProduct(productNo);
        if (product == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found.");
        }

        List<MultipartFile> uploadFiles = new ArrayList<>();
        if (files != null) {
            for (MultipartFile file : files) {
                if (file != null && !file.isEmpty()) {
                    uploadFiles.add(file);
                }
            }
        }

        if (uploadFiles.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "At least one product image is required.");
        }

        adminDao.deleteProductImages(productNo);

        for (int index = 0; index < uploadFiles.size(); index += 1) {
            MultipartFile file = uploadFiles.get(index);
            String mimeType = trimToNull(file.getContentType());
            if (mimeType == null || !mimeType.startsWith("image/")) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only image files can be uploaded.");
            }

            ProductImageDto productImage = new ProductImageDto();
            productImage.setProductNo(productNo);
            productImage.setImageName(resolveImageName(file.getOriginalFilename()));
            productImage.setImageExt(extractImageExtension(file.getOriginalFilename()));
            productImage.setMimeType(mimeType);
            productImage.setImageSize(file.getSize());
            productImage.setSortOrder(index + 1);
            productImage.setIsMain(index == 0 ? "Y" : "N");
            productImage.setImageData(readImageBytes(file));
            adminDao.insertProductImage(productImage);
        }

        return adminDao.findProductImages(productNo);
    }

    @Override
    @Transactional
    public void deleteProduct(Long productNo) {
        ProductDto product = adminDao.findAdminProduct(productNo);
        if (product == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found.");
        }

        if (adminDao.countOrderItemsByProduct(productNo) > 0) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Products with order history cannot be deleted. Remove completed delivered orders from order management first."
            );
        }

        adminDao.deleteCartItemsByProduct(productNo);
        adminDao.deleteWishlistByProduct(productNo);
        adminDao.deleteReviewImagesByProduct(productNo);
        adminDao.deleteReviewsByProduct(productNo);
        adminDao.deleteProductRecipeMappings(productNo);
        adminDao.deleteProductPriceMatches(productNo);
        adminDao.deleteProductPriceCodeMaps(productNo);
        adminDao.deletePackageHistoriesByProduct(productNo);
        adminDao.deleteProductImages(productNo);

        int deletedCount = adminDao.deleteAdminProduct(productNo);
        if (deletedCount == 0) {
            throw new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Failed to delete product."
            );
        }
    }

    @Override
    public List<OrderDto> getOrders() {
        orderDao.autoConfirmEligiblePurchases();
        List<OrderDto> orders = adminDao.findAdminOrders();
        for (OrderDto order : orders) {
            hydrateOrderSummary(order);
        }
        return orders;
    }

    @Override
    public OrderDto getOrderDetail(Long orderNo) {
        orderDao.autoConfirmEligiblePurchases();
        OrderDto order = adminDao.findAdminOrderDetail(orderNo);
        if (order == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found.");
        }

        List<OrderItemDto> items = orderDao.findOrderItems(orderNo);
        BigDecimal totalSavedAmount = BigDecimal.ZERO;
        for (OrderItemDto item : items) {
            item.setUnitPrice(defaultAmount(item.getUnitPrice()));
            item.setSubtotal(defaultAmount(item.getSubtotal()));
            item.setMarketAvgPrice(defaultAmount(item.getMarketAvgPrice()));
            item.setSavedAmount(defaultAmount(item.getSavedAmount()));
            item.setSavingRate(defaultAmount(item.getSavingRate()));
            totalSavedAmount = totalSavedAmount.add(defaultAmount(item.getSavedAmount()));
        }

        order.setItems(items);
        order.setTotalAmount(defaultAmount(order.getTotalAmount()));
        order.setDiscountAmount(defaultAmount(order.getDiscountAmount()));
        order.setDeliveryFee(defaultAmount(order.getDeliveryFee()));
        order.setFinalAmount(defaultAmount(order.getFinalAmount()));
        order.setPaidAmount(defaultAmount(order.getPaidAmount()));
        order.setTotalSavedAmount(totalSavedAmount);
        hydrateOrderRuntimeState(order);
        order.setTrackingHistories(orderDao.findDeliveryTrackingHistories(orderNo));
        order.setOrderStatusHistories(orderDao.findOrderStatusHistories(orderNo));
        return order;
    }

    @Override
    @Transactional
    public OrderDto updateOrder(Long orderNo, OrderDto request) {
        OrderDto currentOrder = getOrderDetail(orderNo);
        String trackingNo = trimToNull(request == null ? null : request.getTrackingNo());
        String courierName = trimToNull(request == null ? null : request.getCourierName());
        if (courierName == null) {
            courierName = "oneulFarm";
        }

        if (trackingNo != null) {
            adminDao.updateAdminDeliveryTracking(orderNo, trackingNo, courierName);
        }

        String nextStatus = trimToNull(request == null ? null : request.getOrderStatus());
        if (nextStatus != null && !nextStatus.equals(currentOrder.getOrderStatus())) {
            if ("SHIPPING".equals(nextStatus)) {
                return shipOrder(orderNo, request);
            } else if ("COMPLETED".equals(nextStatus)) {
                return deliverOrder(orderNo);
            } else if ("CANCELED".equals(nextStatus)) {
                return rejectOrder(orderNo);
            } else if ("PAID".equals(nextStatus) || "CREATED".equals(nextStatus)) {
                adminDao.updateAdminOrderStatus(orderNo, nextStatus);
            } else {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported order status.");
            }
        }

        return getOrderDetail(orderNo);
    }

    @Override
    @Transactional
    public OrderDto rejectOrder(Long orderNo) {
        OrderDto currentOrder = getOrderDetail(orderNo);
        if (!Boolean.TRUE.equals(currentOrder.getRejectAvailable())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Order cannot be rejected in the current state.");
        }

        adminDao.updateAdminOrderStatus(orderNo, "CANCELED");
        orderDao.insertOrderStatusHistory(orderNo, currentOrder.getOrderStatus(), "CANCELED", "ADMIN", null, "운영자가 주문을 거절했습니다.");
        return getOrderDetail(orderNo);
    }

    @Override
    @Transactional
    public OrderDto acceptCancelRequest(Long orderNo, Long actorUserNo) {
        OrderDto currentOrder = getOrderDetail(orderNo);
        if (!Boolean.TRUE.equals(currentOrder.getCancelAcceptAvailable())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cancel request cannot be accepted in the current state.");
        }

        List<OrderItemDto> orderItems = orderDao.findOrderItems(orderNo);
        for (OrderItemDto orderItem : orderItems) {
            if (orderItem.getProductNo() != null && orderItem.getQuantity() != null && orderItem.getQuantity() > 0) {
                orderDao.increaseProductStock(orderItem.getProductNo(), orderItem.getQuantity());
            }
        }

        orderDao.updateOrderStatus(orderNo, "CANCELED");
        orderDao.updateOrderCancelStatus(orderNo, "CANCEL_ACCEPTED");
        orderDao.updateLatestOrderCancelRequest(orderNo, "CANCEL_ACCEPTED", actorUserNo, null);
        orderDao.insertOrderStatusHistory(orderNo, currentOrder.getOrderStatus(), "CANCELED", "ADMIN", actorUserNo, "운영자가 취소 요청을 수락했습니다.");
        return getOrderDetail(orderNo);
    }

    @Override
    @Transactional
    public OrderDto rejectCancelRequest(Long orderNo, Long actorUserNo) {
        OrderDto currentOrder = getOrderDetail(orderNo);
        if (!Boolean.TRUE.equals(currentOrder.getCancelRejectAvailable())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cancel request cannot be rejected in the current state.");
        }

        orderDao.updateOrderCancelStatus(orderNo, "CANCEL_REJECTED");
        orderDao.updateLatestOrderCancelRequest(orderNo, "CANCEL_REJECTED", actorUserNo, null);
        orderDao.insertOrderStatusHistory(
            orderNo,
            currentOrder.getOrderStatus(),
            currentOrder.getOrderStatus(),
            "ADMIN",
            actorUserNo,
            "운영자가 취소 요청을 거절했습니다."
        );
        return getOrderDetail(orderNo);
    }

    @Override
    @Transactional
    public OrderDto shipOrder(Long orderNo, OrderDto request) {
        OrderDto currentOrder = getOrderDetail(orderNo);
        if (!Boolean.TRUE.equals(currentOrder.getShipAvailable())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Order cannot be moved to shipping in the current state.");
        }

        String trackingNo = trimToNull(request == null ? null : request.getTrackingNo());
        String courierName = trimToNull(request == null ? null : request.getCourierName());
        if (courierName == null) {
            courierName = "oneulFarm";
        }

        String resolvedTrackingNo = trackingNo == null
            ? "TRK-" + currentOrder.getOrderId()
            : trackingNo;
        adminDao.updateAdminOrderStatus(orderNo, "SHIPPING");
        adminDao.updateAdminDeliveryForShipping(orderNo, resolvedTrackingNo, courierName);
        orderDao.insertOrderStatusHistory(orderNo, currentOrder.getOrderStatus(), "SHIPPING", "ADMIN", null, "운영자가 주문을 배송사로 인계했습니다.");
        orderDao.insertDeliveryTrackingHistory(
            orderNo,
            OrderCompatibilityUtils.resolveCarrierCode(courierName),
            resolvedTrackingNo,
            "IN_TRANSIT",
            "관리자가 주문을 배송사로 인계했습니다.",
            null
        );
        return getOrderDetail(orderNo);
    }

    @Override
    @Transactional
    public OrderDto deliverOrder(Long orderNo) {
        OrderDto currentOrder = getOrderDetail(orderNo);
        if (!Boolean.TRUE.equals(currentOrder.getDeliverAvailable())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Order cannot be marked delivered in the current state.");
        }

        adminDao.updateAdminOrderStatus(orderNo, "COMPLETED");
        adminDao.updateAdminDeliveryForDelivered(orderNo);
        orderDao.insertOrderStatusHistory(orderNo, currentOrder.getOrderStatus(), "COMPLETED", "ADMIN", null, "운영자가 배송 완료 처리했습니다.");
        orderDao.insertDeliveryTrackingHistory(
            orderNo,
            currentOrder.getCarrierCode(),
            currentOrder.getTrackingNo(),
            "DELIVERED",
            "관리자가 배송 완료 처리했습니다.",
            null
        );
        return getOrderDetail(orderNo);
    }

    @Override
    @Transactional
    public void deleteOrder(Long orderNo) {
        OrderDto currentOrder = getOrderDetail(orderNo);
        if (!"COMPLETED".equals(currentOrder.getOrderStatus())
            || !"DELIVERED".equals(currentOrder.getDeliveryStatus())) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Only completed delivered orders can be removed."
            );
        }

        adminDao.deleteReviewImagesByOrder(orderNo);
        adminDao.deleteReviewsByOrder(orderNo);
        adminDao.deletePaymentByOrder(orderNo);
        adminDao.deleteDeliveryByOrder(orderNo);
        adminDao.deleteOrderItemsByOrder(orderNo);

        int deletedCount = adminDao.deleteOrder(orderNo);
        if (deletedCount == 0) {
            throw new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Failed to remove order."
            );
        }
    }

    @Override
    public List<UserProfileDto> getUsers() {
        List<UserProfileDto> users = new ArrayList<>();
        for (UserProfileDto user : adminDao.findAdminUsers()) {
            if (!shouldExposeUserInAdmin(user)) {
                continue;
            }
            users.add(user);
        }
        for (UserProfileDto user : users) {
            hydrateUserDefaults(user);
        }
        return users;
    }

    @Override
    @Transactional
    public UserProfileDto updateUserStatus(Long userNo, UserProfileDto request) {
        String status = trimToNull(request == null ? null : request.getStatus());
        if (status == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "User status is required.");
        }

        if (!"ACTIVE".equals(status) && !"BLOCKED".equals(status) && !"WITHDRAWN".equals(status)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported user status.");
        }

        int updatedCount = adminDao.updateAdminUserStatus(userNo, status);
        if (updatedCount == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found.");
        }

        UserProfileDto user = adminDao.findAdminUser(userNo);
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found.");
        }
        hydrateUserDefaults(user);
        return user;
    }

    @Override
    @Transactional
    public UserProfileDto updateUserRole(Long actorUserNo, Long userNo, UserProfileDto request) {
        if (actorUserNo == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Actor user number is required.");
        }

        UserDto actor = userDao.findByUserNo(actorUserNo);
        if (actor == null || !"ADMIN".equalsIgnoreCase(actor.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Administrator access is required.");
        }

        if (!"admin123".equalsIgnoreCase(trimToNull(actor.getUserId()))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the super administrator can change admin roles.");
        }

        String role = trimToNull(request == null ? null : request.getRole());
        if (!"USER".equals(role) && !"ADMIN".equals(role)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported user role.");
        }

        UserProfileDto targetUser = adminDao.findAdminUser(userNo);
        if (targetUser == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found.");
        }

        if ("admin123".equalsIgnoreCase(trimToNull(targetUser.getUserId())) && !"ADMIN".equals(role)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The super administrator role cannot be changed.");
        }

        if (actorUserNo.equals(userNo) && !"ADMIN".equals(role)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You cannot remove your own administrator role.");
        }

        int updatedCount = adminDao.updateAdminUserRole(userNo, role);
        if (updatedCount == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found.");
        }

        UserProfileDto updatedUser = adminDao.findAdminUser(userNo);
        if (updatedUser == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found.");
        }
        hydrateUserDefaults(updatedUser);
        return updatedUser;
    }

    @Override
    @Transactional
    public void deleteUser(Long userNo) {
        UserProfileDto user = adminDao.findAdminUser(userNo);
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found.");
        }

        if (!"USER".equals(user.getRole())) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Only regular user accounts can be permanently deleted."
            );
        }

        if (adminDao.countPackageHistoriesByUser(userNo) > 0) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Accounts with package history cannot be permanently deleted."
            );
        }

        adminDao.deleteReviewImagesByUser(userNo);
        adminDao.deleteReviewsByUser(userNo);
        adminDao.deleteWishlistByUser(userNo);
        adminDao.deleteCartItemsByUser(userNo);
        adminDao.deleteCartByUser(userNo);
        adminDao.deleteUserAddresses(userNo);
        adminDao.deleteTermsAgreementsByUser(userNo);
        adminDao.deleteUserMonthlyStats(userNo);
        adminDao.deletePaymentsByUser(userNo);
        adminDao.deleteDeliveriesByUser(userNo);
        adminDao.deleteOrderItemsByUser(userNo);
        adminDao.deleteOrdersByUser(userNo);

        int deletedCount = adminDao.deleteAdminUser(userNo);
        if (deletedCount == 0) {
            throw new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Failed to permanently delete user."
            );
        }
    }

    @Override
    public List<PurchaseBatchDto> getPurchaseBatches() {
        return adminDao.findPurchaseBatches();
    }

    @Override
    public List<PackageHistoryDto> getPackageHistories() {
        return adminDao.findPackageHistories();
    }

    @Override
    @Transactional
    public PurchaseBatchDto createPurchaseBatch(PurchaseBatchDto request) {
        validatePurchaseBatchRequest(request);
        normalizePurchaseBatchRequest(request);
        ProductDto draftProduct = createDraftProductFromPurchase(request);
        ensureRetailPriceCodeMap(draftProduct);
        request.setProductNo(draftProduct.getProductNo());
        adminDao.insertPurchaseBatch(request);
        if (request.getBatchNo() == null) {
            PurchaseBatchDto newestPurchaseBatch = adminDao.findNewestPurchaseBatch(request);
            if (newestPurchaseBatch != null) {
                request.setBatchNo(newestPurchaseBatch.getBatchNo());
            }
        }

        PurchaseBatchDto purchaseBatch = adminDao.findPurchaseBatch(request.getBatchNo());
        if (purchaseBatch == null) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to create purchase batch.");
        }
        return purchaseBatch;
    }

    @Override
    @Transactional
    public PackageHistoryDto packageBatch(Long userNo, Long batchNo, PackageHistoryDto request) {
        PurchaseBatchDto purchaseBatch = adminDao.findPurchaseBatch(batchNo);
        if (purchaseBatch == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Purchase batch not found.");
        }

        Long productNo = purchaseBatch.getProductNo() != null
            ? purchaseBatch.getProductNo()
            : request.getProductNo();
        if (productNo == null) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "No linked product exists for this purchase batch."
            );
        }

        ProductDto product = adminDao.findAdminProduct(productNo);
        if (product == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Linked product not found.");
        }

        validatePackageHistoryRequest(request);
        normalizePackageHistoryRequest(request);

        request.setBatchNo(batchNo);
        request.setProductNo(productNo);
        request.setUserNo(resolvePackageActorUserNo(userNo));
        applyPackageResultToProduct(product, purchaseBatch, request);
        adminDao.updateAdminProduct(product);
        ensureRetailPriceCodeMap(product);
        adminDao.insertPackageHistory(request);
        if (purchaseBatch.getProductNo() == null) {
            adminDao.updatePurchaseBatchProduct(batchNo, productNo);
        }
        adminDao.updatePurchaseBatchStatus(batchNo, "PACKAGED");
        if ("SELLING".equalsIgnoreCase(product.getSaleStatus())) {
            productPriceMatchService.refreshProductPriceMatch();
        }
        return request;
    }

    @Override
    @Transactional
    public void deletePurchaseBatch(Long batchNo) {
        PurchaseBatchDto purchaseBatch = adminDao.findPurchaseBatch(batchNo);
        if (purchaseBatch == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Purchase batch not found.");
        }

        adminDao.deletePackageHistoriesByBatch(batchNo);

        int deletedCount = adminDao.deletePurchaseBatch(batchNo);
        if (deletedCount == 0) {
            throw new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Failed to delete purchase batch."
            );
        }
    }

    @Override
    public List<MainBannerDto> getMainBanners() {
        return adminDao.findMainBanners();
    }

    @Override
    public List<ProductRecipeDto> getRecipeMappings() {
        return adminDao.findRecipeMappings();
    }

    private void validateProductRequest(ProductDto request) {
        if (request == null
            || request.getCategoryNo() == null
            || isBlank(request.getProductName())
            || isBlank(request.getUnit())
            || request.getPackageWeight() == null
            || request.getSalePrice() == null
            || request.getStockQty() == null
            || isBlank(request.getSaleStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Required product fields are missing.");
        }

        if (!"Y".equals(request.getIsSeasonal()) && !"N".equals(request.getIsSeasonal())) {
            request.setIsSeasonal("N");
        }

        if (request.getSalePrice().compareTo(BigDecimal.ZERO) < 0
            || request.getPackageWeight().compareTo(BigDecimal.ZERO) < 0
            || request.getStockQty() < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Product values cannot be negative.");
        }

        if (!"READY".equals(request.getSaleStatus())
            && !"SELLING".equals(request.getSaleStatus())
            && !"SOLD_OUT".equals(request.getSaleStatus())
            && !"STOP".equals(request.getSaleStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported product status.");
        }
    }

    private void validatePurchaseBatchRequest(PurchaseBatchDto request) {
        if (request == null
            || request.getCategoryNo() == null
            || isBlank(request.getProductName())
            || isBlank(request.getPurchaseUnit())
            || request.getPurchaseQty() == null
            || request.getPurchasePrice() == null
            || request.getPurchaseDate() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Required purchase fields are missing.");
        }

        if (trimToNull(request.getStatus()) == null) {
            request.setStatus("PURCHASED");
        }

        if (request.getPurchaseQty().compareTo(BigDecimal.ZERO) < 0
            || request.getPurchasePrice().compareTo(BigDecimal.ZERO) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Purchase values cannot be negative.");
        }
    }

    private void validatePackageHistoryRequest(PackageHistoryDto request) {
        if (request == null
            || request.getPackagedQty() == null
            || request.getPackagedQty() < 1
            || request.getPackagedWeight() == null
            || request.getSalePrice() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Required package fields are missing.");
        }

        if (request.getPackagedWeight().compareTo(BigDecimal.ZERO) <= 0
            || request.getSalePrice().compareTo(BigDecimal.ZERO) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Package values cannot be negative.");
        }

        String saleStatus = trimToNull(request.getSaleStatus());
        if (saleStatus != null
            && !"READY".equals(saleStatus)
            && !"SELLING".equals(saleStatus)
            && !"SOLD_OUT".equals(saleStatus)
            && !"STOP".equals(saleStatus)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported package sale status.");
        }
    }

    private void hydrateProductDefaults(ProductDto product) {
        product.setSalePrice(defaultAmount(product.getSalePrice()));
        product.setPackageWeight(defaultAmount(product.getPackageWeight()));
        product.setAvgPrice(defaultAmount(product.getAvgPrice()));
        product.setMinPrice(defaultAmount(product.getMinPrice()));
        product.setMaxPrice(defaultAmount(product.getMaxPrice()));
        product.setPriceGap(defaultAmount(product.getPriceGap()));
        product.setSavingRate(defaultAmount(product.getSavingRate()));
        product.setAverageRating(defaultAmount(product.getAverageRating()));
        if (product.getReviewCount() == null) {
            product.setReviewCount(0L);
        }
        List<ProductImageDto> productImages = adminDao.findProductImages(product.getProductNo());
        product.setImages(productImages == null ? Collections.emptyList() : productImages);
        product.setRecipes(Collections.emptyList());
        product.setReviews(Collections.emptyList());
    }

    private void hydrateOrderSummary(OrderDto order) {
        order.setFinalAmount(defaultAmount(order.getFinalAmount()));
        order.setTotalSavedAmount(defaultAmount(order.getTotalSavedAmount()));
        order.setPaidAmount(defaultAmount(order.getPaidAmount()));
        hydrateOrderRuntimeState(order);
    }

    private void hydrateOrderRuntimeState(OrderDto order) {
        orderWorkflowRuntimeStore.apply(order);
        OrderCompatibilityUtils.hydrateOrderCompatibility(order);
    }

    private boolean shouldExposeUserInAdmin(UserProfileDto user) {
        if (user == null) {
            return false;
        }

        if (!"USER".equals(user.getRole()) && !"ADMIN".equals(user.getRole())) {
            return false;
        }

        String userId = uppercase(trimToNull(user.getUserId()));
        String email = uppercase(trimToNull(user.getEmail()));
        String nickname = uppercase(trimToNull(user.getNickname()));

        if (email != null && email.endsWith("@EXAMPLE.COM")) {
            return false;
        }

        if ("DUPCHECK".equals(userId)) {
            return false;
        }

        return !startsWith(userId, "FLAKY")
            && !startsWith(nickname, "FLAKY")
            && !contains(userId, "PROBE")
            && !contains(email, "PROBE");
    }

    private void normalizeProductRequest(ProductDto request) {
        request.setProductName(request.getProductName().trim());
        request.setOrigin(trimToNull(request.getOrigin()));
        request.setUnit(request.getUnit().trim());
        request.setDescription(trimToNull(request.getDescription()));
    }

    private void normalizePurchaseBatchRequest(PurchaseBatchDto request) {
        request.setProductName(request.getProductName().trim());
        request.setOrigin(trimToNull(request.getOrigin()));
        request.setPurchaseUnit(request.getPurchaseUnit().trim());
        request.setSupplierName(trimToNull(request.getSupplierName()));
        request.setStatus(request.getStatus().trim());
    }

    private void normalizePackageHistoryRequest(PackageHistoryDto request) {
        request.setNote(trimToNull(request.getNote()));
        String saleStatus = trimToNull(request.getSaleStatus());
        request.setSaleStatus(saleStatus == null ? "SELLING" : saleStatus);
    }

    private ProductDto createDraftProductFromPurchase(PurchaseBatchDto request) {
        ProductDto draftProduct = new ProductDto();
        draftProduct.setCategoryNo(request.getCategoryNo());
        draftProduct.setProductName(request.getProductName());
        draftProduct.setOrigin(request.getOrigin());
        draftProduct.setUnit(request.getPurchaseUnit());
        draftProduct.setPackageWeight(BigDecimal.ZERO);
        draftProduct.setSalePrice(BigDecimal.ZERO);
        draftProduct.setStockQty(0L);
        draftProduct.setDescription(null);
        draftProduct.setIsSeasonal("N");
        draftProduct.setSaleStatus("READY");
        adminDao.insertAdminProduct(draftProduct);
        if (draftProduct.getProductNo() == null) {
            ProductDto newestProduct = adminDao.findNewestAdminProduct(draftProduct);
            if (newestProduct != null) {
                draftProduct.setProductNo(newestProduct.getProductNo());
            }
        }

        if (draftProduct.getProductNo() == null) {
            throw new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Failed to create linked draft product."
            );
        }
        return draftProduct;
    }

    private void applyPackageResultToProduct(
        ProductDto product,
        PurchaseBatchDto purchaseBatch,
        PackageHistoryDto request
    ) {
        if (purchaseBatch.getCategoryNo() != null) {
            product.setCategoryNo(purchaseBatch.getCategoryNo());
        }
        product.setProductName(purchaseBatch.getProductName());
        product.setOrigin(purchaseBatch.getOrigin());
        product.setUnit(purchaseBatch.getPurchaseUnit());
        product.setPackageWeight(request.getPackagedWeight());
        product.setSalePrice(request.getSalePrice());
        long currentStock = product.getStockQty() == null ? 0L : product.getStockQty();
        product.setStockQty(currentStock + request.getPackagedQty());
        product.setSaleStatus(request.getSaleStatus());
        if (product.getStockQty() == 0L && "SELLING".equals(product.getSaleStatus())) {
            product.setSaleStatus("SOLD_OUT");
        }
        if (!"Y".equals(product.getIsSeasonal()) && !"N".equals(product.getIsSeasonal())) {
            product.setIsSeasonal("N");
        }
    }

    private Long resolvePackageActorUserNo(Long requestedUserNo) {
        if (requestedUserNo != null) {
            UserDto requestedUser = userDao.findByUserNo(requestedUserNo);
            if (requestedUser != null) {
                return requestedUserNo;
            }
        }

        return adminDao.findAdminUsers().stream()
            .filter(user -> user.getUserNo() != null)
            .filter(user -> !"WITHDRAWN".equalsIgnoreCase(user.getStatus()))
            .map(UserProfileDto::getUserNo)
            .findFirst()
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "No valid user exists for package history."
            ));
    }

    private void ensureRetailPriceCodeMap(ProductDto product) {
        if (product == null || product.getProductNo() == null || isBlank(product.getProductName())) {
            return;
        }

        PriceSnapshotDTO retailSnapshot = findBestRetailSnapshot(product.getProductName());
        if (retailSnapshot == null) {
            return;
        }

        ProductPriceCodeMapDTO retailMap = buildRetailPriceCodeMap(product.getProductNo(), retailSnapshot);
        if (retailMap == null) {
            return;
        }

        adminDao.deleteProductPriceCodeMaps(product.getProductNo());
        adminDao.insertProductPriceCodeMap(retailMap);
    }

    private PriceSnapshotDTO findBestRetailSnapshot(String productName) {
        List<PriceSnapshotDTO> retailSnapshots =
            priceSnapshotService.getPriceSnapshotList(productName, "RETAIL", null, 40);
        if (retailSnapshots == null || retailSnapshots.isEmpty()) {
            return null;
        }

        PriceSnapshotDTO bestSnapshot = null;
        int bestScore = Integer.MIN_VALUE;
        for (PriceSnapshotDTO candidate : retailSnapshots) {
            int score = calculateSnapshotMatchScore(productName, candidate);
            if (bestSnapshot == null || score > bestScore) {
                bestSnapshot = candidate;
                bestScore = score;
            }
        }
        return bestSnapshot;
    }

    private int calculateSnapshotMatchScore(String query, PriceSnapshotDTO candidate) {
        if (candidate == null) {
            return Integer.MIN_VALUE;
        }

        String normalizedQuery = normalizeSearchKey(query);
        String normalizedItemName = normalizeSearchKey(candidate.getItemName());
        if (normalizedItemName.isEmpty()) {
            return Integer.MIN_VALUE;
        }

        int score = 0;
        if (normalizedItemName.equals(normalizedQuery)) {
            score += 1000;
        } else if (normalizedItemName.startsWith(normalizedQuery)) {
            score += 700;
        } else if (normalizedItemName.contains(normalizedQuery)) {
            score += 500;
        }

        String rawItemName = trimToNull(candidate.getItemName());
        if (rawItemName != null && rawItemName.equalsIgnoreCase(query.trim())) {
            score += 150;
        }

        score -= Math.max(normalizedItemName.length() - normalizedQuery.length(), 0);
        return score;
    }

    private ProductPriceCodeMapDTO buildRetailPriceCodeMap(Long productNo, PriceSnapshotDTO retailSnapshot) {
        String itemCode = trimToNull(retailSnapshot.getItemCode());
        if (itemCode == null) {
            return null;
        }

        String[] codeTokens = itemCode.split("_", 7);
        if (codeTokens.length != 7 || !"RETAIL".equalsIgnoreCase(codeTokens[0])) {
            return null;
        }

        ProductPriceCodeMapDTO productPriceCodeMap = new ProductPriceCodeMapDTO();
        productPriceCodeMap.setProductNo(productNo);
        productPriceCodeMap.setMarketType("RETAIL");
        productPriceCodeMap.setItemCategoryCode(codeTokens[1]);
        productPriceCodeMap.setItemCode(codeTokens[2]);
        productPriceCodeMap.setKindCode(codeTokens[3]);
        productPriceCodeMap.setProductRankCode(codeTokens[4]);
        productPriceCodeMap.setCountryCode(codeTokens[5]);
        productPriceCodeMap.setConvertKgYn(codeTokens[6]);
        productPriceCodeMap.setItemNameHint(trimToNull(retailSnapshot.getItemName()));
        productPriceCodeMap.setUnitHint(trimToNull(retailSnapshot.getUnit()));
        return productPriceCodeMap;
    }

    private String normalizeSearchKey(String value) {
        String trimmedValue = trimToNull(value);
        if (trimmedValue == null) {
            return "";
        }

        return trimmedValue
            .replaceAll("\\s+", "")
            .toLowerCase(Locale.ROOT);
    }

    private void hydrateUserDefaults(UserProfileDto user) {
        if (user.getTotalSavedAmount() == null) {
            user.setTotalSavedAmount(BigDecimal.ZERO);
        }
        if (user.getTotalPurchaseAmount() == null) {
            user.setTotalPurchaseAmount(BigDecimal.ZERO);
        }
        if (user.getTotalOrderCount() == null) {
            user.setTotalOrderCount(0L);
        }
    }

    private BigDecimal defaultAmount(BigDecimal amount) {
        return amount == null ? BigDecimal.ZERO : amount;
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }

        String trimmed = value.trim();
        if (trimmed.isEmpty()) {
            return null;
        }
        String lowercaseValue = trimmed.toLowerCase(Locale.ROOT);
        if ("null".equals(lowercaseValue) || "undefined".equals(lowercaseValue) || "nan".equals(lowercaseValue)) {
            return null;
        }
        return trimmed;
    }

    private String uppercase(String value) {
        return value == null ? null : value.toUpperCase();
    }

    private boolean startsWith(String source, String prefix) {
        return source != null && source.startsWith(prefix);
    }

    private boolean contains(String source, String target) {
        return source != null && source.contains(target);
    }

    private String resolveImageName(String originalFilename) {
        String trimmedName = trimToNull(originalFilename);
        return trimmedName == null ? "product-image" : trimmedName;
    }

    private String extractImageExtension(String originalFilename) {
        String trimmedName = trimToNull(originalFilename);
        if (trimmedName == null || !trimmedName.contains(".")) {
            return null;
        }

        return trimmedName.substring(trimmedName.lastIndexOf('.') + 1).toLowerCase();
    }

    private byte[] readImageBytes(MultipartFile file) {
        try {
            return file.getBytes();
        } catch (IOException exception) {
            throw new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Failed to read image file."
            );
        }
    }
}
