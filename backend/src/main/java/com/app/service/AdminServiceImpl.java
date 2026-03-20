package com.app.service;

import java.math.BigDecimal;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.app.dao.AdminDao;
import com.app.dao.OrderDao;
import com.app.dto.MainBannerDto;
import com.app.dto.OrderDto;
import com.app.dto.OrderItemDto;
import com.app.dto.PackageHistoryDto;
import com.app.dto.ProductCategoryDto;
import com.app.dto.ProductDto;
import com.app.dto.ProductImageDto;
import com.app.dto.ProductRecipeDto;
import com.app.dto.PurchaseBatchDto;
import com.app.dto.UserProfileDto;
import org.springframework.web.multipart.MultipartFile;

@Service
public class AdminServiceImpl implements AdminService {

    @Autowired
    private AdminDao adminDao;

    @Autowired
    private OrderDao orderDao;

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
                "Ordered products cannot be permanently deleted."
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
        List<OrderDto> orders = adminDao.findAdminOrders();
        for (OrderDto order : orders) {
            hydrateOrderSummary(order);
        }
        return orders;
    }

    @Override
    public OrderDto getOrderDetail(Long orderNo) {
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
                String resolvedTrackingNo = trackingNo == null
                    ? "TRK-" + currentOrder.getOrderId()
                    : trackingNo;
                adminDao.updateAdminOrderStatus(orderNo, "SHIPPING");
                adminDao.updateAdminDeliveryForShipping(orderNo, resolvedTrackingNo, courierName);
            } else if ("COMPLETED".equals(nextStatus)) {
                adminDao.updateAdminOrderStatus(orderNo, "COMPLETED");
                adminDao.updateAdminDeliveryForDelivered(orderNo);
            } else if ("PAID".equals(nextStatus) || "CREATED".equals(nextStatus)) {
                adminDao.updateAdminOrderStatus(orderNo, nextStatus);
            } else {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported order status.");
            }
        }

        return getOrderDetail(orderNo);
    }

    @Override
    public List<UserProfileDto> getUsers() {
        List<UserProfileDto> users = adminDao.findAdminUsers();
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

        validatePackageHistoryRequest(request);

        request.setBatchNo(batchNo);
        request.setUserNo(userNo);
        adminDao.insertPackageHistory(request);
        adminDao.increaseProductStock(request.getProductNo(), request.getPackagedQty());
        adminDao.updatePurchaseBatchStatus(batchNo, "PACKAGED");
        return request;
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
            || request.getProductNo() == null
            || request.getPackagedQty() == null
            || request.getPackagedQty() < 1
            || request.getPackagedWeight() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Required package fields are missing.");
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
        return trimmed.isEmpty() ? null : trimmed;
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
