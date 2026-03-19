package com.app.dto;

import java.time.LocalDateTime;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ProductReviewDto {

    private Long reviewNo;
    private Long userNo;
    private String author;
    private Integer rating;
    private String content;
    private LocalDateTime createdAt;
}
