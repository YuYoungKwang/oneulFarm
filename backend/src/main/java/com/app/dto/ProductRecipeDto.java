package com.app.dto;

import java.math.BigDecimal;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ProductRecipeDto {

    private Long mapNo;
    private Long recipeNo;
    private String recipeName;
    private String description;
    private String cookTime;
    private String difficulty;
    private BigDecimal matchScore;
    private String imageUrl;
}
