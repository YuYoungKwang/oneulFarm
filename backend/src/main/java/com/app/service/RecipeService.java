package com.app.service;

import java.util.List;

import com.app.dto.RecipeDTO;

public interface RecipeService {

    int syncRecipe(String keyword, Integer limit);

    List<RecipeDTO> getRecipeList(String keyword, String ingredientKeyword, String sort, Integer limit, Integer page);

    int getRecipeListCount(String keyword, String ingredientKeyword);

    RecipeDTO getRecipeDetail(Long recipeNo);
}
