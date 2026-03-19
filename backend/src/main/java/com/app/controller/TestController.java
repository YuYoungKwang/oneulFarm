package com.app.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

// REST API 용 컨트롤러
@RestController
public class TestController {

    // GET /api/test 요청 처리
    @GetMapping("/api/test")
    public String test() {
        return "Hello World! API 정상 작동 중";
    }
}