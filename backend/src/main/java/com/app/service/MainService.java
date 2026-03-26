package com.app.service;

import java.util.Map;

import com.app.dto.main.MainRecommendationResponseDto;

public interface MainService {

    Map<String, Object> getMainPage();

    MainRecommendationResponseDto getMainRecommendations();
}
