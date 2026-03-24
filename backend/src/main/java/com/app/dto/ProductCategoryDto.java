package com.app.dto;

import java.time.LocalDateTime;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ProductCategoryDto {

    private Long categoryNo;
    private String categoryName;
    private LocalDateTime createdAt;
}
