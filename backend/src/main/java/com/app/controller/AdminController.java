package com.app.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.app.common.ApiResponse;
import com.app.dto.MainBannerDto;
import com.app.dto.OrderDto;
import com.app.dto.PackageHistoryDto;
import com.app.dto.ProductCategoryDto;
import com.app.dto.ProductDto;
import com.app.dto.ProductImageDto;
import com.app.dto.ProductRecipeDto;
import com.app.dto.PurchaseBatchDto;
import com.app.dto.UserProfileDto;
import com.app.service.AdminService;

@RestController
@RequestMapping(value = "/api/admin", produces = MediaType.APPLICATION_JSON_VALUE)
public class AdminController {

    @Autowired
    private AdminService adminService;

    @GetMapping("/product-categories")
    public ApiResponse<List<ProductCategoryDto>> getProductCategories() {
        return ApiResponse.success(adminService.getProductCategories(), "Product categories loaded.");
    }

    @GetMapping("/products")
    public ApiResponse<List<ProductDto>> getProducts() {
        return ApiResponse.success(adminService.getProducts(), "Admin products loaded.");
    }

    @PostMapping(value = "/products", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ApiResponse<ProductDto> saveProduct(
        @RequestBody ProductDto request
    ) {
        return ApiResponse.success(adminService.saveProduct(request), "Product saved.");
    }

    @PatchMapping(value = "/products/{productNo}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ApiResponse<ProductDto> updateProduct(
        @PathVariable Long productNo,
        @RequestBody ProductDto request
    ) {
        request.setProductNo(productNo);
        return ApiResponse.success(adminService.saveProduct(request), "Product updated.");
    }

    @PostMapping(value = "/products/{productNo}/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<List<ProductImageDto>> uploadProductImages(
        @PathVariable Long productNo,
        @RequestParam("files") List<MultipartFile> files
    ) {
        return ApiResponse.success(
            adminService.saveProductImages(productNo, files),
            "Product images uploaded."
        );
    }

    @DeleteMapping("/products/{productNo}")
    public ApiResponse<Void> deleteProduct(
        @PathVariable Long productNo
    ) {
        adminService.deleteProduct(productNo);
        return ApiResponse.success(null, "Product deleted.");
    }

    @GetMapping("/orders")
    public ApiResponse<List<OrderDto>> getOrders() {
        return ApiResponse.success(adminService.getOrders(), "Admin orders loaded.");
    }

    @GetMapping("/orders/{orderNo}")
    public ApiResponse<OrderDto> getOrderDetail(
        @PathVariable Long orderNo
    ) {
        return ApiResponse.success(adminService.getOrderDetail(orderNo), "Admin order detail loaded.");
    }

    @PatchMapping(value = "/orders/{orderNo}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ApiResponse<OrderDto> updateOrder(
        @PathVariable Long orderNo,
        @RequestBody OrderDto request
    ) {
        return ApiResponse.success(adminService.updateOrder(orderNo, request), "Admin order updated.");
    }

    @GetMapping("/users")
    public ApiResponse<List<UserProfileDto>> getUsers() {
        return ApiResponse.success(adminService.getUsers(), "Admin users loaded.");
    }

    @PatchMapping(value = "/users/{userNo}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ApiResponse<UserProfileDto> updateUserStatus(
        @PathVariable Long userNo,
        @RequestBody UserProfileDto request
    ) {
        return ApiResponse.success(adminService.updateUserStatus(userNo, request), "Admin user updated.");
    }

    @GetMapping("/purchases")
    public ApiResponse<List<PurchaseBatchDto>> getPurchases() {
        return ApiResponse.success(adminService.getPurchaseBatches(), "Purchase batches loaded.");
    }

    @GetMapping("/package-histories")
    public ApiResponse<List<PackageHistoryDto>> getPackageHistories() {
        return ApiResponse.success(adminService.getPackageHistories(), "Package histories loaded.");
    }

    @PostMapping(value = "/purchases", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ApiResponse<PurchaseBatchDto> createPurchase(
        @RequestBody PurchaseBatchDto request
    ) {
        return ApiResponse.success(adminService.createPurchaseBatch(request), "Purchase batch created.");
    }

    @PostMapping(value = "/purchases/{batchNo}/package", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ApiResponse<PackageHistoryDto> packageBatch(
        @RequestHeader("X-USER-NO") Long userNo,
        @PathVariable Long batchNo,
        @RequestBody PackageHistoryDto request
    ) {
        return ApiResponse.success(adminService.packageBatch(userNo, batchNo, request), "Package history created.");
    }

    @GetMapping("/content/banners")
    public ApiResponse<List<MainBannerDto>> getBanners() {
        return ApiResponse.success(adminService.getMainBanners(), "Admin banners loaded.");
    }

    @GetMapping("/content/recipe-mappings")
    public ApiResponse<List<ProductRecipeDto>> getRecipeMappings() {
        return ApiResponse.success(adminService.getRecipeMappings(), "Recipe mappings loaded.");
    }
}
