package com.app.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.app.dao.MainDao;
import com.app.dto.main.BannerDto;
import com.app.dto.main.MainPageDto;
import com.app.dto.main.ProductDto;

@Service
public class MainServiceImpl implements MainService {

    @Autowired
    private MainDao mainDao;

    @Override
    public MainPageDto getMainPage() {

        // 1. 데이터 조회
        List<BannerDto> banners = mainDao.findMainBanners();
        List<ProductDto> products = mainDao.findMainProducts();

        // 2. imageUrl 세팅 (🔥 핵심)
        for (BannerDto banner : banners) {
            banner.setImageUrl("/api/image/banner/" + banner.getBannerNo());
        }

        for (ProductDto product : products) {
            // mapper에서 imageNo를 받아야 하는데
            // DTO에는 없으니까 구조 살짝 수정 필요 👇
        	product.setImageUrl("/api/image/product/" + product.getImageNo());
        		
        }

        // 3. 결과 조립
        MainPageDto dto = new MainPageDto();
        dto.setBanners(banners);
        dto.setProducts(products);

        return dto;
    }
}