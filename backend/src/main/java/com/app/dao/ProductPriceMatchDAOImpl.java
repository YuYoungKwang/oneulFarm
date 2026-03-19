package com.app.dao;

import java.util.List;

import org.mybatis.spring.SqlSessionTemplate;
import org.springframework.stereotype.Repository;

import com.app.dto.ProductPriceCodeMapDTO;

@Repository
public class ProductPriceMatchDAOImpl implements ProductPriceMatchDAO {

    private static final String NAMESPACE = "com.app.dao.ProductPriceMatchDAO.";

    private final SqlSessionTemplate sqlSessionTemplate;

    public ProductPriceMatchDAOImpl(SqlSessionTemplate sqlSessionTemplate) {
        this.sqlSessionTemplate = sqlSessionTemplate;
    }

    @Override
    public int deleteProductPriceMatchForSellingProducts() {
        return sqlSessionTemplate.delete(NAMESPACE + "deleteProductPriceMatchForSellingProducts");
    }

    @Override
    public List<ProductPriceCodeMapDTO> selectActiveProductPriceCodeMapList() {
        return sqlSessionTemplate.selectList(NAMESPACE + "selectActiveProductPriceCodeMapList");
    }

    @Override
    public int insertProductPriceMatch(ProductPriceCodeMapDTO productPriceCodeMapDTO) {
        return sqlSessionTemplate.insert(NAMESPACE + "insertProductPriceMatch", productPriceCodeMapDTO);
    }
}
