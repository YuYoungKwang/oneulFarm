package com.app.service;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.app.dto.UserDto;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

@Service
public class JwtTokenService {

    private final byte[] signingKeyBytes;
    private final long expirationMillis;
    private final String issuer;

    public JwtTokenService(
        @Value("${auth.jwt.secret:oneulFarm-development-secret-key-change-me-2026-auth}") String secret,
        @Value("${auth.jwt.expiration-ms:86400000}") long expirationMillis,
        @Value("${auth.jwt.issuer:oneulFarm}") String issuer
    ) {
        this.signingKeyBytes = secret.getBytes(StandardCharsets.UTF_8);
        this.expirationMillis = expirationMillis;
        this.issuer = issuer;
    }

    public String generateAccessToken(UserDto user) {
        Instant now = Instant.now();
        Instant expiration = now.plus(Duration.ofMillis(expirationMillis));

        return Jwts.builder()
            .subject(String.valueOf(user.getUserNo()))
            .issuer(issuer)
            .issuedAt(Date.from(now))
            .expiration(Date.from(expiration))
            .claim("userNo", user.getUserNo())
            .claim("role", user.getRole())
            .claim("status", user.getStatus())
            .claim("passwordChangeRequired", "Y".equalsIgnoreCase(user.getTempPasswordYn()))
            .signWith(Keys.hmacShaKeyFor(signingKeyBytes))
            .compact();
    }

    public Claims parseClaims(String token) throws JwtException {
        return Jwts.parser()
            .verifyWith(Keys.hmacShaKeyFor(signingKeyBytes))
            .requireIssuer(issuer)
            .build()
            .parseSignedClaims(token)
            .getPayload();
    }
}
