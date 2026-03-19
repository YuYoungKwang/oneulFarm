package com.app.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.app.service.ImageService;

@RestController
@RequestMapping("/api/image")
public class ImageController {

    @Autowired
    private ImageService imageService;

    @GetMapping("/banner/{id}")
    public ResponseEntity<byte[]> getBannerImage(@PathVariable("id") Long bannerNo) {

        byte[] image = imageService.getBannerImage(bannerNo);
        String mimeType = imageService.getBannerMimeType(bannerNo);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, mimeType != null ? mimeType : MediaType.IMAGE_JPEG_VALUE)
                .body(image);
    }

    @GetMapping("/product/{id}")
    public ResponseEntity<byte[]> getProductImage(@PathVariable("id") Long imageNo) {

        byte[] image = imageService.getProductImage(imageNo);
        String mimeType = imageService.getProductMimeType(imageNo);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, mimeType != null ? mimeType : MediaType.IMAGE_JPEG_VALUE)
                .body(image);
    }
}