package com.app.dao;

import java.util.List;

import com.app.dto.RecipeDTO;
import com.app.dto.RecipeDetailDTO;
import com.app.dto.RecipeIngredientDTO;
import com.app.dto.RecipeStepDTO;
import com.app.dto.RecipeStepImageDTO;

public interface RecipeDAO {

    int mergeRecipe(RecipeDTO recipeDTO);

    int deleteRecipeIngredientByRecipeNo(Long recipeNo);

    int deleteRecipeStepImageByRecipeNo(Long recipeNo);

    int deleteRecipeStepByRecipeNo(Long recipeNo);

    int insertRecipeIngredient(RecipeIngredientDTO recipeIngredientDTO);

    int insertRecipeStep(RecipeStepDTO recipeStepDTO);

    int insertRecipeStepImage(RecipeStepImageDTO recipeStepImageDTO);

    List<RecipeDTO> selectRecipeList(String keyword, String ingredientKeyword, String sort, int limit);

    RecipeDetailDTO selectRecipeDetail(Long recipeNo);

    List<RecipeIngredientDTO> selectRecipeIngredientList(Long recipeNo);

    List<RecipeStepDTO> selectRecipeStepList(Long recipeNo);

    List<RecipeStepImageDTO> selectRecipeStepImageList(Long recipeNo);
}
