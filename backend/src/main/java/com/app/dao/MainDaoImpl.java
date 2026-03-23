package com.app.dao;

import java.util.List;

import org.mybatis.spring.SqlSessionTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import com.app.dto.main.BannerDto;
import com.app.dto.main.ProductDto;

@Repository
public class MainDaoImpl implements MainDao {

    private static final String NAMESPACE = "mainMapper.";

    @Autowired
    private SqlSessionTemplate sqlSessionTemplate;

    @Override
    public List<BannerDto> findMainBanners() {
        return sqlSessionTemplate.selectList(NAMESPACE + "selectMainBanners");
    }

    @Override
    public List<ProductDto> findMainProducts() {
        return sqlSessionTemplate.selectList(NAMESPACE + "selectMainProducts");
    }
}