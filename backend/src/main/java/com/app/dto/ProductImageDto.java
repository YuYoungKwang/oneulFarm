package com.app.dto;

import java.time.LocalDateTime;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ProductImageDto {

    private Long productNo;
    private Long imageNo;
    private String imageName;
    private String imageExt;
    private String mimeType;
    private Long imageSize;
    private byte[] imageData;
    private Integer sortOrder;
    private String isMain;
    private LocalDateTime createdAt;
}
