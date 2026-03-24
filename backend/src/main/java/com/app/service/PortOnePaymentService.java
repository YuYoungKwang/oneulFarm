package com.app.service;

import java.util.Map;

public interface PortOnePaymentService {

    Map<String, Object> getConfig();

    Map<String, Object> completePayment(Map<String, Object> request);
}
