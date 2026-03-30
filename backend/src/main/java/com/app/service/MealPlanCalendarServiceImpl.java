package com.app.service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.app.dao.MealPlanDao;
import com.app.dao.RecipeDAO;
import com.app.dto.MealPlanCalendarResponseDto;
import com.app.dto.MealPlanCalendarResponseDto.DayDto;
import com.app.dto.MealPlanDto;
import com.app.dto.MealPlanEntryDto;
import com.app.dto.MealPlanEntryIngredientDto;
import com.app.dto.MealPlanEntryRequestDto;
import com.app.dto.MealPlanImportRequestDto;
import com.app.dto.MealPlanImportResultDto;
import com.app.dto.MealPlanPlanDto;
import com.app.dto.MealPlanPlanDto.IngredientDto;
import com.app.dto.MealPlanPlanDto.MealDto;
import com.app.dto.MealPlanChatResponseDto.SellableIngredientDto;
import com.app.dto.RecipeDTO;
import com.app.dto.RecipeIngredientDTO;

@Service
public class MealPlanCalendarServiceImpl implements MealPlanCalendarService {

    private static final String SOURCE_AI = "AI";
    private static final String SOURCE_MANUAL = "MANUAL";
    private static final String SOURCE_RECIPE = "RECIPE";

    private static final String MEAL_BREAKFAST = "BREAKFAST";
    private static final String MEAL_LUNCH = "LUNCH";
    private static final String MEAL_DINNER = "DINNER";
    private static final String MEAL_SNACK = "SNACK";
    private static final String MEAL_CUSTOM = "CUSTOM";

    private final MealPlanDao mealPlanDao;
    private final RecipeDAO recipeDAO;

    public MealPlanCalendarServiceImpl(MealPlanDao mealPlanDao, RecipeDAO recipeDAO) {
        this.mealPlanDao = mealPlanDao;
        this.recipeDAO = recipeDAO;
    }

    @Override
    @Transactional(readOnly = true)
    public MealPlanCalendarResponseDto getCalendar(Long userNo, String month) {
        requireUserNo(userNo);

        YearMonth yearMonth = parseYearMonth(month);
        LocalDate startDate = yearMonth.atDay(1);
        LocalDate endDate = yearMonth.atEndOfMonth();

        List<MealPlanEntryDto> entryList =
            mealPlanDao.findCalendarEntries(userNo, startDate.toString(), endDate.toString());
        List<MealPlanEntryIngredientDto> ingredientList =
            mealPlanDao.findCalendarEntryIngredients(userNo, startDate.toString(), endDate.toString());

        Map<Long, List<MealPlanEntryIngredientDto>> ingredientMap =
            new LinkedHashMap<Long, List<MealPlanEntryIngredientDto>>();
        for (MealPlanEntryIngredientDto ingredientDto : ingredientList) {
            if (ingredientDto == null || ingredientDto.getEntryNo() == null) {
                continue;
            }
            ingredientMap
                .computeIfAbsent(ingredientDto.getEntryNo(), key -> new ArrayList<MealPlanEntryIngredientDto>())
                .add(ingredientDto);
        }

        Map<String, DayDto> dayMap = createMonthDayMap(startDate, endDate);
        for (MealPlanEntryDto entryDto : entryList) {
            List<MealPlanEntryIngredientDto> attachedIngredientList =
                ingredientMap.getOrDefault(entryDto.getEntryNo(), Collections.<MealPlanEntryIngredientDto>emptyList());
            entryDto.setIngredientList(new ArrayList<MealPlanEntryIngredientDto>(attachedIngredientList));

            DayDto dayDto = dayMap.get(entryDto.getMealDate());
            if (dayDto == null) {
                dayDto = new DayDto();
                dayDto.setDate(entryDto.getMealDate());
                dayDto.setDayLabel(resolveDayLabel(parseIsoDate(entryDto.getMealDate(), "mealDate").getDayOfWeek()));
                dayMap.put(entryDto.getMealDate(), dayDto);
            }
            dayDto.getEntries().add(entryDto);
        }

        MealPlanCalendarResponseDto responseDto = new MealPlanCalendarResponseDto();
        responseDto.setMonth(yearMonth.toString());
        responseDto.setStartDate(startDate.toString());
        responseDto.setEndDate(endDate.toString());
        responseDto.setDays(new ArrayList<DayDto>(dayMap.values()));
        return responseDto;
    }

    @Override
    @Transactional
    public MealPlanImportResultDto importAiPlan(Long userNo, MealPlanImportRequestDto requestDto) {
        requireUserNo(userNo);
        if (requestDto == null || requestDto.getPlan() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "AI meal plan payload is required.");
        }

        MealPlanPlanDto planDto = requestDto.getPlan();
        if (planDto.getDaysList() == null || planDto.getDaysList().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "AI meal plan days are required.");
        }

        LocalDate startDate = parseIsoDate(requestDto.getStartDate(), "startDate");
        LocalDate endDate = trimToNull(requestDto.getEndDate()) == null
            ? startDate.plusDays(planDto.getDaysList().size() - 1L)
            : parseIsoDate(requestDto.getEndDate(), "endDate");

        if (endDate.isBefore(startDate)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "endDate must be on or after startDate.");
        }

        long rangeDays = endDate.toEpochDay() - startDate.toEpochDay() + 1L;
        if (planDto.getDaysList().size() > rangeDays) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Date range is shorter than the AI meal plan.");
        }

        MealPlanDto mealPlanDto = new MealPlanDto();
        mealPlanDto.setUserNo(userNo);
        mealPlanDto.setPlanTitle(defaultIfBlank(requestDto.getTitle(), "AI Meal Plan"));
        mealPlanDto.setSourceType(SOURCE_AI);
        mealPlanDto.setRequestText(trimToNull(requestDto.getRequestText()));
        mealPlanDto.setPlanSummary(trimToNull(planDto.getGoalSummary()));
        mealPlanDto.setStartDate(startDate.toString());
        mealPlanDto.setEndDate(endDate.toString());
        mealPlanDto.setAiResponseId(trimToNull(requestDto.getResponseId()));

        Long planNo = mealPlanDao.insertMealPlan(mealPlanDto);
        if (planNo == null) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to create meal plan.");
        }

        Map<String, Long> matchedProductNoMap = buildMatchedProductNoMap(requestDto.getSellableIngredients());
        Integer importedEntryCount = Integer.valueOf(0);
        Integer importedIngredientCount = Integer.valueOf(0);
        int defaultServings = resolvePositiveInteger(planDto.getServings(), 1);

        for (int dayIndex = 0; dayIndex < planDto.getDaysList().size(); dayIndex++) {
            MealPlanCalendarImportCounts importCounts = importAiDay(
                userNo,
                planNo,
                startDate.plusDays(dayIndex),
                planDto.getDaysList().get(dayIndex),
                matchedProductNoMap,
                defaultServings
            );
            importedEntryCount = Integer.valueOf(importedEntryCount.intValue() + importCounts.getEntryCount());
            importedIngredientCount = Integer.valueOf(importedIngredientCount.intValue() + importCounts.getIngredientCount());
        }

        MealPlanImportResultDto resultDto = new MealPlanImportResultDto();
        resultDto.setPlanNo(planNo);
        resultDto.setTitle(mealPlanDto.getPlanTitle());
        resultDto.setStartDate(startDate.toString());
        resultDto.setEndDate(endDate.toString());
        resultDto.setImportedEntryCount(importedEntryCount);
        resultDto.setImportedIngredientCount(importedIngredientCount);
        return resultDto;
    }

    @Override
    @Transactional
    public MealPlanEntryDto createEntry(Long userNo, MealPlanEntryRequestDto requestDto) {
        requireUserNo(userNo);
        MealPlanEntryDto entryDto = buildEntryDto(userNo, null, requestDto, SOURCE_MANUAL, null, null);
        Long entryNo = mealPlanDao.insertEntry(entryDto);
        insertEntryIngredients(entryNo, requestDto == null ? null : requestDto.getIngredientList());
        return loadEntry(userNo, entryNo);
    }

    @Override
    @Transactional
    public MealPlanEntryDto updateEntry(Long userNo, Long entryNo, MealPlanEntryRequestDto requestDto) {
        requireUserNo(userNo);
        MealPlanEntryDto existingEntryDto = requireEntry(userNo, entryNo);

        MealPlanEntryDto entryDto = buildEntryDto(
            userNo,
            existingEntryDto.getPlanNo(),
            requestDto,
            defaultIfBlank(requestDto == null ? null : requestDto.getSourceType(), existingEntryDto.getSourceType()),
            requestDto != null && requestDto.getRecipeNo() != null ? requestDto.getRecipeNo() : existingEntryDto.getRecipeNo(),
            existingEntryDto.getEntryNo()
        );
        entryDto.setImageUrl(defaultIfBlank(requestDto == null ? null : requestDto.getImageUrl(), existingEntryDto.getImageUrl()));

        if (mealPlanDao.updateEntry(entryDto) == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Meal plan entry not found.");
        }
        mealPlanDao.deleteEntryIngredients(entryNo);
        insertEntryIngredients(entryNo, requestDto == null ? null : requestDto.getIngredientList());
        return loadEntry(userNo, entryNo);
    }

    @Override
    @Transactional
    public void deleteEntry(Long userNo, Long entryNo) {
        requireUserNo(userNo);
        MealPlanEntryDto existingEntryDto = requireEntry(userNo, entryNo);
        mealPlanDao.deleteEntryIngredients(entryNo);
        mealPlanDao.deleteEntry(userNo, entryNo);

        if (existingEntryDto.getPlanNo() != null
            && mealPlanDao.countEntriesByPlan(userNo, existingEntryDto.getPlanNo()) == 0) {
            mealPlanDao.deletePlan(userNo, existingEntryDto.getPlanNo());
        }
    }

    @Override
    @Transactional
    public void deletePlan(Long userNo, Long planNo) {
        requireUserNo(userNo);
        mealPlanDao.deletePlanEntryIngredients(userNo, planNo);
        mealPlanDao.deletePlanEntries(userNo, planNo);
        int deletedCount = mealPlanDao.deletePlan(userNo, planNo);
        if (deletedCount == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Meal plan not found.");
        }
    }

    @Override
    @Transactional
    public MealPlanEntryDto createEntryFromRecipe(Long userNo, MealPlanEntryRequestDto requestDto) {
        requireUserNo(userNo);
        if (requestDto == null || requestDto.getRecipeNo() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "recipeNo is required.");
        }

        RecipeDTO recipeDto = recipeDAO.selectRecipeDetail(requestDto.getRecipeNo());
        if (recipeDto == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Recipe not found.");
        }

        List<RecipeIngredientDTO> recipeIngredientList = recipeDto.getIngredientList();
        if (recipeIngredientList == null || recipeIngredientList.isEmpty()) {
            recipeIngredientList = recipeDAO.selectRecipeIngredientList(recipeDto.getRecipeNo());
        }

        MealPlanEntryDto entryDto = new MealPlanEntryDto();
        entryDto.setPlanNo(null);
        entryDto.setUserNo(userNo);
        entryDto.setMealDate(parseIsoDate(requestDto.getMealDate(), "mealDate").toString());
        entryDto.setMealType(normalizeMealType(requestDto.getMealType()));
        entryDto.setEntryTitle(defaultIfBlank(recipeDto.getRecipeName(), "Recipe Meal"));
        entryDto.setEntryDescription(defaultIfBlank(requestDto.getEntryDescription(), trimToNull(recipeDto.getDescription())));
        entryDto.setSourceType(SOURCE_RECIPE);
        entryDto.setRecipeNo(recipeDto.getRecipeNo());
        entryDto.setRecipeName(recipeDto.getRecipeName());
        entryDto.setServings(Integer.valueOf(resolvePositiveInteger(requestDto.getServings(), 1)));
        entryDto.setDisplayOrder(Integer.valueOf(resolvePositiveInteger(requestDto.getDisplayOrder(), 1)));
        entryDto.setImageUrl(trimToNull(recipeDto.getImageUrl()));

        Long entryNo = mealPlanDao.insertEntry(entryDto);
        if (recipeIngredientList != null) {
            for (RecipeIngredientDTO recipeIngredientDto : recipeIngredientList) {
                if (recipeIngredientDto == null || trimToNull(recipeIngredientDto.getIngredientName()) == null) {
                    continue;
                }
                MealPlanEntryIngredientDto ingredientDto = new MealPlanEntryIngredientDto();
                ingredientDto.setEntryNo(entryNo);
                ingredientDto.setIngredientName(recipeIngredientDto.getIngredientName().trim());
                ingredientDto.setAmountText(trimToNull(recipeIngredientDto.getAmount()));
                mealPlanDao.insertEntryIngredient(ingredientDto);
            }
        }
        return loadEntry(userNo, entryNo);
    }

    private MealPlanCalendarImportCounts importAiDay(
        Long userNo,
        Long planNo,
        LocalDate mealDate,
        MealPlanPlanDto.DayDto dayDto,
        Map<String, Long> matchedProductNoMap,
        int defaultServings
    ) {
        if (dayDto == null || dayDto.getMeals() == null || dayDto.getMeals().isEmpty()) {
            return new MealPlanCalendarImportCounts(0, 0);
        }

        int entryCount = 0;
        int ingredientCount = 0;

        for (int mealIndex = 0; mealIndex < dayDto.getMeals().size(); mealIndex++) {
            MealDto mealDto = dayDto.getMeals().get(mealIndex);
            if (mealDto == null || trimToNull(mealDto.getMenuName()) == null) {
                continue;
            }

            MealPlanEntryDto entryDto = new MealPlanEntryDto();
            entryDto.setPlanNo(planNo);
            entryDto.setUserNo(userNo);
            entryDto.setMealDate(mealDate.toString());
            entryDto.setMealType(normalizeMealType(mealDto.getMealType()));
            entryDto.setEntryTitle(mealDto.getMenuName().trim());
            entryDto.setEntryDescription(trimToNull(mealDto.getDescription()));
            entryDto.setSourceType(SOURCE_AI);
            entryDto.setServings(Integer.valueOf(defaultServings));
            entryDto.setDisplayOrder(Integer.valueOf(mealIndex + 1));

            Long entryNo = mealPlanDao.insertEntry(entryDto);
            entryCount++;
            ingredientCount += insertAiIngredients(entryNo, mealDto.getIngredients(), matchedProductNoMap);
        }

        return new MealPlanCalendarImportCounts(entryCount, ingredientCount);
    }

    private int insertAiIngredients(
        Long entryNo,
        List<IngredientDto> ingredientList,
        Map<String, Long> matchedProductNoMap
    ) {
        if (ingredientList == null || ingredientList.isEmpty()) {
            return 0;
        }

        int insertedCount = 0;
        for (IngredientDto ingredientDto : ingredientList) {
            if (ingredientDto == null || trimToNull(ingredientDto.getIngredientName()) == null) {
                continue;
            }

            MealPlanEntryIngredientDto entryIngredientDto = new MealPlanEntryIngredientDto();
            entryIngredientDto.setEntryNo(entryNo);
            entryIngredientDto.setIngredientName(ingredientDto.getIngredientName().trim());
            entryIngredientDto.setAmountValue(ingredientDto.getAmountValue());
            entryIngredientDto.setUnit(trimToNull(ingredientDto.getUnit()));
            entryIngredientDto.setAmountText(trimToNull(ingredientDto.getAmountText()));
            entryIngredientDto.setProductNo(findMatchedProductNo(ingredientDto.getIngredientName(), matchedProductNoMap));
            mealPlanDao.insertEntryIngredient(entryIngredientDto);
            insertedCount++;
        }
        return insertedCount;
    }

    private MealPlanEntryDto buildEntryDto(
        Long userNo,
        Long planNo,
        MealPlanEntryRequestDto requestDto,
        String defaultSourceType,
        Long defaultRecipeNo,
        Long entryNo
    ) {
        if (requestDto == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Meal plan entry payload is required.");
        }

        String title = trimToNull(requestDto.getEntryTitle());
        if (title == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "entryTitle is required.");
        }

        MealPlanEntryDto entryDto = new MealPlanEntryDto();
        entryDto.setEntryNo(entryNo);
        entryDto.setPlanNo(planNo);
        entryDto.setUserNo(userNo);
        entryDto.setMealDate(parseIsoDate(requestDto.getMealDate(), "mealDate").toString());
        entryDto.setMealType(normalizeMealType(requestDto.getMealType()));
        entryDto.setEntryTitle(title);
        entryDto.setEntryDescription(trimToNull(requestDto.getEntryDescription()));
        entryDto.setSourceType(normalizeSourceType(defaultIfBlank(requestDto.getSourceType(), defaultSourceType)));
        entryDto.setRecipeNo(requestDto.getRecipeNo() == null ? defaultRecipeNo : requestDto.getRecipeNo());
        entryDto.setServings(Integer.valueOf(resolvePositiveInteger(requestDto.getServings(), 1)));
        entryDto.setDisplayOrder(Integer.valueOf(resolvePositiveInteger(requestDto.getDisplayOrder(), 1)));
        entryDto.setImageUrl(trimToNull(requestDto.getImageUrl()));
        return entryDto;
    }

    private void insertEntryIngredients(Long entryNo, List<MealPlanEntryIngredientDto> ingredientList) {
        if (ingredientList == null || ingredientList.isEmpty()) {
            return;
        }

        for (MealPlanEntryIngredientDto ingredientDto : ingredientList) {
            if (ingredientDto == null || trimToNull(ingredientDto.getIngredientName()) == null) {
                continue;
            }

            MealPlanEntryIngredientDto insertDto = new MealPlanEntryIngredientDto();
            insertDto.setEntryNo(entryNo);
            insertDto.setIngredientName(ingredientDto.getIngredientName().trim());
            insertDto.setAmountValue(ingredientDto.getAmountValue());
            insertDto.setUnit(trimToNull(ingredientDto.getUnit()));
            insertDto.setAmountText(trimToNull(ingredientDto.getAmountText()));
            insertDto.setProductNo(ingredientDto.getProductNo());
            mealPlanDao.insertEntryIngredient(insertDto);
        }
    }

    private MealPlanEntryDto loadEntry(Long userNo, Long entryNo) {
        MealPlanEntryDto entryDto = requireEntry(userNo, entryNo);
        List<MealPlanEntryIngredientDto> ingredientList = mealPlanDao.findEntryIngredients(entryNo);
        entryDto.setIngredientList(new ArrayList<MealPlanEntryIngredientDto>(ingredientList));
        return entryDto;
    }

    private MealPlanEntryDto requireEntry(Long userNo, Long entryNo) {
        MealPlanEntryDto entryDto = mealPlanDao.findEntry(userNo, entryNo);
        if (entryDto == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Meal plan entry not found.");
        }
        return entryDto;
    }

    private Map<String, DayDto> createMonthDayMap(LocalDate startDate, LocalDate endDate) {
        Map<String, DayDto> dayMap = new LinkedHashMap<String, DayDto>();
        LocalDate cursor = startDate;
        while (!cursor.isAfter(endDate)) {
            DayDto dayDto = new DayDto();
            dayDto.setDate(cursor.toString());
            dayDto.setDayLabel(resolveDayLabel(cursor.getDayOfWeek()));
            dayMap.put(dayDto.getDate(), dayDto);
            cursor = cursor.plusDays(1L);
        }
        return dayMap;
    }

    private Map<String, Long> buildMatchedProductNoMap(List<SellableIngredientDto> sellableIngredientList) {
        Map<String, Long> matchedProductNoMap = new LinkedHashMap<String, Long>();
        if (sellableIngredientList == null || sellableIngredientList.isEmpty()) {
            return matchedProductNoMap;
        }

        for (SellableIngredientDto sellableIngredientDto : sellableIngredientList) {
            if (sellableIngredientDto == null
                || sellableIngredientDto.getCartCandidate() == null
                || sellableIngredientDto.getCartCandidate().getProductNo() == null) {
                continue;
            }

            String ingredientName = normalizeIngredientKey(sellableIngredientDto.getIngredientName());
            if (ingredientName == null) {
                continue;
            }
            matchedProductNoMap.putIfAbsent(ingredientName, sellableIngredientDto.getCartCandidate().getProductNo());
        }
        return matchedProductNoMap;
    }

    private Long findMatchedProductNo(String ingredientName, Map<String, Long> matchedProductNoMap) {
        String normalizedKey = normalizeIngredientKey(ingredientName);
        if (normalizedKey == null) {
            return null;
        }
        return matchedProductNoMap.get(normalizedKey);
    }

    private String normalizeIngredientKey(String value) {
        String trimmedValue = trimToNull(value);
        if (trimmedValue == null) {
            return null;
        }
        return trimmedValue
            .toLowerCase(Locale.ROOT)
            .replace(" ", "")
            .replace("-", "")
            .replace("_", "");
    }

    private void requireUserNo(Long userNo) {
        if (userNo == null || userNo.longValue() <= 0L) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "X-USER-NO is required.");
        }
    }

    private YearMonth parseYearMonth(String value) {
        if (trimToNull(value) == null) {
            return YearMonth.now();
        }
        try {
            return YearMonth.parse(value);
        } catch (DateTimeParseException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "month must use YYYY-MM format.");
        }
    }

    private LocalDate parseIsoDate(String value, String label) {
        if (trimToNull(value) == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, label + " is required.");
        }
        try {
            return LocalDate.parse(value);
        } catch (DateTimeParseException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, label + " must use YYYY-MM-DD format.");
        }
    }

    private String normalizeSourceType(String value) {
        String normalizedValue = trimToNull(value);
        if (normalizedValue == null) {
            return SOURCE_MANUAL;
        }

        String upperValue = normalizedValue.toUpperCase(Locale.ROOT);
        if (SOURCE_AI.equals(upperValue) || SOURCE_RECIPE.equals(upperValue) || SOURCE_MANUAL.equals(upperValue)) {
            return upperValue;
        }
        return SOURCE_MANUAL;
    }

    private String normalizeMealType(String value) {
        String normalizedValue = trimToNull(value);
        if (normalizedValue == null) {
            return MEAL_CUSTOM;
        }

        String upperValue = normalizedValue.toUpperCase(Locale.ROOT);
        if (MEAL_BREAKFAST.equals(upperValue) || "\uC544\uCE68".equals(normalizedValue)) {
            return MEAL_BREAKFAST;
        }
        if (MEAL_LUNCH.equals(upperValue) || "\uC810\uC2EC".equals(normalizedValue)) {
            return MEAL_LUNCH;
        }
        if (MEAL_DINNER.equals(upperValue) || "\uC800\uB141".equals(normalizedValue)) {
            return MEAL_DINNER;
        }
        if (MEAL_SNACK.equals(upperValue) || "\uAC04\uC2DD".equals(normalizedValue)) {
            return MEAL_SNACK;
        }
        return MEAL_CUSTOM;
    }

    private String resolveDayLabel(DayOfWeek dayOfWeek) {
        switch (dayOfWeek) {
            case MONDAY:
                return "MON";
            case TUESDAY:
                return "TUE";
            case WEDNESDAY:
                return "WED";
            case THURSDAY:
                return "THU";
            case FRIDAY:
                return "FRI";
            case SATURDAY:
                return "SAT";
            case SUNDAY:
            default:
                return "SUN";
        }
    }

    private int resolvePositiveInteger(Integer value, int fallback) {
        if (value == null || value.intValue() <= 0) {
            return fallback;
        }
        return value.intValue();
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmedValue = value.trim();
        return trimmedValue.isEmpty() ? null : trimmedValue;
    }

    private String defaultIfBlank(String value, String fallback) {
        String trimmedValue = trimToNull(value);
        return trimmedValue == null ? fallback : trimmedValue;
    }

    private static final class MealPlanCalendarImportCounts {

        private final int entryCount;
        private final int ingredientCount;

        private MealPlanCalendarImportCounts(int entryCount, int ingredientCount) {
            this.entryCount = entryCount;
            this.ingredientCount = ingredientCount;
        }

        private int getEntryCount() {
            return entryCount;
        }

        private int getIngredientCount() {
            return ingredientCount;
        }
    }
}
