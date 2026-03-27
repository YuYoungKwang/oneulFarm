package com.app.dao;

import java.util.List;

import com.app.dto.KeywordRecipeCategoryMapDto;
import com.app.dto.ProductSearchKeywordMapDto;
import com.app.dto.SearchKeywordAliasDto;

public interface ProductKeywordMapDao {

    List<ProductSearchKeywordMapDto> findActiveProductSearchKeywordMapByProductNo(Long productNo);

    List<ProductSearchKeywordMapDto> findActiveProductSearchKeywordMapByCategoryName(String categoryName);

    List<SearchKeywordAliasDto> findActiveSearchKeywordAliasList(String representKeyword);

    List<KeywordRecipeCategoryMapDto> findActiveKeywordRecipeCategoryMapList(String representKeyword);
}
