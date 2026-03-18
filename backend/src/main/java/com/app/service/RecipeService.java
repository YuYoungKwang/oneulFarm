package com.app.service;

import java.util.List;
import java.util.Map;

import com.app.dto.RecipeDTO;

public interface RecipeService {

    int syncRecipe(String keyword, Integer limit);

    List<RecipeDTO> getRecipeList(String keyword, Integer limit);

    Map<String, Object> getRecipeDetail(Long recipeNo);
}
