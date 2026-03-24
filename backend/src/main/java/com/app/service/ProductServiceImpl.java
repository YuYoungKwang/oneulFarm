package com.app.service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.app.dao.ProductDao;
import com.app.dto.ProductDto;
import com.app.dto.ProductImageDto;

@Service
public class ProductServiceImpl implements ProductService {

    @Autowired
    private ProductDao productDao;

    @Override
    public List<ProductDto> getProducts() {
        List<ProductDto> products = productDao.findSellingProducts();
        for (ProductDto product : products) {
            product.setImages(resolveDisplayImages(product.getProductNo()));
            product.setRecipes(Collections.emptyList());
            product.setReviews(Collections.emptyList());
        }
        return products;
    }

    @Override
    public ProductDto getProduct(Long productNo) {
        ProductDto product = productDao.findProduct(productNo);
        if (product == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found.");
        }

        product.setImages(resolveDisplayImages(productNo));
        product.setRecipes(productDao.findProductRecipes(productNo));
        product.setReviews(productDao.findProductReviews(productNo));
        return product;
    }

    private List<ProductImageDto> resolveDisplayImages(Long productNo) {
        List<ProductImageDto> images = productDao.findProductImages(productNo);
        if (images == null || images.isEmpty()) {
            return Collections.emptyList();
        }

        List<ProductImageDto> displayImages = new ArrayList<>();
        for (ProductImageDto image : images) {
            if (image == null || image.getImageNo() == null) {
                continue;
            }
            if (image.getImageSize() != null && image.getImageSize() <= 0) {
                continue;
            }
            displayImages.add(image);
        }
        return displayImages;
    }
}
