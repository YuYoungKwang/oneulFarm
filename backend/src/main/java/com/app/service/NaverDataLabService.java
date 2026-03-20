package com.app.service;

import java.util.List;
import java.util.Map;

public interface NaverDataLabService {

    Map<String, Object> getPopularSearchData(
        List<String> keywordList,
        String startDate,
        String endDate,
        String timeUnit
    );
}
