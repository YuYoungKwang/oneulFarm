package com.app.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.app.common.ApiResponse;
import com.app.dto.AddressRequestDto;
import com.app.dto.UserAddressDto;
import com.app.service.AddressService;

@RestController
@RequestMapping(value = "/api/users/me/addresses", produces = MediaType.APPLICATION_JSON_VALUE)
public class AddressController {

    @Autowired
    private AddressService addressService;

    @GetMapping
    public ApiResponse<List<UserAddressDto>> getMyAddresses(
        @RequestHeader("X-USER-NO") Long userNo
    ) {
        return ApiResponse.success(addressService.getMyAddresses(userNo), "배송지 목록 조회 성공");
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ApiResponse<List<UserAddressDto>> addAddress(
        @RequestHeader("X-USER-NO") Long userNo,
        @RequestBody AddressRequestDto request
    ) {
        return ApiResponse.success(addressService.addAddress(userNo, request), "배송지 등록 성공");
    }

    @PatchMapping(value = "/{addressNo}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ApiResponse<List<UserAddressDto>> updateAddress(
        @RequestHeader("X-USER-NO") Long userNo,
        @PathVariable("addressNo") Long addressNo,
        @RequestBody AddressRequestDto request
    ) {
        return ApiResponse.success(addressService.updateAddress(userNo, addressNo, request), "배송지 수정 성공");
    }

    @PatchMapping("/{addressNo}/default")
    public ApiResponse<List<UserAddressDto>> changeDefaultAddress(
        @RequestHeader("X-USER-NO") Long userNo,
        @PathVariable("addressNo") Long addressNo
    ) {
        return ApiResponse.success(
            addressService.changeDefaultAddress(userNo, addressNo),
            "기본 배송지 변경 성공"
        );
    }

    @DeleteMapping("/{addressNo}")
    public ApiResponse<List<UserAddressDto>> deleteAddress(
        @RequestHeader("X-USER-NO") Long userNo,
        @PathVariable("addressNo") Long addressNo
    ) {
        return ApiResponse.success(addressService.deleteAddress(userNo, addressNo), "배송지 삭제 성공");
    }
}
