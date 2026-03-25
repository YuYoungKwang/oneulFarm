package com.app.dto;

import java.sql.Timestamp;

import lombok.Data;

@Data
public class SocialAccountDto {

    private Long socialAccountNo;
    private Long userNo;
    private String provider;
    private String providerUserId;
    private String providerEmail;
    private Timestamp createdAt;
    private Timestamp updatedAt;
}
