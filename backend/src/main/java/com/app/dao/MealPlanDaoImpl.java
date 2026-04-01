package com.app.dao;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.mybatis.spring.SqlSessionTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import com.app.dto.MealPlanDto;
import com.app.dto.MealPlanEntryDto;
import com.app.dto.MealPlanEntryIngredientDto;

@Repository
public class MealPlanDaoImpl implements MealPlanDao {

    private static final String NAMESPACE = "mealPlanCalendarMapper.";

    @Autowired
    private SqlSessionTemplate sqlSessionTemplate;

    @Override
    public List<MealPlanEntryDto> findCalendarEntries(Long userNo, String startDate, String endDate) {
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("userNo", userNo);
        params.put("startDate", startDate);
        params.put("endDate", endDate);
        return sqlSessionTemplate.selectList(NAMESPACE + "selectCalendarEntries", params);
    }

    @Override
    public List<MealPlanEntryIngredientDto> findCalendarEntryIngredients(Long userNo, String startDate, String endDate) {
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("userNo", userNo);
        params.put("startDate", startDate);
        params.put("endDate", endDate);
        return sqlSessionTemplate.selectList(NAMESPACE + "selectCalendarEntryIngredients", params);
    }

    @Override
    public MealPlanEntryDto findEntry(Long userNo, Long entryNo) {
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("userNo", userNo);
        params.put("entryNo", entryNo);
        return sqlSessionTemplate.selectOne(NAMESPACE + "selectEntry", params);
    }

    @Override
    public List<MealPlanEntryIngredientDto> findEntryIngredients(Long entryNo) {
        return sqlSessionTemplate.selectList(NAMESPACE + "selectEntryIngredients", entryNo);
    }

    @Override
    public Long insertMealPlan(MealPlanDto mealPlanDto) {
        sqlSessionTemplate.insert(NAMESPACE + "insertMealPlan", mealPlanDto);
        return mealPlanDto.getPlanNo();
    }

    @Override
    public Long insertEntry(MealPlanEntryDto entryDto) {
        sqlSessionTemplate.insert(NAMESPACE + "insertEntry", entryDto);
        return entryDto.getEntryNo();
    }

    @Override
    public int insertEntryIngredient(MealPlanEntryIngredientDto ingredientDto) {
        return sqlSessionTemplate.insert(NAMESPACE + "insertEntryIngredient", ingredientDto);
    }

    @Override
    public int updateEntry(MealPlanEntryDto entryDto) {
        return sqlSessionTemplate.update(NAMESPACE + "updateEntry", entryDto);
    }

    @Override
    public int deleteEntryIngredients(Long entryNo) {
        return sqlSessionTemplate.delete(NAMESPACE + "deleteEntryIngredients", entryNo);
    }

    @Override
    public int deleteEntry(Long userNo, Long entryNo) {
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("userNo", userNo);
        params.put("entryNo", entryNo);
        return sqlSessionTemplate.delete(NAMESPACE + "deleteEntry", params);
    }

    @Override
    public int deletePlanEntryIngredients(Long userNo, Long planNo) {
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("userNo", userNo);
        params.put("planNo", planNo);
        return sqlSessionTemplate.delete(NAMESPACE + "deletePlanEntryIngredients", params);
    }

    @Override
    public int deletePlanEntries(Long userNo, Long planNo) {
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("userNo", userNo);
        params.put("planNo", planNo);
        return sqlSessionTemplate.delete(NAMESPACE + "deletePlanEntries", params);
    }

    @Override
    public int deletePlan(Long userNo, Long planNo) {
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("userNo", userNo);
        params.put("planNo", planNo);
        return sqlSessionTemplate.delete(NAMESPACE + "deletePlan", params);
    }

    @Override
    public int countEntriesByPlan(Long userNo, Long planNo) {
        Map<String, Object> params = new HashMap<String, Object>();
        params.put("userNo", userNo);
        params.put("planNo", planNo);
        Integer count = sqlSessionTemplate.selectOne(NAMESPACE + "countEntriesByPlan", params);
        return count == null ? 0 : count.intValue();
    }
}
