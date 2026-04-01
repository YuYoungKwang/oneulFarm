package com.app.dto;

import java.time.LocalDateTime;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CancelRequestHistoryDto {

    private Long cancelRequestNo;
    private Long orderNo;
    private Long requestedByUserNo;
    private String cancelStatus;
    private String requestReason;
    private String decisionReason;
    private Long decidedByUserNo;
    private LocalDateTime requestedAt;
    private LocalDateTime decidedAt;
}
