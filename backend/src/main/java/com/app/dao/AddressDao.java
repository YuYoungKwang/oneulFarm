package com.app.dao;

import java.util.List;

import com.app.dto.CreateAddressRequestDto;
import com.app.dto.UpdateAddressRequestDto;
import com.app.dto.UserAddressDto;

public interface AddressDao {

    List<UserAddressDto> findMyAddresses(Long userNo);

    int countMyAddress(Long userNo, Long addressNo);

    int countMyAddresses(Long userNo);

    int insertAddress(Long userNo, CreateAddressRequestDto request);

    int updateAddress(Long userNo, Long addressNo, UpdateAddressRequestDto request);

    int clearDefaultAddress(Long userNo);

    int setDefaultAddress(Long userNo, Long addressNo);

    UserAddressDto findMyAddress(Long userNo, Long addressNo);

    int deleteAddress(Long userNo, Long addressNo);
}
