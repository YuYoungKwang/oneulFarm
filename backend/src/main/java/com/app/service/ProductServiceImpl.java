package com.app.service;

import java.util.Collections;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.app.dao.ProductDao;
import com.app.dto.ProductResponseDto;

@Service
public class ProductServiceImpl implements ProductService {

    @Autowired
    private ProductDao productDao;

    @Override
    public List<ProductResponseDto> getProducts() {
        List<ProductResponseDto> products = productDao.findSellingProducts();
        for (ProductResponseDto product : products) {
            product.setImages(Collections.emptyList());
            product.setRecipes(Collections.emptyList());
            product.setReviews(Collections.emptyList());
        }
        return products;
    }

    @Override
    public ProductResponseDto getProduct(Long productNo) {
        ProductResponseDto product = productDao.findProduct(productNo);
        if (product == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found.");
        }

        product.setImages(productDao.findProductImages(productNo));
        product.setRecipes(productDao.findProductRecipes(productNo));
        product.setReviews(productDao.findProductReviews(productNo));
        return product;
    }
}
