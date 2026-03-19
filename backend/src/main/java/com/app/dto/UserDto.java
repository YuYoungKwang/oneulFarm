package com.app.dto;

import java.sql.Timestamp;

import lombok.Data;

@Data
public class UserDto {

    private Long userNo;
    private String userId;
    private String email;
    private String password;
    private String nickname;
    private String phone;
    private String role;
    private String status;
    private String tempPasswordYn;
    private Timestamp createdAt;
    private Timestamp updatedAt;
    private Timestamp deletedAt;

    private String profileImageUrl;
    private String profileImageName;
    private String profileImageExt;
    private String profileImageMimeType;
    private Long profileImageSize;
    private byte[] profileImageData;
}
