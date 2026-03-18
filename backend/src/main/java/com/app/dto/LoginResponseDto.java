package com.app.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoginResponseDto {

    private Long userNo;
    private String userId;
    private String email;
    private String nickname;
    private String phone;
    private String role;
    private String status;
    private boolean passwordChangeRequired;

    public static LoginResponseDto from(UserDto user) {
        return new LoginResponseDto(
            user.getUserNo(),
            user.getUserId(),
            user.getEmail(),
            user.getNickname(),
            user.getPhone(),
            user.getRole(),
            user.getStatus(),
            "Y".equalsIgnoreCase(user.getTempPasswordYn())
        );
    }
}
