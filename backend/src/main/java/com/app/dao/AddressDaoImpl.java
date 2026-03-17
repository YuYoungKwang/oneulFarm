package com.app.dao;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.mybatis.spring.SqlSessionTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import com.app.dto.CreateAddressRequestDto;
import com.app.dto.UserAddressDto;

@Repository
public class AddressDaoImpl implements AddressDao {

    private static final String NAMESPACE = "addressMapper.";

    @Autowired
    private SqlSessionTemplate sqlSessionTemplate;

    @Override
    public List<UserAddressDto> findMyAddresses(Long userNo) {
        return sqlSessionTemplate.selectList(NAMESPACE + "selectMyAddresses", userNo);
    }

    @Override
    public int countMyAddress(Long userNo, Long addressNo) {
        Map<String, Object> params = new HashMap<>();
        params.put("userNo", userNo);
        params.put("addressNo", addressNo);
        Integer count = sqlSessionTemplate.selectOne(NAMESPACE + "countMyAddress", params);
        return count == null ? 0 : count;
    }

    @Override
    public int countMyAddresses(Long userNo) {
        Integer count = sqlSessionTemplate.selectOne(NAMESPACE + "countMyAddresses", userNo);
        return count == null ? 0 : count;
    }

    @Override
    public int insertAddress(Long userNo, CreateAddressRequestDto request) {
        Map<String, Object> params = new HashMap<>();
        params.put("userNo", userNo);
        params.put("recipientName", request.getRecipientName());
        params.put("recipientPhone", request.getRecipientPhone());
        params.put("zipCode", request.getZipCode());
        params.put("address1", request.getAddress1());
        params.put("address2", request.getAddress2());
        params.put("addressName", request.getAddressName());
        params.put("deliveryMessage", request.getDeliveryMessage());
        params.put("isDefault", request.getIsDefault());
        return sqlSessionTemplate.insert(NAMESPACE + "insertAddress", params);
    }

    @Override
    public int clearDefaultAddress(Long userNo) {
        return sqlSessionTemplate.update(NAMESPACE + "clearDefaultAddress", userNo);
    }

    @Override
    public int setDefaultAddress(Long userNo, Long addressNo) {
        Map<String, Object> params = new HashMap<>();
        params.put("userNo", userNo);
        params.put("addressNo", addressNo);
        return sqlSessionTemplate.update(NAMESPACE + "setDefaultAddress", params);
    }
}
