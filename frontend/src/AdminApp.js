import { useEffect, useMemo, useState } from 'react';
import './styles/admin.css';
import AdminLayout from './admin/AdminLayout';
import {
  AdminEmptyState,
  AdminMetricCard,
  AdminPageHeader,
  AdminStatusBadge,
  formatAdminCount,
  formatAdminCurrency,
  formatAdminDate,
  formatAdminDateParts,
} from './admin/AdminUi';
import {
  createAdminPackageHistory,
  createAdminPurchaseBatch,
  deleteAdminPurchaseBatch,
  deleteAdminOrder,
  deleteAdminProduct,
  deleteAdminUser,
  fetchAdminBanners,
  fetchAdminOrderDetail,
  fetchAdminOrders,
  fetchAdminPackageHistories,
  fetchAdminProductCategories,
  fetchAdminProducts,
  fetchAdminPurchases,
  fetchAdminPurchaseQuote,
  fetchAdminRetailPriceList,
  fetchAdminPurchaseReferenceItems,
  fetchAdminRecipeMappings,
  fetchAdminUsers,
  getAdminBannerImageUrl,
  getAdminProductImageUrl,
  saveAdminProduct,
  triggerAdminRecipeSync,
  uploadAdminProductImages,
  updateAdminOrder,
  updateAdminUserStatus,
} from './admin/adminApi';
import { isAdminMode, leaveAdminPage, openAdminPage } from './admin/adminSession';

const EMPTY_PRODUCT_FORM = {
  productNo: null,
  categoryNo: '',
  productName: '',
  origin: '',
  unit: 'kg',
  packageWeight: '1',
  salePrice: '0',
  stockQty: '0',
  description: '',
  isSeasonal: 'N',
  saleStatus: 'READY',
};

const EMPTY_PURCHASE_FORM = {
  categoryNo: '',
  referenceItemCode: '',
  productName: '',
  origin: '',
  purchaseUnit: 'kg',
  purchaseQty: '0',
  purchasePrice: '0',
  purchaseDate: new Date().toISOString().slice(0, 10),
  supplierName: '',
  status: 'PURCHASED',
};

const EMPTY_PACKAGE_FORM = {
  productNo: '',
  packagedQty: '0',
  packagedWeight: '1',
  salePrice: '0',
  saleStatus: 'SELLING',
  note: '',
};

function parseAdminPage(hash) {
  const normalized = hash.replace(/^#\/?/, '').trim().toLowerCase();
  const segments = normalized.split('/').filter(Boolean);

  if (segments[0] !== 'admin') {
    return 'dashboard';
  }

  const page = segments[1] || 'dashboard';
  return ['dashboard', 'products', 'purchase', 'orders', 'users', 'content'].includes(page)
    ? page
    : 'dashboard';
}

function toNumber(value, fallback = 0) {
  const nextValue = Number(value);
  return Number.isFinite(nextValue) ? nextValue : fallback;
}

function hasAdminValue(value) {
  return value !== null && value !== undefined && value !== '';
}

const COUNT_UNIT_SET = new Set(['ea', 'each', '개', '포기', '단', '망', '봉', '봉지', 'pack', 'pk']);
const VOLUME_UNIT_SET = new Set(['ml', 'milliliter', 'milliliters', 'millilitre', 'millilitres', 'l', 'liter', 'liters', 'litre', 'litres', 'ℓ', '리터']);

const ADMIN_SUPPORTED_CATEGORY_NAMES = ['채소', '과일', '버섯', '육류', '유제품', '달걀', '가공식품'];
const ADMIN_FRUIT_KEYWORDS = ['사과', '배/', '복숭아', '포도', '감귤', '단감', '바나나', '참다래', '수박', '참외', '딸기', '멜론', '오렌지', '망고', '레몬', '파인애플', '체리', '키위'];
const ADMIN_FRUIT_EXACT_NAMES = new Set(['사과', '배', '복숭아', '포도', '감귤', '단감', '바나나', '참다래', '수박', '참외', '딸기', '멜론', '오렌지', '망고', '레몬', '파인애플', '체리', '키위']);
const ADMIN_MUSHROOM_KEYWORDS = ['버섯', '송이'];
const ADMIN_DAIRY_KEYWORDS = ['우유', '치즈', '요거트', '요구르트', '버터', '분유', '생크림'];
const ADMIN_EGG_KEYWORDS = ['계란', '달걀', '특란', '왕란'];
const ADMIN_MEAT_KEYWORDS = ['쇠고기', '소 ', '소/', '돼지', '삼겹', '목심', '갈비', '안심', '등심', '양지', '설도', '앞다리', '가슴살', '북채', '토종닭', '육계', '닭 '];
const ADMIN_PROCESSED_KEYWORDS = ['김치', '고추장', '된장', '간장', '두부', '순두부', '연두부', '즉석밥', '맛김', '콩나물'];
const ADMIN_UNSUPPORTED_REFERENCE_KEYWORDS = ['가리비', '갈치', '고등어', '굴/', '김/', '다시마', '멸치', '미역', '오징어', '새우', '전복', '북어', '삼치', '명태', '홍합', '쌀', '찹쌀', '콩/', '팥/', '녹두', '메밀', '들깨', '참깨'];
const ADMIN_REFERENCE_ALIAS_MAP = {
  'catalog:200:214:01|02': [
    { key: 'red-lettuce', productName: '적상추', quoteName: '상추' },
    { key: 'green-lettuce', productName: '청상추', quoteName: '상추' },
  ],
  'catalog:200:223:01|02|03': [
    { key: 'spined-cucumber', productName: '가시오이', quoteName: '오이' },
    { key: 'dadagi-cucumber', productName: '다다기오이', quoteName: '오이' },
    { key: 'cheong-cucumber', productName: '취청오이', quoteName: '오이' },
  ],
  'catalog:200:224:01|02': [
    { key: 'green-zucchini', productName: '애호박', quoteName: '호박' },
    { key: 'zucchini', productName: '쥬키니', quoteName: '호박' },
  ],
};

function splitAdminReferenceNameSegments(value) {
  return String(value || '')
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function dedupeAdminReferenceNameSegments(segmentArray) {
  return segmentArray.filter((segment, index) => segment && segmentArray.indexOf(segment) === index);
}

function normalizeAdminReferenceProductName(value) {
  const segmentArray = dedupeAdminReferenceNameSegments(splitAdminReferenceNameSegments(value));
  if (!segmentArray.length) {
    return String(value || '').trim();
  }
  return segmentArray[0];
}

function buildAdminReferenceDisplayName(value) {
  const segmentArray = dedupeAdminReferenceNameSegments(splitAdminReferenceNameSegments(value));
  if (!segmentArray.length) {
    return String(value || '').trim();
  }
  return segmentArray.join(' / ');
}

function formatDecimalInput(value, fractionDigits = 2) {
  const nextValue = Number(value);
  if (!Number.isFinite(nextValue)) {
    return '';
  }

  return nextValue.toFixed(fractionDigits).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
}

function formatAdminIsoDate(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function buildAdminRecentSnapshotDateList(daysBack = 7) {
  const dateList = [];
  const today = new Date();
  for (let offset = 0; offset <= daysBack; offset += 1) {
    const nextDate = new Date(today);
    nextDate.setDate(today.getDate() - offset);
    dateList.push(formatAdminIsoDate(nextDate));
  }
  return dateList;
}

function resolveUnitAmount(value, unit) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) {
    return null;
  }

  const normalizedUnit = normalizeMeasurementUnit(unit);
  if (!normalizedUnit) {
    return null;
  }

  if (normalizedUnit === 'kg') {
    return { type: 'WEIGHT', amount: amount * 1000 };
  }
  if (normalizedUnit === 'g') {
    return { type: 'WEIGHT', amount };
  }
  if (isVolumeUnit(normalizedUnit)) {
    return { type: 'VOLUME', amount: normalizeVolumeAmount(normalizedUnit, amount) };
  }
  if (COUNT_UNIT_SET.has(normalizedUnit)) {
    return { type: 'COUNT', amount };
  }

  return null;
}

function normalizeMeasurementUnit(unit) {
  const normalizedUnit = normalizeUnitKey(unit);
  if (!normalizedUnit) {
    return null;
  }

  if (
    normalizedUnit === '\uAD6C' ||
    normalizedUnit === '\uC54C' ||
    normalizedUnit === '\uD310' ||
    normalizedUnit === '\uBCD1' ||
    normalizedUnit === '\uD1B5' ||
    normalizedUnit === '\uD329'
  ) {
    return 'ea';
  }

  return normalizedUnit;
}

function normalizeUnitKey(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized ? normalized.replace(/\s+/g, '') : '';
}

function isVolumeUnit(unit) {
  return Boolean(unit && VOLUME_UNIT_SET.has(unit));
}

function normalizeVolumeAmount(unit, amount) {
  if (
    unit === 'l' ||
    unit === 'liter' ||
    unit === 'liters' ||
    unit === 'litre' ||
    unit === 'litres' ||
    unit === '\u2113' ||
    unit === '\uB9AC\uD130'
  ) {
    return amount * 1000;
  }
  return amount;
}

function calculatePurchasePriceFromQuote(purchaseQuote, purchaseQty, purchaseUnit) {
  if (!purchaseQuote) {
    return null;
  }

  const baseQuantity = resolveUnitAmount(
    purchaseQuote.pricingBaseQty,
    purchaseQuote.pricingBaseUnit
  );
  const currentQuantity = resolveUnitAmount(purchaseQty, purchaseUnit);
  const basePrice = Number(purchaseQuote.pricingBasePrice);

  if (!baseQuantity || !currentQuantity || !Number.isFinite(basePrice) || baseQuantity.amount <= 0) {
    return null;
  }

  if (baseQuantity.type !== currentQuantity.type) {
    return null;
  }

  return (basePrice * currentQuantity.amount) / baseQuantity.amount;
}

function containsAnyTextKeyword(value, keywordArray) {
  const normalizedValue = String(value || '').trim();
  if (!normalizedValue) {
    return false;
  }

  return keywordArray.some((keyword) => normalizedValue.includes(keyword));
}

// eslint-disable-next-line no-unused-vars
function resolveAdminReferenceCategoryName(item) {
  const currentCategoryName = String(item?.categoryName || '').trim();
  const rawProductName = String(item?.productName || '').trim();
  const normalizedProductName = normalizeAdminReferenceProductName(rawProductName) || rawProductName;
  const itemCategoryCode = extractAdminReferenceCategoryCode(item?.itemCode);
  if (!normalizedProductName) {
    return '';
  }

  if (containsAnyTextKeyword(rawProductName || normalizedProductName, ADMIN_UNSUPPORTED_REFERENCE_KEYWORDS)) {
    return '';
  }
  if (itemCategoryCode === '800' || containsAnyTextKeyword(normalizedProductName, ADMIN_PROCESSED_KEYWORDS)) {
    return '가공식품';
  }
  if (containsAnyTextKeyword(normalizedProductName, ADMIN_DAIRY_KEYWORDS)) {
    return '유제품';
  }
  if (containsAnyTextKeyword(normalizedProductName, ADMIN_EGG_KEYWORDS)) {
    return '달걀';
  }
  if (itemCategoryCode === '500' || containsAnyTextKeyword(normalizedProductName, ADMIN_MEAT_KEYWORDS)) {
    return '육류';
  }
  if (itemCategoryCode === '300' || containsAnyTextKeyword(normalizedProductName, ADMIN_MUSHROOM_KEYWORDS)) {
    return '버섯';
  }
  if (
    ADMIN_FRUIT_EXACT_NAMES.has(normalizedProductName)
    || itemCategoryCode === '400'
    || containsAnyTextKeyword(rawProductName, ADMIN_FRUIT_KEYWORDS)
  ) {
    return '과일';
  }
  if (itemCategoryCode === '100' || itemCategoryCode === '200') {
    return '채소';
  }
  if (ADMIN_SUPPORTED_CATEGORY_NAMES.includes(currentCategoryName) && currentCategoryName !== '과일') {
    return currentCategoryName;
  }

  return '채소';
}

function resolveStableAdminReferenceCategoryName(item) {
  const supportedCategoryNames = [
    '\uCC44\uC18C',
    '\uACFC\uC77C',
    '\uBC84\uC12F',
    '\uC721\uB958',
    '\uC720\uC81C\uD488',
    '\uB2EC\uAC40',
    '\uAC00\uACF5\uC2DD\uD488',
  ];
  const fruitExactNames = new Set([
    '\uC0AC\uACFC',
    '\uBC30',
    '\uBCF5\uC22D\uC544',
    '\uD3EC\uB3C4',
    '\uAC10\uADE4',
    '\uB2E8\uAC10',
    '\uBC14\uB098\uB098',
    '\uCC38\uB2E4\uB798',
    '\uCC38\uC678',
    '\uC624\uB80C\uC9C0',
    '\uD30C\uC778\uC560\uD50C',
    '\uBA5C\uB860',
    '\uB538\uAE30',
    '\uCCB4\uB9AC',
    '\uB9DD\uACE0',
    '\uD0A4\uC704',
    '\uC790\uB450',
    '\uC218\uBC15',
  ]);
  const fruitKeywords = Array.from(fruitExactNames);
  const mushroomKeywords = ['\uBC84\uC12F', '\uC1A1\uC774'];
  const dairyKeywords = ['\uC6B0\uC720', '\uCE58\uC988', '\uC694\uAC70\uD2B8', '\uC694\uAD6C\uB974\uD2B8', '\uBC84\uD130', '\uBD84\uC720', '\uC0DD\uD06C\uB9BC'];
  const eggKeywords = ['\uACC4\uB780', '\uB2EC\uAC40', '\uD2B9\uB780', '\uC655\uB780'];
  const meatKeywords = [
    '\uC1E0\uACE0\uAE30',
    '\uD55C\uC6B0',
    '\uC18C\uACE0\uAE30',
    '\uB3FC\uC9C0',
    '\uB2ED',
    '\uC624\uB9AC',
    '\uB4F1\uC2EC',
    '\uC548\uC2EC',
    '\uC0BC\uACB9\uC0B4',
    '\uAC08\uBE44',
    '\uBAA9\uC2EC',
    '\uC591\uC9C0',
    '\uC124\uB3C4',
    '\uC55E\uB2E4\uB9AC',
    '\uAC00\uC2B4\uC0B4',
    '\uBD81\uCC44',
    '\uD1A0\uC885\uB2ED',
    '\uC721\uACC4',
  ];
  const processedKeywords = ['\uAE40\uCE58', '\uACE0\uCD94\uC7A5', '\uB41C\uC7A5', '\uAC04\uC7A5', '\uB450\uBD80', '\uC21C\uB450\uBD80', '\uC5F0\uB450\uBD80', '\uC989\uC11D\uBC25', '\uB9DB\uAE40', '\uCF69\uB098\uBB3C'];
  const unsupportedKeywords = [
    '\uAC00\uB9AC\uBE44',
    '\uAC08\uCE58',
    '\uACE0\uB4F1\uC5B4',
    '\uAD74',
    '\uAE40/',
    '\uB2E4\uC2DC\uB9C8',
    '\uBA78\uCE58',
    '\uBBF8\uC5ED',
    '\uC624\uC9D5\uC5B4',
    '\uC0C8\uC6B0',
    '\uBCD1\uC5B4',
    '\uBD81\uC5B4',
    '\uAF41\uCE58',
    '\uBA85\uD0DC',
    '\uCC38\uAE68',
    '\uCF69',
    '\uC300',
    '\uCC39\uC300',
    '\uB179\uB450',
    '\uBA54\uBC00',
    '\uB4E4\uAE68',
  ];
  const currentCategoryName = String(item?.categoryName || '').trim();
  const rawProductName = String(item?.productName || '').trim();
  const normalizedProductName = normalizeAdminReferenceProductName(rawProductName) || rawProductName;
  const itemCategoryCode = extractAdminReferenceCategoryCode(item?.itemCode);

  if (!normalizedProductName) {
    return '';
  }
  if (containsAnyTextKeyword(rawProductName || normalizedProductName, unsupportedKeywords)) {
    return '';
  }
  if (itemCategoryCode === '800' || containsAnyTextKeyword(normalizedProductName, processedKeywords)) {
    return '\uAC00\uACF5\uC2DD\uD488';
  }
  if (containsAnyTextKeyword(normalizedProductName, dairyKeywords)) {
    return '\uC720\uC81C\uD488';
  }
  if (containsAnyTextKeyword(normalizedProductName, eggKeywords)) {
    return '\uB2EC\uAC40';
  }
  if (itemCategoryCode === '500' || containsAnyTextKeyword(normalizedProductName, meatKeywords)) {
    return '\uC721\uB958';
  }
  if (itemCategoryCode === '300' || containsAnyTextKeyword(normalizedProductName, mushroomKeywords)) {
    return '\uBC84\uC12F';
  }
  if (
    fruitExactNames.has(normalizedProductName)
    || itemCategoryCode === '400'
    || containsAnyTextKeyword(rawProductName || normalizedProductName, fruitKeywords)
  ) {
    return '\uACFC\uC77C';
  }
  if (itemCategoryCode === '100' || itemCategoryCode === '200') {
    return '\uCC44\uC18C';
  }
  if (supportedCategoryNames.includes(currentCategoryName)) {
    return currentCategoryName;
  }
  return '\uCC44\uC18C';
}

function extractAdminReferenceCategoryCode(itemCode) {
  const normalizedItemCode = String(itemCode || '').trim().split('::')[0];
  if (!normalizedItemCode) {
    return '';
  }

  if (normalizedItemCode.startsWith('catalog:')) {
    return normalizedItemCode.split(':')[1] || '';
  }

  const matched = normalizedItemCode.match(/^[A-Z]+_(\d{3})_/);
  if (matched) {
    return matched[1];
  }

  return '';
}

function isAdminCatalogReferenceItem(itemCode) {
  return String(itemCode || '').trim().split('::')[0].startsWith('catalog:');
}

function parseAdminCatalogReferenceCode(itemCode) {
  const normalizedItemCode = String(itemCode || '').trim().split('::')[0];
  if (!normalizedItemCode.startsWith('catalog:')) {
    return null;
  }

  const tokenArray = normalizedItemCode.split(':');
  if (tokenArray.length < 4) {
    return null;
  }

  return {
    itemCategoryCode: tokenArray[1] || '',
    itemCode: tokenArray[2] || '',
    kindCode: tokenArray.slice(3).join(':') || '',
  };
}

function buildAdminReferenceOptionCode(itemCode, aliasKey) {
  const normalizedItemCode = String(itemCode || '').trim();
  const normalizedAliasKey = String(aliasKey || '').trim();
  return normalizedAliasKey ? `${normalizedItemCode}::${normalizedAliasKey}` : normalizedItemCode;
}

function normalizeAdminCatalogKindCode(kindCode) {
  return String(kindCode || '').trim().replace(/\|/g, '-');
}

function normalizeAdminSearchKey(value) {
  return String(value || '').trim().replace(/\s+/g, '').toLowerCase();
}

function parseAdminSnapshotUnit(snapshotUnit) {
  const normalizedSnapshotUnit = String(snapshotUnit || '').replace(/\s+/g, '').trim();
  if (!normalizedSnapshotUnit) {
    return null;
  }

  const matched = normalizedSnapshotUnit.match(/^([0-9]+(?:\.[0-9]+)?)?([A-Za-z\uAC00-\uD7A3\u2113]+)$/);
  if (!matched) {
    return null;
  }

  const quantity = Number(matched[1] || 1);
  const displayUnit = matched[2] || '';
  const resolvedQuantity = resolveUnitAmount(quantity, displayUnit);
  if (!Number.isFinite(quantity) || quantity <= 0 || !displayUnit || !resolvedQuantity) {
    return null;
  }

  return {
    quantity,
    displayUnit,
    resolvedQuantity,
  };
}

function buildAdminPricingBasisFromSnapshotUnit(snapshotUnit) {
  const parsedUnit = parseAdminSnapshotUnit(snapshotUnit);
  if (!parsedUnit) {
    return null;
  }

  if (parsedUnit.resolvedQuantity.type === 'WEIGHT') {
    return {
      type: 'WEIGHT',
      amount: 1000,
      unit: 'kg',
      label: '1kg',
    };
  }

  if (parsedUnit.resolvedQuantity.type === 'VOLUME') {
    return {
      type: 'VOLUME',
      amount: 1000,
      unit: 'L',
      label: '1L',
    };
  }

  const displayUnit = parsedUnit.displayUnit === 'ea' ? '개' : parsedUnit.displayUnit;
  return {
    type: 'COUNT',
    amount: 1,
    unit: displayUnit,
    label: `1${displayUnit}`,
  };
}

function calculateAdminComparablePrice(avgPrice, snapshotUnit, pricingBasis) {
  const parsedUnit = parseAdminSnapshotUnit(snapshotUnit);
  const numericAvgPrice = Number(avgPrice);
  if (!parsedUnit || !pricingBasis || !Number.isFinite(numericAvgPrice) || numericAvgPrice <= 0) {
    return null;
  }

  if (parsedUnit.resolvedQuantity.type !== pricingBasis.type || parsedUnit.resolvedQuantity.amount <= 0) {
    return null;
  }

  return (numericAvgPrice * pricingBasis.amount) / parsedUnit.resolvedQuantity.amount;
}

function findAdminRetailFallbackSnapshot(referenceItem, retailPriceList) {
  const parsedReferenceCode = parseAdminCatalogReferenceCode(referenceItem?.itemCode);
  const normalizedProductName = normalizeAdminReferenceProductName(referenceItem?.productName);
  const normalizedQuoteName = normalizeAdminReferenceProductName(
    referenceItem?.quoteName || referenceItem?.rawProductName || referenceItem?.productName
  );
  const normalizedProductSearchKey = normalizeAdminSearchKey(normalizedProductName);
  const normalizedQuoteSearchKey = normalizeAdminSearchKey(normalizedQuoteName);
  const storedItemCodePrefix = parsedReferenceCode
    ? `RETAIL_${parsedReferenceCode.itemCategoryCode}_${parsedReferenceCode.itemCode}_${normalizeAdminCatalogKindCode(parsedReferenceCode.kindCode)}_`
    : '';
  const referenceUnit = String(referenceItem?.snapshotUnit || '').replace(/\s+/g, '').trim();

  let bestSnapshot = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  (retailPriceList || []).forEach((snapshot) => {
    const snapshotItemCode = String(snapshot?.itemCode || '').trim();
    const snapshotItemName = String(snapshot?.itemName || '').trim();
    const normalizedSnapshotName = normalizeAdminReferenceProductName(snapshotItemName);
    const normalizedSnapshotSearchKey = normalizeAdminSearchKey(normalizedSnapshotName);
    const snapshotSegmentArray = dedupeAdminReferenceNameSegments(splitAdminReferenceNameSegments(snapshotItemName));
    if (!snapshotItemCode || !snapshotItemName) {
      return;
    }

    let score = 0;
    if (storedItemCodePrefix && snapshotItemCode.startsWith(storedItemCodePrefix)) {
      score += 5000;
    }
    if (
      normalizedProductSearchKey
      && snapshotSegmentArray.some(
        (segment) => normalizeAdminSearchKey(segment) === normalizedProductSearchKey
      )
    ) {
      score += 2600;
    }
    if (normalizedSnapshotSearchKey === normalizedProductSearchKey) {
      score += 1600;
    }
    if (normalizedSnapshotSearchKey === normalizedQuoteSearchKey) {
      score += 1200;
    } else if (
      normalizedSnapshotSearchKey.includes(normalizedProductSearchKey)
      || normalizedProductSearchKey.includes(normalizedSnapshotSearchKey)
      || normalizedSnapshotSearchKey.includes(normalizedQuoteSearchKey)
      || normalizedQuoteSearchKey.includes(normalizedSnapshotSearchKey)
    ) {
      score += 800;
    }
    if (referenceUnit && String(snapshot.unit || '').replace(/\s+/g, '').trim() === referenceUnit) {
      score += 400;
    }
    if (String(snapshot.sourceName || '').includes('KAMIS_PROCESS_RETAIL_ITEM_PAGE')) {
      score += 300;
    }
    if (String(snapshot.sourceName || '').includes('KAMIS_PERIOD_RETAIL_PRODUCT_LIST')) {
      score += 200;
    }
    if (String(snapshot.sourceName || '').includes('KAMIS_DAILY_SALES_LIST')) {
      score += 100;
    }

    if (score > bestScore) {
      bestSnapshot = snapshot;
      bestScore = score;
    }
  });

  return bestScore > 0 ? bestSnapshot : null;
}

function buildAdminRetailFallbackQuote(referenceItem, retailSnapshot) {
  const snapshotUnit = String(retailSnapshot?.unit || referenceItem?.snapshotUnit || '').trim();
  const parsedSnapshotUnit = parseAdminSnapshotUnit(snapshotUnit);
  const pricingBasis = buildAdminPricingBasisFromSnapshotUnit(snapshotUnit);
  const retailComparablePrice = calculateAdminComparablePrice(
    retailSnapshot?.avgPrice,
    snapshotUnit,
    pricingBasis
  );
  const purchaseQty = parsedSnapshotUnit?.quantity ?? 1;
  const purchaseUnit = parsedSnapshotUnit?.displayUnit || snapshotUnit || 'ea';
  const purchasePrice = Number(retailSnapshot?.avgPrice || 0);
  const comparableRounded = Number.isFinite(retailComparablePrice)
    ? Math.round(retailComparablePrice)
    : null;

  return {
    quoteSource: 'RETAIL_FALLBACK',
    queryName: referenceItem?.productName || retailSnapshot?.itemName || '',
    requestedItemCode: referenceItem?.itemCode || '',
    matchedItemName: retailSnapshot?.itemName || referenceItem?.productName || '',
    matchedItemCode: retailSnapshot?.itemCode || referenceItem?.itemCode || '',
    snapshotDate: retailSnapshot?.snapshotDate || null,
    wholesaleSnapshotDate: null,
    retailSnapshotDate: retailSnapshot?.snapshotDate || null,
    snapshotUnit,
    wholesaleSourceUnit: null,
    purchaseUnit,
    purchaseQty,
    purchasePrice,
    pricingBaseUnit: purchaseUnit,
    pricingBaseQty: purchaseQty,
    pricingBasePrice: purchasePrice,
    priceBasisUnit: pricingBasis?.label || snapshotUnit,
    wholesalePriceBasisUnit: null,
    retailPriceBasisUnit: pricingBasis?.label || snapshotUnit,
    recommendedPriceBasisUnit: pricingBasis?.label || snapshotUnit,
    wholesaleSourcePrice: null,
    retailSourcePrice: purchasePrice,
    wholesaleAvgPrice: null,
    wholesaleComparablePrice: null,
    retailAvgPrice: retailComparablePrice,
    retailSnapshotUnit: snapshotUnit,
    retailComparablePrice,
    recommendedSalePrice: comparableRounded,
    pricingNote: '도매 시세가 없어 소매 시세 기준으로 매입 단위, 수량, 가격을 자동 입력했습니다.',
    wholesaleItemCode: null,
    retailItemCode: retailSnapshot?.itemCode || null,
  };
}

function mergeAdminRetailFallbackIntoQuote(baseQuote, retailSnapshot) {
  const snapshotUnit = String(retailSnapshot?.unit || '').trim();
  const pricingBasisUnit =
    String(
      baseQuote?.recommendedPriceBasisUnit
      || baseQuote?.retailPriceBasisUnit
      || baseQuote?.priceBasisUnit
      || ''
    ).trim();
  const pricingBasisQuantity = parsePricingBasisQuantity(pricingBasisUnit);
  const parsedSnapshotUnit = parseAdminSnapshotUnit(snapshotUnit);
  const numericRetailSourcePrice = Number(retailSnapshot?.avgPrice);

  let retailComparablePrice = null;
  if (
    pricingBasisQuantity
    && parsedSnapshotUnit
    && pricingBasisQuantity.type === parsedSnapshotUnit.resolvedQuantity.type
    && parsedSnapshotUnit.resolvedQuantity.amount > 0
    && Number.isFinite(numericRetailSourcePrice)
    && numericRetailSourcePrice > 0
  ) {
    retailComparablePrice =
      (numericRetailSourcePrice * pricingBasisQuantity.amount) / parsedSnapshotUnit.resolvedQuantity.amount;
  }

  const wholesaleComparablePrice = Number(baseQuote?.wholesaleComparablePrice);
  let recommendedSalePrice = baseQuote?.recommendedSalePrice ?? null;
  if (
    recommendedSalePrice == null
    && Number.isFinite(wholesaleComparablePrice)
    && wholesaleComparablePrice > 0
    && Number.isFinite(retailComparablePrice)
    && retailComparablePrice > 0
  ) {
    recommendedSalePrice = Math.round((wholesaleComparablePrice + retailComparablePrice) / 2);
  }

  return {
    ...baseQuote,
    retailSnapshotDate: retailSnapshot?.snapshotDate || baseQuote?.retailSnapshotDate || null,
    retailSourcePrice: Number.isFinite(numericRetailSourcePrice) ? numericRetailSourcePrice : baseQuote?.retailSourcePrice ?? null,
    retailAvgPrice: Number.isFinite(retailComparablePrice) ? retailComparablePrice : baseQuote?.retailAvgPrice ?? null,
    retailSnapshotUnit: snapshotUnit || baseQuote?.retailSnapshotUnit || null,
    retailComparablePrice: Number.isFinite(retailComparablePrice) ? retailComparablePrice : baseQuote?.retailComparablePrice ?? null,
    retailItemCode: retailSnapshot?.itemCode || baseQuote?.retailItemCode || null,
    recommendedSalePrice,
    pricingNote:
      Number.isFinite(retailComparablePrice)
      ? null
      : baseQuote?.pricingNote || '\uC5F0\uACB0\uB41C \uC18C\uB9E4 \uC2DC\uC138\uAC00 \uC5C6\uC5B4 \uAD8C\uC7A5 \uD310\uB9E4\uAC00\uB97C \uACC4\uC0B0\uD558\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4.',
  };
}

async function fetchAdminRecentRetailPriceList(itemName, limit = 200, daysBack = 7) {
  const snapshotDateList = buildAdminRecentSnapshotDateList(daysBack);

  for (const snapshotDate of snapshotDateList) {
    const retailPriceList = await fetchAdminRetailPriceList(itemName, limit, snapshotDate);
    if (Array.isArray(retailPriceList) && retailPriceList.length) {
      return retailPriceList;
    }
  }

  return [];
}

function getAdminReferenceCategoryPriority(categoryName) {
  switch (String(categoryName || '').trim()) {
    case '\uAC00\uACF5\uC2DD\uD488':
      return 7;
    case '\uC720\uC81C\uD488':
      return 6;
    case '\uB2EC\uAC40':
      return 5;
    case '\uC721\uB958':
      return 4;
    case '\uACFC\uC77C':
      return 3;
    case '\uBC84\uC12F':
      return 2;
    case '\uCC44\uC18C':
      return 1;
    default:
      return 0;
  }
}

function getAdminReferenceMergePriority(item) {
  let score = 0;
  if (item?.supportsAutoQuote) {
    score += 100;
  }
  if (String(item?.referenceSource || '').trim() === 'WHOLESALE') {
    score += 20;
  }
  if (item?.snapshotDate) {
    score += 5;
  }
  return score;
}

function mergeAdminPurchaseReferenceOptions(referenceItemList) {
  const mergedItemMap = new Map();

  (referenceItemList || []).forEach((item) => {
    const mergeKey = normalizeAdminSearchKey(
      item?.productName || item?.quoteName || item?.rawProductName || item?.displayLabel
    );
    if (!mergeKey) {
      return;
    }

    const existingItem = mergedItemMap.get(mergeKey);
    if (!existingItem) {
      mergedItemMap.set(mergeKey, item);
      return;
    }

    const nextPrimaryItem =
      getAdminReferenceMergePriority(item) > getAdminReferenceMergePriority(existingItem)
        ? item
        : existingItem;
    const nextSecondaryItem = nextPrimaryItem === item ? existingItem : item;
    const mergedCategoryName =
      getAdminReferenceCategoryPriority(item?.categoryName) >= getAdminReferenceCategoryPriority(existingItem?.categoryName)
        ? item?.categoryName
        : existingItem?.categoryName;
    const mergedDisplayName = buildAdminReferenceDisplayName(
      nextPrimaryItem?.productName || nextPrimaryItem?.rawProductName || nextPrimaryItem?.quoteName
    );
    const mergedSnapshotUnit = nextPrimaryItem?.snapshotUnit || nextSecondaryItem?.snapshotUnit || '';

    mergedItemMap.set(mergeKey, {
      ...nextSecondaryItem,
      ...nextPrimaryItem,
      categoryName: mergedCategoryName || nextPrimaryItem?.categoryName || nextSecondaryItem?.categoryName || '',
      supportsAutoQuote: Boolean(existingItem?.supportsAutoQuote || item?.supportsAutoQuote),
      productName: nextPrimaryItem?.productName || nextSecondaryItem?.productName || '',
      quoteName: nextPrimaryItem?.quoteName || nextSecondaryItem?.quoteName || '',
      rawProductName: nextPrimaryItem?.rawProductName || nextSecondaryItem?.rawProductName || '',
      quoteItemCode:
        nextPrimaryItem?.quoteItemCode
        || nextPrimaryItem?.itemCode
        || nextSecondaryItem?.quoteItemCode
        || nextSecondaryItem?.itemCode
        || '',
      itemCode: nextPrimaryItem?.itemCode || nextSecondaryItem?.itemCode || '',
      snapshotUnit: mergedSnapshotUnit,
      displayLabel: mergedCategoryName
        ? `${mergedCategoryName} / ${mergedDisplayName}${mergedSnapshotUnit ? ` / ${mergedSnapshotUnit}` : ''}`
        : nextPrimaryItem?.displayLabel || nextSecondaryItem?.displayLabel || mergedDisplayName,
    });
  });

  return Array.from(mergedItemMap.values());
}

function normalizeAdminPurchaseReferenceItems(referenceItems, categories) {
  const availableCategoryNameSet = new Set(
    (categories || []).map((category) => String(category?.categoryName || '').trim()).filter(Boolean)
  );

  const normalizedReferenceItemList = (referenceItems || [])
    .flatMap((item) => {
      const resolvedCategoryName = resolveStableAdminReferenceCategoryName(item);
      const normalizedProductName = normalizeAdminReferenceProductName(item.productName);
      const normalizedDisplayName = buildAdminReferenceDisplayName(item.productName);
      const aliasDefinitionList = ADMIN_REFERENCE_ALIAS_MAP[String(item.itemCode || '').trim()] || [null];

      return aliasDefinitionList.map((aliasDefinition) => {
        const aliasedProductName = aliasDefinition?.productName || normalizedProductName || item.productName;
        const aliasedDisplayName = aliasDefinition?.productName || normalizedDisplayName || item.productName;

        return {
          ...item,
          itemCode: buildAdminReferenceOptionCode(item.itemCode, aliasDefinition?.key),
          quoteItemCode: item.itemCode,
          quoteName: aliasDefinition?.quoteName || normalizedProductName || item.productName,
          rawProductName: item.productName,
          productName: aliasedProductName,
          categoryName: resolvedCategoryName,
          displayLabel: resolvedCategoryName
            ? `${resolvedCategoryName} / ${aliasedDisplayName}${item.snapshotUnit ? ` / ${item.snapshotUnit}` : ''}`
            : item.displayLabel || aliasedDisplayName || item.productName,
          supportsAutoQuote: item.supportsAutoQuote !== false,
        };
      });
    })
    .filter((item) => item.categoryName && availableCategoryNameSet.has(item.categoryName));

  return mergeAdminPurchaseReferenceOptions(normalizedReferenceItemList)
    .sort((leftItem, rightItem) => {
      const leftAutoQuoteRank = leftItem.supportsAutoQuote ? 0 : 1;
      const rightAutoQuoteRank = rightItem.supportsAutoQuote ? 0 : 1;
      if (leftAutoQuoteRank !== rightAutoQuoteRank) {
        return leftAutoQuoteRank - rightAutoQuoteRank;
      }

      const leftSourceRank = leftItem.referenceSource === 'WHOLESALE' ? 0 : 1;
      const rightSourceRank = rightItem.referenceSource === 'WHOLESALE' ? 0 : 1;
      if (leftSourceRank !== rightSourceRank) {
        return leftSourceRank - rightSourceRank;
      }

      return String(leftItem.displayLabel || leftItem.productName || '').localeCompare(
        String(rightItem.displayLabel || rightItem.productName || ''),
        'ko'
      );
    });
}

function parsePricingBasisQuantity(basisUnit) {
  const normalizedBasisUnit = String(basisUnit || '').replace(/\s+/g, '').trim();
  if (!normalizedBasisUnit) {
    return null;
  }

  const matched = normalizedBasisUnit.match(/^([0-9]+(?:\.[0-9]+)?)?([A-Za-z\uAC00-\uD7A3]+)$/);
  if (!matched) {
    return null;
  }

  return resolveUnitAmount(matched[1] || 1, matched[2]);
}

function convertQuantityAmountToDisplayUnit(quantity, displayUnit) {
  if (!quantity) {
    return null;
  }

  const normalizedDisplayUnit = normalizeMeasurementUnit(displayUnit);
  if (!normalizedDisplayUnit) {
    return null;
  }

  if (quantity.type === 'WEIGHT') {
    if (normalizedDisplayUnit === 'kg') {
      return quantity.amount / 1000;
    }
    if (normalizedDisplayUnit === 'g') {
      return quantity.amount;
    }
  }

  if (quantity.type === 'VOLUME') {
    if (normalizedDisplayUnit === 'l') {
      return quantity.amount / 1000;
    }
    if (normalizedDisplayUnit === 'ml') {
      return quantity.amount;
    }
  }

  if (quantity.type === 'COUNT' && COUNT_UNIT_SET.has(normalizedDisplayUnit)) {
    return quantity.amount;
  }

  return null;
}

function floorMoneyToHundred(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return 0;
  }

  return Math.floor(numericValue / 100) * 100;
}

function calculateAutoPackageDefaults(batch, packageQuote, packagedQty) {
  const packagedQtyNumber = Number(packagedQty);
  if (!batch || !Number.isFinite(packagedQtyNumber) || packagedQtyNumber <= 0) {
    return null;
  }

  const totalBatchQuantity = resolveUnitAmount(batch.purchaseQty, batch.purchaseUnit);
  if (!totalBatchQuantity || totalBatchQuantity.amount <= 0) {
    return null;
  }

  const perPackageQuantity = {
    ...totalBatchQuantity,
    amount: totalBatchQuantity.amount / packagedQtyNumber,
  };
  const packagedWeightValue = convertQuantityAmountToDisplayUnit(
    perPackageQuantity,
    batch.purchaseUnit
  );

  let salePrice = null;
  const pricingBasisQuantity = parsePricingBasisQuantity(
    packageQuote?.recommendedPriceBasisUnit ||
      packageQuote?.retailPriceBasisUnit ||
      packageQuote?.priceBasisUnit
  );

  if (
    pricingBasisQuantity &&
    pricingBasisQuantity.type === perPackageQuantity.type &&
    pricingBasisQuantity.amount > 0
  ) {
    const sameWeightRetailPrice =
      Number(packageQuote?.retailComparablePrice || 0) *
      (perPackageQuantity.amount / pricingBasisQuantity.amount);
    const sameWeightRecommendedPrice =
      Number(packageQuote?.recommendedSalePrice || 0) *
      (perPackageQuantity.amount / pricingBasisQuantity.amount);

    if (
      Number.isFinite(sameWeightRetailPrice) &&
      sameWeightRetailPrice > 0 &&
      Number.isFinite(sameWeightRecommendedPrice) &&
      sameWeightRecommendedPrice > 0
    ) {
      salePrice = floorMoneyToHundred(
        (sameWeightRetailPrice + sameWeightRecommendedPrice) / 2
      );
    } else if (Number.isFinite(sameWeightRetailPrice) && sameWeightRetailPrice > 0) {
      salePrice = floorMoneyToHundred(sameWeightRetailPrice);
    } else if (
      Number.isFinite(sameWeightRecommendedPrice) &&
      sameWeightRecommendedPrice > 0
    ) {
      salePrice = floorMoneyToHundred(sameWeightRecommendedPrice);
    }
  }

  return {
    packagedWeight: packagedWeightValue,
    salePrice,
    saleStatus: 'SELLING',
  };
}

function resolveAdminOrderDisplayStatus(order) {
  if (!order) {
    return '';
  }

  if (order.deliveryStatus === 'DELIVERED') {
    return 'DELIVERED';
  }

  if (order.deliveryStatus === 'SHIPPING') {
    return 'SHIPPING';
  }

  return order.orderStatus || order.deliveryStatus || '';
}

function buildProductForm(product) {
  if (!product) {
    return { ...EMPTY_PRODUCT_FORM };
  }

  return {
    productNo: product.productNo,
    categoryNo: String(product.categoryNo || ''),
    productName: product.productName || '',
    origin: product.origin || '',
    unit: product.unit || 'kg',
    packageWeight: String(product.packageWeight ?? 1),
    salePrice: String(product.salePrice ?? 0),
    stockQty: String(product.stockQty ?? 0),
    description: product.description || '',
    isSeasonal: product.isSeasonal || 'N',
    saleStatus: product.saleStatus || 'READY',
  };
}

function buildProductImagePreviews(product) {
  return (product?.images || []).filter((image) => (
    image?.imageNo && (image.imageSize == null || image.imageSize > 0)
  )).map((image, index) => ({
    key: image.imageNo || `${product.productNo}-${index}`,
    imageNo: image.imageNo,
    name: image.imageName || `상품 이미지 ${index + 1}`,
    previewUrl: image.imageNo ? getAdminProductImageUrl(image.imageNo) : '',
    isMain: image.isMain === 'Y',
  }));
}

function revokeProductImagePreviews(previews) {
  (previews || []).forEach((preview) => {
    if (preview?.previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(preview.previewUrl);
    }
  });
}

function validateAdminProductForm(productForm, categories) {
  if (!productForm.productNo) {
    return '상품관리는 기존 상품만 수정할 수 있습니다. 매입/소분에서 먼저 상품을 생성해주세요.';
  }

  if (!productForm.categoryNo) {
    return '\uCE74\uD14C\uACE0\uB9AC\uB97C \uC120\uD0DD\uD574\uC8FC\uC138\uC694.';
  }

  if (!categories.some((category) => String(category.categoryNo) === String(productForm.categoryNo))) {
    return '\uC720\uD6A8\uD55C \uCE74\uD14C\uACE0\uB9AC\uB97C \uB2E4\uC2DC \uC120\uD0DD\uD574\uC8FC\uC138\uC694.';
  }

  if (!String(productForm.productName || '').trim()) {
    return '\uC0C1\uD488\uBA85\uC744 \uC785\uB825\uD574\uC8FC\uC138\uC694.';
  }

  if (!String(productForm.unit || '').trim()) {
    return '\uD310\uB9E4 \uB2E8\uC704\uB97C \uC785\uB825\uD574\uC8FC\uC138\uC694.';
  }

  const packageWeight = Number(productForm.packageWeight);
  if (!Number.isFinite(packageWeight) || packageWeight <= 0) {
    return '\uD3EC\uC7A5 \uC911\uB7C9\uC740 0\uBCF4\uB2E4 \uD070 \uC22B\uC790\uB85C \uC785\uB825\uD574\uC8FC\uC138\uC694.';
  }

  const salePrice = Number(productForm.salePrice);
  if (!Number.isFinite(salePrice) || salePrice < 0) {
    return '\uD310\uB9E4\uAC00\uB294 0 \uC774\uC0C1 \uC22B\uC790\uB85C \uC785\uB825\uD574\uC8FC\uC138\uC694.';
  }

  const stockQty = Number(productForm.stockQty);
  if (!Number.isFinite(stockQty) || stockQty < 0) {
    return '\uC7AC\uACE0 \uC218\uB7C9\uC740 0 \uC774\uC0C1 \uC22B\uC790\uB85C \uC785\uB825\uD574\uC8FC\uC138\uC694.';
  }

  if (!String(productForm.saleStatus || '').trim()) {
    return '\uD310\uB9E4 \uC0C1\uD0DC\uB97C \uC120\uD0DD\uD574\uC8FC\uC138\uC694.';
  }

  return '';
}

function validatePurchaseBatchForm(purchaseForm, categories, imageCount) {
  if (!purchaseForm.categoryNo) {
    return '카테고리를 선택해주세요.';
  }

  if (!categories.some((category) => String(category.categoryNo) === String(purchaseForm.categoryNo))) {
    return '유효한 카테고리를 선택해주세요.';
  }

  if (!String(purchaseForm.referenceItemCode || '').trim()) {
    return '시세 품목을 선택해주세요.';
  }

  if (!String(purchaseForm.purchaseUnit || '').trim()) {
    return '매입 단위를 입력해주세요.';
  }

  const purchaseQty = Number(purchaseForm.purchaseQty);
  if (!Number.isFinite(purchaseQty) || purchaseQty <= 0) {
    return '매입 수량은 0보다 큰 숫자로 입력해주세요.';
  }

  const purchasePrice = Number(purchaseForm.purchasePrice);
  if (!Number.isFinite(purchasePrice) || purchasePrice < 0) {
    return '총 매입가는 0 이상 숫자로 입력해주세요.';
  }

  if (!String(purchaseForm.purchaseDate || '').trim()) {
    return '매입일을 입력해주세요.';
  }

  if (!imageCount) {
    return '매입 이미지는 최소 1장 이상 등록해주세요.';
  }

  return '';
}

function validatePackageForm(selectedBatch, packageForm) {
  if (!selectedBatch) {
    return '소분할 매입 배치를 먼저 선택해주세요.';
  }

  if (!selectedBatch.productNo && !String(packageForm.productNo || '').trim()) {
    return '연결할 상품이 없습니다. 기존 배치는 상품을 한 번 연결해주세요.';
  }

  const packagedQty = Number(packageForm.packagedQty);
  if (!Number.isFinite(packagedQty) || packagedQty <= 0) {
    return '생성 수량은 0보다 큰 숫자로 입력해주세요.';
  }

  const packagedWeight = Number(packageForm.packagedWeight);
  if (!Number.isFinite(packagedWeight) || packagedWeight <= 0) {
    return '포장 중량은 0보다 큰 숫자로 입력해주세요.';
  }

  const salePrice = Number(packageForm.salePrice);
  if (!Number.isFinite(salePrice) || salePrice < 0) {
    return '판매가는 0 이상 숫자로 입력해주세요.';
  }

  if (!String(packageForm.saleStatus || '').trim()) {
    return '판매 상태를 선택해주세요.';
  }

  return '';
}

function getWeekBuckets(orders) {
  const today = new Date();
  const buckets = [];

  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    const key = date.toISOString().slice(0, 10);
    const dayOrders = orders.filter(
      (order) => String(order.orderedAt || '').slice(0, 10) === key
    );

    buckets.push({
      key,
      label: `${date.getMonth() + 1}/${date.getDate()}`,
      count: dayOrders.length,
      amount: dayOrders.reduce(
        (sum, order) => sum + toNumber(order.finalAmount, 0),
        0
      ),
    });
  }

  return buckets;
}

function DashboardPage({
  products,
  orders,
  purchases,
  banners,
  users,
}) {
  const today = new Date();
  const todayKey = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-');
  const todayOrders = orders.filter(
    (order) => String(order.orderedAt || '').slice(0, 10) === todayKey
  );
  const todaySales = todayOrders.reduce(
    (sum, order) => sum + toNumber(order.finalAmount, 0),
    0
  );
  const lowStockProducts = products.filter((product) => toNumber(product.stockQty, 0) <= 10);
  const activeUsers = users.filter((user) => user.status === 'ACTIVE');
  const shippingReadyCount = orders.filter((order) => order.orderStatus === 'PAID').length;
  const pendingPurchaseCount = purchases.filter((purchase) => purchase.status === 'PURCHASED').length;
  const activeBannerCount = banners.filter((banner) => banner.isActive === 'Y').length;
  const recentOrders = [...orders]
    .sort((left, right) => new Date(right.orderedAt || 0) - new Date(left.orderedAt || 0))
    .slice(0, 5);
  const recentPurchases = [...purchases]
    .sort(
      (left, right) =>
        new Date(right.purchaseDate || right.createdAt || 0) -
        new Date(left.purchaseDate || left.createdAt || 0)
    )
    .slice(0, 5);
  const weeklyBuckets = getWeekBuckets(orders);
  const maxAmount = Math.max(...weeklyBuckets.map((bucket) => bucket.amount), 1);
  const chartPoints = weeklyBuckets
    .map((bucket, index) => {
      const x = 40 + index * 84;
      const y = 210 - (bucket.amount / maxAmount) * 150;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <>
      <AdminPageHeader
        title="관리자 대시보드"
        description="주문, 매출, 재고, 매입 현황을 한 번에 확인하는 운영 메인 화면"
        actions={
          <>
            <button type="button" className="admin-action admin-action--line" onClick={() => (window.location.hash = '#/admin/orders')}>
              주문 보기
            </button>
            <button type="button" className="admin-action admin-action--primary" onClick={() => (window.location.hash = '#/admin/products')}>
              상품 관리
            </button>
          </>
        }
      />

      <section className="admin-metrics-grid">
        <AdminMetricCard
          label="오늘 주문 수"
          value={formatAdminCount(todayOrders.length)}
          helper="오늘 생성된 전체 주문"
        />
        <AdminMetricCard
          label="오늘 매출"
          value={formatAdminCurrency(todaySales)}
          helper="주문 기준 합계"
        />
        <AdminMetricCard
          label="재고 부족 상품"
          value={formatAdminCount(lowStockProducts.length, '개')}
          helper="재고 10개 이하 상품"
        />
        <AdminMetricCard
          label="활성 회원"
          value={formatAdminCount(activeUsers.length, '\uBA85')}
          helper="회원 관리 테이블 기준 활성 계정"
        />
      </section>

      <section className="admin-grid admin-grid--3">
        <article className="admin-card admin-card--panel">
          <h2>주간 주문 추이</h2>
          <p className="admin-card__sub">일자별 주문 수와 매출 흐름</p>
          <div className="admin-chart">
            <svg viewBox="0 0 640 260" preserveAspectRatio="none" aria-hidden="true">
              <polyline points={chartPoints} className="admin-chart__line" />
              {weeklyBuckets.map((bucket, index) => {
                const x = 40 + index * 84;
                const y = 210 - (bucket.amount / maxAmount) * 150;
                return (
                  <g key={bucket.key}>
                    <circle cx={x} cy={y} r="5" className="admin-chart__dot" />
                    <text x={x} y="245" textAnchor="middle" className="admin-chart__label">
                      {bucket.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </article>

        <article className="admin-card admin-card--panel">
          <h2>재고 경고</h2>
          <div className="admin-stack">
            {lowStockProducts.slice(0, 4).map((product) => (
              <div key={product.productNo} className="admin-summary-box">
                <strong>{product.productName}</strong>
                <div className="admin-muted">남은 재고 {toNumber(product.stockQty, 0)}개</div>
              </div>
            ))}
            {!lowStockProducts.length ? (
              <AdminEmptyState title="재고 경고 없음" description="현재 기준 임계 재고 상품이 없습니다." />
            ) : null}
          </div>
        </article>

        <article className="admin-card admin-card--panel">
          <h2>오늘 해야 할 일</h2>
          <div className="admin-stack">
            <div className="admin-summary-box">
              <strong>출고 대기</strong>
              <div className="admin-muted">
                {formatAdminCount(
                  shippingReadyCount
                )} 출고 예정
              </div>
            </div>
            <div className="admin-summary-box">
              <strong>매입 검수</strong>
              <div className="admin-muted">
                {formatAdminCount(
                  pendingPurchaseCount
                )} 확인 필요
              </div>
            </div>
            <div className="admin-summary-box">
              <strong>배너 운영</strong>
              <div className="admin-muted">
                현재 노출 배너 {formatAdminCount(
                  activeBannerCount,
                  '개'
                )}
              </div>
            </div>
          </div>
        </article>
      </section>
      <section className="admin-grid admin-grid--2">
        <article className="admin-card admin-card--panel">
          <div className="admin-section-line">
            <h2>최근 주문</h2>
            <button type="button" className="admin-action admin-action--soft" onClick={() => (window.location.hash = '#/admin/orders')}>
              전체 보기
            </button>
          </div>
          <table className="admin-table">
            <thead>
              <tr>
                <th>주문번호</th>
                <th>고객</th>
                <th>상품</th>
                <th>금액</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => (
                <tr key={order.orderNo}>
                  <td>{order.orderId}</td>
                  <td>{order.recipientName}</td>
                  <td>{order.displayProductName}</td>
                  <td>{formatAdminCurrency(order.finalAmount)}</td>
                  <td><AdminStatusBadge status={resolveAdminOrderDisplayStatus(order)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>

        <article className="admin-card admin-card--panel">
          <div className="admin-section-line">
            <h2>매입 / 소분 현황</h2>
            <button type="button" className="admin-action admin-action--soft" onClick={() => (window.location.hash = '#/admin/purchase')}>
              작업 보기
            </button>
          </div>
          <table className="admin-table">
            <thead>
              <tr>
                <th>배치</th>
                <th>품목</th>
                <th>수량</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {recentPurchases.map((purchase) => (
                <tr key={purchase.batchNo}>
                  <td>{purchase.batchNo}</td>
                  <td>{purchase.productName}</td>
                  <td>{purchase.purchaseQty}{purchase.purchaseUnit}</td>
                  <td><AdminStatusBadge status={purchase.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      </section>
    </>
  );
}

// eslint-disable-next-line no-unused-vars
function LegacyProductsPage({
  categories,
  products,
  selectedProductNo,
  productFilter,
  productForm,
  productImagePreviews,
  onSelectProduct,
  onProductFilterChange,
  onProductFormChange,
  onProductImagesChange,
  onClearProductImages,
  onResetProductForm,
  onRetireProduct,
  onSaveProduct,
  submitting,
}) {
  const filteredProducts = products.filter((product) => {
    if (productFilter === 'ALL') {
      return true;
    }
    if (productFilter === 'LOW_STOCK') {
      return toNumber(product.stockQty, 0) <= 10;
    }
    if (productFilter === 'SEASONAL') {
      return product.isSeasonal === 'Y';
    }
    return product.saleStatus === productFilter;
  });

  return (
    <>
      <AdminPageHeader
        title="상품 관리"
        description="상품 등록, 수정, 재고 현황을 관리하는 화면"
        actions={
          <>
            <button type="button" className="admin-action admin-action--line" onClick={onClearProductImages}>
              엑셀 업로드
            </button>
            <button type="button" className="admin-action admin-action--primary" onClick={onResetProductForm}>
              상품 등록
            </button>
          </>
        }
      />

      <div className="admin-filter-row">
        {[
          ['ALL', '전체'],
          ['SELLING', '판매중'],
          ['STOP', '판매중지'],
          ['LOW_STOCK', '재고부족'],
          ['SEASONAL', '제철상품'],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={`admin-filter-chip ${productFilter === value ? 'is-active' : ''}`}
            onClick={() => onProductFilterChange(value)}
          >
            {label}
          </button>
        ))}
      </div>
      <section className="admin-grid admin-grid--2">
        <article className="admin-card admin-card--panel">
          <h2>상품 목록</h2>
          <table className="admin-table admin-table--clickable">
            <thead>
              <tr>
                <th>상품</th>
                <th>카테고리</th>
                <th>판매가</th>
                <th>재고</th>
                <th>상태</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr
                  key={product.productNo}
                  className={product.productNo === selectedProductNo ? 'is-selected' : ''}
                  onClick={() => onSelectProduct(product)}
                >
                  <td>{product.productName}</td>
                  <td>{product.categoryName}</td>
                  <td>{formatAdminCurrency(product.salePrice)}</td>
                  <td>{formatAdminCount(product.stockQty, '개')}</td>
                  <td><AdminStatusBadge status={product.saleStatus} /></td>
                  <td className="admin-table__actions">
                    <button
                      type="button"
                      className="admin-action admin-action--danger"
                      onClick={(event) => {
                        event.stopPropagation();
                        onRetireProduct(product);
                      }}
                      disabled={submitting}
                    >
                      영구삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>

        <article className="admin-card admin-card--panel">
          <h2>상품 등록 / 수정</h2>
          <div className="admin-form-grid">
            <label>
              <span>상품명</span>
              <input name="productName" value={productForm.productName} onChange={onProductFormChange} />
            </label>
            <label>
              <span>카테고리</span>
              <select name="categoryNo" value={productForm.categoryNo} onChange={onProductFormChange}>
                <option value="">선택</option>
                {categories.map((category) => (
                  <option key={category.categoryNo} value={category.categoryNo}>
                    {category.categoryName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>판매가</span>
              <input name="salePrice" value={productForm.salePrice} onChange={onProductFormChange} />
            </label>
            <label>
              <span>재고 수량</span>
              <input name="stockQty" value={productForm.stockQty} onChange={onProductFormChange} />
            </label>
            <label>
              <span>원산지</span>
              <input name="origin" value={productForm.origin} onChange={onProductFormChange} />
            </label>
            <label>
              <span>단위</span>
              <input name="unit" value={productForm.unit} onChange={onProductFormChange} />
            </label>
            <label>
              <span>포장 중량</span>
              <input name="packageWeight" value={productForm.packageWeight} onChange={onProductFormChange} />
            </label>
            <label>
              <span>판매 상태</span>
              <select name="saleStatus" value={productForm.saleStatus} onChange={onProductFormChange}>
                <option value="READY">준비</option>
                <option value="SELLING">판매중</option>
                <option value="SOLD_OUT">품절</option>
                <option value="STOP">판매중지</option>
              </select>
            </label>
            <label>
              <span>제철 상품</span>
              <select name="isSeasonal" value={productForm.isSeasonal} onChange={onProductFormChange}>
                <option value="N">일반</option>
                <option value="Y">제철</option>
              </select>
            </label>
          </div>
          <label className="admin-form-field admin-form-field--full">
            <span>상품 설명</span>
            <textarea name="description" value={productForm.description} onChange={onProductFormChange} />
          </label>
          <div className="admin-form-field admin-form-field--full">
            <span>상품 이미지</span>
            <label className="admin-file-upload">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={onProductImagesChange}
              />
              <strong>이미지 선택</strong>
              <small>최소 1장 필수 · 여러 장 업로드 가능</small>
            </label>
            <div className="admin-file-upload__hint">
              권장 사이즈: 1200 x 1200px 이상 / 정사각형 비율 / JPG, PNG, WEBP
            </div>
            <div className="admin-page-actions">
              <button type="button" className="admin-action admin-action--line" onClick={onClearProductImages}>
                선택 이미지 초기화
              </button>
            </div>
            {productImagePreviews.length ? (
              <div className="admin-image-preview-grid">
                {productImagePreviews.map((image, index) => (
                  <article className="admin-image-preview" key={image.key || image.imageNo || index}>
                    <div className="admin-image-preview__thumb">
                      <img
                        src={image.previewUrl}
                        alt={image.name || `상품 이미지 ${index + 1}`}
                      />
                    </div>
                    <div className="admin-image-preview__meta">
                      <strong>{image.name || `상품 이미지 ${index + 1}`}</strong>
                      <span>{image.isMain ? '대표 이미지' : `추가 이미지 ${index + 1}`}</span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="admin-image-empty">
                등록된 이미지가 없습니다. 상품 이미지는 최소 1장 이상 필요합니다.
              </div>
            )}
          </div>
          <div className="admin-page-actions admin-page-actions--end">
            <button type="button" className="admin-action admin-action--line" disabled>
              이미지 업로드
            </button>
            <button type="button" className="admin-action admin-action--soft" onClick={onResetProductForm}>
              초기화
            </button>
            <button type="button" className="admin-action admin-action--primary" onClick={onSaveProduct} disabled={submitting}>
              {submitting ? '저장 중...' : '저장'}
            </button>
          </div>
        </article>
      </section>
    </>
  );
}

function OrdersPage({
  orders,
  selectedOrderNo,
  selectedOrderDetail,
  orderFilter,
  trackingNo,
  onOrderFilterChange,
  onSelectOrder,
  onTrackingChange,
  onDeleteOrder,
  onUpdateOrder,
  updating,
}) {
  const filteredOrders = orders.filter((order) => {
    if (orderFilter === 'ALL') {
      return true;
    }
    return resolveAdminOrderDisplayStatus(order) === orderFilter;
  });
  const canDeleteOrder = Boolean(
    selectedOrderDetail
      && selectedOrderDetail.orderStatus === 'COMPLETED'
      && selectedOrderDetail.deliveryStatus === 'DELIVERED'
  );

  return (
    <>
      <AdminPageHeader
        title="주문 관리"
        description="주문 목록, 상세 정보, 배송 상태를 관리하는 화면"
        actions={
          <>
            <button type="button" className="admin-action admin-action--line" disabled>
              송장 업로드
            </button>
            <button
              type="button"
              className="admin-action admin-action--primary"
              onClick={() => onUpdateOrder({ orderStatus: 'SHIPPING' })}
              disabled={!selectedOrderDetail || updating}
            >
              출고 처리
            </button>
          </>
        }
      />

      <div className="admin-filter-row">
        {[
          ['ALL', '전체'],
          ['PAID', '결제완료'],
          ['SHIPPING', '배송중'],
          ['DELIVERED', '배송완료'],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={`admin-filter-chip ${orderFilter === value ? 'is-active' : ''}`}
            onClick={() => onOrderFilterChange(value)}
          >
            {label}
          </button>
        ))}
      </div>

      <section className="admin-grid admin-grid--2">
        <article className="admin-card admin-card--panel">
          <h2>주문 목록</h2>
          <table className="admin-table admin-table--clickable admin-table--users">
            <thead>
              <tr>
                <th>주문번호</th>
                <th>고객</th>
                <th>주문일</th>
                <th>결제금액</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr
                  key={order.orderNo}
                  className={order.orderNo === selectedOrderNo ? 'is-selected' : ''}
                  onClick={() => onSelectOrder(order.orderNo)}
                >
                  <td>{order.orderId}</td>
                  <td>{order.recipientName}</td>
                  <td>{formatAdminDate(order.orderedAt)}</td>
                  <td>{formatAdminCurrency(order.finalAmount)}</td>
                  <td><AdminStatusBadge status={resolveAdminOrderDisplayStatus(order)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>

        <article className="admin-card admin-card--panel">
          <h2>주문 상세</h2>
          {!selectedOrderDetail ? (
            <AdminEmptyState title="주문을 선택해주세요." description="좌측 주문 목록에서 상세를 확인할 주문을 고를 수 있습니다." />
          ) : (
            <div className="admin-stack">
              <div className="admin-summary-box">
                <strong>주문번호</strong>
                <div className="admin-muted">{selectedOrderDetail.orderId}</div>
              </div>
              <div className="admin-summary-box">
                <strong>고객 정보</strong>
                <div className="admin-muted">
                  {selectedOrderDetail.recipientName} / {selectedOrderDetail.recipientPhone}
                </div>
                <div className="admin-muted">
                  {selectedOrderDetail.address1} {selectedOrderDetail.address2}
                </div>
              </div>
              <div className="admin-summary-box">
                <strong>주문 상품</strong>
                <div className="admin-detail-list">
                  {(selectedOrderDetail.items || []).map((item) => (
                    <div key={item.orderItemNo}>
                      {item.productName} x {item.quantity}
                    </div>
                  ))}
                </div>
              </div>
              <div className="admin-summary-box">
                <strong>배송 상태 변경</strong>
                <div className="admin-page-actions">
                  <AdminStatusBadge status={resolveAdminOrderDisplayStatus(selectedOrderDetail)} />
                  {canDeleteOrder ? (
                    <button
                      type="button"
                      className="admin-action admin-action--danger"
                      onClick={() => onDeleteOrder(selectedOrderDetail)}
                      disabled={updating}
                    >
                      정보 제거
                    </button>
                  ) : null}
                  <button type="button" className="admin-action admin-action--soft" onClick={() => onUpdateOrder({ orderStatus: 'SHIPPING' })} disabled={updating}>
                    배송중
                  </button>
                  <button type="button" className="admin-action admin-action--primary" onClick={() => onUpdateOrder({ orderStatus: 'COMPLETED' })} disabled={updating}>
                    배송완료
                  </button>
                </div>
              </div>
              <div className="admin-summary-box">
                <strong>송장 정보</strong>
                <div className="admin-inline-form">
                  <input value={trackingNo} onChange={onTrackingChange} placeholder="송장번호 입력" />
                  <button type="button" className="admin-action admin-action--line" onClick={() => onUpdateOrder({ trackingNo })} disabled={updating}>
                    저장
                  </button>
                </div>
              </div>
            </div>
          )}
        </article>
      </section>
    </>
  );
}

function UsersPage({
  users,
  selectedUserNo,
  userFilter,
  onUserFilterChange,
  onSelectUser,
  onUpdateUserStatus,
  onDeleteUser,
  updating,
}) {
  const rankedUsers = [...users].sort((left, right) => (
    toNumber(right.totalPurchaseAmount, 0) - toNumber(left.totalPurchaseAmount, 0)
    || toNumber(right.totalOrderCount, 0) - toNumber(left.totalOrderCount, 0)
    || toNumber(right.userNo, 0) - toNumber(left.userNo, 0)
  ));
  const filteredUsers = userFilter === 'TOP'
    ? rankedUsers.slice(0, 5)
    : users.filter((user) => {
      if (userFilter === 'ALL') {
        return true;
      }
      return user.status === userFilter;
    });
  const selectedUser = users.find((user) => user.userNo === selectedUserNo) || null;

  return (
    <>
      <AdminPageHeader
        title="회원 관리"
        actions={
          <button type="button" className="admin-action admin-action--line" disabled>
            엑셀 다운로드
          </button>
        }
      />

      <div className="admin-filter-row">
        {[
          ['ALL', '전체 회원'],
          ['ACTIVE', '활성'],
          ['BLOCKED', '차단'],
          ['WITHDRAWN', '탈퇴'],
          ['TOP', '구매 상위'],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={`admin-filter-chip ${userFilter === value ? 'is-active' : ''}`}
            onClick={() => onUserFilterChange(value)}
          >
            {label}
          </button>
        ))}
      </div>

      <section className="admin-grid admin-grid--users">
        <article className="admin-card admin-card--panel">
          <h2>회원 목록</h2>
          <div className="admin-table-wrap">
            <table className="admin-table admin-table--clickable admin-table--users">
              <thead>
                <tr>
                  <th>회원</th>
                  <th>가입일</th>
                  <th>주문 수</th>
                  <th>누적 구매</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr
                    key={user.userNo}
                    className={user.userNo === selectedUserNo ? 'is-selected' : ''}
                    onClick={() => onSelectUser(user.userNo)}
                  >
                    <td>
                      <div className="admin-user-cell">
                        <strong className="admin-user-primary">{user.nickname}</strong>
                        <span className="admin-user-sub">{user.email}</span>
                      </div>
                    </td>
                    <td className="admin-date-cell">{renderAdminDateCell(user.createdAt)}</td>
                    <td className="admin-count-cell">{formatAdminCount(user.totalOrderCount)}</td>
                    <td>{formatAdminCurrency(user.totalPurchaseAmount)}</td>
                    <td className="admin-table__actions">
                      <div className="admin-user-actions">
                        <AdminStatusBadge status={user.status} />
                        <button
                          type="button"
                          className="admin-action admin-action--danger admin-action--tiny"
                          onClick={(event) => {
                            event.stopPropagation();
                            onDeleteUser(user);
                          }}
                          disabled={updating}
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="admin-card admin-card--panel">
          <h2>회원 상세 / 상태 관리</h2>
          {!selectedUser ? (
            <AdminEmptyState title="회원을 선택해주세요." description="좌측 목록에서 확인할 회원을 고를 수 있습니다." />
          ) : (
            <div className="admin-stack">
              <div className="admin-summary-box">
                <strong>기본 정보</strong>
                <div className="admin-muted">
                  {selectedUser.nickname} / {selectedUser.email} / {selectedUser.phone}
                </div>
              </div>
              <div className="admin-summary-box">
                <strong>구매 통계</strong>
                <div className="admin-muted">
                  주문 {formatAdminCount(selectedUser.totalOrderCount, '회')} / 누적 구매 {formatAdminCurrency(selectedUser.totalPurchaseAmount)} / 누적 절약 {formatAdminCurrency(selectedUser.totalSavedAmount)}
                </div>
              </div>
              <div className="admin-summary-box">
                <strong>상태 변경</strong>
                <div className="admin-page-actions">
                  <button type="button" className="admin-action admin-action--soft" onClick={() => onUpdateUserStatus(selectedUser.userNo, 'ACTIVE')} disabled={updating}>
                    활성
                  </button>
                  <button type="button" className="admin-action admin-action--line" onClick={() => onUpdateUserStatus(selectedUser.userNo, 'WITHDRAWN')} disabled={updating}>
                    탈퇴
                  </button>
                  <button type="button" className="admin-action admin-action--danger" onClick={() => onUpdateUserStatus(selectedUser.userNo, 'BLOCKED')} disabled={updating}>
                    차단
                  </button>
                </div>
              </div>
              <div className="admin-summary-box">
                <strong>기본 배송지</strong>
                <div className="admin-muted">{selectedUser.defaultAddress || '기본 배송지 없음'}</div>
              </div>
            </div>
          )}
        </article>
      </section>
    </>
  );
}

function renderAdminDateCell(value) {
  const { date, time } = formatAdminDateParts(value);

  return (
    <div className="admin-date-stack">
      <span>{date}</span>
      {time ? <span>{time}</span> : null}
    </div>
  );
}

// eslint-disable-next-line no-unused-vars
function LegacyPurchasePage({
  products,
  purchases,
  packageHistories,
  selectedBatchNo,
  purchaseForm,
  packageForm,
  onSelectBatch,
  onPurchaseFormChange,
  onPackageFormChange,
  onCreatePurchase,
  onCreatePackageHistory,
  onDeletePurchaseBatch,
  submittingPurchase,
  submittingPackage,
}) {
  const selectedBatch = purchases.find((purchase) => purchase.batchNo === selectedBatchNo) || null;

  return (
    <>
      <AdminPageHeader
        title="매입 / 소분 관리"
        description="원물 매입과 소분 작업, 재고 반영을 관리하는 화면"
      />

      <section className="admin-grid admin-grid--split">
        <article className="admin-card admin-card--panel">
          <h2>매입 등록</h2>
          <div className="admin-form-grid">
            <label><span>품목명</span><input name="productName" value={purchaseForm.productName} onChange={onPurchaseFormChange} /></label>
            <label><span>공급처</span><input name="supplierName" value={purchaseForm.supplierName} onChange={onPurchaseFormChange} /></label>
            <label><span>매입 수량</span><input name="purchaseQty" value={purchaseForm.purchaseQty} onChange={onPurchaseFormChange} /></label>
            <label><span>단위</span><input name="purchaseUnit" value={purchaseForm.purchaseUnit} onChange={onPurchaseFormChange} /></label>
            <label><span>총 매입가</span><input name="purchasePrice" value={purchaseForm.purchasePrice} onChange={onPurchaseFormChange} /></label>
            <label><span>매입일</span><input type="date" name="purchaseDate" value={purchaseForm.purchaseDate} onChange={onPurchaseFormChange} /></label>
            <label><span>원산지</span><input name="origin" value={purchaseForm.origin} onChange={onPurchaseFormChange} /></label>
          </div>
          <div className="admin-page-actions admin-page-actions--end">
            <button type="button" className="admin-action admin-action--primary" onClick={onCreatePurchase} disabled={submittingPurchase}>
              {submittingPurchase ? '저장 중...' : '매입 등록'}
            </button>
          </div>
        </article>

        <article className="admin-card admin-card--panel">
          <h2>소분 작업</h2>
          <div className="admin-summary-box">
            <strong>선택 배치</strong>
            <div className="admin-muted">
              {selectedBatch
                ? `${selectedBatch.batchNo} / ${selectedBatch.productName} / ${selectedBatch.purchaseQty}${selectedBatch.purchaseUnit}`
                : '좌측 이력 테이블에서 배치를 선택해주세요.'}
            </div>
          </div>
          <div className="admin-form-grid admin-form-grid--spaced">
            <label>
              <span>소분 상품</span>
              <select name="productNo" value={packageForm.productNo} onChange={onPackageFormChange}>
                <option value="">선택</option>
                {products.map((product) => (
                  <option key={product.productNo} value={product.productNo}>
                    {product.productName}
                  </option>
                ))}
              </select>
            </label>
            <label><span>생성 수량</span><input name="packagedQty" value={packageForm.packagedQty} onChange={onPackageFormChange} /></label>
            <label><span>1개당 중량</span><input name="packagedWeight" value={packageForm.packagedWeight} onChange={onPackageFormChange} /></label>
            <label className="admin-form-field admin-form-field--full"><span>메모</span><textarea name="note" value={packageForm.note} onChange={onPackageFormChange} /></label>
          </div>
          <div className="admin-page-actions admin-page-actions--end">
            <button type="button" className="admin-action admin-action--primary" onClick={onCreatePackageHistory} disabled={!selectedBatch || submittingPackage}>
              {submittingPackage ? '처리 중...' : '소분 실행'}
            </button>
          </div>
        </article>
      </section>

      <section className="admin-card admin-card--panel">
        <h2>매입 / 소분 이력</h2>
        <table className="admin-table admin-table--clickable">
          <thead>
            <tr>
              <th>배치번호</th>
              <th>품목</th>
              <th>매입수량</th>
              <th>매입가</th>
              <th>상태</th>
              <th>최근 소분</th>
              <th>관리</th>
              <th>관리</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {purchases.map((purchase) => {
              const latestPackage = packageHistories.find((history) => history.batchNo === purchase.batchNo);
              return (
                <tr
                  key={purchase.batchNo}
                  className={purchase.batchNo === selectedBatchNo ? 'is-selected' : ''}
                  onClick={() => onSelectBatch(purchase.batchNo)}
                >
                  <td>{purchase.batchNo}</td>
                  <td>{purchase.productName}</td>
                  <td>{purchase.purchaseQty}{purchase.purchaseUnit}</td>
                  <td>{formatAdminCurrency(purchase.purchasePrice)}</td>
                  <td><AdminStatusBadge status={purchase.status} /></td>
                  <td>{latestPackage ? formatAdminDate(latestPackage.packagedAt) : '-'}</td>
                  <td className="admin-table__actions">
                    <button
                      type="button"
                      className="admin-action admin-action--danger"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDeletePurchaseBatch(purchase);
                      }}
                      disabled={submittingPurchase || submittingPackage}
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </>
  );
}

function ContentPage({
  banners,
  recipeMappings,
  syncingRecipes,
  onSyncRecipes,
}) {
  return (
    <>
      <AdminPageHeader
        title="배너 / 레시피 관리"
        description="메인 배너 노출과 레시피 매핑, 콘텐츠 노출 순서를 관리하는 화면"
        actions={
          <>
            <button type="button" className="admin-action admin-action--line" disabled>
              배너 업로드 준비중
            </button>
            <button type="button" className="admin-action admin-action--primary" onClick={onSyncRecipes} disabled={syncingRecipes}>
              {syncingRecipes ? '동기화 중...' : '레시피 동기화'}
            </button>
          </>
        }
      />

      <section className="admin-grid admin-grid--2">
        <article className="admin-card admin-card--panel">
          <h2>메인 배너 관리</h2>
          <table className="admin-table">
            <thead>
              <tr>
                <th>배너</th>
                <th>제목</th>
                <th>링크</th>
                <th>상태</th>
                <th>순서</th>
              </tr>
            </thead>
            <tbody>
              {banners.map((banner) => (
                <tr key={banner.bannerNo}>
                  <td>
                    <div className="admin-banner-thumb">
                      <img src={getAdminBannerImageUrl(banner.bannerNo)} alt={banner.title} />
                    </div>
                  </td>
                  <td>{banner.title}</td>
                  <td>{banner.linkUrl || '-'}</td>
                  <td><AdminStatusBadge status={banner.isActive} /></td>
                  <td>{banner.sortOrder}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>

        <article className="admin-card admin-card--panel">
          <h2>레시피 매핑 관리</h2>
          <table className="admin-table">
            <thead>
              <tr>
                <th>레시피</th>
                <th>연결 상품</th>
                <th>연관도</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {recipeMappings.map((mapping) => (
                <tr key={mapping.mapNo}>
                  <td>{mapping.recipeName}</td>
                  <td>{mapping.productName}</td>
                  <td>{Math.round(toNumber(mapping.matchScore, 0))}</td>
                  <td><AdminStatusBadge status="Y" /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="admin-summary-box admin-summary-box--note">
            <strong>이미지 저장 기준</strong>
            <div className="admin-muted">
              PRODUCT_IMAGE, REVIEW_IMAGE, MAIN_BANNER는 BLOB 저장이며 RECIPE와 RECIPE_STEP은 외부 URL을 사용합니다.
            </div>
          </div>
        </article>
      </section>
    </>
  );
}

function ProductsPage({
  categories,
  products,
  selectedProductNo,
  productFilter,
  productForm,
  productImagePreviews,
  onSelectProduct,
  onProductFilterChange,
  onProductFormChange,
  onResetProductForm,
  onRetireProduct,
  onSaveProduct,
  submitting,
}) {
  const filteredProducts = products.filter((product) => {
    if (productFilter === 'ALL') {
      return true;
    }
    if (productFilter === 'LOW_STOCK') {
      return toNumber(product.stockQty, 0) <= 10;
    }
    if (productFilter === 'SEASONAL') {
      return product.isSeasonal === 'Y';
    }
    return product.saleStatus === productFilter;
  });

  return (
    <>
      <AdminPageHeader
        title="상품 관리"
        description="매입/소분에서 생성된 상품을 수정하거나 삭제하는 화면"
        actions={
          <>
            <button type="button" className="admin-action admin-action--line" onClick={onResetProductForm}>
              선택 상품 다시 불러오기
            </button>
          </>
        }
      />

      <div className="admin-filter-row">
        {[
          ['ALL', '전체'],
          ['SELLING', '판매중'],
          ['STOP', '판매중지'],
          ['LOW_STOCK', '재고부족'],
          ['SEASONAL', '제철상품'],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={`admin-filter-chip ${productFilter === value ? 'is-active' : ''}`}
            onClick={() => onProductFilterChange(value)}
          >
            {label}
          </button>
        ))}
      </div>
      <section className="admin-grid admin-grid--2">
        <article className="admin-card admin-card--panel">
          <h2>상품 목록</h2>
          <table className="admin-table admin-table--clickable">
            <thead>
              <tr>
                <th>상품</th>
                <th>카테고리</th>
                <th>판매가</th>
                <th>재고</th>
                <th>상태</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr
                  key={product.productNo}
                  className={product.productNo === selectedProductNo ? 'is-selected' : ''}
                  onClick={() => onSelectProduct(product)}
                >
                  <td>{product.productName}</td>
                  <td>{product.categoryName}</td>
                  <td>{formatAdminCurrency(product.salePrice)}</td>
                  <td>{formatAdminCount(product.stockQty, '개')}</td>
                  <td><AdminStatusBadge status={product.saleStatus} /></td>
                  <td className="admin-table__actions">
                    <button
                      type="button"
                      className="admin-action admin-action--danger"
                      onClick={(event) => {
                        event.stopPropagation();
                        onRetireProduct(product);
                      }}
                      disabled={submitting}
                    >
                      영구삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>

        <article className="admin-card admin-card--panel">
          <h2>상품 수정 / 삭제</h2>
          <div className="admin-form-grid">
            <label>
              <span>상품명</span>
              <input name="productName" value={productForm.productName} onChange={onProductFormChange} />
            </label>
            <label>
              <span>카테고리</span>
              <select name="categoryNo" value={productForm.categoryNo} onChange={onProductFormChange}>
                <option value="">선택</option>
                {categories.map((category) => (
                  <option key={category.categoryNo} value={category.categoryNo}>
                    {category.categoryName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>판매가</span>
              <input name="salePrice" value={productForm.salePrice} onChange={onProductFormChange} />
            </label>
            <label>
              <span>재고 수량</span>
              <input name="stockQty" value={productForm.stockQty} onChange={onProductFormChange} />
            </label>
            <label>
              <span>원산지</span>
              <input name="origin" value={productForm.origin} onChange={onProductFormChange} />
            </label>
            <label>
              <span>단위</span>
              <input name="unit" value={productForm.unit} onChange={onProductFormChange} />
            </label>
            <label>
              <span>포장 중량</span>
              <input name="packageWeight" value={productForm.packageWeight} onChange={onProductFormChange} />
            </label>
            <label>
              <span>판매 상태</span>
              <select name="saleStatus" value={productForm.saleStatus} onChange={onProductFormChange}>
                <option value="READY">준비중</option>
                <option value="SELLING">판매중</option>
                <option value="SOLD_OUT">품절</option>
                <option value="STOP">판매중지</option>
              </select>
            </label>
            <label>
              <span>제철 상품</span>
              <select name="isSeasonal" value={productForm.isSeasonal} onChange={onProductFormChange}>
                <option value="N">일반</option>
                <option value="Y">제철</option>
              </select>
            </label>
          </div>
          <label className="admin-form-field admin-form-field--full">
            <span>상품 설명</span>
            <textarea name="description" value={productForm.description} onChange={onProductFormChange} />
          </label>
          <div className="admin-form-field admin-form-field--full">
            <span>등록된 상품 이미지</span>
            <div className="admin-file-upload__hint">
              이미지는 매입 단계에서 등록됩니다. 여기서는 연결된 이미지를 확인만 할 수 있습니다.
            </div>
            {productImagePreviews.length ? (
              <div className="admin-image-preview-grid">
                {productImagePreviews.map((image, index) => (
                  <article className="admin-image-preview" key={image.key || image.imageNo || index}>
                    <div className="admin-image-preview__thumb">
                      <img
                        src={image.previewUrl}
                        alt={image.name || `상품 이미지 ${index + 1}`}
                      />
                    </div>
                    <div className="admin-image-preview__meta">
                      <strong>{image.name || `상품 이미지 ${index + 1}`}</strong>
                      <span>{image.isMain ? '대표 이미지' : `추가 이미지 ${index + 1}`}</span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="admin-image-empty">
                아직 연결된 이미지가 없습니다. 이미지는 매입 등록 단계에서 추가해주세요.
              </div>
            )}
          </div>
          <div className="admin-page-actions">
            <button type="button" className="admin-action admin-action--soft" onClick={onResetProductForm}>
              되돌리기
            </button>
            <button type="button" className="admin-action admin-action--primary" onClick={onSaveProduct} disabled={submitting}>
              {submitting ? '저장 중...' : '수정 저장'}
            </button>
          </div>
        </article>
      </section>
    </>
  );
}

function PurchasePage({
  categories,
  products,
  purchases,
  packageHistories,
  purchaseReferenceItems,
  selectedBatchNo,
  purchaseForm,
  packageForm,
  purchaseQuote,
  purchaseImagePreviews,
  onSelectBatch,
  onPurchaseReferenceChange,
  onPurchaseFormChange,
  onPackageFormChange,
  onAutofillPurchaseQuote,
  onPurchaseImagesChange,
  onClearPurchaseImages,
  onCreatePurchase,
  onCreatePackageHistory,
  onDeletePurchaseBatch,
  quotingPurchase,
  submittingPurchase,
  submittingPackage,
}) {
  const selectedBatch = purchases.find((purchase) => purchase.batchNo === selectedBatchNo) || null;
  const selectedBatchProduct = products.find((product) => product.productNo === selectedBatch?.productNo) || null;
  const linkedProductPreviews = selectedBatchProduct ? buildProductImagePreviews(selectedBatchProduct) : [];
  const needsLegacyProductLink = Boolean(selectedBatch && !selectedBatch.productNo);
  const selectedPurchaseCategoryName =
    categories.find((category) => String(category.categoryNo) === String(purchaseForm.categoryNo))
      ?.categoryName || '';
  const filteredPurchaseReferenceItems = selectedPurchaseCategoryName
    ? purchaseReferenceItems.filter((item) => item.categoryName === selectedPurchaseCategoryName)
    : [];

  return (
    <>
      <AdminPageHeader
        title="매입 / 소분 관리"
        description="매입 단계에서 이미지까지 등록하고, 소분 단계에서 판매가를 확정해 판매 상품으로 넘깁니다."
      />

      <section className="admin-grid admin-grid--split">
        <article className="admin-card admin-card--panel">
          <h2>매입 등록</h2>
          <div className="admin-form-grid">
            <label>
              <span>시세 품목</span>
              <select
                name="referenceItemCode"
                value={purchaseForm.referenceItemCode}
                onChange={onPurchaseReferenceChange}
                disabled={!selectedPurchaseCategoryName}
              >
                <option value="">선택</option>
                {filteredPurchaseReferenceItems.map((item) => (
                  <option key={item.itemCode} value={item.itemCode}>
                    {item.displayLabel || item.productName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>카테고리</span>
              <select name="categoryNo" value={purchaseForm.categoryNo} onChange={onPurchaseFormChange}>
                <option value="">선택</option>
                {categories.map((category) => (
                  <option key={category.categoryNo} value={category.categoryNo}>
                    {category.categoryName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>품목명</span>
              <input
                name="productName"
                value={purchaseForm.productName}
                readOnly
                placeholder="시세 품목을 선택하면 자동 입력됩니다."
              />
            </label>
            <label><span>공급처</span><input name="supplierName" value={purchaseForm.supplierName} onChange={onPurchaseFormChange} /></label>
            <label><span>매입 수량</span><input name="purchaseQty" value={purchaseForm.purchaseQty} onChange={onPurchaseFormChange} /></label>
            <label><span>단위</span><input name="purchaseUnit" value={purchaseForm.purchaseUnit} onChange={onPurchaseFormChange} /></label>
            <label><span>총 매입가</span><input name="purchasePrice" value={purchaseForm.purchasePrice} onChange={onPurchaseFormChange} /></label>
            <label><span>매입일</span><input type="date" name="purchaseDate" value={purchaseForm.purchaseDate} onChange={onPurchaseFormChange} /></label>
            <label><span>원산지</span><input name="origin" value={purchaseForm.origin} onChange={onPurchaseFormChange} /></label>
          </div>
          <div className="admin-page-actions admin-page-actions--spaced">
            <span className="admin-muted">
              최신 도매 시세 기준으로 매입 단위, 매입 수량, 총 매입가를 자동 채웁니다.
            </span>
            <button
              type="button"
              className="admin-action admin-action--line"
              onMouseDown={(event) => event.preventDefault()}
              onClick={onAutofillPurchaseQuote}
              disabled={
                quotingPurchase
                || !String(purchaseForm.referenceItemCode || '').trim()
              }
            >
              {quotingPurchase ? '시세 조회 중...' : '시세로 자동 채움'}
            </button>
          </div>
          {purchaseQuote ? (
            <div className="admin-summary-box admin-summary-box--note">
              <strong>시세 자동 채움 기준</strong>
              <div className="admin-muted">
                {purchaseQuote.matchedItemName} · 기준일 {purchaseQuote.snapshotDate} · 계산 기준{' '}
                {purchaseQuote.priceBasisUnit || '1kg'}
              </div>
              {hasAdminValue(purchaseQuote.wholesaleSourcePrice) ? (
                <div className="admin-muted">
                  도매 원시세 {formatAdminCurrency(purchaseQuote.wholesaleSourcePrice)} ({purchaseQuote.wholesaleSourceUnit || purchaseQuote.snapshotUnit} 기준)
                  {hasAdminValue(purchaseQuote.wholesaleAvgPrice) ? (
                    <> · {purchaseQuote.wholesalePriceBasisUnit || purchaseQuote.priceBasisUnit || '1kg'} 환산 {formatAdminCurrency(purchaseQuote.wholesaleAvgPrice)}</>
                  ) : null}
                </div>
              ) : null}
              <div className="admin-muted">
                기준 단위 {purchaseQuote.snapshotUnit} · 자동 입력 {purchaseQuote.purchaseQty}
                {purchaseQuote.purchaseUnit}
                {hasAdminValue(purchaseQuote.retailSourcePrice) ? (
                  <>
                    {' '}
                    · {purchaseQuote.quoteSource === 'RETAIL_FALLBACK' ? '기준 시세' : '소매 원시세'} {formatAdminCurrency(purchaseQuote.retailSourcePrice)}
                    {purchaseQuote.retailSnapshotUnit ? ` (${purchaseQuote.retailSnapshotUnit} 기준)` : ''}
                  </>
                ) : null}
                {hasAdminValue(purchaseQuote.retailComparablePrice) ? (
                  <> · {purchaseQuote.retailPriceBasisUnit || purchaseQuote.priceBasisUnit || '1kg'} 환산 {formatAdminCurrency(purchaseQuote.retailComparablePrice)}</>
                ) : null}
                {hasAdminValue(purchaseQuote.recommendedSalePrice) ? (
                  <> · 권장 판매가 {formatAdminCurrency(purchaseQuote.recommendedSalePrice)} ({purchaseQuote.recommendedPriceBasisUnit || purchaseQuote.priceBasisUnit || '1kg'} 기준)</>
                ) : null}
              </div>
              {purchaseQuote.pricingNote ? (
                <div className="admin-muted">{purchaseQuote.pricingNote}</div>
              ) : null}
            </div>
          ) : null}
          <div className="admin-form-field admin-form-field--full">
            <span>매입 이미지</span>
            <label className="admin-file-upload">
              <input type="file" accept="image/*" multiple onChange={onPurchaseImagesChange} />
              <strong>이미지 선택</strong>
              <small>매입 단계에서 등록한 이미지를 소분/상품관리에서도 그대로 사용합니다.</small>
            </label>
            <div className="admin-file-upload__hint">
              권장 사이즈: 1200 x 1200px 이상 / 정사각형 비율 / JPG, PNG, WEBP
            </div>
            <div className="admin-page-actions">
              <button type="button" className="admin-action admin-action--line" onClick={onClearPurchaseImages}>
                선택 이미지 초기화
              </button>
            </div>
            {purchaseImagePreviews.length ? (
              <div className="admin-image-preview-grid">
                {purchaseImagePreviews.map((image, index) => (
                  <article className="admin-image-preview" key={image.key || image.imageNo || index}>
                    <div className="admin-image-preview__thumb">
                      <img src={image.previewUrl} alt={image.name || `매입 이미지 ${index + 1}`} />
                    </div>
                    <div className="admin-image-preview__meta">
                      <strong>{image.name || `매입 이미지 ${index + 1}`}</strong>
                      <span>{image.isMain ? '대표 이미지' : `추가 이미지 ${index + 1}`}</span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="admin-image-empty">
                매입 이미지는 최소 1장 이상 등록해주세요.
              </div>
            )}
          </div>
          <div className="admin-page-actions admin-page-actions--end">
            <button type="button" className="admin-action admin-action--primary" onClick={onCreatePurchase} disabled={submittingPurchase}>
              {submittingPurchase ? '저장 중...' : '매입 등록'}
            </button>
          </div>
        </article>

        <article className="admin-card admin-card--panel">
          <h2>소분 / 판매 전환</h2>
          <div className="admin-summary-box">
            <strong>선택 배치</strong>
            <div className="admin-muted">
              {selectedBatch
                ? `${selectedBatch.batchNo} / ${selectedBatch.productName} / ${selectedBatch.purchaseQty}${selectedBatch.purchaseUnit}`
                : '아래 매입/소분 이력 테이블에서 배치를 선택해주세요.'}
            </div>
          </div>
          {selectedBatchProduct ? (
            <div className="admin-summary-box admin-summary-box--note">
              <strong>연결된 상품</strong>
              <div className="admin-muted">
                {selectedBatchProduct.productName} / {selectedBatchProduct.categoryName} / 상품번호 {selectedBatchProduct.productNo}
              </div>
              {linkedProductPreviews.length ? (
                <div className="admin-image-preview-grid admin-image-preview-grid--compact">
                  {linkedProductPreviews.map((image, index) => (
                    <article className="admin-image-preview" key={image.key || image.imageNo || index}>
                      <div className="admin-image-preview__thumb">
                        <img src={image.previewUrl} alt={image.name || `상품 이미지 ${index + 1}`} />
                      </div>
                      <div className="admin-image-preview__meta">
                        <strong>{image.name || `상품 이미지 ${index + 1}`}</strong>
                        <span>{image.isMain ? '대표 이미지' : `추가 이미지 ${index + 1}`}</span>
                      </div>
                    </article>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
          <div className="admin-form-grid admin-form-grid--spaced">
            {needsLegacyProductLink ? (
              <label>
                <span>연결 상품</span>
                <select name="productNo" value={packageForm.productNo} onChange={onPackageFormChange}>
                  <option value="">선택</option>
                  {products.map((product) => (
                    <option key={product.productNo} value={product.productNo}>
                      {product.productName}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label><span>생성 수량</span><input name="packagedQty" value={packageForm.packagedQty} onChange={onPackageFormChange} /></label>
            <label><span>1개당 중량</span><input name="packagedWeight" value={packageForm.packagedWeight} onChange={onPackageFormChange} /></label>
            <label><span>판매가</span><input name="salePrice" value={packageForm.salePrice} onChange={onPackageFormChange} /></label>
            <label>
              <span>판매 상태</span>
              <select name="saleStatus" value={packageForm.saleStatus} onChange={onPackageFormChange}>
                <option value="SELLING">판매중</option>
                <option value="READY">준비중</option>
                <option value="SOLD_OUT">품절</option>
                <option value="STOP">판매중지</option>
              </select>
            </label>
            <label className="admin-form-field admin-form-field--full"><span>메모</span><textarea name="note" value={packageForm.note} onChange={onPackageFormChange} /></label>
          </div>
          <div className="admin-page-actions admin-page-actions--end">
            <button type="button" className="admin-action admin-action--primary" onClick={onCreatePackageHistory} disabled={!selectedBatch || submittingPackage}>
              {submittingPackage ? '처리 중...' : '소분 실행'}
            </button>
          </div>
        </article>
      </section>

      <section className="admin-card admin-card--panel">
        <h2>매입 / 소분 이력</h2>
        <table className="admin-table admin-table--clickable">
          <thead>
            <tr>
              <th>배치번호</th>
              <th>품목</th>
              <th>매입수량</th>
              <th>매입가</th>
              <th>상태</th>
              <th>최근 소분</th>
            </tr>
          </thead>
          <tbody>
            {purchases.map((purchase) => {
              const latestPackage = packageHistories.find((history) => history.batchNo === purchase.batchNo);
              return (
                <tr
                  key={purchase.batchNo}
                  className={purchase.batchNo === selectedBatchNo ? 'is-selected' : ''}
                  onClick={() => onSelectBatch(purchase.batchNo)}
                >
                  <td>{purchase.batchNo}</td>
                  <td>{purchase.productName}</td>
                  <td>{purchase.purchaseQty}{purchase.purchaseUnit}</td>
                  <td>{formatAdminCurrency(purchase.purchasePrice)}</td>
                  <td><AdminStatusBadge status={purchase.status} /></td>
                  <td>{latestPackage ? formatAdminDate(latestPackage.packagedAt) : '-'}</td>
                  <td className="admin-table__actions">
                    <button
                      type="button"
                      className="admin-action admin-action--danger"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDeletePurchaseBatch(purchase);
                      }}
                      disabled={submittingPurchase || submittingPackage}
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </>
  );
}

function AdminApp() {
  const [currentPage, setCurrentPage] = useState(() => parseAdminPage(window.location.hash));
  const [adminMode, setAdminMode] = useState(() => isAdminMode());
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [packageHistories, setPackageHistories] = useState([]);
  const [purchaseReferenceItems, setPurchaseReferenceItems] = useState([]);
  const [banners, setBanners] = useState([]);
  const [recipeMappings, setRecipeMappings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [selectedProductNo, setSelectedProductNo] = useState(null);
  const [selectedOrderNo, setSelectedOrderNo] = useState(null);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState(null);
  const [selectedUserNo, setSelectedUserNo] = useState(null);
  const [selectedBatchNo, setSelectedBatchNo] = useState(null);
  const [productFilter, setProductFilter] = useState('ALL');
  const [orderFilter, setOrderFilter] = useState('ALL');
  const [userFilter, setUserFilter] = useState('ALL');
  const [productForm, setProductForm] = useState(EMPTY_PRODUCT_FORM);
  const [, setProductImageFiles] = useState([]);
  const [productImagePreviews, setProductImagePreviews] = useState([]);
  const [purchaseForm, setPurchaseForm] = useState(EMPTY_PURCHASE_FORM);
  const [purchaseQuote, setPurchaseQuote] = useState(null);
  const [packageQuote, setPackageQuote] = useState(null);
  const [purchaseImageFiles, setPurchaseImageFiles] = useState([]);
  const [purchaseImagePreviews, setPurchaseImagePreviews] = useState([]);
  const [packageForm, setPackageForm] = useState(EMPTY_PACKAGE_FORM);
  const [trackingNo, setTrackingNo] = useState('');
  const [savingProduct, setSavingProduct] = useState(false);
  const [updatingOrder, setUpdatingOrder] = useState(false);
  const [updatingUser, setUpdatingUser] = useState(false);
  const [savingPurchase, setSavingPurchase] = useState(false);
  const [savingPackage, setSavingPackage] = useState(false);
  const [quotingPurchase, setQuotingPurchase] = useState(false);
  const [, setLoadingPackageQuote] = useState(false);
  const [syncingRecipes, setSyncingRecipes] = useState(false);

  useEffect(() => {
    const syncRoute = () => {
      setCurrentPage(parseAdminPage(window.location.hash));
      setAdminMode(isAdminMode());
    };

    window.addEventListener('hashchange', syncRoute);
    window.addEventListener('storage', syncRoute);
    window.addEventListener('oneulFarm:storage-change', syncRoute);

    return () => {
      window.removeEventListener('hashchange', syncRoute);
      window.removeEventListener('storage', syncRoute);
      window.removeEventListener('oneulFarm:storage-change', syncRoute);
    };
  }, []);

  async function loadAdminData() {
    setLoading(true);
    setLoadError('');

    try {
      const [
        nextCategories,
        nextProducts,
        nextOrders,
        nextUsers,
        nextPurchases,
        nextPackageHistories,
        nextPurchaseReferenceItems,
        nextBanners,
        nextRecipeMappings,
      ] = await Promise.all([
        fetchAdminProductCategories(),
        fetchAdminProducts(),
        fetchAdminOrders(),
        fetchAdminUsers(),
        fetchAdminPurchases(),
        fetchAdminPackageHistories(),
        fetchAdminPurchaseReferenceItems(),
        fetchAdminBanners(),
        fetchAdminRecipeMappings(),
      ]);

      setCategories(nextCategories);
      setProducts(nextProducts);
      setOrders(nextOrders);
      setUsers(nextUsers);
      setPurchases(nextPurchases);
      setPackageHistories(nextPackageHistories);
      setPurchaseReferenceItems(nextPurchaseReferenceItems);
      setBanners(nextBanners);
      setRecipeMappings(nextRecipeMappings);
      if (!selectedProductNo && nextProducts.length) {
        setSelectedProductNo(nextProducts[0].productNo);
        setProductForm(buildProductForm(nextProducts[0]));
      }
      if (!selectedOrderNo && nextOrders.length) {
        setSelectedOrderNo(nextOrders[0].orderNo);
      }
      if (!selectedUserNo && nextUsers.length) {
        setSelectedUserNo(nextUsers[0].userNo);
      }
      if (!selectedBatchNo && nextPurchases.length) {
        setSelectedBatchNo(nextPurchases[0].batchNo);
      }
    } catch (error) {
      setLoadError(error.message || '관리자 데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!adminMode) {
      setLoading(false);
      return;
    }

    loadAdminData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminMode]);

  useEffect(() => {
    if (!adminMode || !selectedOrderNo) {
      setSelectedOrderDetail(null);
      setTrackingNo('');
      return;
    }

    let ignore = false;

    async function loadOrderDetail() {
      try {
        const detail = await fetchAdminOrderDetail(selectedOrderNo);
        if (ignore) {
          return;
        }
        setSelectedOrderDetail(detail);
        setTrackingNo(detail?.trackingNo || '');
      } catch (error) {
        if (!ignore) {
          setActionError(error.message || '주문 상세를 불러오지 못했습니다.');
        }
      }
    }

    loadOrderDetail();
    return () => {
      ignore = true;
    };
  }, [adminMode, selectedOrderNo]);

  const currentProduct = useMemo(
    () => products.find((product) => product.productNo === selectedProductNo) || null,
    [products, selectedProductNo]
  );

  const currentUser = useMemo(
    () => users.find((user) => user.userNo === selectedUserNo) || null,
    [users, selectedUserNo]
  );

  const currentBatch = useMemo(
    () => purchases.find((purchase) => purchase.batchNo === selectedBatchNo) || null,
    [purchases, selectedBatchNo]
  );

  const normalizedPurchaseReferenceItems = useMemo(
    () => normalizeAdminPurchaseReferenceItems(purchaseReferenceItems, categories),
    [purchaseReferenceItems, categories]
  );

  useEffect(() => {
    if (!adminMode || !currentBatch?.productName) {
      setPackageQuote(null);
      return;
    }

    let ignore = false;

    async function loadPackageQuote() {
      setLoadingPackageQuote(true);

      try {
        const nextPackageQuote = await fetchAdminPurchaseQuote(currentBatch.productName);
        if (!ignore) {
          setPackageQuote(nextPackageQuote);
        }
      } catch (error) {
        if (!ignore) {
          setPackageQuote(null);
        }
      } finally {
        if (!ignore) {
          setLoadingPackageQuote(false);
        }
      }
    }

    loadPackageQuote();
    return () => {
      ignore = true;
    };
  }, [adminMode, currentBatch]);

  useEffect(() => {
    if (!currentBatch) {
      setPackageForm(EMPTY_PACKAGE_FORM);
      return;
    }

    setPackageForm((current) => {
      const nextForm = {
        ...current,
        productNo: currentBatch.productNo ? String(currentBatch.productNo) : current.productNo,
      };

      if (Number(current.packagedQty) > 0) {
        const autoDefaults = calculateAutoPackageDefaults(
          currentBatch,
          packageQuote,
          current.packagedQty
        );
        if (autoDefaults?.packagedWeight != null) {
          nextForm.packagedWeight = formatDecimalInput(autoDefaults.packagedWeight, 2);
        }
        if (autoDefaults?.salePrice != null) {
          nextForm.salePrice = formatDecimalInput(autoDefaults.salePrice, 0);
        }
        if (autoDefaults?.saleStatus) {
          nextForm.saleStatus = autoDefaults.saleStatus;
        }
      }

      return nextForm;
    });
  }, [currentBatch, packageQuote]);

  useEffect(() => {
    if (currentProduct) {
      setProductForm(buildProductForm(currentProduct));
      setProductImageFiles([]);
      setProductImagePreviews((currentPreviews) => {
        revokeProductImagePreviews(currentPreviews);
        return buildProductImagePreviews(currentProduct);
      });
    }
  }, [currentProduct]);

  useEffect(() => () => {
    revokeProductImagePreviews(productImagePreviews);
  }, [productImagePreviews]);

  useEffect(() => () => {
    revokeProductImagePreviews(purchaseImagePreviews);
  }, [purchaseImagePreviews]);

  function handleProductFormChange(event) {
    const { name, value } = event.target;
    setActionError('');
    setActionSuccess('');
    setProductForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  // eslint-disable-next-line no-unused-vars
  function handleProductImagesChange(event) {
    const nextFiles = Array.from(event.target.files || []).filter((file) =>
      String(file.type || '').startsWith('image/')
    );

    setActionError('');
    setActionSuccess('');
    setProductImageFiles(nextFiles);
    setProductImagePreviews((currentPreviews) => {
      revokeProductImagePreviews(currentPreviews);
      return nextFiles.map((file, index) => ({
        key: `${file.name}-${file.size}-${index}`,
        imageNo: null,
        name: file.name,
        previewUrl: URL.createObjectURL(file),
        isMain: index === 0,
      }));
    });
  }

  function resetProductImages(product = null) {
    setProductImageFiles([]);
    setProductImagePreviews((currentPreviews) => {
      revokeProductImagePreviews(currentPreviews);
      return buildProductImagePreviews(product);
    });
  }

  function handlePurchaseImagesChange(event) {
    const nextFiles = Array.from(event.target.files || []).filter((file) =>
      String(file.type || '').startsWith('image/')
    );

    setActionError('');
    setActionSuccess('');
    setPurchaseImageFiles(nextFiles);
    setPurchaseImagePreviews((currentPreviews) => {
      revokeProductImagePreviews(currentPreviews);
      return nextFiles.map((file, index) => ({
        key: `${file.name}-${file.size}-${index}`,
        imageNo: null,
        name: file.name,
        previewUrl: URL.createObjectURL(file),
        isMain: index === 0,
      }));
    });
  }

  function resetPurchaseImages() {
    setPurchaseImageFiles([]);
    setPurchaseImagePreviews((currentPreviews) => {
      revokeProductImagePreviews(currentPreviews);
      return [];
    });
  }

  function handlePurchaseFormChange(event) {
    const { name, value } = event.target;
    setActionError('');
    setActionSuccess('');
    setPurchaseForm((current) => {
      const nextForm = {
        ...current,
        [name]: value,
      };

      if (name === 'categoryNo') {
        nextForm.referenceItemCode = '';
        nextForm.productName = '';
      }

      if (purchaseQuote && (name === 'purchaseQty' || name === 'purchaseUnit')) {
        const nextPurchasePrice = calculatePurchasePriceFromQuote(
          purchaseQuote,
          nextForm.purchaseQty,
          nextForm.purchaseUnit
        );
        if (nextPurchasePrice != null) {
          nextForm.purchasePrice = formatDecimalInput(nextPurchasePrice, 2);
        }
      }

      return nextForm;
    });

    if (name === 'productName' || name === 'referenceItemCode' || name === 'categoryNo') {
      setPurchaseQuote(null);
    }
  }

  function handlePurchaseReferenceChange(event) {
    const referenceItemCode = String(event.target.value || '').trim();
    const selectedReferenceItem = normalizedPurchaseReferenceItems.find(
      (item) => String(item.itemCode) === referenceItemCode
    ) || null;
    const matchedCategory = selectedReferenceItem?.categoryName
      ? categories.find((category) => category.categoryName === selectedReferenceItem.categoryName) || null
      : null;

    setActionError('');
    setActionSuccess('');
    setPurchaseQuote(null);
    setPurchaseForm((current) => ({
      ...current,
      referenceItemCode,
      productName: selectedReferenceItem?.productName || '',
      categoryNo: matchedCategory ? String(matchedCategory.categoryNo) : current.categoryNo,
    }));

    if (selectedReferenceItem) {
      handleAutofillPurchaseQuote(
        selectedReferenceItem.productName,
        selectedReferenceItem.itemCode,
        selectedReferenceItem
      );
    }
  }

  async function handleAutofillPurchaseQuote(productNameOverride, itemCodeOverride, referenceItemOverride) {
    const selectedReferenceItem = referenceItemOverride
      || normalizedPurchaseReferenceItems.find((item) => String(item.itemCode) === String(itemCodeOverride ?? purchaseForm.referenceItemCode ?? ''))
      || null;
    const productName = String(
      productNameOverride
      ?? selectedReferenceItem?.quoteName
      ?? purchaseForm.productName
      ?? ''
    ).trim();
    const shouldUseDirectQuoteItemCode = Boolean(
      selectedReferenceItem
      && selectedReferenceItem.referenceSource === 'WHOLESALE'
      && !isAdminCatalogReferenceItem(selectedReferenceItem.itemCode)
    );
    const itemCode = String(
      itemCodeOverride
      ?? (shouldUseDirectQuoteItemCode ? selectedReferenceItem?.quoteItemCode : '')
      ?? purchaseForm.referenceItemCode
      ?? ''
    ).trim();
    if (!productName && !itemCode) {
      setActionError('시세 품목을 선택한 뒤 시세 자동 채움을 눌러주세요.');
      setActionSuccess('');
      return;
    }

    setQuotingPurchase(true);
    setActionError('');
    setActionSuccess('');

    try {
      let quote = null;
      const retailLookupName =
        selectedReferenceItem?.quoteName
        || selectedReferenceItem?.rawProductName
        || selectedReferenceItem?.productName
        || productName;

      try {
        quote = await fetchAdminPurchaseQuote(productName, itemCode);
      } catch (quoteError) {
        if (!selectedReferenceItem || !isAdminCatalogReferenceItem(selectedReferenceItem.itemCode)) {
          throw quoteError;
        }

        const retailPriceList = await fetchAdminRecentRetailPriceList(
          retailLookupName,
          200,
          7
        );
        const retailSnapshot = findAdminRetailFallbackSnapshot(selectedReferenceItem, retailPriceList);
        if (!retailSnapshot) {
          throw quoteError;
        }

        quote = buildAdminRetailFallbackQuote(selectedReferenceItem, retailSnapshot);
      }

      if (quote && !hasAdminValue(quote.retailComparablePrice) && selectedReferenceItem) {
        const retailPriceList = await fetchAdminRecentRetailPriceList(retailLookupName, 200, 7);
        const retailSnapshot = findAdminRetailFallbackSnapshot(selectedReferenceItem, retailPriceList);
        if (retailSnapshot) {
          quote = mergeAdminRetailFallbackIntoQuote(quote, retailSnapshot);
        }
      }

      setPurchaseQuote(quote);
      setPurchaseForm((current) => ({
        ...current,
        purchaseUnit: quote.purchaseUnit || current.purchaseUnit,
        purchaseQty:
          quote.purchaseQty == null ? current.purchaseQty : formatDecimalInput(quote.purchaseQty, 2),
        purchasePrice:
          quote.purchasePrice == null ? current.purchasePrice : formatDecimalInput(quote.purchasePrice, 2),
      }));
      setActionSuccess(
        quote.quoteSource === 'RETAIL_FALLBACK'
          ? `${quote.matchedItemName || productName} 소매 시세를 기준으로 매입 정보를 자동 입력했습니다.`
          : `${quote.matchedItemName || productName} 최신 도매 시세를 기준으로 매입 정보를 자동 입력했습니다.`
      );
    } catch (error) {
      setPurchaseQuote(null);
      setActionError(error.message || '시세 기반 매입 정보를 불러오지 못했습니다.');
    } finally {
      setQuotingPurchase(false);
    }
  }

  function handlePackageFormChange(event) {
    const { name, value } = event.target;
    setActionError('');
    setActionSuccess('');
    setPackageForm((current) => {
      const nextForm = {
        ...current,
        [name]: value,
      };

      if (name === 'packagedQty') {
        const autoDefaults = calculateAutoPackageDefaults(currentBatch, packageQuote, value);
        if (autoDefaults?.packagedWeight != null) {
          nextForm.packagedWeight = formatDecimalInput(autoDefaults.packagedWeight, 2);
        }
        if (autoDefaults?.salePrice != null) {
          nextForm.salePrice = formatDecimalInput(autoDefaults.salePrice, 0);
        }
        if (autoDefaults?.saleStatus) {
          nextForm.saleStatus = autoDefaults.saleStatus;
        }
      }

      return nextForm;
    });
  }

  async function handleSaveProduct() {
    const validationError = validateAdminProductForm(
      productForm,
      categories
    );
    if (validationError) {
      setActionError(validationError);
      setActionSuccess('');
      return;
    }

    setSavingProduct(true);
    setActionError('');
    setActionSuccess('');

    try {
      const payload = {
        productNo: productForm.productNo,
        categoryNo: Number(productForm.categoryNo),
        productName: productForm.productName,
        origin: productForm.origin,
        unit: productForm.unit,
        packageWeight: Number(productForm.packageWeight),
        salePrice: Number(productForm.salePrice),
        stockQty: Number(productForm.stockQty),
        description: productForm.description,
        isSeasonal: productForm.isSeasonal,
        saleStatus: productForm.saleStatus,
      };
      const savedProduct = await saveAdminProduct(payload);
      await loadAdminData();
      if (savedProduct?.productNo) {
        setSelectedProductNo(savedProduct.productNo);
        setProductForm(buildProductForm(savedProduct));
      }
      setActionSuccess('상품 정보가 정상적으로 수정되었습니다.');
    } catch (error) {
      setActionError(error.message || '상품 저장에 실패했습니다.');
    } finally {
      setSavingProduct(false);
    }
  }

  async function handleRetireProduct(product) {
    if (!product?.productNo) {
      return;
    }

    const shouldDelete = window.confirm(
      `'${product.productName}' 상품을 영구삭제할까요? 주문 이력이 있는 상품은 삭제할 수 없습니다.`
    );
    if (!shouldDelete) {
      return;
    }

    setSavingProduct(true);
    setActionError('');
    setActionSuccess('');

    try {
      await deleteAdminProduct(product.productNo);
      await loadAdminData();
      setSelectedProductNo((currentSelectedProductNo) =>
        currentSelectedProductNo === product.productNo ? null : currentSelectedProductNo
      );
      setProductForm((currentForm) =>
        currentForm.productNo === product.productNo ? { ...EMPTY_PRODUCT_FORM } : currentForm
      );
      resetProductImages();
      setActionSuccess('상품을 영구삭제했습니다.');
    } catch (error) {
      setActionError(error.message || '상품 삭제에 실패했습니다.');
    } finally {
      setSavingProduct(false);
    }
  }

  async function handleUpdateOrder(payload) {
    if (!selectedOrderNo) {
      return;
    }

    setUpdatingOrder(true);
    setActionError('');

    try {
      const detail = await updateAdminOrder(selectedOrderNo, {
        ...payload,
        courierName: 'oneulFarm',
      });
      const nextOrders = await fetchAdminOrders();
      setOrders(nextOrders);
      setSelectedOrderDetail(detail);
      setTrackingNo(detail?.trackingNo || trackingNo);
    } catch (error) {
      setActionError(error.message || '주문 상태 변경에 실패했습니다.');
    } finally {
      setUpdatingOrder(false);
    }
  }

  async function handleDeleteOrder(order) {
    if (!order?.orderNo) {
      return;
    }

    const isDeletable =
      order.orderStatus === 'COMPLETED' && order.deliveryStatus === 'DELIVERED';

    if (!isDeletable) {
      setActionError('배송 완료된 주문만 정보 제거할 수 있습니다.');
      return;
    }

    const shouldDelete = window.confirm(
      `'${order.orderId}' 주문 정보를 제거할까요? 배송 완료 주문에 한해서만 삭제할 수 있습니다.`
    );
    if (!shouldDelete) {
      return;
    }

    setUpdatingOrder(true);
    setActionError('');
    setActionSuccess('');

    try {
      await deleteAdminOrder(order.orderNo);
      const [nextOrders, nextUsers] = await Promise.all([
        fetchAdminOrders(),
        fetchAdminUsers(),
      ]);
      setOrders(nextOrders);
      setUsers(nextUsers);
      setSelectedOrderDetail(null);
      setSelectedOrderNo(nextOrders[0]?.orderNo || null);
      setActionSuccess('배송 완료 주문 정보를 제거했습니다.');
    } catch (error) {
      setActionError(error.message || '주문 정보 제거에 실패했습니다.');
    } finally {
      setUpdatingOrder(false);
    }
  }

  async function handleUpdateUserStatus(userNo, status) {
    setUpdatingUser(true);
    setActionError('');

    try {
      await updateAdminUserStatus(userNo, status);
      const nextUsers = await fetchAdminUsers();
      setUsers(nextUsers);
    } catch (error) {
      setActionError(error.message || '회원 상태 변경에 실패했습니다.');
    } finally {
      setUpdatingUser(false);
    }
  }

  async function handleDeleteUser(user) {
    if (!user?.userNo) {
      return;
    }

    const shouldDelete = window.confirm(
      `\uc815\ub9d0 \uc0ad\uc81c\ud558\uc2dc\uaca0\uc2b5\ub2c8\uae4c?\n\n${user.userId} \uacc4\uc815\uc758 \ud68c\uc6d0 \uc815\ubcf4, \uc8fc\ubb38, \ucc1c, \uc7a5\ubc14\uad6c\ub2c8, \ub9ac\ubdf0 \ub370\uc774\ud130\uac00 \ud568\uaed8 \uc644\uc804\ud788 \uc0ad\uc81c\ub429\ub2c8\ub2e4.`
    );
    if (!shouldDelete) {
      return;
    }

    setUpdatingUser(true);
    setActionError('');
    setActionSuccess('');

    try {
      await deleteAdminUser(user.userNo);
      const [nextUsers, nextOrders] = await Promise.all([
        fetchAdminUsers(),
        fetchAdminOrders(),
      ]);
      setUsers(nextUsers);
      setOrders(nextOrders);
      setSelectedUserNo(nextUsers[0]?.userNo || null);

      if (selectedOrderNo && !nextOrders.some((order) => order.orderNo === selectedOrderNo)) {
        setSelectedOrderNo(nextOrders[0]?.orderNo || null);
        setSelectedOrderDetail(null);
      }

      setActionSuccess('\ud68c\uc6d0 \ub370\uc774\ud130\ub97c \uc644\uc804\ud788 \uc0ad\uc81c\ud588\uc2b5\ub2c8\ub2e4.');
    } catch (error) {
      setActionError(error.message || '\ud68c\uc6d0 \uc644\uc804 \uc0ad\uc81c\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4.');
    } finally {
      setUpdatingUser(false);
    }
  }

  async function handleCreatePurchase() {
    const validationError = validatePurchaseBatchForm(
      purchaseForm,
      categories,
      purchaseImagePreviews.length
    );
    if (validationError) {
      setActionError(validationError);
      setActionSuccess('');
      return;
    }

    setSavingPurchase(true);
    setActionError('');
    setActionSuccess('');

    try {
      const { referenceItemCode, ...purchasePayload } = purchaseForm;
      const savedBatch = await createAdminPurchaseBatch({
        ...purchasePayload,
        categoryNo: Number(purchaseForm.categoryNo),
        purchaseQty: Number(purchaseForm.purchaseQty),
        purchasePrice: Number(purchaseForm.purchasePrice),
      });
      if (savedBatch?.productNo && purchaseImageFiles.length) {
        await uploadAdminProductImages(savedBatch.productNo, purchaseImageFiles);
      }
      const [nextPurchases, nextProducts] = await Promise.all([
        fetchAdminPurchases(),
        fetchAdminProducts(),
      ]);
      setPurchases(nextPurchases);
      setProducts(nextProducts);
      setSelectedBatchNo(savedBatch?.batchNo || nextPurchases[0]?.batchNo || null);
      setSelectedProductNo(savedBatch?.productNo || nextProducts[0]?.productNo || null);
      setPurchaseForm(EMPTY_PURCHASE_FORM);
      setPurchaseQuote(null);
      resetPurchaseImages();
      setActionSuccess('매입과 초안 상품 등록이 완료되었습니다. 소분 단계에서 판매 정보를 확정해주세요.');
    } catch (error) {
      setActionError(error.message || '매입 등록에 실패했습니다.');
    } finally {
      setSavingPurchase(false);
    }
  }

  async function handleCreatePackageHistory() {
    if (!selectedBatchNo) {
      return;
    }

    const selectedBatch = purchases.find((purchase) => purchase.batchNo === selectedBatchNo) || null;
    const validationError = validatePackageForm(selectedBatch, packageForm);
    if (validationError) {
      setActionError(validationError);
      setActionSuccess('');
      return;
    }

    setSavingPackage(true);
    setActionError('');
    setActionSuccess('');

    try {
      await createAdminPackageHistory(selectedBatchNo, {
        productNo: selectedBatch?.productNo
          ? Number(selectedBatch.productNo)
          : Number(packageForm.productNo),
        packagedQty: Number(packageForm.packagedQty),
        packagedWeight: Number(packageForm.packagedWeight),
        salePrice: Number(packageForm.salePrice),
        saleStatus: packageForm.saleStatus,
        note: packageForm.note,
      });
      const [nextPurchases, nextPackageHistories, nextProducts] = await Promise.all([
        fetchAdminPurchases(),
        fetchAdminPackageHistories(),
        fetchAdminProducts(),
      ]);
      setPurchases(nextPurchases);
      setPackageHistories(nextPackageHistories);
      setProducts(nextProducts);
      setPackageForm(EMPTY_PACKAGE_FORM);
      const nextSelectedBatch = nextPurchases.find((purchase) => purchase.batchNo === selectedBatchNo) || null;
      if (nextSelectedBatch?.productNo) {
        setSelectedProductNo(nextSelectedBatch.productNo);
      }
      setActionSuccess('소분 정보가 상품에 반영되었습니다. 상품관리에서는 수정/삭제만 진행하면 됩니다.');
    } catch (error) {
      setActionError(error.message || '소분 처리에 실패했습니다.');
    } finally {
      setSavingPackage(false);
    }
  }

  async function handleDeletePurchaseBatch(purchase) {
    if (!purchase?.batchNo) {
      return;
    }

    const shouldDelete = window.confirm(
      `'${purchase.productName}' 매입/소분 이력을 삭제하시겠습니까?\n\n연결된 소분 이력은 함께 삭제되고, 상품 정보는 유지됩니다.`
    );
    if (!shouldDelete) {
      return;
    }

    setSavingPurchase(true);
    setActionError('');
    setActionSuccess('');

    try {
      await deleteAdminPurchaseBatch(purchase.batchNo);
      const [nextPurchases, nextPackageHistories] = await Promise.all([
        fetchAdminPurchases(),
        fetchAdminPackageHistories(),
      ]);
      setPurchases(nextPurchases);
      setPackageHistories(nextPackageHistories);
      setSelectedBatchNo((currentSelectedBatchNo) =>
        currentSelectedBatchNo === purchase.batchNo ? nextPurchases[0]?.batchNo || null : currentSelectedBatchNo
      );
      setActionSuccess('매입/소분 이력을 삭제했습니다.');
    } catch (error) {
      setActionError(error.message || '매입/소분 이력 삭제에 실패했습니다.');
    } finally {
      setSavingPurchase(false);
    }
  }

  async function handleSyncRecipes() {
    setSyncingRecipes(true);
    setActionError('');

    try {
      await triggerAdminRecipeSync();
      const nextMappings = await fetchAdminRecipeMappings();
      setRecipeMappings(nextMappings);
    } catch (error) {
      setActionError(error.message || '레시피 동기화에 실패했습니다.');
    } finally {
      setSyncingRecipes(false);
    }
  }

  if (!adminMode) {
    return (
      <div className="admin-access">
        <div className="admin-access__card">
          <h1>관리자 미리보기</h1>
          <p>로그인 기능 전에는 임시 전환 버튼으로 관리자 화면에 진입합니다.</p>
          <div className="admin-page-actions">
            <button type="button" className="admin-action admin-action--line" onClick={() => leaveAdminPage('#/mypage')}>
              사용자 화면으로
            </button>
            <button type="button" className="admin-action admin-action--primary" onClick={() => openAdminPage('#/admin')}>
              관리자 화면 열기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout activePage={currentPage === 'dashboard' ? 'dashboard' : currentPage}>
      {loading ? <div className="admin-loading">관리자 데이터를 불러오는 중입니다.</div> : null}
      {!loading && loadError ? <div className="admin-error">{loadError}</div> : null}
      {!loading && !loadError && actionError ? <div className="admin-inline-error">{actionError}</div> : null}
      {!loading && !loadError && actionSuccess ? (
        <div className="admin-inline-success">{actionSuccess}</div>
      ) : null}
      {!loading && !loadError && false ? (
        <div className="admin-page-actions admin-page-actions--spaced">
          <span className="admin-muted">
            선택 회원: {currentUser.nickname} ({currentUser.userId})
          </span>
          <button
            type="button"
            className="admin-action admin-action--danger"
            onClick={() => handleDeleteUser(currentUser)}
            disabled={updatingUser}
          >
            선택 회원 삭제
          </button>
        </div>
      ) : null}
      {!loading && !loadError ? (
        <>
          {currentPage === 'dashboard' ? (
            <DashboardPage
              products={products}
              orders={orders}
              purchases={purchases}
              banners={banners}
              users={users}
            />
          ) : null}
          {currentPage === 'products' ? (
            <ProductsPage
              categories={categories}
              products={products}
              selectedProductNo={selectedProductNo}
              productFilter={productFilter}
              productForm={productForm}
              productImagePreviews={productImagePreviews}
              onSelectProduct={(product) => setSelectedProductNo(product.productNo)}
              onProductFilterChange={setProductFilter}
              onProductFormChange={handleProductFormChange}
              onResetProductForm={() => {
                setActionError('');
                setActionSuccess('');
                if (currentProduct) {
                  setSelectedProductNo(currentProduct.productNo);
                  resetProductImages(currentProduct);
                  setProductForm(buildProductForm(currentProduct));
                } else if (products[0]) {
                  setSelectedProductNo(products[0].productNo);
                  resetProductImages(products[0]);
                  setProductForm(buildProductForm(products[0]));
                } else {
                  resetProductImages();
                  setProductForm({ ...EMPTY_PRODUCT_FORM });
                }
              }}
              onRetireProduct={handleRetireProduct}
              onSaveProduct={handleSaveProduct}
              submitting={savingProduct}
            />
          ) : null}
          {currentPage === 'orders' ? (
            <OrdersPage
              orders={orders}
              selectedOrderNo={selectedOrderNo}
              selectedOrderDetail={selectedOrderDetail}
              orderFilter={orderFilter}
              trackingNo={trackingNo}
              onOrderFilterChange={setOrderFilter}
              onSelectOrder={setSelectedOrderNo}
              onTrackingChange={(event) => setTrackingNo(event.target.value)}
              onDeleteOrder={handleDeleteOrder}
              onUpdateOrder={handleUpdateOrder}
              updating={updatingOrder}
            />
          ) : null}
          {currentPage === 'users' ? (
            <UsersPage
              users={users}
              selectedUserNo={selectedUserNo}
              userFilter={userFilter}
              onUserFilterChange={setUserFilter}
              onSelectUser={setSelectedUserNo}
              onUpdateUserStatus={handleUpdateUserStatus}
              onDeleteUser={handleDeleteUser}
              updating={updatingUser}
            />
          ) : null}
          {currentPage === 'purchase' ? (
            <PurchasePage
              categories={categories}
              products={products}
              purchases={purchases}
              packageHistories={packageHistories}
              purchaseReferenceItems={normalizedPurchaseReferenceItems}
              selectedBatchNo={selectedBatchNo}
              purchaseForm={purchaseForm}
              packageForm={packageForm}
              purchaseQuote={purchaseQuote}
              purchaseImagePreviews={purchaseImagePreviews}
              onSelectBatch={setSelectedBatchNo}
              onPurchaseReferenceChange={handlePurchaseReferenceChange}
              onPurchaseFormChange={handlePurchaseFormChange}
              onPackageFormChange={handlePackageFormChange}
              onAutofillPurchaseQuote={handleAutofillPurchaseQuote}
              onPurchaseImagesChange={handlePurchaseImagesChange}
              onClearPurchaseImages={resetPurchaseImages}
              onCreatePurchase={handleCreatePurchase}
              onCreatePackageHistory={handleCreatePackageHistory}
              onDeletePurchaseBatch={handleDeletePurchaseBatch}
              quotingPurchase={quotingPurchase}
              submittingPurchase={savingPurchase}
              submittingPackage={savingPackage}
            />
          ) : null}
          {currentPage === 'content' ? (
            <ContentPage
              banners={banners}
              recipeMappings={recipeMappings}
              syncingRecipes={syncingRecipes}
              onSyncRecipes={handleSyncRecipes}
            />
          ) : null}
        </>
      ) : null}
    </AdminLayout>
  );
}

export default AdminApp;

