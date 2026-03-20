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
    public int updateAdminDeliveryForDelivered(Long orderNo) {
        return sqlSessionTemplate.update(NAMESPACE + "updateAdminDeliveryForDelivered", orderNo);
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
    public List<PackageHistoryDto> findPackageHistories() {
        return sqlSessionTemplate.selectList(NAMESPACE + "selectPackageHistories");
    }

    @Override
    public int insertPackageHistory(PackageHistoryDto packageHistory) {
        return sqlSessionTemplate.insert(NAMESPACE + "insertPackageHistory", packageHistory);
    }

    @Override
    public int updatePurchaseBatchStatus(Long batchNo, String status) {
        Map<String, Object> params = new HashMap<>();
        params.put("batchNo", batchNo);
        params.put("status", status);
        return sqlSessionTemplate.update(NAMESPACE + "updatePurchaseBatchStatus", params);
    }

    @Override
    public int increaseProductStock(Long productNo, Integer quantity) {
        Map<String, Object> params = new HashMap<>();
        params.put("productNo", productNo);
        params.put("quantity", quantity);
        return sqlSessionTemplate.update(NAMESPACE + "increaseProductStock", params);
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
