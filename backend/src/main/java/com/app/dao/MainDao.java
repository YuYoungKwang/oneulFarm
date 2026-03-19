package com.app.dao;

import java.util.List;
import com.app.dto.main.BannerDto;
import com.app.dto.main.ProductDto;

public interface MainDao {

    List<BannerDto> findMainBanners();

    List<ProductDto> findMainProducts();
}