package com.app.common;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.Enumeration;
import java.util.LinkedHashSet;
import java.util.List;

import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletRequestWrapper;
import javax.servlet.http.HttpServletResponse;

import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.app.dao.UserDao;
import com.app.dto.UserDto;
import com.app.service.JwtTokenService;
import com.fasterxml.jackson.databind.ObjectMapper;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;

@Component("jwtAuthenticationFilter")
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String AUTHORIZATION_PREFIX = "Bearer ";
    private static final String USER_NO_HEADER = "X-USER-NO";
    private static final String AUTHENTICATED_USER_ATTR = "authenticatedUser";
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private final JwtTokenService jwtTokenService;
    private final UserDao userDao;

    public JwtAuthenticationFilter(JwtTokenService jwtTokenService, UserDao userDao) {
        this.jwtTokenService = jwtTokenService;
        this.userDao = userDao;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        if (HttpMethod.OPTIONS.matches(request.getMethod())) {
            return true;
        }

        String requestPath = getRequestPath(request);

        if (requestPath.startsWith("/api/cart/")) {
            return false;
        }

        if (requestPath.startsWith("/api/orders/")) {
            return false;
        }

        if (requestPath.startsWith("/api/users/")) {
            return false;
        }

        if (requestPath.startsWith("/api/admin")) {
            return false;
        }

        if (requestPath.startsWith("/api/dashboard/")) {
            return false;
        }

        return !("/api/auth/password".equals(requestPath) && HttpMethod.PATCH.matches(request.getMethod()));
    }

    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain filterChain
    ) throws ServletException, IOException {
        String authorizationHeader = request.getHeader("Authorization");
        if (authorizationHeader == null || !authorizationHeader.startsWith(AUTHORIZATION_PREFIX)) {
            writeErrorResponse(response, HttpStatus.UNAUTHORIZED, "Authentication is required.");
            return;
        }

        String token = authorizationHeader.substring(AUTHORIZATION_PREFIX.length()).trim();
        if (token.isEmpty()) {
            writeErrorResponse(response, HttpStatus.UNAUTHORIZED, "Access token is missing.");
            return;
        }

        Claims claims;
        try {
            claims = jwtTokenService.parseClaims(token);
        } catch (JwtException | IllegalArgumentException exception) {
            writeErrorResponse(response, HttpStatus.UNAUTHORIZED, "Access token is invalid.");
            return;
        }

        Long userNo = extractUserNo(claims.get("userNo"));
        if (userNo == null) {
            writeErrorResponse(response, HttpStatus.UNAUTHORIZED, "Access token is invalid.");
            return;
        }

        UserDto authenticatedUser = userDao.findByUserNo(userNo);
        if (authenticatedUser == null) {
            writeErrorResponse(response, HttpStatus.UNAUTHORIZED, "User no longer exists.");
            return;
        }

        if (!"ACTIVE".equalsIgnoreCase(authenticatedUser.getStatus())) {
            writeErrorResponse(response, HttpStatus.FORBIDDEN, "Only active users can access this resource.");
            return;
        }

        String requestPath = getRequestPath(request);
        if (
            requestPath.startsWith("/api/admin")
                && !"ADMIN".equalsIgnoreCase(authenticatedUser.getRole())
                && !"SUPER_ADMIN".equalsIgnoreCase(authenticatedUser.getRole())
        ) {
            writeErrorResponse(response, HttpStatus.FORBIDDEN, "Administrator access is required.");
            return;
        }

        boolean isPasswordChangeEndpoint =
            "/api/auth/password".equals(requestPath) && HttpMethod.PATCH.matches(request.getMethod());
        if ("Y".equalsIgnoreCase(authenticatedUser.getTempPasswordYn()) && !isPasswordChangeEndpoint) {
            writeErrorResponse(
                response,
                HttpStatus.FORBIDDEN,
                "Password change is required before accessing this resource."
            );
            return;
        }

        request.setAttribute(AUTHENTICATED_USER_ATTR, authenticatedUser);
        filterChain.doFilter(new AuthenticatedRequestWrapper(request, String.valueOf(userNo)), response);
    }

    private String getRequestPath(HttpServletRequest request) {
        String contextPath = request.getContextPath();
        String requestUri = request.getRequestURI();
        if (contextPath != null && !contextPath.isEmpty() && requestUri.startsWith(contextPath)) {
            return requestUri.substring(contextPath.length());
        }
        return requestUri;
    }

    private Long extractUserNo(Object userNoClaim) {
        if (userNoClaim instanceof Number) {
            return ((Number) userNoClaim).longValue();
        }

        if (userNoClaim instanceof String) {
            try {
                return Long.valueOf((String) userNoClaim);
            } catch (NumberFormatException exception) {
                return null;
            }
        }

        return null;
    }

    private void writeErrorResponse(HttpServletResponse response, HttpStatus status, String message) throws IOException {
        response.setStatus(status.value());
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        OBJECT_MAPPER.writeValue(response.getWriter(), ApiResponse.fail(message));
    }

    private static final class AuthenticatedRequestWrapper extends HttpServletRequestWrapper {

        private final String userNoValue;

        private AuthenticatedRequestWrapper(HttpServletRequest request, String userNoValue) {
            super(request);
            this.userNoValue = userNoValue;
        }

        @Override
        public String getHeader(String name) {
            if (USER_NO_HEADER.equalsIgnoreCase(name)) {
                return userNoValue;
            }
            return super.getHeader(name);
        }

        @Override
        public Enumeration<String> getHeaders(String name) {
            if (USER_NO_HEADER.equalsIgnoreCase(name)) {
                return Collections.enumeration(Collections.singletonList(userNoValue));
            }
            return super.getHeaders(name);
        }

        @Override
        public Enumeration<String> getHeaderNames() {
            LinkedHashSet<String> headerNames = new LinkedHashSet<>();
            Enumeration<String> enumeration = super.getHeaderNames();
            while (enumeration != null && enumeration.hasMoreElements()) {
                headerNames.add(enumeration.nextElement());
            }
            headerNames.add(USER_NO_HEADER);
            return Collections.enumeration(headerNames);
        }
    }
}
