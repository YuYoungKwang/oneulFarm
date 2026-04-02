package com.app.exception;

import org.springframework.http.HttpStatus;

import com.app.dto.SocialLoginProfileDto;

public class SocialLoginCompletionException extends RuntimeException {

    private final HttpStatus status;
    private final SocialLoginProfileDto profile;

    public SocialLoginCompletionException(
        HttpStatus status,
        String message,
        SocialLoginProfileDto profile
    ) {
        super(message);
        this.status = status;
        this.profile = profile;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public SocialLoginProfileDto getProfile() {
        return profile;
    }
}
