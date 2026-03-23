package com.app.dto;

import java.time.LocalDateTime;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ActivityReviewDto {

    private Long reviewNo;
    private Long orderItemNo;
    private Long productNo;
    private Long imageNo;
    private Long reviewImageNo;
    private String productName;
    private String orderId;
    private Integer rating;
    private String content;
    private LocalDateTime orderedAt;
    private LocalDateTime createdAt;
}
