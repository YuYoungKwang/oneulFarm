package com.app.dao;

import java.util.List;

import com.app.dto.ProductPriceCodeMapDTO;

public interface ProductPriceMatchDAO {

    int deleteProductPriceMatchForSellingProducts();

    List<ProductPriceCodeMapDTO> selectActiveProductPriceCodeMapList();

    int insertProductPriceMatch(ProductPriceCodeMapDTO productPriceCodeMapDTO);
}
