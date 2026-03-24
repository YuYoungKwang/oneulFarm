package com.app.service;

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
import org.springframework.web.multipart.MultipartFile;

public interface AdminService {

    List<ProductCategoryDto> getProductCategories();

    List<ProductDto> getProducts();

    ProductDto saveProduct(ProductDto request);

    List<ProductImageDto> saveProductImages(Long productNo, List<MultipartFile> files);

    void deleteProduct(Long productNo);

    List<OrderDto> getOrders();

    OrderDto getOrderDetail(Long orderNo);

    OrderDto updateOrder(Long orderNo, OrderDto request);

    void deleteOrder(Long orderNo);

    List<UserProfileDto> getUsers();

    UserProfileDto updateUserStatus(Long userNo, UserProfileDto request);

    void deleteUser(Long userNo);

    List<PurchaseBatchDto> getPurchaseBatches();

    List<PackageHistoryDto> getPackageHistories();

    PurchaseBatchDto createPurchaseBatch(PurchaseBatchDto request);

    PackageHistoryDto packageBatch(Long userNo, Long batchNo, PackageHistoryDto request);

    void deletePurchaseBatch(Long batchNo);

    List<MainBannerDto> getMainBanners();

    List<ProductRecipeDto> getRecipeMappings();
}
