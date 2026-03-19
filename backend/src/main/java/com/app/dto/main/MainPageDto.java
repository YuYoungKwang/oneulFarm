package com.app.dto.main;

import java.util.List;

public class MainPageDto {

    private List<BannerDto> banners;
    private List<ProductDto> products;

    public List<BannerDto> getBanners() {
        return banners;
    }

    public void setBanners(List<BannerDto> banners) {
        this.banners = banners;
    }

    public List<ProductDto> getProducts() {
        return products;
    }

    public void setProducts(List<ProductDto> products) {
        this.products = products;
    }
}