package com.app.dao;

import java.util.List;

import com.app.dto.MainBannerDto;
import com.app.dto.OrderDto;
import com.app.dto.PackageHistoryDto;
import com.app.dto.ProductCategoryDto;
import com.app.dto.ProductDto;
import com.app.dto.ProductImageDto;
import com.app.dto.ProductRecipeDto;
import com.app.dto.PurchaseBatchDto;
import com.app.dto.UserProfileDto;

public interface AdminDao {

    List<ProductCategoryDto> findProductCategories();

    List<ProductDto> findAdminProducts();

    ProductDto findAdminProduct(Long productNo);

    ProductDto findNewestAdminProduct(ProductDto product);

    int insertAdminProduct(ProductDto product);

    int updateAdminProduct(ProductDto product);

    List<ProductImageDto> findProductImages(Long productNo);

    int deleteProductImages(Long productNo);

    int insertProductImage(ProductImageDto productImage);

    int countOrderItemsByProduct(Long productNo);

    int deleteCartItemsByProduct(Long productNo);

    int deleteWishlistByProduct(Long productNo);

    int deleteReviewImagesByProduct(Long productNo);

    int deleteReviewsByProduct(Long productNo);

    int deleteProductRecipeMappings(Long productNo);

    int deleteProductPriceMatches(Long productNo);

    int deleteProductPriceCodeMaps(Long productNo);

    int deletePackageHistoriesByProduct(Long productNo);

    int deleteAdminProduct(Long productNo);

    List<OrderDto> findAdminOrders();

    OrderDto findAdminOrderDetail(Long orderNo);

    int updateAdminOrderStatus(Long orderNo, String orderStatus);

    int updateAdminDeliveryTracking(Long orderNo, String trackingNo, String courierName);

    int updateAdminDeliveryForShipping(Long orderNo, String trackingNo, String courierName);

    int updateAdminDeliveryForDelivered(Long orderNo);

    int deleteReviewImagesByOrder(Long orderNo);

    int deleteReviewsByOrder(Long orderNo);

    int deletePaymentByOrder(Long orderNo);

    int deleteDeliveryByOrder(Long orderNo);

    int deleteOrderItemsByOrder(Long orderNo);

    int deleteOrder(Long orderNo);

    List<UserProfileDto> findAdminUsers();

    UserProfileDto findAdminUser(Long userNo);

    int updateAdminUserStatus(Long userNo, String status);

    int countPackageHistoriesByUser(Long userNo);

    int deleteReviewImagesByUser(Long userNo);

    int deleteReviewsByUser(Long userNo);

    int deleteWishlistByUser(Long userNo);

    int deleteCartItemsByUser(Long userNo);

    int deleteCartByUser(Long userNo);

    int deleteUserAddresses(Long userNo);

    int deleteTermsAgreementsByUser(Long userNo);

    int deleteUserMonthlyStats(Long userNo);

    int deletePaymentsByUser(Long userNo);

    int deleteDeliveriesByUser(Long userNo);

    int deleteOrderItemsByUser(Long userNo);

    int deleteOrdersByUser(Long userNo);

    int deleteAdminUser(Long userNo);

    List<PurchaseBatchDto> findPurchaseBatches();

    PurchaseBatchDto findPurchaseBatch(Long batchNo);

    PurchaseBatchDto findNewestPurchaseBatch(PurchaseBatchDto purchaseBatch);

    int insertPurchaseBatch(PurchaseBatchDto purchaseBatch);

    List<PackageHistoryDto> findPackageHistories();

    int insertPackageHistory(PackageHistoryDto packageHistory);

    int updatePurchaseBatchStatus(Long batchNo, String status);

    int increaseProductStock(Long productNo, Integer quantity);

    List<MainBannerDto> findMainBanners();

    List<ProductRecipeDto> findRecipeMappings();
}
