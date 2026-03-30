package com.app.dao;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.mybatis.spring.SqlSessionTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import com.app.dto.MainBannerDto;
import com.app.dto.OrderDto;
import com.app.dto.PackageHistoryDto;
import com.app.dto.ProductCategoryDto;
import com.app.dto.ProductPriceCodeMapDTO;
import com.app.dto.ProductDto;
import com.app.dto.ProductImageDto;
import com.app.dto.ProductRecipeDto;
import com.app.dto.PurchaseBatchDto;
import com.app.dto.UserProfileDto;

@Repository
public class AdminDaoImpl implements AdminDao {

    private static final String NAMESPACE = "adminMapper.";

    @Autowired
    private SqlSessionTemplate sqlSessionTemplate;

    @Override
    public List<ProductCategoryDto> findProductCategories() {
        return sqlSessionTemplate.selectList(NAMESPACE + "selectProductCategories");
    }

    @Override
    public List<ProductDto> findAdminProducts() {
        return sqlSessionTemplate.selectList(NAMESPACE + "selectAdminProducts");
    }

    @Override
    public ProductDto findAdminProduct(Long productNo) {
        return sqlSessionTemplate.selectOne(NAMESPACE + "selectAdminProduct", productNo);
    }

    @Override
    public ProductDto findNewestAdminProduct(ProductDto product) {
        return sqlSessionTemplate.selectOne(NAMESPACE + "selectNewestAdminProduct", product);
    }

    @Override
    public int insertAdminProduct(ProductDto product) {
        return sqlSessionTemplate.insert(NAMESPACE + "insertAdminProduct", product);
    }

    @Override
    public int updateAdminProduct(ProductDto product) {
        return sqlSessionTemplate.update(NAMESPACE + "updateAdminProduct", product);
    }

    @Override
    public List<ProductImageDto> findProductImages(Long productNo) {
        return sqlSessionTemplate.selectList(NAMESPACE + "selectAdminProductImages", productNo);
    }

    @Override
    public int deleteProductImages(Long productNo) {
        return sqlSessionTemplate.delete(NAMESPACE + "deleteAdminProductImages", productNo);
    }

    @Override
    public int insertProductImage(ProductImageDto productImage) {
        return sqlSessionTemplate.insert(NAMESPACE + "insertAdminProductImage", productImage);
    }

    @Override
    public int countOrderItemsByProduct(Long productNo) {
        return sqlSessionTemplate.selectOne(NAMESPACE + "countAdminOrderItemsByProduct", productNo);
    }

    @Override
    public int deleteCartItemsByProduct(Long productNo) {
        return sqlSessionTemplate.delete(NAMESPACE + "deleteAdminCartItemsByProduct", productNo);
    }

    @Override
    public int deleteWishlistByProduct(Long productNo) {
        return sqlSessionTemplate.delete(NAMESPACE + "deleteAdminWishlistByProduct", productNo);
    }

    @Override
    public int deleteReviewImagesByProduct(Long productNo) {
        return sqlSessionTemplate.delete(NAMESPACE + "deleteAdminReviewImagesByProduct", productNo);
    }

    @Override
    public int deleteReviewsByProduct(Long productNo) {
        return sqlSessionTemplate.delete(NAMESPACE + "deleteAdminReviewsByProduct", productNo);
    }

    @Override
    public int deleteProductRecipeMappings(Long productNo) {
        return sqlSessionTemplate.delete(NAMESPACE + "deleteAdminProductRecipeMappings", productNo);
    }

    @Override
    public int deleteProductPriceMatches(Long productNo) {
        return sqlSessionTemplate.delete(NAMESPACE + "deleteAdminProductPriceMatches", productNo);
    }

    @Override
    public int deleteProductPriceCodeMaps(Long productNo) {
        return sqlSessionTemplate.delete(NAMESPACE + "deleteAdminProductPriceCodeMaps", productNo);
    }

    @Override
    public int insertProductPriceCodeMap(ProductPriceCodeMapDTO productPriceCodeMap) {
        return sqlSessionTemplate.insert(NAMESPACE + "insertAdminProductPriceCodeMap", productPriceCodeMap);
    }

    @Override
    public int deletePackageHistoriesByProduct(Long productNo) {
        return sqlSessionTemplate.delete(NAMESPACE + "deleteAdminPackageHistoriesByProduct", productNo);
    }

    @Override
    public int deleteAdminProduct(Long productNo) {
        return sqlSessionTemplate.delete(NAMESPACE + "deleteAdminProduct", productNo);
    }

    @Override
    public List<OrderDto> findAdminOrders() {
        return sqlSessionTemplate.selectList(NAMESPACE + "selectAdminOrders");
    }

    @Override
    public OrderDto findAdminOrderDetail(Long orderNo) {
        return sqlSessionTemplate.selectOne(NAMESPACE + "selectAdminOrderDetail", orderNo);
    }

    @Override
    public int updateAdminOrderStatus(Long orderNo, String orderStatus) {
        Map<String, Object> params = new HashMap<>();
        params.put("orderNo", orderNo);
        params.put("orderStatus", orderStatus);
        return sqlSessionTemplate.update(NAMESPACE + "updateAdminOrderStatus", params);
    }

    @Override
    public int updateAdminDeliveryTracking(Long orderNo, String trackingNo, String courierName) {
        Map<String, Object> params = new HashMap<>();
        params.put("orderNo", orderNo);
        params.put("trackingNo", trackingNo);
        params.put("courierName", courierName);
        return sqlSessionTemplate.update(NAMESPACE + "updateAdminDeliveryTracking", params);
    }

    @Override
    public int updateAdminDeliveryForShipping(Long orderNo, String trackingNo, String courierName) {
        Map<String, Object> params = new HashMap<>();
        params.put("orderNo", orderNo);
        params.put("trackingNo", trackingNo);
        params.put("courierName", courierName);
        return sqlSessionTemplate.update(NAMESPACE + "updateAdminDeliveryForShipping", params);
    }

    @Override
    public int updateAdminDeliveryForPickup(Long orderNo, String trackingNo, String courierName) {
        Map<String, Object> params = new HashMap<>();
        params.put("orderNo", orderNo);
        params.put("trackingNo", trackingNo);
        params.put("courierName", courierName);
        return sqlSessionTemplate.update(NAMESPACE + "updateAdminDeliveryForPickup", params);
    }

    @Override
    public int updateAdminDeliveryForDelivered(Long orderNo) {
        return sqlSessionTemplate.update(NAMESPACE + "updateAdminDeliveryForDelivered", orderNo);
    }

    @Override
    public int deleteReviewImagesByOrder(Long orderNo) {
        return sqlSessionTemplate.delete(NAMESPACE + "deleteAdminReviewImagesByOrder", orderNo);
    }

    @Override
    public int deleteReviewsByOrder(Long orderNo) {
        return sqlSessionTemplate.delete(NAMESPACE + "deleteAdminReviewsByOrder", orderNo);
    }

    @Override
    public int deletePaymentByOrder(Long orderNo) {
        return sqlSessionTemplate.delete(NAMESPACE + "deleteAdminPaymentByOrder", orderNo);
    }

    @Override
    public int deleteDeliveryByOrder(Long orderNo) {
        return sqlSessionTemplate.delete(NAMESPACE + "deleteAdminDeliveryByOrder", orderNo);
    }

    @Override
    public int deleteOrderItemsByOrder(Long orderNo) {
        return sqlSessionTemplate.delete(NAMESPACE + "deleteAdminOrderItemsByOrder", orderNo);
    }

    @Override
    public int deleteOrder(Long orderNo) {
        return sqlSessionTemplate.delete(NAMESPACE + "deleteAdminOrder", orderNo);
    }

    @Override
    public List<UserProfileDto> findAdminUsers() {
        return sqlSessionTemplate.selectList(NAMESPACE + "selectAdminUsers");
    }

    @Override
    public UserProfileDto findAdminUser(Long userNo) {
        return sqlSessionTemplate.selectOne(NAMESPACE + "selectAdminUser", userNo);
    }

    @Override
    public int updateAdminUserStatus(Long userNo, String status) {
        Map<String, Object> params = new HashMap<>();
        params.put("userNo", userNo);
        params.put("status", status);
        return sqlSessionTemplate.update(NAMESPACE + "updateAdminUserStatus", params);
    }

    @Override
    public int updateAdminUserRole(Long userNo, String role) {
        Map<String, Object> params = new HashMap<>();
        params.put("userNo", userNo);
        params.put("role", role);
        return sqlSessionTemplate.update(NAMESPACE + "updateAdminUserRole", params);
    }

    @Override
    public int countPackageHistoriesByUser(Long userNo) {
        return sqlSessionTemplate.selectOne(NAMESPACE + "countAdminPackageHistoriesByUser", userNo);
    }

    @Override
    public int deleteReviewImagesByUser(Long userNo) {
        return sqlSessionTemplate.delete(NAMESPACE + "deleteAdminReviewImagesByUser", userNo);
    }

    @Override
    public int deleteReviewsByUser(Long userNo) {
        return sqlSessionTemplate.delete(NAMESPACE + "deleteAdminReviewsByUserAccount", userNo);
    }

    @Override
    public int deleteWishlistByUser(Long userNo) {
        return sqlSessionTemplate.delete(NAMESPACE + "deleteAdminWishlistByUser", userNo);
    }

    @Override
    public int deleteCartItemsByUser(Long userNo) {
        return sqlSessionTemplate.delete(NAMESPACE + "deleteAdminCartItemsByUser", userNo);
    }

    @Override
    public int deleteCartByUser(Long userNo) {
        return sqlSessionTemplate.delete(NAMESPACE + "deleteAdminCartByUser", userNo);
    }

    @Override
    public int deleteUserAddresses(Long userNo) {
        return sqlSessionTemplate.delete(NAMESPACE + "deleteAdminUserAddresses", userNo);
    }

    @Override
    public int deleteTermsAgreementsByUser(Long userNo) {
        return sqlSessionTemplate.delete(NAMESPACE + "deleteAdminTermsAgreementsByUser", userNo);
    }

    @Override
    public int deleteUserMonthlyStats(Long userNo) {
        return sqlSessionTemplate.delete(NAMESPACE + "deleteAdminUserMonthlyStats", userNo);
    }

    @Override
    public int deletePaymentsByUser(Long userNo) {
        return sqlSessionTemplate.delete(NAMESPACE + "deleteAdminPaymentsByUser", userNo);
    }

    @Override
    public int deleteDeliveriesByUser(Long userNo) {
        return sqlSessionTemplate.delete(NAMESPACE + "deleteAdminDeliveriesByUser", userNo);
    }

    @Override
    public int deleteOrderItemsByUser(Long userNo) {
        return sqlSessionTemplate.delete(NAMESPACE + "deleteAdminOrderItemsByUser", userNo);
    }

    @Override
    public int deleteOrdersByUser(Long userNo) {
        return sqlSessionTemplate.delete(NAMESPACE + "deleteAdminOrdersByUser", userNo);
    }

    @Override
    public int deleteAdminUser(Long userNo) {
        return sqlSessionTemplate.delete(NAMESPACE + "deleteAdminUser", userNo);
    }

    @Override
    public List<PurchaseBatchDto> findPurchaseBatches() {
        return sqlSessionTemplate.selectList(NAMESPACE + "selectPurchaseBatches");
    }

    @Override
    public PurchaseBatchDto findPurchaseBatch(Long batchNo) {
        return sqlSessionTemplate.selectOne(NAMESPACE + "selectPurchaseBatch", batchNo);
    }

    @Override
    public PurchaseBatchDto findNewestPurchaseBatch(PurchaseBatchDto purchaseBatch) {
        return sqlSessionTemplate.selectOne(NAMESPACE + "selectNewestPurchaseBatch", purchaseBatch);
    }

    @Override
    public int insertPurchaseBatch(PurchaseBatchDto purchaseBatch) {
        return sqlSessionTemplate.insert(NAMESPACE + "insertPurchaseBatch", purchaseBatch);
    }

    @Override
    public int updatePurchaseBatchProduct(Long batchNo, Long productNo) {
        Map<String, Object> params = new HashMap<>();
        params.put("batchNo", batchNo);
        params.put("productNo", productNo);
        return sqlSessionTemplate.update(NAMESPACE + "updatePurchaseBatchProduct", params);
    }

    @Override
    public List<PackageHistoryDto> findPackageHistories() {
        return sqlSessionTemplate.selectList(NAMESPACE + "selectPackageHistories");
    }

    @Override
    public List<PackageHistoryDto> findPackageHistoriesByBatch(Long batchNo) {
        return sqlSessionTemplate.selectList(NAMESPACE + "selectPackageHistoriesByBatch", batchNo);
    }

    @Override
    public PackageHistoryDto findPackageHistory(Long packageNo) {
        return sqlSessionTemplate.selectOne(NAMESPACE + "selectPackageHistory", packageNo);
    }

    @Override
    public int insertPackageHistory(PackageHistoryDto packageHistory) {
        return sqlSessionTemplate.insert(NAMESPACE + "insertPackageHistory", packageHistory);
    }

    @Override
    public int deletePackageHistory(Long packageNo) {
        return sqlSessionTemplate.delete(NAMESPACE + "deletePackageHistory", packageNo);
    }

    @Override
    public int deletePackageHistoriesByBatch(Long batchNo) {
        return sqlSessionTemplate.delete(NAMESPACE + "deletePackageHistoriesByBatch", batchNo);
    }

    @Override
    public int deletePurchaseBatch(Long batchNo) {
        return sqlSessionTemplate.delete(NAMESPACE + "deletePurchaseBatch", batchNo);
    }

    @Override
    public int updatePurchaseBatchStatus(Long batchNo, String status) {
        Map<String, Object> params = new HashMap<>();
        params.put("batchNo", batchNo);
        params.put("status", status);
        return sqlSessionTemplate.update(NAMESPACE + "updatePurchaseBatchStatus", params);
    }

    @Override
    public int updatePurchaseBatchInventory(Long batchNo, java.math.BigDecimal remainingQty, String status) {
        Map<String, Object> params = new HashMap<>();
        params.put("batchNo", batchNo);
        params.put("remainingQty", remainingQty);
        params.put("status", status);
        return sqlSessionTemplate.update(NAMESPACE + "updatePurchaseBatchInventory", params);
    }

    @Override
    public int increaseProductStock(Long productNo, Integer quantity) {
        Map<String, Object> params = new HashMap<>();
        params.put("productNo", productNo);
        params.put("quantity", quantity);
        return sqlSessionTemplate.update(NAMESPACE + "increaseProductStock", params);
    }

    @Override
    public int decreaseProductStock(Long productNo, Integer quantity) {
        Map<String, Object> params = new HashMap<>();
        params.put("productNo", productNo);
        params.put("quantity", quantity);
        return sqlSessionTemplate.update(NAMESPACE + "decreaseProductStock", params);
    }

    @Override
    public List<MainBannerDto> findMainBanners() {
        return sqlSessionTemplate.selectList(NAMESPACE + "selectMainBanners");
    }

    @Override
    public List<ProductRecipeDto> findRecipeMappings() {
        return sqlSessionTemplate.selectList(NAMESPACE + "selectRecipeMappings");
    }
}
