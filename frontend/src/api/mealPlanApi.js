import { buildAuthHeaders, getAuthUser, requestAuthApi } from '../auth';

function normalizeIngredient(item = {}) {
  return {
    ingredientName: item.ingredientName || '',
    amountValue: item.amountValue ?? null,
    unit: item.unit || '',
    amountText: item.amountText || '',
    note: item.note || '',
  };
}

function normalizeMeal(item = {}) {
  return {
    mealType: item.mealType || '',
    menuName: item.menuName || '',
    description: item.description || '',
    ingredients: Array.isArray(item.ingredients) ? item.ingredients.map(normalizeIngredient) : [],
  };
}

function normalizeDay(item = {}) {
  return {
    dayLabel: item.dayLabel || '',
    meals: Array.isArray(item.meals) ? item.meals.map(normalizeMeal) : [],
  };
}

function normalizeCartCandidate(item = {}) {
  return {
    productNo: item.productNo ?? null,
    productName: item.productName || '',
    salePrice: item.salePrice ?? null,
    unit: item.unit || '',
    packageWeight: item.packageWeight ?? null,
    displayPackageText: item.displayPackageText || '',
    requiredAmountValue: item.requiredAmountValue ?? null,
    requiredUnit: item.requiredUnit || '',
    requiredAmountText: item.requiredAmountText || '',
    recommendedQuantity: item.recommendedQuantity ?? null,
    coveredAmountText: item.coveredAmountText || '',
  };
}

function normalizeSellable(item = {}) {
  return {
    ingredientName: item.ingredientName || '',
    requiredAmountText: item.requiredAmountText || '',
    matchSummary: item.matchSummary || '',
    cartCandidate: item.cartCandidate ? normalizeCartCandidate(item.cartCandidate) : null,
  };
}

function normalizeUnsellable(item = {}) {
  return {
    ingredientName: item.ingredientName || '',
    requiredAmountText: item.requiredAmountText || '',
    reason: item.reason || '',
  };
}

function normalizeCartPreview(item = {}) {
  return {
    totalProductKinds: item.totalProductKinds ?? null,
    totalQuantity: item.totalQuantity ?? null,
    estimatedTotalPrice: item.estimatedTotalPrice ?? null,
  };
}

function normalizePlan(plan = null) {
  if (!plan || typeof plan !== 'object') {
    return null;
  }

  return {
    goalSummary: plan.goalSummary || '',
    servings: plan.servings ?? null,
    days: plan.days ?? null,
    daysList: Array.isArray(plan.daysList) ? plan.daysList.map(normalizeDay) : [],
    removalNotes: Array.isArray(plan.removalNotes) ? plan.removalNotes.map((item) => String(item || '')) : [],
  };
}

function normalizeResponse(data = {}) {
  return {
    reply: data.reply || '',
    responseId: data.responseId || null,
    model: data.model || null,
    fallbackMode: Boolean(data.fallbackMode),
    plan: normalizePlan(data.plan),
    aggregatedIngredients: Array.isArray(data.aggregatedIngredients)
      ? data.aggregatedIngredients.map(normalizeIngredient)
      : [],
    sellableIngredients: Array.isArray(data.sellableIngredients)
      ? data.sellableIngredients.map(normalizeSellable)
      : [],
    unsellableIngredients: Array.isArray(data.unsellableIngredients)
      ? data.unsellableIngredients.map(normalizeUnsellable)
      : [],
    cartPromptMessage: data.cartPromptMessage || '',
    cartPreview: data.cartPreview ? normalizeCartPreview(data.cartPreview) : null,
  };
}

function parseChatSessionJson(chatJson) {
  if (!chatJson) {
    return null;
  }

  try {
    return JSON.parse(chatJson);
  } catch (error) {
    return null;
  }
}

function normalizeChatSession(data = {}) {
  return {
    chatNo: data.chatNo ?? null,
    chatTitle: data.chatTitle || '',
    lastMessageText: data.lastMessageText || '',
    previousResponseId: data.previousResponseId || null,
    messageCount: data.messageCount ?? 0,
    fallbackMode: Boolean(data.fallbackMode),
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
    sessionData: parseChatSessionJson(data.chatJson),
  };
}

function normalizeImportIngredient(item = {}) {
  return {
    ingredientName: item.ingredientName || '',
    amountValue: item.amountValue ?? null,
    unit: item.unit || '',
    amountText: item.amountText || '',
    note: item.note || '',
  };
}

function normalizeImportMeal(item = {}) {
  return {
    mealType: item.mealType || '',
    menuName: item.menuName || '',
    description: item.description || '',
    ingredients: Array.isArray(item.ingredients)
      ? item.ingredients.map(normalizeImportIngredient)
      : [],
  };
}

function normalizeImportDay(item = {}) {
  return {
    dayLabel: item.dayLabel || '',
    meals: Array.isArray(item.meals) ? item.meals.map(normalizeImportMeal) : [],
  };
}

function buildImportPlan(plan = null) {
  if (!plan || typeof plan !== 'object') {
    return null;
  }

  return {
    goalSummary: plan.goalSummary || '',
    servings: plan.servings ?? null,
    days: plan.days ?? null,
    daysList: Array.isArray(plan.daysList) ? plan.daysList.map(normalizeImportDay) : [],
    removalNotes: Array.isArray(plan.removalNotes)
      ? plan.removalNotes.map((item) => String(item || ''))
      : [],
  };
}

function buildImportSellableIngredient(item = {}) {
  return {
    ingredientName: item.ingredientName || '',
    requiredAmountText: item.requiredAmountText || '',
    matchSummary: item.matchSummary || '',
    cartCandidate: item.cartCandidate
      ? {
          productNo: item.cartCandidate.productNo ?? null,
          productName: item.cartCandidate.productName || '',
          salePrice: item.cartCandidate.salePrice ?? null,
          unit: item.cartCandidate.unit || '',
          packageWeight: item.cartCandidate.packageWeight ?? null,
          displayPackageText: item.cartCandidate.displayPackageText || '',
          requiredAmountValue: item.cartCandidate.requiredAmountValue ?? null,
          requiredUnit: item.cartCandidate.requiredUnit || '',
          requiredAmountText: item.cartCandidate.requiredAmountText || '',
          recommendedQuantity: item.cartCandidate.recommendedQuantity ?? null,
          coveredAmountText: item.cartCandidate.coveredAmountText || '',
        }
      : null,
  };
}

function buildLocalDemoResponse() {
  return normalizeResponse({
    reply:
      '\uC9C0\uAE08\uC740 \uAC80\uC99D\uB41C \uC2DD\uB2E8 \uACB0\uACFC\uB97C \uB9CC\uB4E4 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uBC31\uC5D4\uB4DC \uC5F0\uACB0 \uC0C1\uD0DC\uB97C \uD655\uC778\uD55C \uB4A4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.',
    responseId: null,
    model: 'local-demo',
    fallbackMode: true,
    plan: null,
    aggregatedIngredients: [],
    sellableIngredients: [],
    unsellableIngredients: [],
    cartPromptMessage: '',
    cartPreview: null,
  });
}

const MEAL_SCHEDULE_STORAGE_PREFIX = 'oneulFarmAccountMealPlans:v1';
const MEAL_SCHEDULE_CHANGE_EVENT = 'oneulFarm:meal-schedule-change';

function getMealScheduleStorageKey(userNo) {
  return `${MEAL_SCHEDULE_STORAGE_PREFIX}:${userNo || 'guest'}`;
}

function readMealScheduleStore(userNo) {
  if (typeof window === 'undefined') {
    return { nextEntryNo: 1, nextPlanNo: 1, entries: [], plans: [] };
  }

  try {
    const rawValue = window.localStorage.getItem(getMealScheduleStorageKey(userNo));
    if (!rawValue) {
      return { nextEntryNo: 1, nextPlanNo: 1, entries: [], plans: [] };
    }

    const parsedValue = JSON.parse(rawValue);
    return {
      nextEntryNo: Number(parsedValue?.nextEntryNo || 1),
      nextPlanNo: Number(parsedValue?.nextPlanNo || 1),
      entries: Array.isArray(parsedValue?.entries) ? parsedValue.entries : [],
      plans: Array.isArray(parsedValue?.plans) ? parsedValue.plans : [],
    };
  } catch (error) {
    return { nextEntryNo: 1, nextPlanNo: 1, entries: [], plans: [] };
  }
}

function writeMealScheduleStore(userNo, store) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(getMealScheduleStorageKey(userNo), JSON.stringify(store));
}

function dispatchMealScheduleChange(detail) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.dispatchEvent(
      new CustomEvent(MEAL_SCHEDULE_CHANGE_EVENT, {
        detail,
      })
    );
  } catch (error) {
    // Ignore dispatch failures in local preview.
  }
}

function toDateKey(value) {
  return String(value || '').slice(0, 10);
}

function formatLocalDateKey(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return '';
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

function addDays(dateKey, offset) {
  const normalizedDate = toDateKey(dateKey);
  if (!normalizedDate) {
    return '';
  }

  const date = new Date(`${normalizedDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  date.setDate(date.getDate() + Number(offset || 0));
  return formatLocalDateKey(date);
}

function normalizeMealTypeSafe(value) {
  const nextValue = String(value || '').trim();
  const upperValue = nextValue.toUpperCase();

  if (['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'CUSTOM'].includes(upperValue)) {
    return upperValue;
  }

  if (
    nextValue.includes('아침') ||
    nextValue.includes('조식') ||
    upperValue.includes('BREAKFAST')
  ) {
    return 'BREAKFAST';
  }

  if (
    nextValue.includes('점심') ||
    nextValue.includes('중식') ||
    upperValue.includes('LUNCH')
  ) {
    return 'LUNCH';
  }

  if (
    nextValue.includes('저녁') ||
    nextValue.includes('석식') ||
    upperValue.includes('DINNER')
  ) {
    return 'DINNER';
  }

  if (
    nextValue.includes('간식') ||
    upperValue.includes('SNACK')
  ) {
    return 'SNACK';
  }

  if (
    nextValue.includes('직접 입력') ||
    upperValue.includes('CUSTOM')
  ) {
    return 'CUSTOM';
  }

  return 'DINNER';
}

function normalizeMealType(value) {
  const nextValue = String(value || '').trim();
  const upperValue = nextValue.toUpperCase();

  if (['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'CUSTOM'].includes(upperValue)) {
    return upperValue;
  }

  if (
    nextValue.includes('\uC544\uCE68') ||
    nextValue.includes('\uC870\uC2DD') ||
    upperValue.includes('BREAKFAST')
  ) {
    return 'BREAKFAST';
  }

  if (
    nextValue.includes('\uC810\uC2EC') ||
    nextValue.includes('\uC911\uC2DD') ||
    upperValue.includes('LUNCH')
  ) {
    return 'LUNCH';
  }

  if (
    nextValue.includes('\uC800\uB141') ||
    nextValue.includes('\uC11D\uC2DD') ||
    upperValue.includes('DINNER')
  ) {
    return 'DINNER';
  }

  if (nextValue.includes('\uAC04\uC2DD') || upperValue.includes('SNACK')) {
    return 'SNACK';
  }

  if (nextValue.includes('\uC9C1\uC811 \uC785\uB825') || upperValue.includes('CUSTOM')) {
    return 'CUSTOM';
  }

  return 'DINNER';
}

function buildMealEntryTitle(meal, dayLabel, mealIndex) {
  const menuName = String(meal?.menuName || '').trim();
  if (menuName) {
    return menuName;
  }

  const description = String(meal?.description || '').trim();
  if (description) {
    return description;
  }

  const nextDayLabel = String(dayLabel || '').trim();
  if (nextDayLabel) {
    return `${nextDayLabel} \uC2DD\uB2E8 ${Number(mealIndex || 0) + 1}`;
  }

  return `\uC2DD\uB2E8 ${Number(mealIndex || 0) + 1}`;
}

function buildMealEntryNotes({ meal, mealIngredients }) {
  const noteParts = [];
  const description = String(meal?.description || '').trim();
  if (description) {
    noteParts.push(description);
  }

  const ingredientText = Array.isArray(mealIngredients) && mealIngredients.length
    ? mealIngredients
        .map((ingredient) => {
          const ingredientName = String(ingredient?.ingredientName || '').trim();
          const amountText = String(ingredient?.amountText || '').trim();
          if (!ingredientName) {
            return '';
          }
          return amountText ? `${ingredientName} ${amountText}` : ingredientName;
        })
        .filter(Boolean)
        .join(', ')
    : '';

  if (ingredientText) {
    noteParts.push(ingredientText);
  }

  return noteParts.join('\n');
}

function normalizeSellableIngredientList(sellableIngredients) {
  return Array.isArray(sellableIngredients)
    ? sellableIngredients
        .map((item) => ({
          ingredientName: String(item?.ingredientName || '').trim(),
          cartCandidate: item?.cartCandidate || null,
        }))
        .filter((item) => item.ingredientName)
    : [];
}

function createLocalMealPlanImport({
  user,
  startDate,
  endDate,
  title,
  requestText,
  aiResponseId,
  plan,
  sellableIngredients,
}) {
  const authUser = user || getAuthUser();
  const userNo = authUser?.userNo;
  if (!userNo) {
    throw new Error('\uB85C\uADF8\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4. \uC2DD\uB2E8\uC744 \uC800\uC7A5\uD558\uB824\uBA74 \uBA3C\uC800 \uB85C\uADF8\uC778\uD574 \uC8FC\uC138\uC694.');
  }

  const store = readMealScheduleStore(userNo);
  const normalizedPlanDays = Array.isArray(plan?.daysList) ? plan.daysList : [];
  const normalizedSellableIngredients = normalizeSellableIngredientList(sellableIngredients);
  const nextPlanNo = Number(store.nextPlanNo || 1);
  const baseStartDate = toDateKey(startDate);
  const resolvedTitle =
    String(title || '').trim() ||
    String(plan?.goalSummary || '').trim() ||
    '\uC2DD\uB2E8 \uAC00\uC838\uC624\uAE30';

  let nextEntryNo = Number(store.nextEntryNo || 1);
  const nextEntries = [];

  if (normalizedPlanDays.length) {
    normalizedPlanDays.forEach((day, dayIndex) => {
      const mealDate = addDays(baseStartDate, dayIndex);
      const meals = Array.isArray(day?.meals) ? day.meals : [];

      meals.forEach((meal, mealIndex) => {
        const mealIngredients = Array.isArray(meal?.ingredients) ? meal.ingredients : [];
        nextEntries.push({
          entryNo: nextEntryNo,
          planNo: nextPlanNo,
          date: mealDate,
          mealType: normalizeMealTypeSafe(meal?.mealType),
          title: buildMealEntryTitle(meal, day?.dayLabel, mealIndex),
          notes: buildMealEntryNotes({
            meal,
            mealIngredients,
          }),
          servings: Number(plan?.servings || 1) || 1,
          sourceType: 'AI',
          recipeNo: null,
          recipeTitle: '',
          importedFromAiResponseId: aiResponseId || null,
        });
        nextEntryNo += 1;
      });
    });
  }

  if (!nextEntries.length && baseStartDate) {
    nextEntries.push({
      entryNo: nextEntryNo,
      planNo: nextPlanNo,
      date: baseStartDate,
      mealType: 'CUSTOM',
      title: resolvedTitle,
      notes: '',
      servings: Number(plan?.servings || 1) || 1,
      sourceType: 'AI',
      recipeNo: null,
      recipeTitle: '',
      importedFromAiResponseId: aiResponseId || null,
    });
    nextEntryNo += 1;
  }

  const importedEntryCount = nextEntries.length;
  const nextPlans = [
    {
      planNo: nextPlanNo,
      planTitle: resolvedTitle,
      planSummary: String(plan?.goalSummary || '').trim(),
      startDate: toDateKey(startDate),
      endDate: toDateKey(endDate),
      requestText: '',
      aiResponseId: aiResponseId || null,
      importedEntryCount,
      createdAt: new Date().toISOString(),
      sellableIngredients: normalizedSellableIngredients,
    },
    ...store.plans,
  ];

  const nextStore = {
    nextEntryNo,
    nextPlanNo: nextPlanNo + 1,
    entries: [...nextEntries, ...store.entries],
    plans: nextPlans,
  };

  writeMealScheduleStore(userNo, nextStore);
  dispatchMealScheduleChange({
    userNo,
    planNo: nextPlanNo,
    importedEntryCount,
  });

  return {
    planNo: nextPlanNo,
    title: resolvedTitle,
    startDate: toDateKey(startDate),
    endDate: toDateKey(endDate),
    importedEntryCount,
  };
}

export async function requestMealPlanChat({ message, previousResponseId } = {}) {
  try {
    const payload = await requestAuthApi(
      '/api/meal-plan/chat',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          previousResponseId: previousResponseId || null,
        }),
      },
      '\uC2DD\uB2E8 AI \uC751\uB2F5\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.'
    );

    const normalized = normalizeResponse(payload?.data || {});
    const hasStructuredPlan =
      normalized.plan ||
      normalized.aggregatedIngredients.length ||
      normalized.sellableIngredients.length ||
      normalized.unsellableIngredients.length ||
      normalized.cartPromptMessage ||
      normalized.cartPreview;

    if (!hasStructuredPlan) {
      const error = new Error(
        '\uC2DD\uB2E8 AI \uBC31\uC5D4\uB4DC\uAC00 \uCD5C\uC2E0 \uAD6C\uC870\uB85C \uBC18\uC601\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4. Tomcat\uC744 \uB2E4\uC2DC \uC2DC\uC791\uD574 \uC8FC\uC138\uC694.'
      );
      error.disableMealPlanFallback = true;
      throw error;
    }

    return normalized;
  } catch (error) {
    if (error?.disableMealPlanFallback) {
      throw error;
    }
    console.warn('meal-plan chat fallback', error);
    return buildLocalDemoResponse(message);
  }
}

export async function listMealPlanChatSessions(user = getAuthUser()) {
  const payload = await requestAuthApi(
    '/api/users/me/meal-plan-chats',
    {
      method: 'GET',
      headers: buildAuthHeaders({ user }),
    },
    '\uC2DD\uB2E8 AI \uCC44\uD305 \uBAA9\uB85D\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.'
  );

  return Array.isArray(payload?.data) ? payload.data.map(normalizeChatSession) : [];
}

export async function createMealPlanChatSession(sessionPayload = {}, user = getAuthUser()) {
  const payload = await requestAuthApi(
    '/api/users/me/meal-plan-chats',
    {
      method: 'POST',
      headers: buildAuthHeaders({ includeJson: true, user }),
      body: JSON.stringify(sessionPayload),
    },
    '\uC2DD\uB2E8 AI \uCC44\uD305\uC744 \uC0DD\uC131\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.'
  );

  return normalizeChatSession(payload?.data || {});
}

export async function updateMealPlanChatSession(chatNo, sessionPayload = {}, user = getAuthUser()) {
  const payload = await requestAuthApi(
    `/api/users/me/meal-plan-chats/${chatNo}`,
    {
      method: 'PATCH',
      headers: buildAuthHeaders({ includeJson: true, user }),
      body: JSON.stringify(sessionPayload),
    },
    '\uC2DD\uB2E8 AI \uCC44\uD305\uC744 \uC800\uC7A5\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.'
  );

  return normalizeChatSession(payload?.data || {});
}

export async function deleteMealPlanChatSession(chatNo, user = getAuthUser()) {
  await requestAuthApi(
    `/api/users/me/meal-plan-chats/${chatNo}`,
    {
      method: 'DELETE',
      headers: buildAuthHeaders({ user }),
    },
    '\uC2DD\uB2E8 AI \uCC44\uD305\uC744 \uC0AD\uC81C\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.'
  );
}

export async function importMealPlanToCalendar({
  user,
  startDate,
  endDate,
  title,
  requestText,
  aiResponseId,
  plan,
  sellableIngredients,
} = {}) {
  return createLocalMealPlanImport({
    user,
    startDate,
    endDate,
    title,
    requestText,
    aiResponseId,
    plan: buildImportPlan(plan),
    sellableIngredients: Array.isArray(sellableIngredients)
      ? sellableIngredients.map(buildImportSellableIngredient)
      : [],
  });
}
