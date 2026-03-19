package com.app.service;

import com.app.dto.RecipeDetailDTO;
import com.app.dto.RecipeListResponseDTO;

public interface RecipeService {

    int syncRecipe(String keyword, Integer limit);

    RecipeListResponseDTO getRecipeList(String keyword, String ingredientKeyword, String sort, Integer limit);

    RecipeDetailDTO getRecipeDetail(Long recipeNo);
}
