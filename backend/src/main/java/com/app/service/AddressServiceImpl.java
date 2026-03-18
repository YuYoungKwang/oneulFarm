package com.app.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.app.dao.AddressDao;
import com.app.dto.CreateAddressRequestDto;
import com.app.dto.UserAddressDto;

@Service
public class AddressServiceImpl implements AddressService {

    @Autowired
    private AddressDao addressDao;

    @Override
    public List<UserAddressDto> getMyAddresses(Long userNo) {
        return addressDao.findMyAddresses(userNo);
    }

    @Override
    @Transactional
    public List<UserAddressDto> addAddress(Long userNo, CreateAddressRequestDto request) {
        validateRequest(request);

        int addressCount = addressDao.countMyAddresses(userNo);
        String isDefault = normalizeFlag(request.getIsDefault());
        if (addressCount == 0) {
            isDefault = "Y";
        }

        request.setRecipientName(request.getRecipientName().trim());
        request.setRecipientPhone(request.getRecipientPhone().trim());
        request.setZipCode(request.getZipCode().trim());
        request.setAddress1(request.getAddress1().trim());
        request.setAddress2(trimToNull(request.getAddress2()));
        request.setAddressName(trimToNull(request.getAddressName()));
        request.setDeliveryMessage(trimToNull(request.getDeliveryMessage()));
        request.setIsDefault(isDefault);

        if ("Y".equals(isDefault)) {
            addressDao.clearDefaultAddress(userNo);
        }

        int insertedCount = addressDao.insertAddress(userNo, request);
        if (insertedCount == 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "배송지 등록에 실패했습니다.");
        }

        return addressDao.findMyAddresses(userNo);
    }

    @Override
    @Transactional
    public List<UserAddressDto> changeDefaultAddress(Long userNo, Long addressNo) {
        if (addressDao.countMyAddress(userNo, addressNo) == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "배송지 정보를 찾을 수 없습니다.");
        }

        addressDao.clearDefaultAddress(userNo);
        int updatedCount = addressDao.setDefaultAddress(userNo, addressNo);

        if (updatedCount == 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "기본 배송지 변경에 실패했습니다.");
        }

        return addressDao.findMyAddresses(userNo);
    }

    private void validateRequest(CreateAddressRequestDto request) {
        if (isBlank(request.getRecipientName())
            || isBlank(request.getRecipientPhone())
            || isBlank(request.getZipCode())
            || isBlank(request.getAddress1())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "수령인, 연락처, 우편번호, 기본 주소는 필수입니다.");
        }
    }

    private String normalizeFlag(String value) {
        return "Y".equalsIgnoreCase(value) ? "Y" : "N";
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
