package com.app.service;

import java.util.List;

import com.app.dto.ProductResponseDto;

public interface ProductService {

    List<ProductResponseDto> getProducts();

    ProductResponseDto getProduct(Long productNo);
}
