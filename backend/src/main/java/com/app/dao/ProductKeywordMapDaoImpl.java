package com.app.dao;

import java.util.List;

import org.mybatis.spring.SqlSessionTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import com.app.dto.KeywordRecipeCategoryMapDto;
import com.app.dto.ProductSearchKeywordMapDto;
import com.app.dto.SearchKeywordAliasDto;

@Repository
public class ProductKeywordMapDaoImpl implements ProductKeywordMapDao {

    private static final String NAMESPACE = "productKeywordMapper.";

    @Autowired
    private SqlSessionTemplate sqlSessionTemplate;

    @Override
    public List<ProductSearchKeywordMapDto> findActiveProductSearchKeywordMapByProductNo(Long productNo) {
        return sqlSessionTemplate.selectList(NAMESPACE + "selectActiveProductSearchKeywordMapByProductNo", productNo);
    }

    @Override
    public List<ProductSearchKeywordMapDto> findActiveProductSearchKeywordMapByCategoryName(String categoryName) {
        return sqlSessionTemplate.selectList(NAMESPACE + "selectActiveProductSearchKeywordMapByCategoryName", categoryName);
    }

    @Override
    public List<SearchKeywordAliasDto> findActiveSearchKeywordAliasList(String representKeyword) {
        return sqlSessionTemplate.selectList(NAMESPACE + "selectActiveSearchKeywordAliasList", representKeyword);
    }

    @Override
    public List<KeywordRecipeCategoryMapDto> findActiveKeywordRecipeCategoryMapList(String representKeyword) {
        return sqlSessionTemplate.selectList(NAMESPACE + "selectActiveKeywordRecipeCategoryMapList", representKeyword);
    }
}
