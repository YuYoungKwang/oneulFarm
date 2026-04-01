package com.app.service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;

import com.app.dao.ProductDao;
import com.app.dao.ProductKeywordMapDao;
import com.app.dto.KeywordRecipeCategoryMapDto;
import com.app.dto.ProductDto;
import com.app.dto.ProductKeywordProfileDto;
import com.app.dto.ProductSearchKeywordMapDto;
import com.app.dto.SearchKeywordAliasDto;

@Service
public class ProductKeywordMapServiceImpl implements ProductKeywordMapService {

    @Autowired
    private ProductKeywordMapDao productKeywordMapDao;

    @Autowired
    private ProductDao productDao;

    @Override
    public ProductKeywordProfileDto getKeywordProfile(ProductDto product) {
        if (product == null) {
            return null;
        }

        ProductSearchKeywordMapDto mapDto;
        try {
            mapDto = resolveKeywordMap(product);
        } catch (DataAccessException exception) {
            return null;
        }
        if (mapDto == null || isBlank(mapDto.getRepresentKeyword())) {
            return null;
        }

        ProductKeywordProfileDto profileDto = new ProductKeywordProfileDto();
        profileDto.setMapNo(mapDto.getMapNo());
        profileDto.setCategoryNo(mapDto.getCategoryNo());
        profileDto.setCategoryName(firstNonBlank(mapDto.getCategoryName(), product.getCategoryName()));
        profileDto.setProductNo(firstNonNull(mapDto.getProductNo(), product.getProductNo()));
        profileDto.setProductName(firstNonBlank(mapDto.getProductName(), product.getProductName()));
        profileDto.setRepresentKeyword(mapDto.getRepresentKeyword());
        profileDto.setSearchKeywordList(buildSearchKeywordList(mapDto.getRepresentKeyword()));
        profileDto.setAllowedRecipeCategoryList(buildAllowedRecipeCategoryList(mapDto.getRepresentKeyword()));
        return profileDto;
    }

    @Override
    public ProductKeywordProfileDto getKeywordProfile(Long productNo) {
        if (productNo == null) {
            return null;
        }

        ProductDto product = productDao.findProduct(productNo);
        if (product == null) {
            return null;
        }

        return getKeywordProfile(product);
    }

    @Override
    public List<String> getSearchKeywords(ProductDto product) {
        ProductKeywordProfileDto profileDto = getKeywordProfile(product);
        if (profileDto == null) {
            return Collections.emptyList();
        }

        return profileDto.getSearchKeywordList();
    }

    @Override
    public List<String> getAllowedRecipeCategories(ProductDto product) {
        ProductKeywordProfileDto profileDto = getKeywordProfile(product);
        if (profileDto == null) {
            return Collections.emptyList();
        }

        return profileDto.getAllowedRecipeCategoryList();
    }

    private ProductSearchKeywordMapDto resolveKeywordMap(ProductDto product) {
        if (product.getProductNo() != null) {
            List<ProductSearchKeywordMapDto> exactProductMapList =
                productKeywordMapDao.findActiveProductSearchKeywordMapByProductNo(product.getProductNo());
            if (!exactProductMapList.isEmpty()) {
                return exactProductMapList.get(0);
            }
        }

        if (!isBlank(product.getCategoryName())) {
            List<ProductSearchKeywordMapDto> categoryMapList =
                productKeywordMapDao.findActiveProductSearchKeywordMapByCategoryName(product.getCategoryName().trim());
            if (!categoryMapList.isEmpty()) {
                return categoryMapList.get(0);
            }
        }

        return null;
    }

    private List<String> buildSearchKeywordList(String representKeyword) {
        Set<String> keywordSet = new LinkedHashSet<String>();
        String normalizedRepresentKeyword = trimToNull(representKeyword);
        if (normalizedRepresentKeyword == null) {
            return Collections.emptyList();
        }

        keywordSet.add(normalizedRepresentKeyword);

        List<SearchKeywordAliasDto> aliasDtoList;
        try {
            aliasDtoList = safeList(productKeywordMapDao.findActiveSearchKeywordAliasList(normalizedRepresentKeyword));
        } catch (DataAccessException exception) {
            aliasDtoList = Collections.emptyList();
        }

        for (SearchKeywordAliasDto aliasDto : aliasDtoList) {
            String searchKeyword = trimToNull(aliasDto.getSearchKeyword());
            if (searchKeyword != null) {
                keywordSet.add(searchKeyword);
            }
        }

        return new ArrayList<String>(keywordSet);
    }

    private List<String> buildAllowedRecipeCategoryList(String representKeyword) {
        Set<String> categorySet = new LinkedHashSet<String>();
        String normalizedRepresentKeyword = trimToNull(representKeyword);
        if (normalizedRepresentKeyword == null) {
            return Collections.emptyList();
        }

        List<KeywordRecipeCategoryMapDto> categoryMapDtoList;
        try {
            categoryMapDtoList = safeList(
                productKeywordMapDao.findActiveKeywordRecipeCategoryMapList(normalizedRepresentKeyword)
            );
        } catch (DataAccessException exception) {
            categoryMapDtoList = Collections.emptyList();
        }

        for (KeywordRecipeCategoryMapDto categoryMapDto : categoryMapDtoList) {
            String recipeCategory = trimToNull(categoryMapDto.getRecipeCategory());
            if (recipeCategory != null) {
                categorySet.add(recipeCategory);
            }
        }

        return new ArrayList<String>(categorySet);
    }

    private Long firstNonNull(Long primaryValue, Long fallbackValue) {
        return primaryValue != null ? primaryValue : fallbackValue;
    }

    private String firstNonBlank(String primaryValue, String fallbackValue) {
        String normalizedPrimaryValue = trimToNull(primaryValue);
        if (normalizedPrimaryValue != null) {
            return normalizedPrimaryValue;
        }

        String normalizedFallbackValue = trimToNull(fallbackValue);
        return normalizedFallbackValue == null ? "" : normalizedFallbackValue;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }

        String trimmedValue = value.trim();
        return trimmedValue.isEmpty() ? null : trimmedValue;
    }

    private boolean isBlank(String value) {
        return trimToNull(value) == null;
    }

    private <T> List<T> safeList(List<T> source) {
        return source == null ? Collections.<T>emptyList() : source;
    }
}
