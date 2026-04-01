package com.app.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.app.common.OrderCompatibilityUtils;
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
    private OrderFulfillmentSimulationService orderFulfillmentSimulationService;

    @Autowired
    private PriceSnapshotService priceSnapshotService;

    @Autowired
    private ProductPriceMatchService productPriceMatchService;

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
        orderFulfillmentSimulationService.advanceEligibleOrders();
        orderDao.autoConfirmEligiblePurchases();
        List<OrderDto> orders = adminDao.findAdminOrders();
        for (OrderDto order : orders) {
            hydrateOrderSummary(order);
        }
        return orders;
    }

    @Override
    public OrderDto getOrderDetail(Long orderNo) {
        orderFulfillmentSimulationService.advanceEligibleOrders();
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
        order.setCancelRequestHistories(orderDao.findCancelRequestHistories(orderNo));
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
        orderDao.insertOrderStatusHistory(orderNo, currentOrder.getOrderStatus(), "CANCELED", "ADMIN", null, "?댁쁺?먭? 二쇰Ц??嫄곗젅?덉뒿?덈떎.");
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
        orderDao.insertOrderStatusHistory(orderNo, currentOrder.getOrderStatus(), "CANCELED", "ADMIN", actorUserNo, "?댁쁺?먭? 痍⑥냼 ?붿껌???섎씫?덉뒿?덈떎.");
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
            "?댁쁺?먭? 痍⑥냼 ?붿껌??嫄곗젅?덉뒿?덈떎."
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
        orderDao.insertOrderStatusHistory(orderNo, currentOrder.getOrderStatus(), "SHIPPING", "ADMIN", null, "?댁쁺?먭? 二쇰Ц??諛곗넚?щ줈 ?멸퀎?덉뒿?덈떎.");
        orderDao.insertDeliveryTrackingHistory(
            orderNo,
            OrderCompatibilityUtils.resolveCarrierCode(courierName),
            resolvedTrackingNo,
            "IN_TRANSIT",
            "愿由ъ옄媛 二쇰Ц??諛곗넚???덈툕濡??멸퀎?덉뒿?덈떎.",
            getHubLocationName(courierName),
            getHubLocationAddress(courierName),
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
        orderDao.insertOrderStatusHistory(orderNo, currentOrder.getOrderStatus(), "COMPLETED", "ADMIN", null, "?댁쁺?먭? 諛곗넚 ?꾨즺 泥섎━?덉뒿?덈떎.");
        orderDao.insertDeliveryTrackingHistory(
            orderNo,
            currentOrder.getCarrierCode(),
            currentOrder.getTrackingNo(),
            "DELIVERED",
            "愿由ъ옄媛 諛곗넚 ?꾨즺 泥섎━?덉뒿?덈떎.",
            getDestinationLocationName(currentOrder),
            getDestinationLocationAddress(currentOrder),
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
        if (actor == null || !isAdminRole(actor.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Administrator access is required.");
        }

        if (!isSuperAdminRole(actor.getRole())) {
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

        if (isSuperAdminRole(targetUser.getRole())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The super administrator role cannot be changed.");
        }

        if (actorUserNo.equals(userNo) && !"ADMIN".equals(role) && !"SUPER_ADMIN".equals(role)) {
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
        List<PurchaseBatchDto> purchaseBatches = adminDao.findPurchaseBatches();
        for (PurchaseBatchDto purchaseBatch : purchaseBatches) {
            hydratePurchaseBatchDefaults(purchaseBatch);
        }
        return purchaseBatches;
    }

    @Override
    public List<PackageHistoryDto> getPackageHistories() {
        List<PackageHistoryDto> packageHistories = adminDao.findPackageHistories();
        for (PackageHistoryDto packageHistory : packageHistories) {
            hydratePackageHistoryDefaults(packageHistory);
        }
        return packageHistories;
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
        hydratePurchaseBatchDefaults(purchaseBatch);
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
        adminDao.updatePurchaseBatchInventory(batchNo, purchaseBatch.getRemainingQty(), purchaseBatch.getStatus());
        if ("SELLING".equalsIgnoreCase(product.getSaleStatus())) {
            productPriceMatchService.refreshProductPriceMatch();
        }
        hydratePackageHistoryDefaults(request);
        return request;
    }

    @Override
    @Transactional
    public void cancelPackageHistory(Long packageNo) {
        PackageHistoryDto packageHistory = adminDao.findPackageHistory(packageNo);
        if (packageHistory == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Package history not found.");
        }

        PurchaseBatchDto purchaseBatch = adminDao.findPurchaseBatch(packageHistory.getBatchNo());
        if (purchaseBatch == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Purchase batch not found.");
        }
        hydratePurchaseBatchDefaults(purchaseBatch);
        hydratePackageHistoryDefaults(packageHistory);

        ProductDto product = adminDao.findAdminProduct(packageHistory.getProductNo());
        if (product == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Linked product not found.");
        }

        adminDao.deletePackageHistory(packageNo);
        adminDao.decreaseProductStock(product.getProductNo(), packageHistory.getPackagedQty());

        BigDecimal restoredRemainingQty = scaleAmount(
            defaultAmount(purchaseBatch.getRemainingQty()).add(defaultAmount(packageHistory.getTotalUsed()))
        );
        if (restoredRemainingQty.compareTo(defaultAmount(purchaseBatch.getSellableQty())) > 0) {
            restoredRemainingQty = defaultAmount(purchaseBatch.getSellableQty());
        }

        List<PackageHistoryDto> remainingPackageHistories = adminDao.findPackageHistoriesByBatch(purchaseBatch.getBatchNo());
        String nextBatchStatus = resolveBatchStatusAfterCancel(restoredRemainingQty, remainingPackageHistories, product);
        adminDao.updatePurchaseBatchInventory(purchaseBatch.getBatchNo(), restoredRemainingQty, nextBatchStatus);

        long nextStockQty = Math.max(0L, (product.getStockQty() == null ? 0L : product.getStockQty()) - packageHistory.getPackagedQty());
        product.setStockQty(nextStockQty);
        if (nextStockQty == 0L) {
            product.setSaleStatus("READY");
        }
        adminDao.updateAdminProduct(product);
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
            || request.getActualUnitPrice() == null
            || request.getPurchaseDate() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Required purchase fields are missing.");
        }

        if (trimToNull(request.getStatus()) == null) {
            request.setStatus("PURCHASED");
        }

        if (request.getPurchaseQty().compareTo(BigDecimal.ZERO) < 0
            || request.getActualUnitPrice().compareTo(BigDecimal.ZERO) < 0
            || defaultAmount(request.getLogisticsCost()).compareTo(BigDecimal.ZERO) < 0
            || defaultAmount(request.getCommissionRate()).compareTo(BigDecimal.ZERO) < 0
            || defaultAmount(request.getCommissionCost()).compareTo(BigDecimal.ZERO) < 0
            || defaultAmount(request.getOtherPurchaseCost()).compareTo(BigDecimal.ZERO) < 0
            || defaultAmount(request.getDiscardRate()).compareTo(BigDecimal.ZERO) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Purchase values cannot be negative.");
        }

        if (defaultAmount(request.getDiscardRate()).compareTo(new BigDecimal("100")) > 0
            || defaultAmount(request.getCommissionRate()).compareTo(new BigDecimal("100")) > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Discard rate cannot exceed 100 percent.");
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
            || request.getSalePrice().compareTo(BigDecimal.ZERO) <= 0
            || defaultAmount(request.getPackagingMaterialCost()).compareTo(BigDecimal.ZERO) < 0
            || defaultAmount(request.getPackagingLaborCost()).compareTo(BigDecimal.ZERO) < 0
            || defaultAmount(request.getOtherPackagingCost()).compareTo(BigDecimal.ZERO) < 0) {
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

    private void hydratePurchaseBatchDefaults(PurchaseBatchDto purchaseBatch) {
        purchaseBatch.setPurchaseQty(defaultAmount(purchaseBatch.getPurchaseQty()));
        purchaseBatch.setPurchasePrice(defaultAmount(purchaseBatch.getPurchasePrice()));
        purchaseBatch.setReferenceUnitPrice(defaultAmount(purchaseBatch.getReferenceUnitPrice()));
        purchaseBatch.setReferenceTotalPrice(defaultAmount(purchaseBatch.getReferenceTotalPrice()));
        purchaseBatch.setActualUnitPrice(defaultAmount(purchaseBatch.getActualUnitPrice()));
        purchaseBatch.setActualPurchaseAmount(defaultAmount(purchaseBatch.getActualPurchaseAmount()));
        purchaseBatch.setLogisticsCost(defaultAmount(purchaseBatch.getLogisticsCost()));
        purchaseBatch.setCommissionRate(defaultAmount(purchaseBatch.getCommissionRate()));
        purchaseBatch.setCommissionCost(defaultAmount(purchaseBatch.getCommissionCost()));
        purchaseBatch.setOtherPurchaseCost(defaultAmount(purchaseBatch.getOtherPurchaseCost()));
        purchaseBatch.setDiscardRate(defaultAmount(purchaseBatch.getDiscardRate()));
        purchaseBatch.setDiscardQty(defaultAmount(purchaseBatch.getDiscardQty()));
        purchaseBatch.setSellableQty(defaultAmount(purchaseBatch.getSellableQty()));
        purchaseBatch.setRemainingQty(defaultAmount(purchaseBatch.getRemainingQty()));
        purchaseBatch.setTotalPurchaseCost(defaultAmount(purchaseBatch.getTotalPurchaseCost()));
        purchaseBatch.setActualCostPerKg(defaultAmount(purchaseBatch.getActualCostPerKg()));
    }

    private void hydratePackageHistoryDefaults(PackageHistoryDto packageHistory) {
        packageHistory.setTotalUsed(defaultAmount(packageHistory.getTotalUsed()));
        packageHistory.setPackagedWeight(defaultAmount(packageHistory.getPackagedWeight()));
        packageHistory.setSalePrice(defaultAmount(packageHistory.getSalePrice()));
        packageHistory.setPackagingMaterialCost(defaultAmount(packageHistory.getPackagingMaterialCost()));
        packageHistory.setPackagingLaborCost(defaultAmount(packageHistory.getPackagingLaborCost()));
        packageHistory.setOtherPackagingCost(defaultAmount(packageHistory.getOtherPackagingCost()));
        packageHistory.setFinalCostPerKg(defaultAmount(packageHistory.getFinalCostPerKg()));
        packageHistory.setFinalCostPerPackage(defaultAmount(packageHistory.getFinalCostPerPackage()));
        packageHistory.setExpectedProfitPerUnit(defaultAmount(packageHistory.getExpectedProfitPerUnit()));
        packageHistory.setExpectedTotalProfit(defaultAmount(packageHistory.getExpectedTotalProfit()));
    }

    private void hydrateOrderSummary(OrderDto order) {
        order.setFinalAmount(defaultAmount(order.getFinalAmount()));
        order.setTotalSavedAmount(defaultAmount(order.getTotalSavedAmount()));
        order.setPaidAmount(defaultAmount(order.getPaidAmount()));
        hydrateOrderRuntimeState(order);
    }

    private void hydrateOrderRuntimeState(OrderDto order) {
        OrderCompatibilityUtils.hydrateOrderCompatibility(order);
    }

    @Override
    @Transactional
    public OrderDto acceptOrder(Long orderNo, Long actorUserNo) {
        OrderDto currentOrder = getOrderDetail(orderNo);
        if (!Boolean.TRUE.equals(currentOrder.getAcceptAvailable())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Order cannot be accepted in the current state.");
        }

        try {
            orderDao.startFulfillmentSimulation(orderNo, LocalDateTime.now());
        } catch (DataAccessException exception) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "DB??FULFILLMENT_STARTED_AT 而щ읆???놁뼱 二쇰Ц ?묒닔瑜??쒖옉?????놁뒿?덈떎. ALTER TABLE OFT_ORDERS ADD (FULFILLMENT_STARTED_AT TIMESTAMP)瑜?癒쇱? ?ㅽ뻾??二쇱꽭??"
            );
        }
        orderDao.insertOrderStatusHistory(
            orderNo,
            currentOrder.getOrderStatus(),
            "ORDER_ACCEPTED",
            "ADMIN",
            actorUserNo,
            "?댁쁺?먭? 二쇰Ц ?묒닔瑜??꾨즺?섍퀬 ?쒖뿰???먮룞 諛곗넚???쒖옉?덉뒿?덈떎."
        );
        return getOrderDetail(orderNo);
    }

    private boolean shouldExposeUserInAdmin(UserProfileDto user) {
        if (user == null) {
            return false;
        }

        if (!"USER".equals(user.getRole()) && !"ADMIN".equals(user.getRole()) && !"SUPER_ADMIN".equals(user.getRole())) {
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

    private boolean isAdminRole(String role) {
        return "ADMIN".equalsIgnoreCase(role) || "SUPER_ADMIN".equalsIgnoreCase(role);
    }

    private boolean isSuperAdminRole(String role) {
        return "SUPER_ADMIN".equalsIgnoreCase(role);
    }

    private void normalizePurchaseBatchRequest(PurchaseBatchDto request) {
        request.setProductName(request.getProductName().trim());
        request.setOrigin(trimToNull(request.getOrigin()));
        request.setPurchaseUnit(request.getPurchaseUnit().trim());
        request.setGrade(trimToNull(request.getGrade()));
        request.setSupplierType(trimToNull(request.getSupplierType()));
        request.setSupplierName(trimToNull(request.getSupplierName()));
        request.setStatus(request.getStatus().trim());
        request.setReferenceUnitPrice(defaultAmount(request.getReferenceUnitPrice()));
        request.setReferenceTotalPrice(defaultAmount(request.getReferenceTotalPrice()));
        request.setActualUnitPrice(defaultAmount(request.getActualUnitPrice()));
        request.setActualPurchaseAmount(defaultAmount(request.getActualPurchaseAmount()));
        request.setLogisticsCost(defaultAmount(request.getLogisticsCost()));
        request.setCommissionRate(defaultAmount(request.getCommissionRate()));
        request.setCommissionCost(defaultAmount(request.getCommissionCost()));
        request.setOtherPurchaseCost(defaultAmount(request.getOtherPurchaseCost()));
        request.setDiscardRate(defaultAmount(request.getDiscardRate()));
        applyPurchaseBatchDerivedAmounts(request);
    }

    private void normalizePackageHistoryRequest(PackageHistoryDto request) {
        request.setNote(trimToNull(request.getNote()));
        String saleStatus = trimToNull(request.getSaleStatus());
        request.setSaleStatus(saleStatus == null ? "SELLING" : saleStatus);
        request.setPackagingMaterialCost(defaultAmount(request.getPackagingMaterialCost()));
        request.setPackagingLaborCost(defaultAmount(request.getPackagingLaborCost()));
        request.setOtherPackagingCost(defaultAmount(request.getOtherPackagingCost()));
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
        applyPackageHistoryDerivedAmounts(purchaseBatch, request);
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

    private void applyPurchaseBatchDerivedAmounts(PurchaseBatchDto request) {
        BigDecimal purchaseQty = defaultAmount(request.getPurchaseQty());
        BigDecimal actualUnitPrice = defaultAmount(request.getActualUnitPrice());
        BigDecimal actualPurchaseAmount = defaultAmount(request.getActualPurchaseAmount());
        if (actualPurchaseAmount.compareTo(BigDecimal.ZERO) <= 0
            && purchaseQty.compareTo(BigDecimal.ZERO) > 0
            && actualUnitPrice.compareTo(BigDecimal.ZERO) >= 0) {
            actualPurchaseAmount = scaleAmount(actualUnitPrice.multiply(purchaseQty));
        }

        BigDecimal referenceUnitPrice = defaultAmount(request.getReferenceUnitPrice());
        BigDecimal referenceTotalPrice = defaultAmount(request.getReferenceTotalPrice());
        if (referenceTotalPrice.compareTo(BigDecimal.ZERO) <= 0
            && purchaseQty.compareTo(BigDecimal.ZERO) > 0
            && referenceUnitPrice.compareTo(BigDecimal.ZERO) >= 0) {
            referenceTotalPrice = scaleAmount(referenceUnitPrice.multiply(purchaseQty));
        }

        BigDecimal discardRate = defaultAmount(request.getDiscardRate());
        BigDecimal discardQty = scaleAmount(
            purchaseQty.multiply(discardRate).divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP)
        );

        if (discardQty.compareTo(purchaseQty) > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Discard quantity cannot exceed purchase quantity.");
        }

        BigDecimal commissionRate = defaultAmount(request.getCommissionRate());
        BigDecimal commissionCost = scaleAmount(
            actualPurchaseAmount.multiply(commissionRate).divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP)
        );
        BigDecimal sellableQty = scaleAmount(purchaseQty.subtract(discardQty));
        BigDecimal totalPurchaseCost = scaleAmount(
            actualPurchaseAmount
                .add(defaultAmount(request.getLogisticsCost()))
                .add(commissionCost)
                .add(defaultAmount(request.getOtherPurchaseCost()))
        );

        request.setPurchasePrice(totalPurchaseCost);
        request.setReferenceUnitPrice(referenceUnitPrice);
        request.setReferenceTotalPrice(referenceTotalPrice);
        request.setActualPurchaseAmount(actualPurchaseAmount);
        request.setCommissionCost(commissionCost);
        request.setDiscardQty(discardQty);
        request.setSellableQty(sellableQty.max(BigDecimal.ZERO));
        request.setRemainingQty(sellableQty.max(BigDecimal.ZERO));
        request.setTotalPurchaseCost(totalPurchaseCost);
        request.setActualCostPerKg(calculateCostPerStandardUnit(request.getPurchaseUnit(), sellableQty, totalPurchaseCost));
    }

    private void applyPackageHistoryDerivedAmounts(PurchaseBatchDto purchaseBatch, PackageHistoryDto request) {
        BigDecimal totalUsed = calculatePackageTotalUsed(purchaseBatch.getPurchaseUnit(), request);
        BigDecimal remainingQty = defaultAmount(purchaseBatch.getRemainingQty());
        if (remainingQty.compareTo(BigDecimal.ZERO) <= 0) {
            remainingQty = defaultAmount(purchaseBatch.getSellableQty());
        }
        if (totalUsed.compareTo(remainingQty) > 0) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Packaged quantity exceeds remaining inventory."
            );
        }

        BigDecimal totalPackagingCost = scaleAmount(
            defaultAmount(request.getPackagingMaterialCost())
                .add(defaultAmount(request.getPackagingLaborCost()))
                .add(defaultAmount(request.getOtherPackagingCost()))
        );
        BigDecimal totalPurchaseCost = defaultAmount(purchaseBatch.getTotalPurchaseCost());
        BigDecimal finalCostPerKg = calculateCostPerStandardUnit(
            purchaseBatch.getPurchaseUnit(),
            defaultAmount(purchaseBatch.getSellableQty()),
            totalPurchaseCost.add(totalPackagingCost)
        );

        BigDecimal finalCostPerPackage = calculatePackageUnitCost(
            purchaseBatch.getPurchaseUnit(),
            request.getPackagedWeight(),
            request.getPackagedQty(),
            finalCostPerKg,
            totalPurchaseCost.add(totalPackagingCost)
        );

        request.setTotalUsed(totalUsed);
        request.setFinalCostPerKg(finalCostPerKg);
        request.setFinalCostPerPackage(finalCostPerPackage);
        request.setExpectedProfitPerUnit(scaleAmount(defaultAmount(request.getSalePrice()).subtract(finalCostPerPackage)));
        request.setExpectedTotalProfit(
            scaleAmount(request.getExpectedProfitPerUnit().multiply(BigDecimal.valueOf(request.getPackagedQty().longValue())))
        );

        BigDecimal nextRemainingQty = scaleAmount(remainingQty.subtract(totalUsed)).max(BigDecimal.ZERO);
        purchaseBatch.setRemainingQty(nextRemainingQty);
        purchaseBatch.setStatus(resolveBatchStatusAfterPackage(nextRemainingQty, request.getSaleStatus()));
    }

    private BigDecimal calculatePackageTotalUsed(String unit, PackageHistoryDto request) {
        return scaleAmount(
            BigDecimal.valueOf(request.getPackagedQty().longValue()).multiply(defaultAmount(request.getPackagedWeight()))
        );
    }

    private String resolveBatchStatusAfterPackage(BigDecimal remainingQty, String saleStatus) {
        if (remainingQty.compareTo(BigDecimal.ZERO) <= 0) {
            if ("SELLING".equalsIgnoreCase(saleStatus)) {
                return "ON_SALE";
            }
            if ("SOLD_OUT".equalsIgnoreCase(saleStatus) || "STOP".equalsIgnoreCase(saleStatus)) {
                return "ENDED";
            }
            return "COMPLETED";
        }

        if ("SELLING".equalsIgnoreCase(saleStatus)) {
            return "ON_SALE";
        }

        return "PROCESSING";
    }

    private String resolveBatchStatusAfterCancel(
        BigDecimal restoredRemainingQty,
        List<PackageHistoryDto> remainingPackageHistories,
        ProductDto product
    ) {
        if (remainingPackageHistories == null || remainingPackageHistories.isEmpty()) {
            return "PURCHASED";
        }

        if ("SELLING".equalsIgnoreCase(product.getSaleStatus()) && restoredRemainingQty.compareTo(BigDecimal.ZERO) > 0) {
            return "ON_SALE";
        }

        if (restoredRemainingQty.compareTo(BigDecimal.ZERO) <= 0) {
            return "COMPLETED";
        }

        return "PROCESSING";
    }

    private BigDecimal calculatePackageUnitCost(
        String unit,
        BigDecimal packagedWeight,
        Integer packagedQty,
        BigDecimal finalCostPerKg,
        BigDecimal totalCost
    ) {
        if (packagedQty == null || packagedQty < 1) {
            return BigDecimal.ZERO;
        }

        NormalizedQuantity normalizedPackageWeight = normalizeQuantity(packagedWeight, unit);
        if (normalizedPackageWeight == null) {
            return scaleAmount(totalCost.divide(BigDecimal.valueOf(packagedQty.longValue()), 2, RoundingMode.HALF_UP));
        }

        if ("WEIGHT".equals(normalizedPackageWeight.type)) {
            return scaleAmount(
                finalCostPerKg.multiply(
                    normalizedPackageWeight.amount.divide(new BigDecimal("1000"), 6, RoundingMode.HALF_UP)
                )
            );
        }

        if ("VOLUME".equals(normalizedPackageWeight.type)) {
            return scaleAmount(
                finalCostPerKg.multiply(
                    normalizedPackageWeight.amount.divide(new BigDecimal("1000"), 6, RoundingMode.HALF_UP)
                )
            );
        }

        return scaleAmount(finalCostPerKg.multiply(normalizedPackageWeight.amount));
    }

    private BigDecimal calculateCostPerStandardUnit(String unit, BigDecimal quantity, BigDecimal totalCost) {
        NormalizedQuantity normalizedQuantity = normalizeQuantity(quantity, unit);
        if (normalizedQuantity == null || normalizedQuantity.amount.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }

        BigDecimal divisor = normalizedQuantity.amount;
        if ("WEIGHT".equals(normalizedQuantity.type) || "VOLUME".equals(normalizedQuantity.type)) {
            divisor = normalizedQuantity.amount.divide(new BigDecimal("1000"), 6, RoundingMode.HALF_UP);
        }

        if (divisor.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }

        return scaleAmount(totalCost.divide(divisor, 2, RoundingMode.HALF_UP));
    }

    private NormalizedQuantity normalizeQuantity(BigDecimal quantity, String unit) {
        BigDecimal safeQuantity = defaultAmount(quantity);
        String normalizedUnit = uppercase(trimToNull(unit));
        if (normalizedUnit == null) {
            return null;
        }

        if ("KG".equals(normalizedUnit)) {
            return new NormalizedQuantity("WEIGHT", safeQuantity.multiply(new BigDecimal("1000")));
        }
        if ("G".equals(normalizedUnit)) {
            return new NormalizedQuantity("WEIGHT", safeQuantity);
        }
        if ("L".equals(normalizedUnit) || "LITER".equals(normalizedUnit) || "LITRE".equals(normalizedUnit) || "由ы꽣".equals(unit)) {
            return new NormalizedQuantity("VOLUME", safeQuantity.multiply(new BigDecimal("1000")));
        }
        if ("ML".equals(normalizedUnit)) {
            return new NormalizedQuantity("VOLUME", safeQuantity);
        }
        return new NormalizedQuantity("COUNT", safeQuantity);
    }

    private BigDecimal scaleAmount(BigDecimal amount) {
        return defaultAmount(amount).setScale(2, RoundingMode.HALF_UP);
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

    private String getHubLocationName(String courierName) {
        String carrierCode = OrderCompatibilityUtils.resolveCarrierCode(courierName);
        if ("CJ".equalsIgnoreCase(carrierCode)) {
            return "CJ 동남권 허브터미널";
        }
        if ("LOGEN".equalsIgnoreCase(carrierCode)) {
            return "로젠 중부권 허브터미널";
        }
        if ("HANJIN".equalsIgnoreCase(carrierCode)) {
            return "한진 수도권 허브터미널";
        }
        return "택배사 중간 허브터미널";
    }

    private String getHubLocationAddress(String courierName) {
        String carrierCode = OrderCompatibilityUtils.resolveCarrierCode(courierName);
        if ("CJ".equalsIgnoreCase(carrierCode)) {
            return "경기도 용인시 처인구 백암면 중앙대로 798 CJ 동남권 허브터미널";
        }
        if ("LOGEN".equalsIgnoreCase(carrierCode)) {
            return "충청북도 청주시 흥덕구 강내면 서성목연로 320 로젠 중부권 허브터미널";
        }
        if ("HANJIN".equalsIgnoreCase(carrierCode)) {
            return "경기도 군포시 번영로 82 한진 수도권 허브터미널";
        }
        return "경기도 용인시 처인구 백암면 중앙대로 798 택배사 중간 허브터미널";
    }

    private String getDestinationLocationName(OrderDto order) {
        String recipientName = trimToNull(order == null ? null : order.getRecipientName());
        return recipientName == null ? "고객 배송지" : recipientName + "님 배송지";
    }

    private String getDestinationLocationAddress(OrderDto order) {
        if (order == null) {
            return null;
        }

        StringBuilder builder = new StringBuilder();
        appendLocationPart(builder, order.getZipCode());
        appendLocationPart(builder, order.getAddress1());
        appendLocationPart(builder, order.getAddress2());
        return builder.length() == 0 ? null : builder.toString();
    }

    private void appendLocationPart(StringBuilder builder, String value) {
        String trimmed = trimToNull(value);
        if (trimmed == null) {
            return;
        }
        if (builder.length() > 0) {
            builder.append(' ');
        }
        builder.append(trimmed);
    }

    private static final class NormalizedQuantity {
        private final String type;
        private final BigDecimal amount;

        private NormalizedQuantity(String type, BigDecimal amount) {
            this.type = type;
            this.amount = amount;
        }
    }
}
