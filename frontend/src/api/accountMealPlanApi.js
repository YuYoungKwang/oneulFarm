import { fetchRecipeDetail, fetchRecipeList } from '../components/recipeApi';

const STORAGE_PREFIX = 'oneulFarmAccountMealPlans:v1';
const STORAGE_EVENT_NAME = 'oneulFarm:meal-schedule-change';

function padNumber(value) {
  return String(value).padStart(2, '0');
}

function toMonthKey(value) {
  const safeValue = String(value || '').slice(0, 7);
  return /^\d{4}-\d{2}$/.test(safeValue) ? safeValue : '';
}

function toDateKey(value) {
  const safeValue = String(value || '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(safeValue) ? safeValue : '';
}

function createMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}`;
}

function getStorageKey(user) {
  return `${STORAGE_PREFIX}:${user?.userNo || 'guest'}`;
}

function formatLocalDateKey(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return '';
  }

  return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`;
}

function getTodayDateKey() {
  return formatLocalDateKey(new Date());
}

function createEmptyStore() {
  return {
    nextPlanNo: 1,
    nextEntryNo: 1,
    nextIngredientNo: 1,
    plans: [],
    entries: [],
  };
}

function readStore(user) {
  if (typeof window === 'undefined') {
    return createEmptyStore();
  }

  try {
    const rawValue = window.localStorage.getItem(getStorageKey(user));
    if (!rawValue) {
      return createEmptyStore();
    }

    const parsedValue = JSON.parse(rawValue);
    return {
      nextPlanNo: Number(parsedValue?.nextPlanNo || 1),
      nextEntryNo: Number(parsedValue?.nextEntryNo || 1),
      nextIngredientNo: Number(parsedValue?.nextIngredientNo || 1),
      plans: Array.isArray(parsedValue?.plans) ? parsedValue.plans : [],
      entries: Array.isArray(parsedValue?.entries) ? parsedValue.entries : [],
    };
  } catch (error) {
    return createEmptyStore();
  }
}

function writeStore(user, store) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(getStorageKey(user), JSON.stringify(store));
  window.dispatchEvent(
    new CustomEvent(STORAGE_EVENT_NAME, {
      detail: {
        userNo: user?.userNo || null,
      },
    })
  );
}

function normalizeMealType(value) {
  const safeValue = String(value || '').trim();
  const upperValue = safeValue.toUpperCase();

  if (['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'CUSTOM'].includes(upperValue)) {
    return upperValue;
  }

  if (safeValue.includes('아침') || safeValue.includes('조식') || upperValue.includes('BREAKFAST')) {
    return 'BREAKFAST';
  }

  if (safeValue.includes('점심') || safeValue.includes('중식') || upperValue.includes('LUNCH')) {
    return 'LUNCH';
  }

  if (safeValue.includes('저녁') || safeValue.includes('석식') || upperValue.includes('DINNER')) {
    return 'DINNER';
  }

  if (safeValue.includes('간식') || upperValue.includes('SNACK')) {
    return 'SNACK';
  }

  if (safeValue.includes('직접 입력') || upperValue.includes('CUSTOM')) {
    return 'CUSTOM';
  }

  return 'DINNER';
}

function normalizeIngredient(item, nextIngredientNo, linkedProductMap) {
  const ingredientName = String(item?.ingredientName || '').trim();
  if (!ingredientName) {
    return null;
  }

  return {
    entryIngredientNo: nextIngredientNo,
    ingredientName,
    amountValue:
      item?.amountValue != null && Number.isFinite(Number(item.amountValue))
        ? Number(item.amountValue)
        : null,
    unit: String(item?.unit || '').trim(),
    amountText: String(item?.amountText || '').trim(),
    note: String(item?.note || '').trim(),
    linkedProductNo: linkedProductMap.get(normalizeIngredientToken(ingredientName)) || null,
  };
}

function normalizeIngredientToken(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9\u3131-\u318e\uac00-\ud7a3]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildLinkedProductMap(sellableIngredients) {
  const map = new Map();

  (Array.isArray(sellableIngredients) ? sellableIngredients : []).forEach((item) => {
    const ingredientToken = normalizeIngredientToken(item?.ingredientName);
    const productNo = Number(item?.cartCandidate?.productNo || 0);

    if (ingredientToken && productNo > 0) {
      map.set(ingredientToken, productNo);
    }
  });

  return map;
}

function normalizeEntryShape(entry) {
  return {
    entryNo: Number(entry?.entryNo || 0),
    planNo: entry?.planNo != null ? Number(entry.planNo) : null,
    mealDate: toDateKey(entry?.mealDate || entry?.date || ''),
    mealType: normalizeMealType(entry?.mealType),
    entryTitle: String(entry?.entryTitle || entry?.title || '').trim(),
    entryDescription: String(entry?.entryDescription || entry?.notes || '').trim(),
    servings: Math.max(1, Number(entry?.servings || 1)),
    sourceType: String(entry?.sourceType || 'MANUAL').toUpperCase(),
    recipeNo: entry?.recipeNo != null ? Number(entry.recipeNo) : null,
    recipeTitle: String(entry?.recipeTitle || '').trim(),
    ingredients: Array.isArray(entry?.ingredients) ? entry.ingredients : [],
    createdAt: entry?.createdAt || new Date().toISOString(),
  };
}

function normalizePlanShape(plan) {
  return {
    planNo: Number(plan?.planNo || 0),
    planTitle: String(plan?.planTitle || '').trim(),
    planSummary: String(plan?.planSummary || '').trim(),
    startDate: toDateKey(plan?.startDate || ''),
    endDate: toDateKey(plan?.endDate || ''),
    requestText: String(plan?.requestText || '').trim(),
    aiResponseId: plan?.aiResponseId || null,
    sourceType: String(plan?.sourceType || 'AI').toUpperCase(),
    createdAt: plan?.createdAt || new Date().toISOString(),
  };
}

function filterPlansForMonth(plans, entries, month) {
  const monthKey = toMonthKey(month) || createMonthKey();

  return (Array.isArray(plans) ? plans : [])
    .filter((plan) => {
      if (toMonthKey(plan.startDate) === monthKey || toMonthKey(plan.endDate) === monthKey) {
        return true;
      }

      return entries.some(
        (entry) => entry.planNo === plan.planNo && toMonthKey(entry.mealDate) === monthKey
      );
    })
    .sort((left, right) => {
      return String(left.startDate || '').localeCompare(String(right.startDate || ''));
    });
}

function buildCalendarPayload(user, month) {
  const monthKey = toMonthKey(month) || createMonthKey();
  const store = readStore(user);
  const entries = store.entries
    .map(normalizeEntryShape)
    .filter((entry) => toMonthKey(entry.mealDate) === monthKey)
    .sort((left, right) => {
      if (left.mealDate !== right.mealDate) {
        return left.mealDate.localeCompare(right.mealDate);
      }

      return left.mealType.localeCompare(right.mealType);
    });

  const plans = filterPlansForMonth(
    store.plans.map(normalizePlanShape),
    store.entries.map(normalizeEntryShape),
    monthKey
  );

  return {
    month: monthKey,
    entries,
    plans,
  };
}

function buildEntryFromForm(store, payload) {
  const mealDate = toDateKey(payload?.mealDate || payload?.date) || getTodayDateKey();
  const entryTitle = String(payload?.entryTitle || payload?.title || '').trim();

  if (!entryTitle) {
    throw new Error('\uC2DD\uB2E8 \uC774\uB984\uC744 \uC785\uB825\uD574 \uC8FC\uC138\uC694.');
  }

  return normalizeEntryShape({
    entryNo: store.nextEntryNo,
    planNo: payload?.planNo ?? null,
    mealDate,
    mealType: payload?.mealType,
    entryTitle,
    entryDescription: payload?.entryDescription || payload?.notes || '',
    servings: payload?.servings || 1,
    sourceType: payload?.sourceType || 'MANUAL',
    recipeNo: payload?.recipeNo ?? null,
    recipeTitle: payload?.recipeTitle || '',
    ingredients: Array.isArray(payload?.ingredients) ? payload.ingredients : [],
    createdAt: new Date().toISOString(),
  });
}

function buildDateRange(startDate, endDate, maxLength) {
  const result = [];
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return result;
  }

  const cursor = new Date(start);
  while (cursor <= end && result.length < maxLength) {
    result.push(
      `${cursor.getFullYear()}-${padNumber(cursor.getMonth() + 1)}-${padNumber(cursor.getDate())}`
    );
    cursor.setDate(cursor.getDate() + 1);
  }

  return result;
}

function buildAiEntries(store, planNo, startDate, endDate, payload) {
  const safePlan = payload?.plan || {};
  const daysList = Array.isArray(safePlan?.daysList) ? safePlan.daysList : [];
  if (!daysList.length) {
    throw new Error('\uAC00\uC838\uC62C AI \uC2DD\uB2E8 \uB0B4\uC6A9\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.');
  }

  const linkedProductMap = buildLinkedProductMap(payload?.sellableIngredients || []);
  const dateKeys = buildDateRange(startDate, endDate, daysList.length);
  const entries = [];
  let nextEntryNo = store.nextEntryNo;
  let nextIngredientNo = store.nextIngredientNo;

  dateKeys.forEach((mealDate, dayIndex) => {
    const day = daysList[dayIndex];
    const meals = Array.isArray(day?.meals) ? day.meals : [];

    meals.forEach((meal) => {
      const ingredients = [];
      (Array.isArray(meal?.ingredients) ? meal.ingredients : []).forEach((ingredient) => {
        const normalizedIngredient = normalizeIngredient(
          ingredient,
          nextIngredientNo,
          linkedProductMap
        );
        if (normalizedIngredient) {
          ingredients.push(normalizedIngredient);
          nextIngredientNo += 1;
        }
      });

      entries.push(
        normalizeEntryShape({
          entryNo: nextEntryNo,
          planNo,
          mealDate,
          mealType: meal?.mealType || 'DINNER',
          entryTitle: meal?.menuName || '\uC2DD\uB2E8',
          entryDescription: meal?.description || '',
          servings: safePlan?.servings || 1,
          sourceType: 'AI',
          ingredients,
          createdAt: new Date().toISOString(),
        })
      );
      nextEntryNo += 1;
    });
  });

  return {
    entries,
    nextEntryNo,
    nextIngredientNo,
  };
}

function normalizeRecipeItems(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.items)) {
    return payload.items;
  }

  if (Array.isArray(payload?.list)) {
    return payload.list;
  }

  if (Array.isArray(payload?.content)) {
    return payload.content;
  }

  return [];
}

function extractRecipeCount(payload, fallbackCount) {
  const candidateValues = [
    payload?.totalCount,
    payload?.totalElements,
    payload?.pagination?.totalCount,
    payload?.pageInfo?.totalCount,
    fallbackCount,
  ];

  const matchedValue = candidateValues.find((value) => Number.isFinite(Number(value)));
  return matchedValue != null ? Number(matchedValue) : fallbackCount;
}

function buildRecipeIngredientSnapshot(recipeDetail, servings, nextIngredientNo) {
  const ingredients = [];
  let cursor = nextIngredientNo;

  (Array.isArray(recipeDetail?.ingredientList) ? recipeDetail.ingredientList : []).forEach((item) => {
    const ingredientName = String(item?.ingredientName || item?.name || '').trim();
    if (!ingredientName) {
      return;
    }

    ingredients.push({
      entryIngredientNo: cursor,
      ingredientName,
      amountValue: null,
      unit: '',
      amountText: String(item?.amount || item?.ingredientAmount || '').trim(),
      note: '',
      linkedProductNo: null,
    });
    cursor += 1;
  });

  return {
    ingredients,
    nextIngredientNo: cursor,
    servings: Math.max(1, Number(servings || 1)),
  };
}

export function getMealScheduleStorageEventName() {
  return STORAGE_EVENT_NAME;
}

export async function fetchMealPlanCalendar({ user, month }) {
  return buildCalendarPayload(user, month);
}

export async function createMealPlanEntry({ user, payload }) {
  const store = readStore(user);
  const nextEntry = buildEntryFromForm(store, payload);

  store.entries.push(nextEntry);
  store.nextEntryNo += 1;
  writeStore(user, store);

  return nextEntry;
}

export async function updateMealPlanEntry({ user, entryNo, payload }) {
  const store = readStore(user);
  const targetIndex = store.entries.findIndex(
    (entry) => Number(entry?.entryNo) === Number(entryNo)
  );

  if (targetIndex < 0) {
    throw new Error('\uC218\uC815\uD560 \uC2DD\uB2E8\uC744 \uCC3E\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.');
  }

  const currentEntry = normalizeEntryShape(store.entries[targetIndex]);
  const nextEntry = normalizeEntryShape({
    ...currentEntry,
    mealDate: payload?.mealDate || payload?.date || currentEntry.mealDate,
    mealType: payload?.mealType || currentEntry.mealType,
    entryTitle: payload?.entryTitle || payload?.title || currentEntry.entryTitle,
    entryDescription:
      payload?.entryDescription || payload?.notes || currentEntry.entryDescription,
    servings: payload?.servings || currentEntry.servings,
  });

  if (!nextEntry.entryTitle) {
    throw new Error('\uC2DD\uB2E8 \uC774\uB984\uC744 \uC785\uB825\uD574 \uC8FC\uC138\uC694.');
  }

  store.entries[targetIndex] = nextEntry;
  writeStore(user, store);

  return nextEntry;
}

export async function deleteMealPlanEntry({ user, entryNo }) {
  const store = readStore(user);
  const removedEntry = store.entries.find((entry) => Number(entry?.entryNo) === Number(entryNo));

  store.entries = store.entries.filter((entry) => Number(entry?.entryNo) !== Number(entryNo));

  if (removedEntry?.planNo) {
    const hasSibling = store.entries.some((entry) => Number(entry?.planNo) === Number(removedEntry.planNo));
    if (!hasSibling) {
      store.plans = store.plans.filter((plan) => Number(plan?.planNo) !== Number(removedEntry.planNo));
    }
  }

  writeStore(user, store);
  return true;
}

export async function deleteMealPlanBatch({ user, planNo }) {
  const store = readStore(user);
  store.plans = store.plans.filter((plan) => Number(plan?.planNo) !== Number(planNo));
  store.entries = store.entries.filter((entry) => Number(entry?.planNo) !== Number(planNo));
  writeStore(user, store);
  return true;
}

export async function importAiMealPlan({
  user,
  startDate,
  endDate,
  title,
  requestText,
  responseId,
  plan,
  sellableIngredients,
}) {
  const safeStartDate = toDateKey(startDate);
  const safeEndDate = toDateKey(endDate);
  if (!safeStartDate || !safeEndDate || safeStartDate > safeEndDate) {
    throw new Error('\uC2DC\uC791\uC77C\uACFC \uC885\uB8CC\uC77C\uC744 \uC62C\uBC14\uB974\uAC8C \uC785\uB825\uD574 \uC8FC\uC138\uC694.');
  }

  const store = readStore(user);
  const planNo = store.nextPlanNo;
  const nextPlan = normalizePlanShape({
    planNo,
    planTitle: String(title || '').trim() || '\uB9DE\uCDA4 \uC2DD\uB2E8',
    planSummary: plan?.goalSummary || '',
    startDate: safeStartDate,
    endDate: safeEndDate,
    requestText: requestText || '',
    aiResponseId: responseId || null,
    sourceType: 'AI',
    createdAt: new Date().toISOString(),
  });

  const builtEntries = buildAiEntries(store, planNo, safeStartDate, safeEndDate, {
    plan,
    sellableIngredients,
  });

  store.plans.push(nextPlan);
  store.entries.push(...builtEntries.entries);
  store.nextPlanNo += 1;
  store.nextEntryNo = builtEntries.nextEntryNo;
  store.nextIngredientNo = builtEntries.nextIngredientNo;
  writeStore(user, store);

  return {
    planNo,
    title: nextPlan.planTitle,
    startDate: safeStartDate,
    endDate: safeEndDate,
    importedEntryCount: builtEntries.entries.length,
  };
}

export async function createRecipeMealPlanEntry({ user, recipeNo, mealDate, mealType, servings }) {
  const safeRecipeNo = Number(recipeNo || 0);
  if (safeRecipeNo <= 0) {
    throw new Error('\uB808\uC2DC\uD53C \uC815\uBCF4\uAC00 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.');
  }

  const recipeDetail = await fetchRecipeDetail(safeRecipeNo);
  const store = readStore(user);
  const ingredientSnapshot = buildRecipeIngredientSnapshot(
    recipeDetail,
    servings,
    store.nextIngredientNo
  );

  const nextEntry = normalizeEntryShape({
    entryNo: store.nextEntryNo,
    mealDate: toDateKey(mealDate) || getTodayDateKey(),
    mealType,
    entryTitle: recipeDetail?.recipeName || '\uB808\uC2DC\uD53C \uC2DD\uB2E8',
    entryDescription: recipeDetail?.description || '',
    servings: ingredientSnapshot.servings,
    sourceType: 'RECIPE',
    recipeNo: safeRecipeNo,
    recipeTitle: recipeDetail?.recipeName || '',
    ingredients: ingredientSnapshot.ingredients,
    createdAt: new Date().toISOString(),
  });

  store.entries.push(nextEntry);
  store.nextEntryNo += 1;
  store.nextIngredientNo = ingredientSnapshot.nextIngredientNo;
  writeStore(user, store);

  return nextEntry;
}

export async function searchMealPlanRecipes({ keyword, page = 1, pageSize = 8 }) {
  const payload = await fetchRecipeList({
    keyword: String(keyword || '').trim(),
    page,
    pageSize,
  });

  const items = normalizeRecipeItems(payload).map((item) => ({
    recipeNo: item?.recipeNo,
    recipeName: item?.recipeName || '',
    cookTime: item?.cookTime || item?.cookTimeText || '',
  }));

  return {
    items,
    totalCount: extractRecipeCount(payload, items.length),
  };
}
