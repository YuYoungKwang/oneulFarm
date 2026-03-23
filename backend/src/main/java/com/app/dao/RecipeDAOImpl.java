package com.app.dao;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.mybatis.spring.SqlSessionTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import com.app.dto.RecipeDTO;
import com.app.dto.RecipeIngredientDTO;
import com.app.dto.RecipeStepDTO;
import com.app.dto.RecipeStepImageDTO;

@Repository
public class RecipeDAOImpl implements RecipeDAO {

    private static final String NAMESPACE = "recipeMapper.";

    @Autowired
    private SqlSessionTemplate sqlSessionTemplate;

    @Override
    public int mergeRecipe(RecipeDTO recipeDTO) {
        return sqlSessionTemplate.insert(NAMESPACE + "mergeRecipe", recipeDTO);
    }

    @Override
    public int deleteRecipeIngredientByRecipeNo(Long recipeNo) {
        return sqlSessionTemplate.delete(NAMESPACE + "deleteRecipeIngredientByRecipeNo", recipeNo);
    }

    @Override
    public int deleteRecipeStepImageByRecipeNo(Long recipeNo) {
        return sqlSessionTemplate.delete(NAMESPACE + "deleteRecipeStepImageByRecipeNo", recipeNo);
    }

    @Override
    public int deleteRecipeStepByRecipeNo(Long recipeNo) {
        return sqlSessionTemplate.delete(NAMESPACE + "deleteRecipeStepByRecipeNo", recipeNo);
    }

    @Override
    public int insertRecipeIngredient(RecipeIngredientDTO recipeIngredientDTO) {
        return sqlSessionTemplate.insert(NAMESPACE + "insertRecipeIngredient", recipeIngredientDTO);
    }

    @Override
    public int insertRecipeStep(RecipeStepDTO recipeStepDTO) {
        return sqlSessionTemplate.insert(NAMESPACE + "insertRecipeStep", recipeStepDTO);
    }

    @Override
    public int insertRecipeStepImage(RecipeStepImageDTO recipeStepImageDTO) {
        return sqlSessionTemplate.insert(NAMESPACE + "insertRecipeStepImage", recipeStepImageDTO);
    }

    @Override
    public List<RecipeDTO> selectRecipeList(String keyword, String ingredientKeyword, String sort, int offset, int pageSize) {
        Map<String, Object> parameterMap = new HashMap<String, Object>();
        parameterMap.put("keyword", keyword);
        parameterMap.put("ingredientKeyword", ingredientKeyword);
        parameterMap.put("sort", sort);
        parameterMap.put("offset", Integer.valueOf(offset));
        parameterMap.put("pageSize", Integer.valueOf(pageSize));
        return sqlSessionTemplate.selectList(NAMESPACE + "selectRecipeList", parameterMap);
    }

    @Override
    public int countRecipeList(String keyword, String ingredientKeyword) {
        Map<String, Object> parameterMap = new HashMap<String, Object>();
        parameterMap.put("keyword", keyword);
        parameterMap.put("ingredientKeyword", ingredientKeyword);
        Integer count = sqlSessionTemplate.selectOne(NAMESPACE + "countRecipeList", parameterMap);
        return count == null ? 0 : count.intValue();
    }

    @Override
    public RecipeDTO selectRecipeDetail(Long recipeNo) {
        return sqlSessionTemplate.selectOne(NAMESPACE + "selectRecipeDetail", recipeNo);
    }

    @Override
    public List<RecipeIngredientDTO> selectRecipeIngredientList(Long recipeNo) {
        return sqlSessionTemplate.selectList(NAMESPACE + "selectRecipeIngredientList", recipeNo);
    }

    @Override
    public List<RecipeStepDTO> selectRecipeStepList(Long recipeNo) {
        return sqlSessionTemplate.selectList(NAMESPACE + "selectRecipeStepList", recipeNo);
    }

    @Override
    public List<RecipeStepImageDTO> selectRecipeStepImageList(Long recipeNo) {
        return sqlSessionTemplate.selectList(NAMESPACE + "selectRecipeStepImageList", recipeNo);
    }
}
