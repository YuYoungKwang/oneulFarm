package com.app.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ProductImageDto {

    private Long imageNo;
    private String imageName;
    private String imageExt;
    private String mimeType;
    private Integer sortOrder;
    private String isMain;
}
