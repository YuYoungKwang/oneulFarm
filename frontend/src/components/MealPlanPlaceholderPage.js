import { useEffect, useMemo, useRef, useState } from 'react';
import { isAuthenticated } from '../auth';
import {
  createMealPlanChatSession,
  deleteMealPlanChatSession,
  importMealPlanToCalendar,
  listMealPlanChatSessions,
  requestMealPlanChat,
  updateMealPlanChatSession,
} from '../api/mealPlanApi';
import { addCartItemToApi } from '../api/productApi';
import '../styles/mealPlan.css';

const MEAL_PLAN_CHAT_STORAGE_PREFIX = 'oneulFarmMealPlanChat:v1';
const MEAL_PLAN_CHAT_TAB_ID_KEY = 'oneulFarmMealPlanChat:tabId';
const MAX_STORED_MESSAGES = 40;
const MAX_STORED_SESSIONS = 5;
const MEAL_PLAN_IMPORT_RANGE_PROMPT =
  '\uC88B\uC544\uC694. \uB9C8\uC774\uD398\uC774\uC9C0 \uC2DD\uB2E8\uAD00\uB9AC\uC5D0 \uCD94\uAC00\uD560\uAC8C\uC694. \uC5B8\uC81C\uBD80\uD130 \uB123\uC744\uAE4C\uC694? \uC608: 4\uC6D4 2\uC77C\uBD80\uD130 \uB123\uC5B4\uC918, 2026-04-02\uBD80\uD130 \uCD94\uAC00\uD574\uC918, \uB610\uB294 2026-04-02\uBD80\uD130 2026-04-08\uAE4C\uC9C0 \uCD94\uAC00\uD574\uC918';

const STARTER_PROMPTS = [
  '\uC800\uB294 180cm, 100kg\uC774\uACE0 \uB2E4\uC774\uC5B4\uD2B8 \uC911\uC774\uC5D0\uC694. \uD1B5\uD48D\uB3C4 \uC788\uC2B5\uB2C8\uB2E4. 7\uC77C \uC2DD\uB2E8\uC744 \uC9DC\uC8FC\uC138\uC694.',
  '\uAC74\uAC15 \uC0C1\uD0DC\uB294 \uD1B5\uD48D\uC774\uACE0, \uC800\uB141\uC2DD \uC911\uC2EC 5\uC77C \uC2DD\uB2E8\uC73C\uB85C \uCD94\uCC9C\uD574\uC918.',
  '\uC8FC\uAC04 \uC2DD\uB2E8\uC5D0\uC11C \uC6D4\uC694\uC77C \uC800\uB141\uC740 \uBE7C\uACE0 \uB2E4\uC2DC \uC815\uB9AC\uD574\uC918.',
  '\uD310\uB9E4\uC911\uC778 \uC7AC\uB8CC\uAE4C\uC9C0 \uBAA8\uC544\uC11C \uC7A5\uBC14\uAD6C\uB2C8\uC5D0 \uB123\uC5B4\uC918.',
];

function createMessage(role, text, extra = {}) {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    text,
    ...extra,
  };
}

function buildWelcomeMessage() {
  return createMessage(
    'assistant',
    '\uC548\uB155\uD558\uC138\uC694. oneulFarm \uC2DD\uB2E8 \uC124\uACC4 AI\uC785\uB2C8\uB2E4.\n\uAC74\uAC15 \uC0C1\uD0DC, \uC6D0\uD558\uB294 \uC2DD\uB2E8, \uAE30\uAC04\uC744 \uB9D0\uD574\uC8FC\uBA74 \uC2DD\uB2E8\uACFC \uC7AC\uB8CC\uB97C \uC815\uB9AC\uD558\uACE0, \uD310\uB9E4\uC911\uC778 \uC0C1\uD488\uC740 \uC7A5\uBC14\uAD6C\uB2C8 \uD6C4\uBCF4\uAE4C\uC9C0 \uD568\uAED8 \uBCF4\uC5EC\uB4DC\uB9B4\uAC8C\uC694.'
  );
}

function buildInitialMessages() {
  return [buildWelcomeMessage()];
}

function normalizeText(value) {
  return String(value || '').replace(/\r\n/g, '\n').trim();
}

function sanitizeAssistantText(text) {
  const normalized = normalizeText(text);
  if (!normalized) {
    return '';
  }

  const tipSectionMatch = normalized.match(
    /(?:\r?\n)?\s*(?:\uC7A5\uBCF4\uAE30\s*\uD301|\uC1FC\uD551\s*\uD301|\uAD6C\uB9E4\s*\uD301)\s*[:]?[\s\S]*$/
  );
  if (tipSectionMatch && typeof tipSectionMatch.index === 'number') {
    return normalized.slice(0, tipSectionMatch.index).trim();
  }

  return normalized;
}

function isCartConfirmMessage(value) {
  const normalizedValue = normalizeText(value);
  return /(\uC7A5\uBC14\uAD6C\uB2C8|\uB2EC\uC544\uC918|\uB123\uC5B4\uC918|\uCE74\uD2B8)/.test(
    normalizedValue
  );
}

function formatNumber(value) {
  const nextValue = Number(value);
  if (!Number.isFinite(nextValue)) {
    return '0';
  }
  return nextValue.toLocaleString('ko-KR');
}

function formatPrice(value) {
  const nextValue = Number(value);
  if (!Number.isFinite(nextValue)) {
    return '0\uC6D0';
  }
  return `${Math.round(nextValue).toLocaleString('ko-KR')}\uC6D0`;
}

function formatAmount(amountValue, unit, amountText) {
  if (amountText) {
    return amountText;
  }

  const nextValue = Number(amountValue);
  if (!Number.isFinite(nextValue)) {
    return unit || '';
  }

  return `${formatNumber(nextValue)}${unit || ''}`;
}

function getCartPreviewText(cartPreview) {
  if (!cartPreview) {
    return '';
  }

  const parts = [];
  if (cartPreview.totalProductKinds != null) {
    parts.push(`${formatNumber(cartPreview.totalProductKinds)}\uC885`);
  }
  if (cartPreview.totalQuantity != null) {
    parts.push(`${formatNumber(cartPreview.totalQuantity)}\uAC1C`);
  }
  if (cartPreview.estimatedTotalPrice != null) {
    parts.push(`\uC608\uC0C1 ${formatPrice(cartPreview.estimatedTotalPrice)}`);
  }
  return parts.join(' \u00B7 ');
}

function collectCartCandidates(messages) {
  const latestStructuredMessage = [...messages]
    .reverse()
    .find(
      (message) =>
        message.role === 'assistant' &&
        Array.isArray(message.sellableIngredients) &&
        message.sellableIngredients.some((item) => item?.cartCandidate?.productNo)
    );

  if (!latestStructuredMessage) {
    return [];
  }

  const candidateMap = new Map();
  latestStructuredMessage.sellableIngredients.forEach((item) => {
    const candidate = item?.cartCandidate;
    if (!candidate?.productNo) {
      return;
    }

    const recommendedQuantity = Math.max(1, Number(candidate.recommendedQuantity || 0));
    const currentItem = candidateMap.get(candidate.productNo);

    candidateMap.set(candidate.productNo, {
      ...candidate,
      recommendedQuantity:
        (currentItem?.recommendedQuantity || 0) + recommendedQuantity,
    });
  });

  return Array.from(candidateMap.values());
}

function getLatestStructuredAssistantContext(messages) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (
      message?.role === 'assistant' &&
      message.plan &&
      Array.isArray(message.plan.daysList) &&
      message.plan.daysList.length
    ) {
      let requestText = '';
      for (let userIndex = index - 1; userIndex >= 0; userIndex -= 1) {
        if (messages[userIndex]?.role === 'user') {
          requestText = normalizeText(messages[userIndex].text);
          break;
        }
      }

      return {
        message,
        requestText,
      };
    }
  }

  return null;
}

// eslint-disable-next-line no-unused-vars
function isMealCalendarImportIntent(value) {
  const normalizedValue = normalizeText(value);
  if (!normalizedValue) {
    return false;
  }

  const hasCalendarNoun =
    /(?:식단|달력|캘린더|캘린다|내\s*식단\s*관리|플랜)/.test(normalizedValue);
  const hasImportVerb =
    /(?:추가|등록|저장|반영|가져와|가져오|옮겨|넣어|넣어줘|넣어\s*줘|임포트)/.test(
      normalizedValue
    );
  const hasDateRangeCue =
    /(?:\d{4}[./-]\d{1,2}[./-]\d{1,2}|\d{1,2}\s*월\s*\d{1,2}\s*일).*(?:부터|~|-).*(?:\d{4}[./-]\d{1,2}[./-]\d{1,2}|\d{1,2}\s*월\s*\d{1,2}\s*일)/.test(
      normalizedValue
    );

  return (hasCalendarNoun && hasImportVerb) || (hasImportVerb && hasDateRangeCue);
}

function padDatePart(value) {
  return String(value).padStart(2, '0');
}

function buildIsoDate(year, month, day) {
  const nextYear = Number(year);
  const nextMonth = Number(month);
  const nextDay = Number(day);

  if (
    !Number.isInteger(nextYear) ||
    !Number.isInteger(nextMonth) ||
    !Number.isInteger(nextDay)
  ) {
    return '';
  }

  const date = new Date(nextYear, nextMonth - 1, nextDay);
  if (
    date.getFullYear() !== nextYear ||
    date.getMonth() !== nextMonth - 1 ||
    date.getDate() !== nextDay
  ) {
    return '';
  }

  return `${nextYear}-${padDatePart(nextMonth)}-${padDatePart(nextDay)}`;
}

function addDaysToIsoDate(dateKey, offset) {
  const matched = String(dateKey || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!matched) {
    return '';
  }

  const date = new Date(Number(matched[1]), Number(matched[2]) - 1, Number(matched[3]));
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  date.setDate(date.getDate() + Number(offset || 0));
  return buildIsoDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

function normalizeDateToken(token, fallbackYear) {
  const normalizedToken = normalizeText(token).replace(/\s+/g, '');
  if (!normalizedToken) {
    return '';
  }

  let match = normalizedToken.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/);
  if (match) {
    return buildIsoDate(match[1], match[2], match[3]);
  }

  match = normalizedToken.match(/^(\d{1,2})[./-](\d{1,2})$/);
  if (match) {
    return buildIsoDate(fallbackYear, match[1], match[2]);
  }

  match = normalizedToken.match(/^(\d{4})년(\d{1,2})월(\d{1,2})일$/);
  if (match) {
    return buildIsoDate(match[1], match[2], match[3]);
  }

  match = normalizedToken.match(/^(\d{1,2})월(\d{1,2})일$/);
  if (match) {
    return buildIsoDate(fallbackYear, match[1], match[2]);
  }

  return '';
}

// eslint-disable-next-line no-unused-vars
function extractDateRange(text) {
  const fallbackYear = new Date().getFullYear();
  const normalizedTextValue = normalizeText(text);
  if (!normalizedTextValue) {
    return null;
  }

  const patterns = [
    /(\d{4}[./-]\d{1,2}[./-]\d{1,2}|\d{4}년\s*\d{1,2}월\s*\d{1,2}일|\d{1,2}월\s*\d{1,2}일|\d{1,2}[./-]\d{1,2})\s*(?:부터|에서)\s*(\d{4}[./-]\d{1,2}[./-]\d{1,2}|\d{4}년\s*\d{1,2}월\s*\d{1,2}일|\d{1,2}월\s*\d{1,2}일|\d{1,2}[./-]\d{1,2})\s*까지/,
    /(\d{4}[./-]\d{1,2}[./-]\d{1,2}|\d{4}년\s*\d{1,2}월\s*\d{1,2}일|\d{1,2}월\s*\d{1,2}일|\d{1,2}[./-]\d{1,2})\s*[-~]\s*(\d{4}[./-]\d{1,2}[./-]\d{1,2}|\d{4}년\s*\d{1,2}월\s*\d{1,2}일|\d{1,2}월\s*\d{1,2}일|\d{1,2}[./-]\d{1,2})/,
  ];

  for (const pattern of patterns) {
    const match = normalizedTextValue.match(pattern);
    if (!match) {
      continue;
    }

    const startDate = normalizeDateToken(match[1], fallbackYear);
    const endDate = normalizeDateToken(match[2], fallbackYear);
    if (!startDate || !endDate || startDate > endDate) {
      return null;
    }

    return { startDate, endDate };
  }

  return null;
}

function buildMealPlanImportTitle(plan, startDate, endDate) {
  const summary = normalizeText(plan?.goalSummary);
  if (summary) {
    return `${summary} (${startDate}~${endDate})`;
  }

  return `AI 맞춤 식단 (${startDate}~${endDate})`;
}

function isMealCalendarImportIntentSafe(value) {
  const normalizedValue = normalizeText(value);
  if (!normalizedValue) {
    return false;
  }

  const hasCalendarNoun =
    /(?:\uC2DD\uB2E8|\uB2EC\uB825|\uCE98\uB9B0\uB354|\uB0B4\s*\uC2DD\uB2E8\s*\uAD00\uB9AC)/.test(
      normalizedValue
    );
  const hasImportVerb =
    /(?:\uCD94\uAC00|\uB4F1\uB85D|\uC800\uC7A5|\uBC18\uC601|\uAC00\uC838\uC640|\uAC00\uC838\uC624|\uB123\uC5B4|\uB123\uC5B4\uC918)/.test(
      normalizedValue
    );
  const hasDateRangeCue =
    /(?:\d{4}[./-]\d{1,2}[./-]\d{1,2}|\d{1,2}[./-]\d{1,2}|\d{1,2}\uC6D4\s*\d{1,2}\uC77C).*(?:\uBD80\uD130|~|-).*(?:\d{4}[./-]\d{1,2}[./-]\d{1,2}|\d{1,2}[./-]\d{1,2}|\d{1,2}\uC6D4\s*\d{1,2}\uC77C)/.test(
      normalizedValue
    );

  return (hasCalendarNoun && hasImportVerb) || (hasImportVerb && hasDateRangeCue);
}

function normalizeDateTokenSafe(token, fallbackYear, fallbackMonth = new Date().getMonth() + 1) {
  const normalizedToken = normalizeText(token).replace(/\s+/g, '');
  if (!normalizedToken) {
    return '';
  }

  let match = normalizedToken.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/);
  if (match) {
    return buildIsoDate(match[1], match[2], match[3]);
  }

  match = normalizedToken.match(/^(\d{1,2})[./-](\d{1,2})$/);
  if (match) {
    return buildIsoDate(fallbackYear, match[1], match[2]);
  }

  match = normalizedToken.match(/^(\d{4})\uB144(\d{1,2})\uC6D4(\d{1,2})\uC77C$/);
  if (match) {
    return buildIsoDate(match[1], match[2], match[3]);
  }

  match = normalizedToken.match(/^(\d{1,2})\uC6D4(\d{1,2})\uC77C$/);
  if (match) {
    return buildIsoDate(fallbackYear, match[1], match[2]);
  }

  match = normalizedToken.match(/^(\d{1,2})\uC77C$/);
  if (match) {
    return buildIsoDate(fallbackYear, fallbackMonth, match[1]);
  }

  return '';
}

function extractDateRangeSafe(text, fallbackDays = 1) {
  const fallbackYear = new Date().getFullYear();
  const fallbackMonth = new Date().getMonth() + 1;
  const normalizedTextValue = normalizeText(text);
  if (!normalizedTextValue) {
    return null;
  }

  const patterns = [
    /(\d{4}[./-]\d{1,2}[./-]\d{1,2}|\d{1,2}[./-]\d{1,2}|\d{1,2}\uC6D4\s*\d{1,2}\uC77C|\d{1,2}\uC77C)\s*(?:\uBD80\uD130|\uC5D0\uC11C)\s*(\d{4}[./-]\d{1,2}[./-]\d{1,2}|\d{1,2}[./-]\d{1,2}|\d{1,2}\uC6D4\s*\d{1,2}\uC77C|\d{1,2}\uC77C)\s*(?:\uAE4C\uC9C0)?/,
    /(\d{4}[./-]\d{1,2}[./-]\d{1,2}|\d{1,2}[./-]\d{1,2}|\d{1,2}\uC6D4\s*\d{1,2}\uC77C|\d{1,2}\uC77C)\s*[-~]\s*(\d{4}[./-]\d{1,2}[./-]\d{1,2}|\d{1,2}[./-]\d{1,2}|\d{1,2}\uC6D4\s*\d{1,2}\uC77C|\d{1,2}\uC77C)/,
  ];

  for (const pattern of patterns) {
    const match = normalizedTextValue.match(pattern);
    if (!match) {
      continue;
    }

    const startDate = normalizeDateTokenSafe(match[1], fallbackYear, fallbackMonth);
    const endDate = normalizeDateTokenSafe(match[2], fallbackYear, fallbackMonth);
    if (!startDate || !endDate || startDate > endDate) {
      return null;
    }

    return { startDate, endDate };
  }

  const singleStartMatch = normalizedTextValue.match(
    /(\d{4}[./-]\d{1,2}[./-]\d{1,2}|\d{1,2}[./-]\d{1,2}|\d{1,2}\uC6D4\s*\d{1,2}\uC77C|\d{1,2}\uC77C)\s*(?:\uBD80\uD130|\uC5D0\uC11C)/
  );

  if (singleStartMatch) {
    const startDate = normalizeDateTokenSafe(singleStartMatch[1], fallbackYear, fallbackMonth);
    const safeSpanDays = Math.max(1, Number(fallbackDays || 1));
    const endDate = addDaysToIsoDate(startDate, safeSpanDays - 1);
    if (startDate && endDate) {
      return { startDate, endDate };
    }
  }

  return null;
}

function buildMealPlanImportTitleSafe(plan, startDate, endDate) {
  const summary = normalizeText(plan?.goalSummary);
  if (summary) {
    return `${summary} (${startDate}~${endDate})`;
  }

  return `AI \uB9DE\uCDA4 \uC2DD\uB2E8 (${startDate}~${endDate})`;
}

function buildMealPlanStorageKey(authUser) {
  if (isAuthenticated(authUser) && authUser?.userNo != null) {
    return `${MEAL_PLAN_CHAT_STORAGE_PREFIX}:${authUser.userNo}`;
  }
  return `${MEAL_PLAN_CHAT_STORAGE_PREFIX}:guest`;
}

function getMealPlanTabId() {
  try {
    const existingTabId = window.sessionStorage.getItem(MEAL_PLAN_CHAT_TAB_ID_KEY);
    if (existingTabId) {
      return existingTabId;
    }

    const nextTabId = `tab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    window.sessionStorage.setItem(MEAL_PLAN_CHAT_TAB_ID_KEY, nextTabId);
    return nextTabId;
  } catch (error) {
    return 'tab-default';
  }
}

function buildScopedMealPlanStorageKey(storageKey) {
  return `${storageKey}:${getMealPlanTabId()}`;
}

function normalizeStoredMessage(message, index) {
  if (!message || typeof message !== 'object') {
    return null;
  }

  const role = message.role === 'user' ? 'user' : 'assistant';
  const text = normalizeText(message.text);
  if (!text) {
    return null;
  }

  return {
    id: message.id || `${role}-stored-${index}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    text,
    model: message.model || null,
    fallbackMode: Boolean(message.fallbackMode),
    plan: message.plan || null,
    aggregatedIngredients: Array.isArray(message.aggregatedIngredients)
      ? message.aggregatedIngredients
      : [],
    sellableIngredients: Array.isArray(message.sellableIngredients)
      ? message.sellableIngredients
      : [],
    unsellableIngredients: Array.isArray(message.unsellableIngredients)
      ? message.unsellableIngredients
      : [],
    cartPromptMessage: message.cartPromptMessage || '',
    cartPreview: message.cartPreview || null,
    cartAdded: Boolean(message.cartAdded),
    responseId: message.responseId || null,
  };
}

function buildSessionTitle(messages) {
  const sourceMessage = messages.find(
    (message) => message.role === 'user' && normalizeText(message.text)
  );
  const title = normalizeText(sourceMessage?.text).replace(/\s+/g, ' ');

  if (!title) {
    return '\uC0C8 \uCC44\uD305';
  }

  return title.length > 22 ? `${title.slice(0, 22)}\u2026` : title;
}

function buildSessionPreview(messages) {
  const sourceMessage = [...messages].reverse().find((message) => normalizeText(message.text));
  const preview = normalizeText(sourceMessage?.text).replace(/\s+/g, ' ');

  if (!preview) {
    return '\uB300\uD654\uB97C \uC2DC\uC791\uD574 \uBCF4\uC138\uC694.';
  }

  return preview.length > 44 ? `${preview.slice(0, 44)}\u2026` : preview;
}

function createChatSession(overrides = {}) {
  const messages =
    Array.isArray(overrides.messages) && overrides.messages.length
      ? overrides.messages
      : buildInitialMessages();
  const now = new Date().toISOString();

  return {
    chatNo: overrides.chatNo ?? null,
    id: overrides.id || `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: overrides.title || buildSessionTitle(messages),
    createdAt: overrides.createdAt || now,
    updatedAt: overrides.updatedAt || now,
    messages,
    previousResponseId: overrides.previousResponseId || null,
    isFallbackMode: Boolean(overrides.isFallbackMode),
    isAwaitingMealPlanDateRange: Boolean(overrides.isAwaitingMealPlanDateRange),
  };
}

function normalizeStoredSession(session, index) {
  if (!session || typeof session !== 'object') {
    return null;
  }

  const nextMessages = Array.isArray(session.messages)
    ? session.messages
        .map((message, messageIndex) => normalizeStoredMessage(message, messageIndex))
        .filter(Boolean)
    : [];

  return createChatSession({
    chatNo: session.chatNo ?? null,
    id: session.id || `chat-stored-${index}-${Math.random().toString(36).slice(2, 8)}`,
    title: normalizeText(session.title) || buildSessionTitle(nextMessages),
    createdAt: session.createdAt || null,
    updatedAt: session.updatedAt || session.createdAt || null,
    messages: nextMessages.length ? nextMessages : buildInitialMessages(),
    previousResponseId:
      typeof session.previousResponseId === 'string' ? session.previousResponseId : null,
    isFallbackMode: Boolean(session.isFallbackMode),
    isAwaitingMealPlanDateRange: Boolean(session.isAwaitingMealPlanDateRange),
  });
}

function sortChatSessions(sessions) {
  return [...sessions].sort((left, right) => {
    const leftTime = new Date(left.updatedAt || left.createdAt || 0).getTime();
    const rightTime = new Date(right.updatedAt || right.createdAt || 0).getTime();
    return rightTime - leftTime;
  });
}

function loadStoredConversation(storageKey) {
  if (!storageKey) {
    return null;
  }

  try {
    const scopedStorageKey = buildScopedMealPlanStorageKey(storageKey);
    const scopedLocalValue = window.localStorage.getItem(scopedStorageKey);
    const legacySessionValue = scopedLocalValue ? '' : window.sessionStorage.getItem(storageKey);
    const legacyLocalValue =
      scopedLocalValue || legacySessionValue ? '' : window.localStorage.getItem(storageKey);
    const storedValue = scopedLocalValue || legacySessionValue || legacyLocalValue;
    if (!storedValue) {
      return null;
    }

    if (!scopedLocalValue && (legacySessionValue || legacyLocalValue)) {
      try {
        window.localStorage.setItem(scopedStorageKey, legacySessionValue || legacyLocalValue);
        if (legacySessionValue) {
          window.sessionStorage.removeItem(storageKey);
        }
        if (legacyLocalValue) {
          window.localStorage.removeItem(storageKey);
        }
      } catch (error) {
        // Ignore storage migration failures for local preview.
      }
    }

    const parsedValue = JSON.parse(storedValue);

    if (Array.isArray(parsedValue?.sessions)) {
      const nextSessions = sortChatSessions(
        parsedValue.sessions
          .map((session, index) => normalizeStoredSession(session, index))
          .filter(Boolean)
      ).slice(0, MAX_STORED_SESSIONS);

      if (!nextSessions.length) {
        return null;
      }

      const activeSessionId = nextSessions.some(
        (session) => session.id === parsedValue?.activeSessionId
      )
        ? parsedValue.activeSessionId
        : nextSessions[0].id;

      return {
        sessions: nextSessions,
        activeSessionId,
      };
    }

    const nextMessages = Array.isArray(parsedValue?.messages)
      ? parsedValue.messages
          .map((message, index) => normalizeStoredMessage(message, index))
          .filter(Boolean)
      : [];

    if (!nextMessages.length) {
      return null;
    }

    const migratedSession = createChatSession({
      id: `chat-migrated-${Date.now()}`,
      messages: nextMessages,
      previousResponseId:
        typeof parsedValue?.previousResponseId === 'string' ? parsedValue.previousResponseId : null,
      isFallbackMode: Boolean(parsedValue?.isFallbackMode),
      isAwaitingMealPlanDateRange: Boolean(parsedValue?.isAwaitingMealPlanDateRange),
    });

    return {
      sessions: [migratedSession],
      activeSessionId: migratedSession.id,
    };
  } catch (error) {
    return null;
  }
}

function persistConversation(storageKey, sessions, activeSessionId) {
  if (!storageKey) {
    return;
  }

  try {
    const scopedStorageKey = buildScopedMealPlanStorageKey(storageKey);
    const payload = {
      activeSessionId: activeSessionId || null,
      sessions: sortChatSessions(sessions)
        .slice(0, MAX_STORED_SESSIONS)
        .map((session) => ({
          ...session,
          messages: Array.isArray(session.messages)
            ? session.messages.slice(-MAX_STORED_MESSAGES)
            : buildInitialMessages(),
        })),
    };
    window.localStorage.setItem(scopedStorageKey, JSON.stringify(payload));
  } catch (error) {
    // Ignore storage failures for local preview.
  }
}

function formatSessionTimestamp(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const now = new Date();
  const isSameYear = date.getFullYear() === now.getFullYear();
  const isSameDay =
    isSameYear &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  return date.toLocaleString('ko-KR', {
    month: isSameDay ? undefined : 'numeric',
    day: isSameDay ? undefined : 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function areMessagesEqual(leftMessages = [], rightMessages = []) {
  if (leftMessages === rightMessages) {
    return true;
  }

  if (!Array.isArray(leftMessages) || !Array.isArray(rightMessages)) {
    return false;
  }

  if (leftMessages.length !== rightMessages.length) {
    return false;
  }

  for (let index = 0; index < leftMessages.length; index += 1) {
    const left = leftMessages[index] || {};
    const right = rightMessages[index] || {};
    if (
      left.id !== right.id ||
      left.role !== right.role ||
      left.text !== right.text ||
      left.responseId !== right.responseId ||
      left.cartPromptMessage !== right.cartPromptMessage ||
      left.model !== right.model ||
      Boolean(left.fallbackMode) !== Boolean(right.fallbackMode)
    ) {
      return false;
    }
  }

  return true;
}

function buildSessionSnapshot(
  sessions,
  activeSessionId,
  messages,
  previousResponseId,
  isFallbackMode,
  isAwaitingMealPlanDateRange
) {
  if (!activeSessionId) {
    return sessions;
  }

  const activeSession = sessions.find((session) => session.id === activeSessionId);
  if (!activeSession) {
    return sessions;
  }

  const nextMessages = messages.length ? messages.slice(-MAX_STORED_MESSAGES) : buildInitialMessages();
  const nextTitle = buildSessionTitle(nextMessages);
  const isSameSessionState =
    areMessagesEqual(activeSession.messages, nextMessages) &&
    (activeSession.previousResponseId || null) === (previousResponseId || null) &&
    Boolean(activeSession.isFallbackMode) === Boolean(isFallbackMode) &&
    Boolean(activeSession.isAwaitingMealPlanDateRange) === Boolean(isAwaitingMealPlanDateRange) &&
    activeSession.title === nextTitle;

  if (isSameSessionState) {
    return sessions;
  }

  const updatedSession = {
    ...activeSession,
    title: nextTitle,
    updatedAt: new Date().toISOString(),
    messages: nextMessages,
    previousResponseId: previousResponseId || null,
    isFallbackMode: Boolean(isFallbackMode),
    isAwaitingMealPlanDateRange: Boolean(isAwaitingMealPlanDateRange),
  };

  return [updatedSession, ...sessions.filter((session) => session.id !== activeSessionId)].slice(
    0,
    MAX_STORED_SESSIONS
  );
}

function buildSessionRequestPayload(session) {
  const normalizedSession = normalizeStoredSession(session, 0) || createChatSession();
  const payloadSession = {
    id: normalizedSession.id,
    title: normalizedSession.title || '\uC0C8 \uCC44\uD305',
    messages: Array.isArray(normalizedSession.messages)
      ? normalizedSession.messages.slice(-MAX_STORED_MESSAGES)
      : buildInitialMessages(),
    previousResponseId: normalizedSession.previousResponseId || null,
    isFallbackMode: Boolean(normalizedSession.isFallbackMode),
    isAwaitingMealPlanDateRange: Boolean(normalizedSession.isAwaitingMealPlanDateRange),
  };

  return {
    chatTitle: normalizedSession.title || '\uC0C8 \uCC44\uD305',
    lastMessageText: buildSessionPreview(payloadSession.messages),
    previousResponseId: payloadSession.previousResponseId || null,
    messageCount: payloadSession.messages.length,
    fallbackMode: Boolean(payloadSession.isFallbackMode),
    chatJson: JSON.stringify(payloadSession),
  };
}

function hasPersistableConversation(session) {
  return Array.isArray(session?.messages)
    ? session.messages.some(
        (message) => message?.role === 'user' && Boolean(normalizeText(message?.text))
      )
    : false;
}

function normalizeRemoteChatSession(session, index) {
  const sessionData = session?.sessionData && typeof session.sessionData === 'object'
    ? session.sessionData
    : null;
  const normalizedSession = normalizeStoredSession(
    {
      ...sessionData,
      chatNo: session?.chatNo ?? sessionData?.chatNo ?? null,
      title: session?.chatTitle || sessionData?.title || '\uC0C8 \uCC44\uD305',
      createdAt: session?.createdAt || sessionData?.createdAt || null,
      updatedAt: session?.updatedAt || sessionData?.updatedAt || null,
      previousResponseId: session?.previousResponseId || sessionData?.previousResponseId || null,
      isFallbackMode:
        typeof session?.fallbackMode === 'boolean'
          ? session.fallbackMode
          : sessionData?.isFallbackMode,
    },
    index
  );

  return {
    ...normalizedSession,
    chatNo: session?.chatNo ?? normalizedSession?.chatNo ?? null,
    title: session?.chatTitle || normalizedSession?.title || '\uC0C8 \uCC44\uD305',
    createdAt: session?.createdAt || normalizedSession?.createdAt,
    updatedAt: session?.updatedAt || normalizedSession?.updatedAt,
    previousResponseId: session?.previousResponseId || normalizedSession?.previousResponseId || null,
    isFallbackMode:
      typeof session?.fallbackMode === 'boolean'
        ? session.fallbackMode
        : Boolean(normalizedSession?.isFallbackMode),
  };
}

export default function MealPlanPlaceholderPage({ authUser }) {
  const isSignedIn = isAuthenticated(authUser);
  const storageKey = useMemo(() => buildMealPlanStorageKey(authUser), [authUser]);
  const [chatSessions, setChatSessions] = useState(() => [createChatSession()]);
  const [activeSessionId, setActiveSessionId] = useState('');
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState(() => buildInitialMessages());
  const [previousResponseId, setPreviousResponseId] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const [isCartSubmitting, setIsCartSubmitting] = useState(false);
  const [isAwaitingMealPlanDateRange, setIsAwaitingMealPlanDateRange] = useState(false);
  const messageListRef = useRef(null);
  const isStorageHydratedRef = useRef(false);
  const isBackendPersistenceEnabledRef = useRef(false);
  const persistTimeoutRef = useRef(null);
  const lastPersistedSignatureRef = useRef('');
  const hasConversation = messages.length > 1;

  const latestCartCandidates = useMemo(() => collectCartCandidates(messages), [messages]);

  useEffect(() => {
    const container = messageListRef.current;
    if (!container) {
      return;
    }
    container.scrollTop = container.scrollHeight;
  }, [messages, isSending, isCartSubmitting]);

  useEffect(() => {
    let isCancelled = false;

    async function hydrateConversation() {
      isStorageHydratedRef.current = false;
      lastPersistedSignatureRef.current = '';

      const applyConversation = (storedConversation) => {
        const nextSessions = storedConversation?.sessions?.length
          ? storedConversation.sessions
          : [createChatSession()];
        const nextActiveSessionId = nextSessions.some(
          (session) => session.id === storedConversation?.activeSessionId
        )
          ? storedConversation.activeSessionId
          : nextSessions[0].id;
        const activeSession =
          nextSessions.find((session) => session.id === nextActiveSessionId) || nextSessions[0];

        if (isCancelled) {
          return;
        }

        setChatSessions(nextSessions);
        setActiveSessionId(nextActiveSessionId);
        setDraft('');
        setErrorMessage('');
        setMessages(activeSession.messages);
        setPreviousResponseId(activeSession.previousResponseId || null);
        setIsFallbackMode(Boolean(activeSession.isFallbackMode));
        setIsAwaitingMealPlanDateRange(Boolean(activeSession.isAwaitingMealPlanDateRange));
        isStorageHydratedRef.current = true;
      };

      if (isSignedIn) {
        try {
          const remoteSessionList = await listMealPlanChatSessions(authUser);
          isBackendPersistenceEnabledRef.current = true;

          if (remoteSessionList.length) {
            applyConversation({
              sessions: sortChatSessions(
                remoteSessionList.map((session, index) => normalizeRemoteChatSession(session, index))
              ).slice(0, MAX_STORED_SESSIONS),
              activeSessionId: null,
            });
            return;
          }
        } catch (error) {
          console.warn('meal-plan chat session hydrate fallback', error);
          isBackendPersistenceEnabledRef.current = false;
        }
      } else {
        isBackendPersistenceEnabledRef.current = false;
      }

      applyConversation(loadStoredConversation(storageKey));
    }

    hydrateConversation();

    return () => {
      isCancelled = true;
      if (persistTimeoutRef.current) {
        window.clearTimeout(persistTimeoutRef.current);
      }
    };
  }, [authUser, isSignedIn, storageKey]);

  useEffect(() => {
    if (!activeSessionId || !isStorageHydratedRef.current) {
      return;
    }

    setChatSessions((currentSessions) =>
      buildSessionSnapshot(
        currentSessions,
        activeSessionId,
        messages,
        previousResponseId,
        isFallbackMode,
        isAwaitingMealPlanDateRange
      )
    );
  }, [activeSessionId, messages, previousResponseId, isFallbackMode, isAwaitingMealPlanDateRange]);

  useEffect(() => {
    if (!storageKey) {
      return;
    }

    const sessionsForPersistence = buildSessionSnapshot(
      chatSessions,
      activeSessionId,
      messages,
      previousResponseId,
      isFallbackMode,
      isAwaitingMealPlanDateRange
    );

    persistConversation(storageKey, sessionsForPersistence, activeSessionId);

    if (!isSignedIn || !isBackendPersistenceEnabledRef.current) {
      return undefined;
    }

    const activeSession = sessionsForPersistence.find((session) => session.id === activeSessionId);
    if (!activeSession) {
      return undefined;
    }

    if (!activeSession.chatNo && !hasPersistableConversation(activeSession)) {
      return undefined;
    }

    const sessionPayload = buildSessionRequestPayload(activeSession);
    const persistSignature = JSON.stringify({
      sessionId: activeSession.id,
      chatTitle: sessionPayload.chatTitle,
      lastMessageText: sessionPayload.lastMessageText,
      previousResponseId: sessionPayload.previousResponseId,
      messageCount: sessionPayload.messageCount,
      fallbackMode: sessionPayload.fallbackMode,
      chatJson: sessionPayload.chatJson,
    });

    if (lastPersistedSignatureRef.current === persistSignature) {
      return undefined;
    }

    if (persistTimeoutRef.current) {
      window.clearTimeout(persistTimeoutRef.current);
    }

    persistTimeoutRef.current = window.setTimeout(async () => {
      try {
        const savedSession = activeSession.chatNo
          ? await updateMealPlanChatSession(activeSession.chatNo, sessionPayload, authUser)
          : await createMealPlanChatSession(sessionPayload, authUser);

        lastPersistedSignatureRef.current = persistSignature;
        setChatSessions((currentSessions) =>
          currentSessions.map((session) =>
            session.id === activeSession.id
              ? {
                  ...session,
                  chatNo: savedSession.chatNo ?? session.chatNo ?? null,
                  title: savedSession.chatTitle || session.title,
                  previousResponseId: savedSession.previousResponseId || session.previousResponseId,
                  isFallbackMode:
                    typeof savedSession.fallbackMode === 'boolean'
                      ? savedSession.fallbackMode
                      : session.isFallbackMode,
                  createdAt: savedSession.createdAt || session.createdAt,
                  updatedAt: savedSession.updatedAt || session.updatedAt,
                }
              : session
          )
        );
      } catch (error) {
        console.warn('meal-plan chat session persist fallback', error);
        isBackendPersistenceEnabledRef.current = false;
      }
    }, 350);

    return () => {
      if (persistTimeoutRef.current) {
        window.clearTimeout(persistTimeoutRef.current);
      }
    };
  }, [
    authUser,
    isSignedIn,
    storageKey,
    chatSessions,
    activeSessionId,
    messages,
    previousResponseId,
    isFallbackMode,
    isAwaitingMealPlanDateRange,
  ]);

  function openChatSession(sessionId, sessionList = chatSessions) {
    const targetSession =
      sessionList.find((session) => session.id === sessionId) || sessionList[0] || createChatSession();

    setActiveSessionId(targetSession.id);
    setDraft('');
    setErrorMessage('');
    setMessages(targetSession.messages);
    setPreviousResponseId(targetSession.previousResponseId || null);
    setIsFallbackMode(Boolean(targetSession.isFallbackMode));
    setIsAwaitingMealPlanDateRange(Boolean(targetSession.isAwaitingMealPlanDateRange));
  }

  function handleCreateNewChat() {
    if (isSending || isCartSubmitting) {
      return;
    }

    const nextSession = createChatSession();
    const nextSessions = [nextSession, ...chatSessions].slice(0, MAX_STORED_SESSIONS);

    setChatSessions(nextSessions);
    openChatSession(nextSession.id, nextSessions);
  }

  function handleSelectChatSession(sessionId) {
    if (!sessionId || sessionId === activeSessionId || isSending || isCartSubmitting) {
      return;
    }

    openChatSession(sessionId);
  }

  async function handleDeleteChatSession(sessionId) {
    if (!sessionId || isSending || isCartSubmitting) {
      return;
    }

    const targetSession = chatSessions.find((session) => session.id === sessionId) || null;
    if (isSignedIn && isBackendPersistenceEnabledRef.current && targetSession?.chatNo) {
      try {
        await deleteMealPlanChatSession(targetSession.chatNo, authUser);
      } catch (error) {
        setErrorMessage(
          error?.message || '\uC2DD\uB2E8 AI \uCC44\uD305\uC744 \uC0AD\uC81C\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.'
        );
        return;
      }
    }

    let nextSessions = chatSessions.filter((session) => session.id !== sessionId);
    if (!nextSessions.length) {
      nextSessions = [createChatSession()];
    }

    const nextActiveSessionId =
      sessionId === activeSessionId || !nextSessions.some((session) => session.id === activeSessionId)
        ? nextSessions[0].id
        : activeSessionId;

    setChatSessions(nextSessions);
    lastPersistedSignatureRef.current = '';
    openChatSession(nextActiveSessionId, nextSessions);
  }

  function promptMealPlanImportRange() {
    if (!isAuthenticated(authUser)) {
      setMessages((currentMessages) => [
        ...currentMessages,
        createMessage(
          'assistant',
          '\uB0B4 \uC2DD\uB2E8 \uAD00\uB9AC\uC5D0 \uC800\uC7A5\uD558\uB824\uBA74 \uBA3C\uC800 \uB85C\uADF8\uC778\uD574 \uC8FC\uC138\uC694. \uB85C\uADF8\uC778 \uD6C4 \uAC19\uC740 \uC2DD\uB2E8\uC73C\uB85C \uBC14\uB85C \uC774\uC5B4\uC11C \uCD94\uAC00\uD560 \uC218 \uC788\uC5B4\uC694.'
        ),
      ]);
      return;
    }

    const structuredContext = getLatestStructuredAssistantContext(messages);
    if (!structuredContext) {
      setMessages((currentMessages) => [
        ...currentMessages,
        createMessage(
          'assistant',
          '\uCD94\uAC00\uD560 \uCD5C\uC2E0 \uC2DD\uB2E8\uC774 \uC544\uC9C1 \uC5C6\uC5B4\uC694. \uBA3C\uC800 \uB9DE\uCDA4 \uC2DD\uB2E8\uC744 \uB9CC\uB4E0 \uB4A4 \uB2E4\uC2DC \uB20C\uB7EC\uC8FC\uC138\uC694.'
        ),
      ]);
      return;
    }

    setErrorMessage('');
    setDraft('');
    setIsAwaitingMealPlanDateRange(true);
    setMessages((currentMessages) => {
      const lastMessage = currentMessages[currentMessages.length - 1];
      if (
        lastMessage?.role === 'assistant' &&
        normalizeText(lastMessage.text) === normalizeText(MEAL_PLAN_IMPORT_RANGE_PROMPT)
      ) {
        return currentMessages;
      }

      return [...currentMessages, createMessage('assistant', MEAL_PLAN_IMPORT_RANGE_PROMPT)];
    });
  }

  async function handleImportLatestPlanToCalendarSafe(messageText) {
    const normalizedMessage = normalizeText(messageText);
    if (!normalizedMessage) {
      return;
    }

    setErrorMessage('');
    setDraft('');

    if (!isAuthenticated(authUser)) {
      setIsAwaitingMealPlanDateRange(false);
      setMessages((currentMessages) => [
        ...currentMessages,
        createMessage('user', normalizedMessage),
        createMessage(
          'assistant',
          '\uB0B4 \uC2DD\uB2E8 \uAD00\uB9AC\uC5D0 \uC800\uC7A5\uD558\uB824\uBA74 \uBA3C\uC800 \uB85C\uADF8\uC778\uD574 \uC8FC\uC138\uC694. \uB85C\uADF8\uC778 \uD6C4 \uB2E4\uC2DC \uCD94\uAC00 \uC694\uCCAD\uC744 \uBCF4\uB0B4\uBA74 \uC774\uC5B4\uC11C \uC800\uC7A5\uD560\uAC8C\uC694.'
        ),
      ]);
      return;
    }

    const structuredContext = getLatestStructuredAssistantContext(messages);
    if (!structuredContext) {
      setIsAwaitingMealPlanDateRange(false);
      setMessages((currentMessages) => [
        ...currentMessages,
        createMessage('user', normalizedMessage),
        createMessage(
          'assistant',
          '\uAC00\uC838\uC62C \uCD5C\uC2E0 \uC2DD\uB2E8\uC774 \uC544\uC9C1 \uC5C6\uC5B4\uC694. \uBA3C\uC800 \uB9DE\uCDA4 \uC2DD\uB2E8\uC744 \uB9CC\uB4E4\uACE0 \uAE30\uAC04\uC744 \uC54C\uB824\uC8FC\uC138\uC694.'
        ),
      ]);
      return;
    }

    const inferredPlanDays = Math.max(
      1,
      Number(
        structuredContext.message?.plan?.days ||
          structuredContext.message?.plan?.daysList?.length ||
          1
      )
    );
    const dateRange = extractDateRangeSafe(normalizedMessage, inferredPlanDays);
    if (!dateRange) {
      setIsAwaitingMealPlanDateRange(true);
      setMessages((currentMessages) => [
        ...currentMessages,
        createMessage('user', normalizedMessage),
        createMessage(
          'assistant',
          MEAL_PLAN_IMPORT_RANGE_PROMPT
        ),
      ]);
      return;
    }

    setIsAwaitingMealPlanDateRange(false);
    setIsSending(true);
    setMessages((currentMessages) => [
      ...currentMessages,
      createMessage('user', normalizedMessage),
    ]);

    try {
      const importResult = await importMealPlanToCalendar({
        user: authUser,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        title: buildMealPlanImportTitleSafe(
          structuredContext.message.plan,
          dateRange.startDate,
          dateRange.endDate
        ),
        requestText: structuredContext.requestText,
        aiResponseId: structuredContext.message.responseId,
        plan: structuredContext.message.plan,
        sellableIngredients: structuredContext.message.sellableIngredients || [],
      });

      const importedEntryCount = Number(importResult.importedEntryCount || 0);
      const successText = `${importResult.startDate || dateRange.startDate}\uBD80\uD130 ${
        importResult.endDate || dateRange.endDate
      }\uAE4C\uC9C0 \uB0B4 \uC2DD\uB2E8 \uAD00\uB9AC\uC5D0 \uCD94\uAC00\uD588\uC5B4\uC694.${
        importedEntryCount > 0
          ? ` \uCD1D ${formatNumber(importedEntryCount)}\uAC1C \uC2DD\uB2E8\uC785\uB2C8\uB2E4.`
          : ''
      }`;

      setMessages((currentMessages) => [
        ...currentMessages,
        createMessage('assistant', successText),
      ]);
    } catch (error) {
      const failureText =
        error?.message ||
        '\uC2DD\uB2E8\uC744 \uB0B4 \uC2DD\uB2E8 \uAD00\uB9AC\uB85C \uC62E\uAE30\uB294 \uC911 \uBB38\uC81C\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.';

      setMessages((currentMessages) => [
        ...currentMessages,
        createMessage('assistant', failureText),
      ]);
      setErrorMessage(failureText);
    } finally {
      setIsSending(false);
    }
  }

  async function handleSend(messageText) {
    const normalizedMessage = normalizeText(messageText);
    if (!normalizedMessage || isSending || isCartSubmitting) {
      return;
    }

    if (isCartConfirmMessage(normalizedMessage) && latestCartCandidates.length) {
      await handleAddMatchedItemsToCart(normalizedMessage);
      return;
    }

    if (isAwaitingMealPlanDateRange) {
      if (
        /(?:\uCDE8\uC18C|\uAD1C\uCC2E\uC544|\uD558\uC9C0 ?\uB9C8|\uC548 ?\uD560\uB798|\uC548 ?\uB123\uC5B4|\uBCF4\uB958)/.test(
          normalizedMessage
        )
      ) {
        setIsAwaitingMealPlanDateRange(false);
        setDraft('');
        setMessages((currentMessages) => [
          ...currentMessages,
          createMessage('user', normalizedMessage),
          createMessage(
            'assistant',
            '\uC54C\uACA0\uC5B4\uC694. \uB0B4 \uC2DD\uB2E8 \uAD00\uB9AC \uCD94\uAC00\uB294 \uC7A0\uC2DC \uBCF4\uB958\uD560\uAC8C\uC694.'
          ),
        ]);
        return;
      }

      if (!extractDateRangeSafe(normalizedMessage)) {
        setDraft('');
        setMessages((currentMessages) => [
          ...currentMessages,
          createMessage('user', normalizedMessage),
          createMessage('assistant', MEAL_PLAN_IMPORT_RANGE_PROMPT),
        ]);
        return;
      }

      await handleImportLatestPlanToCalendarSafe(normalizedMessage);
      return;
    }

    if (isMealCalendarImportIntentSafe(normalizedMessage)) {
      await handleImportLatestPlanToCalendarSafe(normalizedMessage);
      return;
    }

    setErrorMessage('');
    setDraft('');
    setIsSending(true);
    setMessages((currentMessages) => [
      ...currentMessages,
      createMessage('user', normalizedMessage),
    ]);

    try {
      const response = await requestMealPlanChat({
        message: normalizedMessage,
        previousResponseId,
      });

      setMessages((currentMessages) => [
        ...currentMessages,
        createMessage(
          'assistant',
          sanitizeAssistantText(response.reply) || '\uC2DD\uB2E8\uACFC \uC7AC\uB8CC\uB97C \uC815\uB9AC\uD588\uC5B4\uC694.',
          {
            model: response.model || null,
            fallbackMode: Boolean(response.fallbackMode),
            responseId: response.responseId || null,
            plan: response.plan || null,
            aggregatedIngredients: response.aggregatedIngredients || [],
            sellableIngredients: response.sellableIngredients || [],
            unsellableIngredients: response.unsellableIngredients || [],
            cartPromptMessage: response.cartPromptMessage || '',
            cartPreview: response.cartPreview || null,
          }
        ),
      ]);

      setPreviousResponseId(response.responseId || null);
      setIsFallbackMode(Boolean(response.fallbackMode));
    } catch (error) {
      setErrorMessage(error.message || '\uC2DD\uB2E8 AI \uC751\uB2F5\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.');
    } finally {
      setIsSending(false);
    }
  }

  // eslint-disable-next-line no-unused-vars
  async function handleImportLatestPlanToCalendar(messageText) {
    const normalizedMessage = normalizeText(messageText);
    if (!normalizedMessage) {
      return;
    }

    setErrorMessage('');
    setDraft('');

    const structuredContext = getLatestStructuredAssistantContext(messages);
    if (!structuredContext) {
      setMessages((currentMessages) => [
        ...currentMessages,
        createMessage('user', normalizedMessage),
        createMessage(
          'assistant',
          '가져올 최신 식단이 아직 없어요. 먼저 맞춤 식단을 만든 뒤 날짜를 알려주세요.'
        ),
      ]);
      return;
    }

    const inferredPlanDays = Math.max(
      1,
      Number(
        structuredContext.message?.plan?.days ||
          structuredContext.message?.plan?.daysList?.length ||
          1
      )
    );
    const dateRange = extractDateRangeSafe(normalizedMessage, inferredPlanDays);
    if (!dateRange) {
      setMessages((currentMessages) => [
        ...currentMessages,
        createMessage('user', normalizedMessage),
        createMessage(
          'assistant',
          '식단을 추가할 기간을 알려주세요. 예: 2026-04-01부터 2026-04-07까지 추가해줘'
        ),
      ]);
      return;
    }

    setIsSending(true);
    setMessages((currentMessages) => [
      ...currentMessages,
      createMessage('user', normalizedMessage),
    ]);

    try {
      const importResult = await importMealPlanToCalendar({
        user: authUser,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        title: buildMealPlanImportTitle(
          structuredContext.message.plan,
          dateRange.startDate,
          dateRange.endDate
        ),
        requestText: structuredContext.requestText,
        aiResponseId: structuredContext.message.responseId,
        plan: structuredContext.message.plan,
        sellableIngredients: structuredContext.message.sellableIngredients || [],
      });

      const importedEntryCount = Number(importResult.importedEntryCount || 0);
      const successText = `${importResult.startDate || dateRange.startDate}부터 ${
        importResult.endDate || dateRange.endDate
      }까지 내 식단 관리에 추가했어요.${
        importedEntryCount > 0 ? ` 총 ${formatNumber(importedEntryCount)}개 식단입니다.` : ''
      }`;

      setMessages((currentMessages) => [
        ...currentMessages,
        createMessage('assistant', successText),
      ]);
    } catch (error) {
      const failureText =
        error?.message || '식단을 내 식단 관리로 옮기는 중 문제가 발생했습니다.';

      setMessages((currentMessages) => [
        ...currentMessages,
        createMessage('assistant', failureText),
      ]);
      setErrorMessage(failureText);
    } finally {
      setIsSending(false);
    }
  }

  async function handleAddMatchedItemsToCart(messageText = '\uC7A5\uBC14\uAD6C\uB2C8\uC5D0 \uB123\uC5B4\uC918') {
    const candidates = latestCartCandidates;
    if (!candidates.length || isCartSubmitting) {
      return;
    }

    setErrorMessage('');
    setDraft('');
    setIsCartSubmitting(true);
    setMessages((currentMessages) => [
      ...currentMessages,
      createMessage('user', messageText),
    ]);

    try {
      if (!isAuthenticated()) {
        setMessages((currentMessages) => [
          ...currentMessages,
          createMessage(
            'assistant',
            '\uB85C\uADF8\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4. \uC7A5\uBC14\uAD6C\uB2C8 \uAE30\uB2A5\uC744 \uC0AC\uC6A9\uD558\uB824\uBA74 \uBA3C\uC800 \uB85C\uADF8\uC778\uD574 \uC8FC\uC138\uC694.'
          ),
        ]);
        return;
      }

      for (const candidate of candidates) {
        await addCartItemToApi(candidate.productNo, Number(candidate.recommendedQuantity || 1));
      }

      const totalQuantity = candidates.reduce(
        (sum, candidate) => sum + Number(candidate.recommendedQuantity || 0),
        0
      );

      setMessages((currentMessages) => [
        ...currentMessages,
        createMessage(
          'assistant',
          `${candidates.length}\uC885 ${formatNumber(totalQuantity)}\uAC1C\uB97C \uC7A5\uBC14\uAD6C\uB2C8\uC5D0 \uB2F4\uC558\uC2B5\uB2C8\uB2E4.`,
          { cartAdded: true }
        ),
      ]);
    } catch (error) {
      setErrorMessage(error.message || '\uC7A5\uBC14\uAD6C\uB2C8 \uCC98\uB9AC \uC911 \uBB38\uC81C\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.');
    } finally {
      setIsCartSubmitting(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    handleSend(draft);
  }

  return (
    <div className="meal-plan-page page-shell">
      <main className="container">
        <section className="meal-plan-hero">
          <div className="meal-plan-hero__copy">
            <span className="meal-plan-hero__eyebrow">Meal Plan AI</span>
            <h1>{'\uC2DD\uB2E8\uC744 \uC9DC\uACE0, \uC7AC\uB8CC\uB97C \uBAA8\uC73C\uACE0, \uBC14\uB85C \uC7A5\uBC14\uAD6C\uB2C8\uAE4C\uC9C0'}</h1>
            <p>
              {'\uAC74\uAC15 \uC0C1\uD0DC\uC640 \uC6D0\uD558\uB294 \uC2DD\uB2E8, \uAE30\uAC04\uC744 \uC54C\uB824\uC8FC\uBA74 1\uC778\uBD84 \uAE30\uC900\uC73C\uB85C \uC2DD\uB2E8\uACFC \uC7AC\uB8CC\uB97C \uC815\uB9AC\uD558\uACE0,'}
              {' '}
              {'\uC6B0\uB9AC \uC0C1\uD488\uC73C\uB85C \uC0B4 \uC218 \uC788\uB294 \uD488\uBAA9\uC740 \uC7A5\uBC14\uAD6C\uB2C8 \uD6C4\uBCF4\uAE4C\uC9C0 \uD568\uAED8 \uBCF4\uC5EC\uB4DC\uB824\uC694.'}
            </p>
          </div>

          <div className="meal-plan-hero__panel">
            <strong>{'\uC774\uB807\uAC8C \uC774\uC6A9\uD574 \uBCF4\uC138\uC694'}</strong>
            <ul>
              <li>{'\uAC74\uAC15 \uC0C1\uD0DC\uC640 \uC2DD\uB2E8 \uC870\uAC74\uC744 \uBA3C\uC800 \uC785\uB825'}</li>
              <li>{'1\uC778\uBD84 \uAE30\uC900 \uC7AC\uB8CC\uB97C \uB0A0\uC9DC\uBCC4\uB85C \uD569\uC0B0'}</li>
              <li>{'\uD310\uB9E4\uC911\uC778 \uC0C1\uD488\uACFC \uC544\uB2CC \uC7AC\uB8CC\uB97C \uBD84\uB9AC'}</li>
              <li>{'\uD544\uC694\uD558\uBA74 \uC7A5\uBC14\uAD6C\uB2C8\uC5D0 \uBC14\uB85C \uB2F4\uAE30'}</li>
            </ul>
          </div>
        </section>

        <section className="meal-plan-chat">
          <div className="meal-plan-chat__shell">
            <aside className="meal-plan-chat__sidebar">
              <div className="meal-plan-chat__sidebar-head">
                <div>
                  <strong>{'\uCC44\uD305 \uBAA9\uB85D'}</strong>
                  <p>{`\uCD5C\uB300 ${MAX_STORED_SESSIONS}\uAC1C\uAE4C\uC9C0 \uC800\uC7A5`}</p>
                </div>
                <button
                  type="button"
                  className="meal-plan-chat__new-button"
                  onClick={handleCreateNewChat}
                  disabled={isSending || isCartSubmitting}
                >
                  {'\uC0C8 \uCC44\uD305'}
                </button>
              </div>

              <div className="meal-plan-chat__session-list">
                {chatSessions.map((session) => (
                  <div
                    key={session.id}
                    className={`meal-plan-chat__session ${
                      session.id === activeSessionId ? 'is-active' : ''
                    }`}
                  >
                    <button
                      type="button"
                      className="meal-plan-chat__session-main"
                      onClick={() => handleSelectChatSession(session.id)}
                      disabled={isSending || isCartSubmitting}
                    >
                      <strong>{session.title || '\uC0C8 \uCC44\uD305'}</strong>
                      <small>{buildSessionPreview(session.messages || [])}</small>
                      <span>{formatSessionTimestamp(session.updatedAt || session.createdAt)}</span>
                    </button>
                    <button
                      type="button"
                      className="meal-plan-chat__session-delete"
                      onClick={() => handleDeleteChatSession(session.id)}
                      disabled={isSending || isCartSubmitting}
                      aria-label={`${session.title || '\uCC44\uD305'} \uC0AD\uC81C`}
                    >
                      {'\uC0AD\uC81C'}
                    </button>
                  </div>
                ))}
              </div>
            </aside>

            <div className="meal-plan-chat__main">
              <div className="meal-plan-chat__header">
                <div>
                  <h2>{'\uB9DE\uCDA4 \uC2DD\uB2E8 \uB300\uD654'}</h2>
                  <p>{'\uC2DD\uB2E8\uACFC \uC7AC\uB8CC, \uC7A5\uBC14\uAD6C\uB2C8 \uD6C4\uBCF4\uB97C \uD55C \uD750\uB984\uC5D0\uC11C \uD655\uC778\uD560 \uC218 \uC788\uC5B4\uC694.'}</p>
                </div>
                {isFallbackMode ? (
                  <span className="meal-plan-chat__status">{'\uC784\uC2DC \uC751\uB2F5 \uBAA8\uB4DC'}</span>
                ) : hasConversation ? (
                  <span className="meal-plan-chat__status is-live">{'AI \uC5F0\uACB0\uB428'}</span>
                ) : (
                  <span className="meal-plan-chat__status">{'\uB300\uD654 \uC900\uBE44\uB428'}</span>
                )}
              </div>

              <div className="meal-plan-chat__prompts">
                {STARTER_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    className="meal-plan-chat__prompt"
                    onClick={() => handleSend(prompt)}
                    disabled={isSending || isCartSubmitting}
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              <div ref={messageListRef} className="meal-plan-chat__messages">
                {messages.map((message) => (
                  <article
                    key={message.id}
                    className={`meal-plan-message ${message.role === 'user' ? 'is-user' : 'is-assistant'}`}
                  >
                    <div className="meal-plan-message__meta">
                      <strong>{message.role === 'user' ? '\uB098' : 'Meal Plan AI'}</strong>
                      {message.model ? <span>{message.model}</span> : null}
                    </div>
                    <p>{message.text}</p>

                    {message.role === 'assistant' && message.plan ? (
                      <AssistantStructuredBlocks
                        message={message}
                        onAddToCart={handleAddMatchedItemsToCart}
                        onOpenMealPlanImport={promptMealPlanImportRange}
                        isCartSubmitting={isCartSubmitting}
                        isMealPlanImportPending={isAwaitingMealPlanDateRange}
                      />
                    ) : null}
                  </article>
                ))}

                {isSending ? (
                  <article className="meal-plan-message is-assistant is-loading">
                    <div className="meal-plan-message__meta">
                      <strong>Meal Plan AI</strong>
                    </div>
                    <p>{'\uC2DD\uB2E8\uACFC \uC7AC\uB8CC\uB97C \uC815\uB9AC\uD558\uACE0 \uC788\uC5B4\uC694...'}</p>
                  </article>
                ) : null}
              </div>

              {errorMessage ? <p className="meal-plan-chat__error">{errorMessage}</p> : null}

              <form className="meal-plan-chat__composer" onSubmit={handleSubmit}>
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder={
                    '\uC608: \uC800\uB294 \uD1B5\uD48D\uC774 \uC788\uACE0 \uB2E4\uC774\uC5B4\uD2B8 \uC911\uC774\uC5D0\uC694. 7\uC77C \uC2DD\uB2E8\uC744 \uC9DC\uC8FC\uACE0, \uC6D4\uC694\uC77C \uC800\uB141\uC740 \uBE7C\uC8FC \uC138\uC694.'
                  }
                  rows={3}
                />
                <button type="submit" disabled={isSending || isCartSubmitting || !draft.trim()}>
                  {'\uBCF4\uB0B4\uAE30'}
                </button>
              </form>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function AssistantStructuredBlocks({
  message,
  onAddToCart,
  onOpenMealPlanImport,
  isCartSubmitting,
  isMealPlanImportPending,
}) {
  const plan = message.plan || {};
  const daysList = Array.isArray(plan.daysList) ? plan.daysList : [];
  const aggregatedIngredients = Array.isArray(message.aggregatedIngredients)
    ? message.aggregatedIngredients
    : [];
  const sellableIngredients = Array.isArray(message.sellableIngredients)
    ? message.sellableIngredients
    : [];
  const unsellableIngredients = Array.isArray(message.unsellableIngredients)
    ? message.unsellableIngredients
    : [];
  const sellableCount = sellableIngredients.filter((item) => item?.cartCandidate?.productNo).length;
  const cartPreviewText = getCartPreviewText(message.cartPreview);

  return (
    <div className="meal-plan-result">
      <section className="meal-plan-result__section">
        <div className="meal-plan-result__heading">{'\uC2DD\uB2E8 \uC694\uC57D'}</div>
          <div className="meal-plan-summary-card">
            <strong>{plan.goalSummary || '\uC2DD\uB2E8\uC744 \uC815\uB9AC\uD588\uC2B5\uB2C8\uB2E4.'}</strong>
          <div className="meal-plan-plan-meta">
            <span>
              {'\uAE30\uC900 \uC778\uC6D0 '}
              {formatNumber(plan.servings || 1)}
              {'\uBA85'}
            </span>
            {plan.days != null ? (
              <span>
                {formatNumber(plan.days)}
                {'\uC77C'}
              </span>
            ) : null}
          </div>
          {Array.isArray(plan.removalNotes) && plan.removalNotes.length ? (
            <div className="meal-plan-note-list">
              {plan.removalNotes.map((note, index) => (
                <span key={`${note}-${index}`}>{note}</span>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {daysList.length ? (
        <section className="meal-plan-result__section">
          <div className="meal-plan-result__heading">{'\uB0A0\uC9DC\uBCC4 \uC2DD\uB2E8'}</div>
          <div className="meal-plan-day-list">
            {daysList.map((day) => (
              <div key={day.dayLabel} className="meal-plan-day-card">
                <strong>{day.dayLabel}</strong>
                <div className="meal-plan-meal-list">
                  {(day.meals || []).map((meal, index) => (
                    <div
                      key={`${day.dayLabel}-${meal.mealType}-${index}`}
                      className="meal-plan-meal-item"
                    >
                      <span>{meal.mealType}</span>
                      <b>{meal.menuName}</b>
                      {meal.description ? <p>{meal.description}</p> : null}
                      {Array.isArray(meal.ingredients) && meal.ingredients.length ? (
                        <div className="meal-plan-meal-ingredients">
                          {meal.ingredients.map((ingredient) => (
                            <span
                              key={`${meal.menuName}-${ingredient.ingredientName}-${ingredient.amountText}`}
                            >
                              {ingredient.ingredientName} {ingredient.amountText}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="meal-plan-result__section">
        <div className="meal-plan-result__heading">{'1\uC778\uBD84 \uAE30\uC900 \uD569\uC0B0 \uC7AC\uB8CC'}</div>
        {aggregatedIngredients.length ? (
          <div className="meal-plan-chip-list">
            {aggregatedIngredients.map((ingredient) => (
              <span
                key={`${ingredient.ingredientName}-${ingredient.amountText}`}
                className="meal-plan-chip"
              >
                {ingredient.ingredientName}{' '}
                {formatAmount(ingredient.amountValue, ingredient.unit, ingredient.amountText)}
              </span>
            ))}
          </div>
        ) : (
          <div className="meal-plan-empty-list">
            {'\uD569\uC0B0\uB41C \uC7AC\uB8CC \uC815\uBCF4\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.'}
          </div>
        )}
      </section>

      <section className="meal-plan-result__section">
        <div className="meal-plan-result__heading">{'\uD310\uB9E4\uC911\uC778 \uC7AC\uB8CC'}</div>
        {sellableIngredients.length ? (
          <div className="meal-plan-match-list">
            {sellableIngredients.map((item) => {
              const candidate = item.cartCandidate || null;
              return (
                <div
                  key={`${item.ingredientName}-${item.requiredAmountText}`}
                  className="meal-plan-product-card"
                >
                  <div className="meal-plan-product-card__header">
                    <strong>{item.ingredientName}</strong>
                    <span>{item.requiredAmountText}</span>
                  </div>
                  <p>{item.matchSummary}</p>
                  {candidate ? (
                    <div className="meal-plan-product-card__footer">
                      <div>
                        <b>{candidate.productName}</b>
                        <small>
                          {'\uAD8C\uC7A5 \uC218\uB7C9 '}
                          {formatNumber(candidate.recommendedQuantity || 1)}
                          {'\uAC1C \u00B7 '}
                          {candidate.coveredAmountText}
                        </small>
                      </div>
                      <span className="meal-plan-product-card__price">
                        {formatPrice(candidate.salePrice)}
                      </span>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="meal-plan-empty-list">
            {'\uD310\uB9E4\uC911\uC778 \uC7AC\uB8CC\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.'}
          </div>
        )}
      </section>

      {unsellableIngredients.length ? (
        <section className="meal-plan-result__section">
          <div className="meal-plan-result__heading">{'\uD604\uC7AC \uD310\uB9E4\uC911\uC774 \uC544\uB2CC \uC7AC\uB8CC'}</div>
          <div className="meal-plan-empty-list">
            {unsellableIngredients.map((item) => (
              <div
                key={`${item.ingredientName}-${item.requiredAmountText}`}
                className="meal-plan-unsellable-item"
              >
                <strong>{item.ingredientName}</strong>
                <span>{item.requiredAmountText}</span>
                <p>{item.reason}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {message.cartPromptMessage && sellableCount > 0 ? (
        <section className="meal-plan-result__section meal-plan-result__cta">
          <div className="meal-plan-cta-copy">
            <div className="meal-plan-result__heading">{'\uC7A5\uBC14\uAD6C\uB2C8 \uD655\uC778'}</div>
            <p>{message.cartPromptMessage}</p>
            {cartPreviewText ? <small>{cartPreviewText}</small> : null}
          </div>
          <button
            type="button"
            className="meal-plan-cta-button"
            onClick={() => onAddToCart('\uC7A5\uBC14\uAD6C\uB2C8\uC5D0 \uB123\uC5B4\uC918')}
            disabled={isCartSubmitting}
          >
            {isCartSubmitting ? '\uC7A5\uBC14\uAD6C\uB2C8 \uB2F4\uB294 \uC911...' : '\uC7A5\uBC14\uAD6C\uB2C8\uC5D0 \uB2F4\uAE30'}
          </button>
        </section>
      ) : null}

      {daysList.length ? (
        <section className="meal-plan-result__section meal-plan-result__cta meal-plan-result__cta--secondary">
          <div className="meal-plan-cta-copy">
            <div className="meal-plan-result__heading">{'내 식단 관리'}</div>
            <p>{'마이페이지 식단관리에 추가할까요?'}</p>
            <small>{'추가하기를 누르면 저장할 기간을 먼저 물어볼게요.'}</small>
          </div>
          <button
            type="button"
            className="meal-plan-cta-button meal-plan-cta-button--secondary"
            onClick={onOpenMealPlanImport}
            disabled={isCartSubmitting}
          >
            {isMealPlanImportPending ? '날짜 입력 기다리는 중...' : '추가하기'}
          </button>
        </section>
      ) : null}
    </div>
  );
}
