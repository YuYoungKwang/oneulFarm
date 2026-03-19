package com.app.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.app.common.ApiResponse;
import com.app.dto.ProductDto;
import com.app.service.ProductService;

@RestController
@RequestMapping(value = "/api/products", produces = MediaType.APPLICATION_JSON_VALUE)
public class ProductController {

    @Autowired
    private ProductService productService;

    @GetMapping
    public ApiResponse<List<ProductDto>> getProducts() {
        return ApiResponse.success(productService.getProducts(), "Product list loaded.");
    }

    @GetMapping("/{productNo}")
    public ApiResponse<ProductDto> getProduct(
        @PathVariable Long productNo
    ) {
        return ApiResponse.success(productService.getProduct(productNo), "Product detail loaded.");
    }
}
