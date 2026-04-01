package com.app.service;

import java.io.IOException;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.app.dao.MealPlanChatDao;
import com.app.dto.MealPlanChatSessionDto;
import com.app.dto.MealPlanChatSessionRequestDto;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class MealPlanChatSessionServiceImpl implements MealPlanChatSessionService {

    private static final int MAX_CHAT_SESSIONS = 5;
    private static final int TITLE_LIMIT = 100;
    private static final int MESSAGE_LIMIT = 500;
    private static final int RESPONSE_ID_LIMIT = 100;
    private static final String DEFAULT_TITLE = "새 채팅";

    private final MealPlanChatDao mealPlanChatDao;
    private final ObjectMapper objectMapper;

    public MealPlanChatSessionServiceImpl(MealPlanChatDao mealPlanChatDao) {
        this.mealPlanChatDao = mealPlanChatDao;
        this.objectMapper = new ObjectMapper();
    }

    @Override
    @Transactional(readOnly = true)
    public List<MealPlanChatSessionDto> getChatSessions(Long userNo) {
        requireUserNo(userNo);
        return limitActiveSessions(userNo);
    }

    @Override
    @Transactional
    public MealPlanChatSessionDto createChatSession(Long userNo, MealPlanChatSessionRequestDto requestDto) {
        requireUserNo(userNo);
        MealPlanChatSessionDto chatSessionDto = buildSessionDto(userNo, null, requestDto);
        Long chatNo = mealPlanChatDao.insertChatSession(chatSessionDto);
        trimExcessChatSessions(userNo);
        return requireChatSession(userNo, chatNo);
    }

    @Override
    @Transactional
    public MealPlanChatSessionDto updateChatSession(Long userNo, Long chatNo, MealPlanChatSessionRequestDto requestDto) {
        requireUserNo(userNo);
        requireChatSession(userNo, chatNo);

        MealPlanChatSessionDto chatSessionDto = buildSessionDto(userNo, chatNo, requestDto);
        if (mealPlanChatDao.updateChatSession(chatSessionDto) == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Meal plan chat not found.");
        }

        trimExcessChatSessions(userNo);
        return requireChatSession(userNo, chatNo);
    }

    @Override
    @Transactional
    public void deleteChatSession(Long userNo, Long chatNo) {
        requireUserNo(userNo);
        if (mealPlanChatDao.softDeleteChatSession(userNo, chatNo) == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Meal plan chat not found.");
        }
    }

    private MealPlanChatSessionDto buildSessionDto(
        Long userNo,
        Long chatNo,
        MealPlanChatSessionRequestDto requestDto
    ) {
        if (requestDto == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Meal plan chat payload is required.");
        }

        String chatJson = validateChatJson(requestDto.getChatJson());
        MealPlanChatSessionDto chatSessionDto = new MealPlanChatSessionDto();
        chatSessionDto.setChatNo(chatNo);
        chatSessionDto.setUserNo(userNo);
        chatSessionDto.setChatTitle(truncate(defaultIfBlank(requestDto.getChatTitle(), DEFAULT_TITLE), TITLE_LIMIT));
        chatSessionDto.setLastMessageText(truncate(trimToNull(requestDto.getLastMessageText()), MESSAGE_LIMIT));
        chatSessionDto.setChatJson(chatJson);
        chatSessionDto.setPreviousResponseId(truncate(trimToNull(requestDto.getPreviousResponseId()), RESPONSE_ID_LIMIT));
        chatSessionDto.setMessageCount(Integer.valueOf(Math.max(0, safeInteger(requestDto.getMessageCount()))));
        chatSessionDto.setFallbackMode(Boolean.TRUE.equals(requestDto.getFallbackMode()));
        return chatSessionDto;
    }

    private String validateChatJson(String chatJson) {
        String normalizedJson = trimToNull(chatJson);
        if (normalizedJson == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "chatJson is required.");
        }

        try {
            objectMapper.readTree(normalizedJson);
            return normalizedJson;
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "chatJson must be valid JSON.");
        }
    }

    private MealPlanChatSessionDto requireChatSession(Long userNo, Long chatNo) {
        MealPlanChatSessionDto chatSessionDto = mealPlanChatDao.findChatSession(userNo, chatNo);
        if (chatSessionDto == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Meal plan chat not found.");
        }
        return chatSessionDto;
    }

    private List<MealPlanChatSessionDto> limitActiveSessions(Long userNo) {
        List<MealPlanChatSessionDto> chatSessionList = mealPlanChatDao.findActiveChatSessions(userNo);
        return chatSessionList.size() <= MAX_CHAT_SESSIONS
            ? chatSessionList
            : chatSessionList.subList(0, MAX_CHAT_SESSIONS);
    }

    private void trimExcessChatSessions(Long userNo) {
        List<MealPlanChatSessionDto> chatSessionList = mealPlanChatDao.findActiveChatSessions(userNo);
        for (int index = MAX_CHAT_SESSIONS; index < chatSessionList.size(); index++) {
            MealPlanChatSessionDto overflowSessionDto = chatSessionList.get(index);
            if (overflowSessionDto != null && overflowSessionDto.getChatNo() != null) {
                mealPlanChatDao.softDeleteChatSession(userNo, overflowSessionDto.getChatNo());
            }
        }
    }

    private void requireUserNo(Long userNo) {
        if (userNo == null || userNo.longValue() <= 0L) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "X-USER-NO is required.");
        }
    }

    private int safeInteger(Integer value) {
        return value == null ? 0 : value.intValue();
    }

    private String defaultIfBlank(String value, String fallback) {
        String normalizedValue = trimToNull(value);
        return normalizedValue == null ? fallback : normalizedValue;
    }

    private String truncate(String value, int limit) {
        String normalizedValue = trimToNull(value);
        if (normalizedValue == null) {
            return null;
        }
        return normalizedValue.length() <= limit ? normalizedValue : normalizedValue.substring(0, limit);
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmedValue = value.trim();
        return trimmedValue.isEmpty() ? null : trimmedValue;
    }
}
