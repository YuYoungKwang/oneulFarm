package com.app.service;

import com.app.dto.TossPaymentConfigDto;
import com.app.dto.TossPaymentConfirmRequestDto;
import com.app.dto.TossPaymentConfirmResponseDto;

public interface TossPaymentService {

    TossPaymentConfigDto getConfig();

    TossPaymentConfirmResponseDto confirmPayment(TossPaymentConfirmRequestDto request);
}
