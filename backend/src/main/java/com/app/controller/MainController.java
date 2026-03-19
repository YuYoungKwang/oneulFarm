package com.app.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.app.common.ApiResponse;
import com.app.service.MainService;

@RestController
@RequestMapping(value = "/api/main", produces = MediaType.APPLICATION_JSON_VALUE)
public class MainController {

    @Autowired
    private MainService mainService;

    @GetMapping
    public ApiResponse<?> getMainPage() {
        return ApiResponse.success(null, "테스트");
    }
}