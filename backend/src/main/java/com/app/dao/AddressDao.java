package com.app.dao;

import java.util.List;

import com.app.dto.AddressRequestDto;
import com.app.dto.UserAddressDto;

public interface AddressDao {

    List<UserAddressDto> findMyAddresses(Long userNo);

    int countMyAddress(Long userNo, Long addressNo);

    int countMyAddresses(Long userNo);

    int insertAddress(Long userNo, AddressRequestDto request);

    int updateAddress(Long userNo, Long addressNo, AddressRequestDto request);

    int clearDefaultAddress(Long userNo);

    int setDefaultAddress(Long userNo, Long addressNo);

    UserAddressDto findMyAddress(Long userNo, Long addressNo);

    int deleteAddress(Long userNo, Long addressNo);
}
