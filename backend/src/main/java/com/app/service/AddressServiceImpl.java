package com.app.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.app.dao.AddressDao;
import com.app.dto.CreateAddressRequestDto;
import com.app.dto.UpdateAddressRequestDto;
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
        validateRequest(
            request.getRecipientName(),
            request.getRecipientPhone(),
            request.getZipCode(),
            request.getAddress1()
        );

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
    public List<UserAddressDto> updateAddress(Long userNo, Long addressNo, UpdateAddressRequestDto request) {
        UserAddressDto currentAddress = addressDao.findMyAddress(userNo, addressNo);
        if (currentAddress == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "배송지 정보를 찾을 수 없습니다.");
        }

        validateRequest(
            request.getRecipientName(),
            request.getRecipientPhone(),
            request.getZipCode(),
            request.getAddress1()
        );

        int addressCount = addressDao.countMyAddresses(userNo);
        String isDefault = normalizeFlag(request.getIsDefault());
        if (addressCount == 1) {
            isDefault = "Y";
        } else if ("Y".equals(currentAddress.getIsDefault()) && !"Y".equals(isDefault)) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "기본 배송지는 해제할 수 없습니다. 다른 배송지를 먼저 기본 배송지로 변경해 주세요."
            );
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

        int updatedCount = addressDao.updateAddress(userNo, addressNo, request);
        if (updatedCount == 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "배송지 수정에 실패했습니다.");
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

    @Override
    @Transactional
    public List<UserAddressDto> deleteAddress(Long userNo, Long addressNo) {
        UserAddressDto address = addressDao.findMyAddress(userNo, addressNo);
        if (address == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "배송지 정보를 찾을 수 없습니다.");
        }

        int addressCount = addressDao.countMyAddresses(userNo);
        if ("Y".equals(address.getIsDefault()) && addressCount > 1) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "기본 배송지는 바로 삭제할 수 없습니다. 다른 배송지를 먼저 기본 배송지로 변경해 주세요."
            );
        }

        int deletedCount = addressDao.deleteAddress(userNo, addressNo);
        if (deletedCount == 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "배송지 삭제에 실패했습니다.");
        }

        return addressDao.findMyAddresses(userNo);
    }

    private void validateRequest(String recipientName, String recipientPhone, String zipCode, String address1) {
        if (isBlank(recipientName)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "수령인을 입력해 주세요.");
        }

        if (isBlank(recipientPhone)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "연락처를 입력해 주세요.");
        }

        if (!recipientPhone.trim().matches("^01[0-9]-?\\d{3,4}-?\\d{4}$")) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "연락처 형식이 올바르지 않습니다. 예: 010-1234-5678"
            );
        }

        if (isBlank(zipCode)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "우편번호를 입력해 주세요.");
        }

        if (!zipCode.trim().matches("^\\d{5}$")) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "우편번호는 5자리 숫자로 입력해 주세요."
            );
        }

        if (isBlank(address1)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "기본 주소를 입력해 주세요.");
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
