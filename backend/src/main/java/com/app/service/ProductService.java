package com.app.service;

import java.util.List;

import com.app.dto.ProductDto;

public interface ProductService {

    List<ProductDto> getProducts();

    ProductDto getProduct(Long productNo);
}
