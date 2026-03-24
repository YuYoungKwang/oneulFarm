package com.app.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ReviewRequestDto {

    private Long orderItemNo;
    private Integer rating;
    private String content;
    private Boolean removeImage;
}
