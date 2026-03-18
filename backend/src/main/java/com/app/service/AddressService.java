package com.app.service;

import java.util.List;

import com.app.dto.CreateAddressRequestDto;
import com.app.dto.UserAddressDto;

public interface AddressService {

    List<UserAddressDto> getMyAddresses(Long userNo);

    List<UserAddressDto> addAddress(Long userNo, CreateAddressRequestDto request);

    List<UserAddressDto> changeDefaultAddress(Long userNo, Long addressNo);

    List<UserAddressDto> deleteAddress(Long userNo, Long addressNo);
}
