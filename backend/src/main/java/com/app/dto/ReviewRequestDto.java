package com.app.dto;

import java.util.List;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ReviewRequestDto {

    private Long orderItemNo;
    private Integer rating;
    private String content;
    private Boolean removeImage;
    private List<Long> removeImageNos;
}
