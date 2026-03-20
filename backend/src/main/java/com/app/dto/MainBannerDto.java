package com.app.dto;

import java.time.LocalDateTime;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MainBannerDto {

    private Long bannerNo;
    private String title;
    private String imageName;
    private String imageExt;
    private String mimeType;
    private Long imageSize;
    private String linkUrl;
    private Integer sortOrder;
    private String isActive;
    private LocalDateTime startedAt;
    private LocalDateTime endedAt;
    private LocalDateTime createdAt;
}
