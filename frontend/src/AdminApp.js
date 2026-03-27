import { useEffect, useMemo, useState } from 'react';
import { clearAuthUser, getAuthUser, isSuperAdminUser } from './auth';
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
  cancelAdminPackageHistory,
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
  updateAdminUserRole,
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
  supplierProfileKey: 'farm-cheonan',
  purchaseUnit: 'kg',
  purchaseQty: '0',
  referenceUnitPrice: '0',
  referenceTotalPrice: '0',
  referenceSnapshotDate: '',
  grade: '상',
  supplierType: '농가',
  actualUnitPrice: '0',
  actualPurchaseAmount: '0',
  logisticsCost: '0',
  commissionRate: '0',
  commissionCost: '0',
  otherPurchaseCost: '0',
  discardRate: '3',
  purchasePrice: '0',
  purchaseDate: new Date().toISOString().slice(0, 10),
  supplierName: '천안 농가',
  status: 'PURCHASED',
};

const EMPTY_PACKAGE_FORM = {
  productNo: '',
  packagedQty: '0',
  packagedWeight: '1',
  salePrice: '0',
  packagingMaterialCost: '0',
  packagingLaborCost: '0',
  otherPackagingCost: '0',
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

const COUNT_UNIT_SET = new Set(['ea', 'each', '\uAC1C', '\uAC1C\uC785', '\uAD6C', '\uB9DD', '\uBCF4', '\uBCF4\uB530\uB9AC', 'pack', 'pk']);
const VOLUME_UNIT_SET = new Set(['ml', 'milliliter', 'milliliters', 'millilitre', 'millilitres', 'l', 'liter', 'liters', 'litre', 'litres', '\u2113', '\uB9AC\uD130']);

const ADMIN_SUPPORTED_CATEGORY_NAMES = ['\uCC44\uC18C', '\uACFC\uC77C', '\uBC84\uC12F', '\uC721\uB958', '\uC720\uC81C\uD488', '\uB2EC\uAC40', '\uAC00\uACF5\uC2DD\uD488'];
const ADMIN_DISABLED_PURCHASE_CATEGORY_NAMES = new Set(['\uAC00\uACF5\uC2DD\uD488', '\uC720\uC81C\uD488']);
const ADMIN_FRUIT_KEYWORDS = ['\uC0AC\uACFC', '\uBC30', '\uBCF5\uC22D\uC544', '\uD3EC\uB3C4', '\uAC10\uADE4', '\uB2E8\uAC10', '\uBC14\uB098\uB098', '\uCC38\uB2E4\uB798', '\uCC38\uC678', '\uB538\uAE30', '\uBA5C\uB860', '\uC624\uB80C\uC9C0', '\uB9DD\uACE0', '\uC790\uB450', '\uD30C\uC778\uC560\uD50C', '\uCCB4\uB9AC', '\uD0A4\uC704', '\uC218\uBC15'];
const ADMIN_FRUIT_EXACT_NAMES = new Set(ADMIN_FRUIT_KEYWORDS);
const ADMIN_MUSHROOM_KEYWORDS = ['\uBC84\uC12F', '\uC1A1\uC774'];
const ADMIN_DAIRY_KEYWORDS = ['\uC6B0\uC720', '\uCE58\uC988', '\uC694\uAC70\uD2B8', '\uC694\uAD6C\uB974\uD2B8', '\uBC84\uD130', '\uBD84\uC720', '\uC0DD\uD06C\uB9BC'];
const ADMIN_EGG_KEYWORDS = ['\uACC4\uB780', '\uB2EC\uAC40', '\uD2B9\uB780', '\uC655\uB780'];
const ADMIN_MEAT_KEYWORDS = ['\uC1E0\uACE0\uAE30', '\uD55C\uC6B0', '\uC18C\uACE0\uAE30', '\uB3FC\uC9C0', '\uB2ED', '\uC624\uB9AC', '\uB4F1\uC2EC', '\uC548\uC2EC', '\uC0BC\uACB9\uC0B4', '\uAC08\uBE44', '\uBAA9\uC2EC', '\uC591\uC9C0', '\uC124\uB3C4', '\uC55E\uB2E4\uB9AC', '\uAC00\uC2B4\uC0B4', '\uBD81\uCC44', '\uD1A0\uC885\uB2ED', '\uC721\uACC4'];
const ADMIN_PROCESSED_KEYWORDS = ['\uAE40\uCE58', '\uACE0\uCD94\uC7A5', '\uB41C\uC7A5', '\uAC04\uC7A5', '\uB450\uBD80', '\uC21C\uB450\uBD80', '\uC5F0\uB450\uBD80', '\uC989\uC11D\uBC25', '\uB9DB\uAE40', '\uCF69\uB098\uBB3C'];
const ADMIN_UNSUPPORTED_REFERENCE_KEYWORDS = ['\uAC00\uB9AC\uBE44', '\uAC08\uCE58', '\uACE0\uB4F1\uC5B4', '\uAD74', '\uAE40/', '\uB2E4\uC2DC\uB9C8', '\uBA78\uCE58', '\uBBF8\uC5ED', '\uC624\uC9D5\uC5B4', '\uC0C8\uC6B0', '\uBCD1\uC5B4', '\uBD81\uC5B4', '\uAF41\uCE58', '\uBA85\uD0DC', '\uCC38\uAE68', '\uCF69', '\uC300', '\uCC39\uC300', '\uB179\uB450', '\uBA54\uBC00', '\uB4E4\uAE68'];
const ADMIN_REFERENCE_ALIAS_MAP = {
  'catalog:200:214:01|02': [
    { key: 'red-lettuce', productName: '\uC801\uC0C1\uCD94', quoteName: '\uC0C1\uCD94' },
    { key: 'green-lettuce', productName: '\uCCAD\uC0C1\uCD94', quoteName: '\uC0C1\uCD94' },
  ],
  'catalog:200:223:01|02|03': [
    { key: 'spined-cucumber', productName: '\uAC00\uC2DC\uC624\uC774', quoteName: '\uC624\uC774' },
    { key: 'dadagi-cucumber', productName: '\uB2E4\uB2E4\uAE30\uC624\uC774', quoteName: '\uC624\uC774' },
    { key: 'cheong-cucumber', productName: '\uCDE8\uCCAD\uC624\uC774', quoteName: '\uC624\uC774' },
  ],
  'catalog:200:224:01|02': [
    { key: 'green-zucchini', productName: '\uC560\uD638\uBC15', quoteName: '\uD638\uBC15' },
    { key: 'zucchini', productName: '\uC96C\uD0A4\uB2C8', quoteName: '\uD638\uBC15' },
  ],
};

const PURCHASE_SUPPLIER_PROFILES = [
  {
    key: 'farm-cheonan',
    supplierName: '천안 농가',
    supplierType: '농가',
    defaultLogisticsCost: 8000,
    defaultCommissionRate: 0,
    defaultDiscardRate: 3,
    priceMultiplierMin: 0.9,
    priceMultiplierMax: 0.95,
    note: '시세보다 약간 저렴한 단가를 기본 제안합니다.',
  },
  {
    key: 'wholesale-daejeon',
    supplierName: '대전 도매시장',
    supplierType: '도매',
    defaultLogisticsCost: 5000,
    defaultCommissionRate: 5,
    defaultDiscardRate: 7,
    priceMultiplierMin: 0.97,
    priceMultiplierMax: 1.04,
    note: '시세와 비슷한 단가를 기본 제안합니다.',
  },
  {
    key: 'distributor-seoul',
    supplierName: '서울 식자재 유통',
    supplierType: '유통',
    defaultLogisticsCost: 0,
    defaultCommissionRate: 0,
    defaultDiscardRate: 2,
    priceMultiplierMin: 1.1,
    priceMultiplierMax: 1.2,
    note: '단가 포함형이라 물류비는 0원으로 시작합니다.',
  },
];

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

function calculatePurchaseDraftMetrics(purchaseForm) {
  const purchaseQty = toNumber(purchaseForm.purchaseQty, 0);
  const referenceUnitPrice = toNumber(purchaseForm.referenceUnitPrice, 0);
  const actualUnitPrice = toNumber(purchaseForm.actualUnitPrice, 0);
  const typedActualPurchaseAmount = toNumber(purchaseForm.actualPurchaseAmount, 0);
  const logisticsCost = toNumber(purchaseForm.logisticsCost, 0);
  const commissionRate = toNumber(purchaseForm.commissionRate, 0);
  const otherPurchaseCost = toNumber(purchaseForm.otherPurchaseCost, 0);
  const discardRate = toNumber(purchaseForm.discardRate, 0);

  const referenceTotalPrice = referenceUnitPrice > 0 ? referenceUnitPrice * purchaseQty : 0;
  const actualPurchaseAmount =
    typedActualPurchaseAmount > 0 ? typedActualPurchaseAmount : actualUnitPrice * purchaseQty;
  const commissionCost = actualPurchaseAmount * Math.max(commissionRate, 0) / 100;
  const discardQty = purchaseQty * Math.max(discardRate, 0) / 100;
  const sellableQty = Math.max(purchaseQty - discardQty, 0);
  const totalPurchaseCost = actualPurchaseAmount + logisticsCost + commissionCost + otherPurchaseCost;
  const actualCostPerKg = sellableQty > 0 ? totalPurchaseCost / sellableQty : 0;

  return {
    referenceTotalPrice,
    actualPurchaseAmount,
    commissionCost,
    discardQty,
    sellableQty,
    totalPurchaseCost,
    actualCostPerKg,
  };
}

function findPurchaseSupplierProfile(profileKey) {
  return PURCHASE_SUPPLIER_PROFILES.find((profile) => profile.key === profileKey) || PURCHASE_SUPPLIER_PROFILES[0];
}

function calculateSupplierSuggestedUnitPrice(referenceUnitPrice, supplierProfile) {
  const numericReferenceUnitPrice = Number(referenceUnitPrice);
  if (!Number.isFinite(numericReferenceUnitPrice) || numericReferenceUnitPrice <= 0 || !supplierProfile) {
    return 0;
  }

  const midpoint = (supplierProfile.priceMultiplierMin + supplierProfile.priceMultiplierMax) / 2;
  return numericReferenceUnitPrice * midpoint;
}

function calculatePackageDraftMetrics(batch, packageForm) {
  if (!batch) {
    return null;
  }

  const packagedQty = toNumber(packageForm.packagedQty, 0);
  const packagedWeight = toNumber(packageForm.packagedWeight, 0);
  const salePrice = toNumber(packageForm.salePrice, 0);
  const packagingMaterialCost = toNumber(packageForm.packagingMaterialCost, 0);
  const packagingLaborCost = toNumber(packageForm.packagingLaborCost, 0);
  const otherPackagingCost = toNumber(packageForm.otherPackagingCost, 0);
  const sellableQty = toNumber(batch.sellableQty, 0);
  const remainingQty = toNumber(batch.remainingQty ?? batch.sellableQty, 0);
  const totalPurchaseCost = toNumber(batch.totalPurchaseCost || batch.purchasePrice, 0);
  const totalPackagingCost =
    packagingMaterialCost + packagingLaborCost + otherPackagingCost;
  const finalTotalCost = totalPurchaseCost + totalPackagingCost;
  const finalCostPerKg = sellableQty > 0 ? finalTotalCost / sellableQty : 0;
  const finalCostPerPackage = packagedWeight > 0 ? finalCostPerKg * packagedWeight : 0;
  const expectedProfitPerUnit = salePrice - finalCostPerPackage;
  const expectedTotalProfit = expectedProfitPerUnit * packagedQty;
  const expectedTotalSales = salePrice * packagedQty;
  const marginRate = salePrice > 0 ? (expectedProfitPerUnit / salePrice) * 100 : 0;
  const requiredSellableQty = packagedQty * packagedWeight;

  return {
    totalPackagingCost,
    finalTotalCost,
    finalCostPerKg,
    finalCostPerPackage,
    expectedProfitPerUnit,
    expectedTotalProfit,
    expectedTotalSales,
    marginRate,
    requiredSellableQty,
    remainingQty,
    exceedsSellableQty: requiredSellableQty > remainingQty,
  };
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
    return '\uAC00\uACF5\uC2DD\uD488';
  }
  if (containsAnyTextKeyword(normalizedProductName, ADMIN_DAIRY_KEYWORDS)) {
    return '\uC720\uC81C\uD488';
  }
  if (containsAnyTextKeyword(normalizedProductName, ADMIN_EGG_KEYWORDS)) {
    return '\uB2EC\uAC40';
  }
  if (itemCategoryCode === '500' || containsAnyTextKeyword(normalizedProductName, ADMIN_MEAT_KEYWORDS)) {
    return '\uC721\uB958';
  }
  if (itemCategoryCode === '300' || containsAnyTextKeyword(normalizedProductName, ADMIN_MUSHROOM_KEYWORDS)) {
    return '\uBC84\uC12F';
  }
  if (
    ADMIN_FRUIT_EXACT_NAMES.has(normalizedProductName)
    || itemCategoryCode === '400'
    || containsAnyTextKeyword(rawProductName, ADMIN_FRUIT_KEYWORDS)
  ) {
    return '\uACFC\uC77C';
  }
  if (itemCategoryCode === '100' || itemCategoryCode === '200') {
    return '\uCC44\uC18C';
  }
  if (ADMIN_SUPPORTED_CATEGORY_NAMES.includes(currentCategoryName) && currentCategoryName !== '\uACFC\uC77C') {
    return currentCategoryName;
  }

  return '\uCC44\uC18C';
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

  const displayUnit = parsedUnit.displayUnit === 'ea' ? '\uAC1C' : parsedUnit.displayUnit;
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
    pricingNote: '\uB3C4\uB9E4 \uC2DC\uC138\uAC00 \uC5C6\uC5B4 \uC18C\uB9E4 \uC2DC\uC138 \uAE30\uC900\uC73C\uB85C \uB9E4\uC785 \uB2E8\uC704, \uC218\uB7C9, \uAC00\uACA9\uC744 \uC790\uB3D9 \uC785\uB825\uD588\uC2B5\uB2C8\uB2E4.',
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
    name: image.imageName || ('\uAE30\uC874 \uC774\uBBF8\uC9C0 ' + (index + 1)),
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
    return '\uC0C1\uD488\uAD00\uB9AC\uC5D0\uC11C\uB294 \uAE30\uC874 \uC0C1\uD488\uB9CC \uC218\uC815\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4. \uB9E4\uC785/\uC18C\uBD84\uC5D0\uC11C \uBA3C\uC800 \uC0C1\uD488\uC744 \uC0DD\uC131\uD574\uC8FC\uC138\uC694.';
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
    return '\uCE74\uD14C\uACE0\uB9AC\uB97C \uC120\uD0DD\uD574\uC8FC\uC138\uC694.';
  }

  if (!categories.some((category) => String(category.categoryNo) === String(purchaseForm.categoryNo))) {
    return '\uC720\uD6A8\uD55C \uCE74\uD14C\uACE0\uB9AC\uB97C \uC120\uD0DD\uD574\uC8FC\uC138\uC694.';
  }

  if (!String(purchaseForm.referenceItemCode || '').trim()) {
    return '\uC2DC\uC138 \uD488\uBAA9\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694.';
  }

  if (!String(purchaseForm.purchaseUnit || '').trim()) {
    return '\uB9E4\uC785 \uB2E8\uC704\uB97C \uC785\uB825\uD574\uC8FC\uC138\uC694.';
  }

  const purchaseQty = Number(purchaseForm.purchaseQty);
  if (!Number.isFinite(purchaseQty) || purchaseQty <= 0) {
    return '\uB9E4\uC785 \uC218\uB7C9\uC740 0\uBCF4\uB2E4 \uD070 \uC22B\uC790\uB85C \uC785\uB825\uD574\uC8FC\uC138\uC694.';
  }

  const purchasePrice = Number(purchaseForm.purchasePrice);
  if (!Number.isFinite(purchasePrice) || purchasePrice < 0) {
    return '\uCC38\uACE0 \uCD1D \uB9E4\uC785\uAC00\uB294 0 \uC774\uC0C1 \uC22B\uC790\uB85C \uC785\uB825\uD574\uC8FC\uC138\uC694.';
  }

  const actualUnitPrice = Number(purchaseForm.actualUnitPrice);
  if (!Number.isFinite(actualUnitPrice) || actualUnitPrice < 0) {
    return '\uC2E4\uC81C \uB9E4\uC785 \uB2E8\uAC00\uB294 0 \uC774\uC0C1 \uC22B\uC790\uB85C \uC785\uB825\uD574\uC8FC\uC138\uC694.';
  }

  const logisticsCost = Number(purchaseForm.logisticsCost);
  const commissionRate = Number(purchaseForm.commissionRate);
  const otherPurchaseCost = Number(purchaseForm.otherPurchaseCost);
  const discardRate = Number(purchaseForm.discardRate);

  if (!Number.isFinite(logisticsCost) || logisticsCost < 0
    || !Number.isFinite(commissionRate) || commissionRate < 0
    || !Number.isFinite(otherPurchaseCost) || otherPurchaseCost < 0
    || !Number.isFinite(discardRate) || discardRate < 0) {
    return '\uC2E4\uC81C \uBE44\uC6A9\uACFC \uD3D0\uAE30 \uAC12\uC740 0 \uC774\uC0C1 \uC22B\uC790\uB85C \uC785\uB825\uD574\uC8FC\uC138\uC694.';
  }

  if (discardRate > 100 || commissionRate > 100) {
    return '\uD3D0\uAE30\uC728\uACFC \uC218\uC218\uB8CC\uC728\uC740 100% \uC774\uD558\uB85C \uC785\uB825\uD574\uC8FC\uC138\uC694.';
  }

  if (!String(purchaseForm.purchaseDate || '').trim()) {
    return '\uB9E4\uC785\uC77C\uC744 \uC785\uB825\uD574\uC8FC\uC138\uC694.';
  }

  if (!imageCount) {
    return '\uB9E4\uC785 \uC774\uBBF8\uC9C0\uB97C \uCD5C\uC18C 1\uC7A5 \uC774\uC0C1 \uB4F1\uB85D\uD574\uC8FC\uC138\uC694.';
  }

  return '';
}

function validatePackageForm(selectedBatch, packageForm) {
  if (!selectedBatch) {
    return '\uC18C\uBD84\uD560 \uB9E4\uC785 \uBC30\uCE58\uB97C \uBA3C\uC800 \uC120\uD0DD\uD574\uC8FC\uC138\uC694.';
  }

  if (!selectedBatch.productNo && !String(packageForm.productNo || '').trim()) {
    return '\uC5F0\uACB0\uB41C \uC0C1\uD488\uC774 \uC5C6\uC2B5\uB2C8\uB2E4. \uAE30\uC874 \uBC30\uCE58\uC5D0 \uC0C1\uD488\uC744 \uD55C \uBC88 \uC5F0\uACB0\uD574\uC8FC\uC138\uC694.';
  }

  const packagedQty = Number(packageForm.packagedQty);
  if (!Number.isFinite(packagedQty) || packagedQty <= 0) {
    return '\uC0DD\uC131 \uC218\uB7C9\uC740 0\uBCF4\uB2E4 \uD070 \uC22B\uC790\uB85C \uC785\uB825\uD574\uC8FC\uC138\uC694.';
  }

  const packagedWeight = Number(packageForm.packagedWeight);
  if (!Number.isFinite(packagedWeight) || packagedWeight <= 0) {
    return '\uD3EC\uC7A5 \uC911\uB7C9\uC740 0\uBCF4\uB2E4 \uD070 \uC22B\uC790\uB85C \uC785\uB825\uD574\uC8FC\uC138\uC694.';
  }

  const salePrice = Number(packageForm.salePrice);
  if (!Number.isFinite(salePrice) || salePrice <= 0) {
    return '\uD310\uB9E4\uAC00\uB294 0\uBCF4\uB2E4 \uD070 \uC22B\uC790\uB85C \uC785\uB825\uD574\uC8FC\uC138\uC694.';
  }

  const packagingMaterialCost = Number(packageForm.packagingMaterialCost);
  const packagingLaborCost = Number(packageForm.packagingLaborCost);
  const otherPackagingCost = Number(packageForm.otherPackagingCost);
  if (!Number.isFinite(packagingMaterialCost) || packagingMaterialCost < 0
    || !Number.isFinite(packagingLaborCost) || packagingLaborCost < 0
    || !Number.isFinite(otherPackagingCost) || otherPackagingCost < 0) {
    return '\uC18C\uBD84 \uBE44\uC6A9\uC740 0 \uC774\uC0C1 \uC22B\uC790\uB85C \uC785\uB825\uD574\uC8FC\uC138\uC694.';
  }

  const packageMetrics = calculatePackageDraftMetrics(selectedBatch, packageForm);
  if (packageMetrics?.exceedsSellableQty) {
    return '\uC794\uC5EC \uC7AC\uACE0\uB97C \uCD08\uACFC\uD558\uC5EC \uC18C\uBD84\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.';
  }

  if (!String(packageForm.saleStatus || '').trim()) {
    return '\uD310\uB9E4 \uC0C1\uD0DC\uB97C \uC120\uD0DD\uD574\uC8FC\uC138\uC694.';
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
        title={'\uAD00\uB9AC\uC790 \uB300\uC2DC\uBCF4\uB4DC'}
        description={'\uC8FC\uBB38, \uB9E4\uCD9C, \uC7AC\uACE0, \uB9E4\uC785 \uD604\uD669\uC744 \uD55C \uBC88\uC5D0 \uD655\uC778\uD558\uB294 \uC6B4\uC601 \uBA54\uC778 \uD654\uBA74'}
        actions={
          <>
            <button type="button" className="admin-action admin-action--line" onClick={() => (window.location.hash = '#/admin/orders')}>
              {'\uC8FC\uBB38 \uBCF4\uAE30'}
            </button>
            <button type="button" className="admin-action admin-action--primary" onClick={() => (window.location.hash = '#/admin/products')}>
              {'\uC0C1\uD488 \uAD00\uB9AC'}
            </button>
          </>
        }
      />

      <section className="admin-metrics-grid">
        <AdminMetricCard
          label={'\uC624\uB298 \uC8FC\uBB38 \uC218'}
          value={formatAdminCount(todayOrders.length)}
          helper={'\uC624\uB298 \uC0DD\uC131\uB41C \uC804\uCCB4 \uC8FC\uBB38'}
        />
        <AdminMetricCard
          label={'\uC624\uB298 \uB9E4\uCD9C'}
          value={formatAdminCurrency(todaySales)}
          helper={'\uC8FC\uBB38 \uAE30\uC900 \uD569\uACC4'}
        />
        <AdminMetricCard
          label={'\uC7AC\uACE0 \uBD80\uC871 \uC0C1\uD488'}
          value={formatAdminCount(lowStockProducts.length, '\uAC1C')}
          helper={'\uC7AC\uACE0 10\uAC1C \uC774\uD558 \uC0C1\uD488'}
        />
        <AdminMetricCard
          label={'\uD65C\uC131 \uD68C\uC6D0'}
          value={formatAdminCount(activeUsers.length, '\uBA85')}
          helper={'\uD68C\uC6D0 \uAD00\uB9AC \uD14C\uC774\uBE14 \uAE30\uC900 \uD65C\uC131 \uACC4\uC815'}
        />
      </section>

      <section className="admin-grid admin-grid--3">
        <article className="admin-card admin-card--panel">
          <h2>{'\uC8FC\uAC04 \uC8FC\uBB38 \uCD94\uC774'}</h2>
          <p className="admin-card__sub">{'\uC77C\uC790\uBCC4 \uC8FC\uBB38 \uC218\uC640 \uB9E4\uCD9C \uD750\uB984'}</p>
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
          <h2>{'\uC7AC\uACE0 \uACBD\uACE0'}</h2>
          <div className="admin-stack">
            {lowStockProducts.slice(0, 4).map((product) => (
              <div key={product.productNo} className="admin-summary-box">
                <strong>{product.productName}</strong>
                <div className="admin-muted">{'\uC7AC\uACE0 '}{toNumber(product.stockQty, 0)}{'\uAC1C'}</div>
              </div>
            ))}
            {!lowStockProducts.length ? (
              <AdminEmptyState title={'\uC7AC\uACE0 \uACBD\uACE0 \uC5C6\uC74C'} description={'\uD604\uC7AC \uAE30\uC900 \uC784\uACC4 \uC7AC\uACE0 \uC0C1\uD488\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.'} />
            ) : null}
          </div>
        </article>

        <article className="admin-card admin-card--panel">
          <h2>{'\uC624\uB298 \uD574\uC57C \uD560 \uC77C'}</h2>
          <div className="admin-stack">
            <div className="admin-summary-box">
              <strong>{'\uCD9C\uACE0 \uC608\uC815'}</strong>
              <div className="admin-muted">
                {formatAdminCount(
                  shippingReadyCount
                )} {'\uAC74 \uCD9C\uACE0 \uB300\uAE30\uC911'}
              </div>
            </div>
            <div className="admin-summary-box">
              <strong>{'\uD655\uC778 \uD544\uC694'}</strong>
              <div className="admin-muted">
                {formatAdminCount(
                  pendingPurchaseCount
                )} {'\uAC74 \uB9E4\uC785 \uB300\uAE30\uC911'}
              </div>
            </div>
            <div className="admin-summary-box">
              <strong>{'\uBC30\uB108 \uC6B4\uC601'}</strong>
              <div className="admin-muted">
                {'\uD604\uC7AC \uB178\uCD9C \uBC30\uB108 '}{formatAdminCount(
                  activeBannerCount,
                  '\uAC1C'
                )}
              </div>
            </div>
          </div>
        </article>
      </section>
      <section className="admin-grid admin-grid--2">
        <article className="admin-card admin-card--panel">
          <div className="admin-section-line">
            <h2>{'\uCD5C\uADFC \uC8FC\uBB38'}</h2>
            <button type="button" className="admin-action admin-action--soft" onClick={() => (window.location.hash = '#/admin/orders')}>
              {'\uC804\uCCB4 \uBCF4\uAE30'}
            </button>
          </div>
          <table className="admin-table">
            <thead>
              <tr>
                <th>{'\uC8FC\uBB38\uBC88\uD638'}</th>
                <th>{'\uACE0\uAC1D'}</th>
                <th>{'\uC0C1\uD488'}</th>
                <th>{'\uAE08\uC561'}</th>
                <th>{'\uC0C1\uD0DC'}</th>
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
            <h2>{'\uB9E4\uC785 / \uC18C\uBD84 \uD604\uD669'}</h2>
            <button type="button" className="admin-action admin-action--soft" onClick={() => (window.location.hash = '#/admin/purchase')}>
              {'\uC791\uC5C5 \uBCF4\uAE30'}
            </button>
          </div>
          <table className="admin-table">
            <thead>
              <tr>
                <th>{'\uBC30\uCE58'}</th>
                <th>{'\uD488\uBAA9'}</th>
                <th>{'\uC218\uB7C9'}</th>
                <th>{'\uC0C1\uD0DC'}</th>
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
function LegacyProductsPage() {
  return null;
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
        title={'\uC8FC\uBB38 \uAD00\uB9AC'}
        description={'\uC8FC\uBB38 \uBAA9\uB85D, \uC0C1\uC138 \uC815\uBCF4, \uBC30\uC1A1 \uC0C1\uD0DC\uB97C \uAD00\uB9AC\uD558\uB294 \uD654\uBA74'}
        actions={
          <>
            <button type="button" className="admin-action admin-action--line" disabled>
              {'\uC1A1\uC7A5 \uB4F1\uB85D \uC900\uBE44\uC911'}
            </button>
            <button
              type="button"
              className="admin-action admin-action--primary"
              onClick={() => onUpdateOrder({ orderStatus: 'SHIPPING' })}
              disabled={!selectedOrderDetail || updating}
            >
              {'\uCD9C\uACE0 \uCC98\uB9AC'}
            </button>
          </>
        }
      />

      <div className="admin-filter-row">
        {[
          ['ALL', '\uC804\uCCB4'],
          ['PAID', '\uACB0\uC81C\uC644\uB8CC'],
          ['SHIPPING', '\uBC30\uC1A1\uC911'],
          ['DELIVERED', '\uBC30\uC1A1\uC644\uB8CC'],
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
          <h2>{'\uC8FC\uBB38 \uBAA9\uB85D'}</h2>
          <table className="admin-table admin-table--clickable admin-table--users">
            <thead>
              <tr>
                <th>{'\uC8FC\uBB38\uBC88\uD638'}</th>
                <th>{'\uACE0\uAC1D'}</th>
                <th>{'\uC8FC\uBB38\uC77C'}</th>
                <th>{'\uACB0\uC81C\uAE08\uC561'}</th>
                <th>{'\uC0C1\uD0DC'}</th>
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
          <h2>{'\uC8FC\uBB38 \uC0C1\uC138'}</h2>
          {!selectedOrderDetail ? (
            <AdminEmptyState title={'\uC8FC\uBB38\uC744 \uC120\uD0DD\uD574\uC8FC\uC138\uC694.'} description={'\uC67C\uCABD \uC8FC\uBB38 \uBAA9\uB85D\uC5D0\uC11C \uC0C1\uC138\uB97C \uD655\uC778\uD560 \uC8FC\uBB38\uC744 \uACE0\uB974\uBA74 \uC815\uBCF4\uAC00 \uC5F4\uB9BD\uB2C8\uB2E4.'} />
          ) : (
            <div className="admin-stack">
              <div className="admin-summary-box">
                <strong>{'\uC8FC\uBB38\uBC88\uD638'}</strong>
                <div className="admin-muted">{selectedOrderDetail.orderId}</div>
              </div>
              <div className="admin-summary-box">
                <strong>{'\uACE0\uAC1D \uC815\uBCF4'}</strong>
                <div className="admin-muted">
                  {selectedOrderDetail.recipientName} / {selectedOrderDetail.recipientPhone}
                </div>
                <div className="admin-muted">
                  {selectedOrderDetail.address1} {selectedOrderDetail.address2}
                </div>
              </div>
              <div className="admin-summary-box">
                <strong>{'\uC8FC\uBB38 \uC0C1\uD488'}</strong>
                <div className="admin-detail-list">
                  {(selectedOrderDetail.items || []).map((item) => (
                    <div key={item.orderItemNo}>
                      {item.productName} x {item.quantity}
                    </div>
                  ))}
                </div>
              </div>
              <div className="admin-summary-box">
                <strong>{'\uBC30\uC1A1 \uC0C1\uD0DC \uBCC0\uACBD'}</strong>
                <div className="admin-page-actions">
                  <AdminStatusBadge status={resolveAdminOrderDisplayStatus(selectedOrderDetail)} />
                  {canDeleteOrder ? (
                    <button
                      type="button"
                      className="admin-action admin-action--danger"
                      onClick={() => onDeleteOrder(selectedOrderDetail)}
                      disabled={updating}
                    >
                      {'\uC815\uBCF4 \uC0AD\uC81C'}
                    </button>
                  ) : null}
                  <button type="button" className="admin-action admin-action--soft" onClick={() => onUpdateOrder({ orderStatus: 'SHIPPING' })} disabled={updating}>
                    {'\uBC30\uC1A1\uC911'}
                  </button>
                  <button type="button" className="admin-action admin-action--primary" onClick={() => onUpdateOrder({ orderStatus: 'COMPLETED' })} disabled={updating}>
                    {'\uBC30\uC1A1\uC644\uB8CC'}
                  </button>
                </div>
              </div>
              <div className="admin-summary-box">
                <strong>{'\uC1A1\uC7A5 \uC815\uBCF4'}</strong>
                <div className="admin-inline-form">
                  <input value={trackingNo} onChange={onTrackingChange} placeholder={'\uC1A1\uC7A5\uBC88\uD638 \uC785\uB825'} />
                  <button type="button" className="admin-action admin-action--line" onClick={() => onUpdateOrder({ trackingNo })} disabled={updating}>
                    {'\uC800\uC7A5'}
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
  onUpdateUserRole,
  onDeleteUser,
  canManageAdminRole,
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
      if (userFilter === 'ROLE') {
        return true;
      }
      if (userFilter === 'ALL') {
        return true;
      }
      return user.status === userFilter;
    });
  const selectedUser = users.find((user) => user.userNo === selectedUserNo) || null;
  const isRoleGrantTab = canManageAdminRole && userFilter === 'ROLE';

  return (
    <>
      <AdminPageHeader
        title={'\uD68C\uC6D0 \uAD00\uB9AC'}
        actions={(
          <button type="button" className="admin-action admin-action--line" disabled>
            {'\uC5D1\uC140 \uB2E4\uC6B4\uB85C\uB4DC'}
          </button>
        )}
      />

      <div className="admin-filter-row">
        {[
          ['ALL', '\uC804\uCCB4\uD68C\uC6D0'],
          ['ACTIVE', '\uD65C\uC131'],
          ['BLOCKED', '\uCC28\uB2E8'],
          ['WITHDRAWN', '\uD0C8\uD1F4'],
          ['TOP', '\uAD6C\uB9E4\uC0C1\uC704'],
        ].concat(canManageAdminRole ? [['ROLE', '\uAD8C\uD55C \uBD80\uC5EC']] : []).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={
              'admin-filter-chip ' + (userFilter === value ? 'is-active' : '')
            }
            onClick={() => onUserFilterChange(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {isRoleGrantTab ? (
        <section className="admin-grid">
          <article className="admin-card admin-card--panel">
            <div className="admin-section-line">
              <div>
                <h2>{'\uAD8C\uD55C \uBAA9\uB85D'}</h2>
                <p className="admin-card__sub">
                  {'\uC288\uD37C\uC5B4\uB4DC\uBBFC \uACC4\uC815\uB9CC \uAD00\uB9AC\uC790 \uAD8C\uD55C\uC744 \uBD80\uC5EC\uD558\uAC70\uB098 \uD574\uC81C\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.'}
                </p>
              </div>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table admin-table--clickable admin-table--users admin-table--roles">
                <thead>
                  <tr>
                    <th>{'\uD68C\uC6D0'}</th>
                    <th>{'\uAC00\uC785\uC77C'}</th>
                    <th>{'\uC8FC\uBB38 \uC218'}</th>
                    <th>{'\uB204\uC801 \uAD6C\uB9E4'}</th>
                    <th>{'\uAD8C\uD55C \uBD80\uC5EC'}</th>
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
                        <div className="admin-role-cell">
                          <button
                            type="button"
                            className={
                              'admin-toggle admin-toggle--compact '
                              + (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' ? 'is-on' : '')
                            }
                            onClick={(event) => {
                              event.stopPropagation();
                              onUpdateUserRole(
                                user.userNo,
                                user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' ? 'USER' : 'ADMIN'
                              );
                            }}
                            disabled={updating || user.role === 'SUPER_ADMIN'}
                          >
                            <span className="admin-toggle__track">
                              <span className="admin-toggle__thumb" />
                            </span>
                            <span className="admin-toggle__label">
                              {user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' ? 'ON' : 'OFF'}
                            </span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      ) : (
        <section className="admin-grid admin-grid--users">
          <article className="admin-card admin-card--panel">
            <h2>{'\uD68C\uC6D0 \uBAA9\uB85D'}</h2>
            <div className="admin-table-wrap">
              <table className="admin-table admin-table--clickable admin-table--users">
                <thead>
                  <tr>
                    <th>{'\uD68C\uC6D0'}</th>
                    <th>{'\uAC00\uC785\uC77C'}</th>
                    <th>{'\uC8FC\uBB38 \uC218'}</th>
                    <th>{'\uB204\uC801 \uAD6C\uB9E4'}</th>
                    <th>{'\uC0C1\uD0DC'}</th>
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
                            {'\uC0AD\uC81C'}
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
            <h2>{'\uD68C\uC6D0 \uC0C1\uC138 / \uC0C1\uD0DC \uAD00\uB9AC'}</h2>
            {!selectedUser ? (
              <AdminEmptyState
                title={'\uD68C\uC6D0\uC744 \uC120\uD0DD\uD574 \uC8FC\uC138\uC694.'}
                description={'\uC67C\uCABD \uBAA9\uB85D\uC5D0\uC11C \uD655\uC778\uD560 \uD68C\uC6D0\uC744 \uACE0\uB974\uBA74 \uC0C1\uC138 \uC815\uBCF4\uAC00 \uC5F4\uB9BD\uB2C8\uB2E4.'}
              />
            ) : (
              <div className="admin-stack">
                <div className="admin-summary-box">
                  <strong>{'\uAE30\uBCF8 \uC815\uBCF4'}</strong>
                  <div className="admin-muted">
                    {selectedUser.nickname} / {selectedUser.email} / {selectedUser.phone}
                  </div>
                </div>
                <div className="admin-summary-box">
                  <strong>{'\uAD6C\uB9E4 \uD1B5\uACC4'}</strong>
                  <div className="admin-muted">
                    {'\uC8FC\uBB38 '}{formatAdminCount(selectedUser.totalOrderCount, '\uAC74')}
                    {' / \uB204\uC801 \uAD6C\uB9E4 '}{formatAdminCurrency(selectedUser.totalPurchaseAmount)}
                    {' / \uB204\uC801 \uC808\uC57D '}{formatAdminCurrency(selectedUser.totalSavedAmount)}
                  </div>
                </div>
                <div className="admin-summary-box">
                  <strong>{'\uC0C1\uD0DC \uBCC0\uACBD'}</strong>
                  <div className="admin-page-actions">
                    <button
                      type="button"
                      className="admin-action admin-action--soft"
                      onClick={() => onUpdateUserStatus(selectedUser.userNo, 'ACTIVE')}
                      disabled={updating}
                    >
                      {'\uD65C\uC131'}
                    </button>
                    <button
                      type="button"
                      className="admin-action admin-action--line"
                      onClick={() => onUpdateUserStatus(selectedUser.userNo, 'WITHDRAWN')}
                      disabled={updating}
                    >
                      {'\uD0C8\uD1F4'}
                    </button>
                    <button
                      type="button"
                      className="admin-action admin-action--danger"
                      onClick={() => onUpdateUserStatus(selectedUser.userNo, 'BLOCKED')}
                      disabled={updating}
                    >
                      {'\uCC28\uB2E8'}
                    </button>
                  </div>
                </div>
                <div className="admin-summary-box">
                  <strong>{'\uAE30\uBCF8 \uBC30\uC1A1\uC9C0'}</strong>
                  <div className="admin-muted">
                    {selectedUser.defaultAddress || '\uAE30\uBCF8 \uBC30\uC1A1\uC9C0 \uC5C6\uC74C'}
                  </div>
                </div>
              </div>
            )}
          </article>
        </section>
      )}
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
function LegacyPurchasePage() {
  return null;
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
        title={'\uBC30\uB108 / \uB808\uC2DC\uD53C \uAD00\uB9AC'}
        description={'\uBA54\uC778 \uBC30\uB108 \uB178\uCD9C\uACFC \uB808\uC2DC\uD53C \uB9E4\uD551, \uCF58\uD150\uCE20 \uB178\uCD9C \uC21C\uC11C\uB97C \uAD00\uB9AC\uD558\uB294 \uD654\uBA74'}
        actions={
          <>
            <button type="button" className="admin-action admin-action--line" disabled>
              {'\uBC30\uB108 \uC5C5\uB85C\uB4DC \uC900\uBE44\uC911'}
            </button>
            <button type="button" className="admin-action admin-action--primary" onClick={onSyncRecipes} disabled={syncingRecipes}>
              {syncingRecipes ? '\uB3D9\uAE30\uD654 \uC911...' : '\uB808\uC2DC\uD53C \uB3D9\uAE30\uD654'}
            </button>
          </>
        }
      />

      <section className="admin-grid admin-grid--2">
        <article className="admin-card admin-card--panel">
          <h2>{'\uBA54\uC778 \uBC30\uB108 \uAD00\uB9AC'}</h2>
          <table className="admin-table">
            <thead>
              <tr>
                <th>{'\uBC30\uB108'}</th>
                <th>{'\uC81C\uBAA9'}</th>
                <th>{'\uB9C1\uD06C'}</th>
                <th>{'\uC0C1\uD0DC'}</th>
                <th>{'\uC21C\uC11C'}</th>
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
          <h2>{'\uB808\uC2DC\uD53C \uB9E4\uD551 \uAD00\uB9AC'}</h2>
          <table className="admin-table">
            <thead>
              <tr>
                <th>{'\uB808\uC2DC\uD53C'}</th>
                <th>{'\uC5F0\uACB0 \uC0C1\uD488'}</th>
                <th>{'\uB9E4\uCE6D \uC810\uC218'}</th>
                <th>{'\uC0C1\uD0DC'}</th>
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
            <strong>{'\uC774\uBBF8\uC9C0 \uC800\uC7A5 \uAE30\uC900'}</strong>
            <div className="admin-muted">
              {'PRODUCT_IMAGE, REVIEW_IMAGE, MAIN_BANNER\uB294 BLOB \uB370\uC774\uD130\uC774\uBA70 RECIPE\uC640 RECIPE_STEP\uC740 \uC678\uBD80 URL\uC744 \uC0AC\uC6A9\uD569\uB2C8\uB2E4.'}
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
        title={'\uC0C1\uD488 \uAD00\uB9AC'}
        description={'\uB9E4\uC785\uACFC \uC18C\uBD84\uC5D0\uC11C \uC0DD\uC131\uB41C \uC0C1\uD488\uC744 \uC218\uC815\uD558\uACE0 \uAD00\uB9AC\uD558\uB294 \uD654\uBA74'}
        actions={
          <>
            <button type="button" className="admin-action admin-action--line" onClick={onResetProductForm}>
              {'\uC120\uD0DD \uC0C1\uD488 \uB2E4\uC2DC \uBD88\uB7EC\uC624\uAE30'}
            </button>
          </>
        }
      />

      <div className="admin-filter-row">
        {[
          ['ALL', '\uC804\uCCB4'],
          ['SELLING', '\uD310\uB9E4\uC911'],
          ['STOP', '\uD310\uB9E4\uC911\uC9C0'],
          ['LOW_STOCK', '\uC7AC\uACE0\uBD80\uC871'],
          ['SEASONAL', '\uC81C\uCCA0\uC0C1\uD488'],
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
          <h2>{'\uC0C1\uD488 \uBAA9\uB85D'}</h2>
          <table className="admin-table admin-table--clickable">
            <thead>
              <tr>
                <th>{'\uC0C1\uD488'}</th>
                <th>{'\uCE74\uD14C\uACE0\uB9AC'}</th>
                <th>{'\uD310\uB9E4\uAC00'}</th>
                <th>{'\uC7AC\uACE0'}</th>
                <th>{'\uC0C1\uD0DC'}</th>
                <th>{'\uAD00\uB9AC'}</th>
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
                  <td>{formatAdminCount(product.stockQty, '\uAC1C')}</td>
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
                      {'\uC601\uAD6C \uC0AD\uC81C'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>

        <article className="admin-card admin-card--panel">
          <h2>{'\uC0C1\uD488 \uC218\uC815 / \uC0AD\uC81C'}</h2>
          <div className="admin-form-grid">
            <label>
              <span>{'\uC0C1\uD488\uBA85'}</span>
              <input name="productName" value={productForm.productName} onChange={onProductFormChange} />
            </label>
            <label>
              <span>{'\uCE74\uD14C\uACE0\uB9AC'}</span>
              <select name="categoryNo" value={productForm.categoryNo} onChange={onProductFormChange}>
                <option value="">{'\uC120\uD0DD'}</option>
                {categories.map((category) => (
                  <option key={category.categoryNo} value={category.categoryNo}>
                    {category.categoryName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{'\uD310\uB9E4\uAC00'}</span>
              <input name="salePrice" value={productForm.salePrice} onChange={onProductFormChange} />
            </label>
            <label>
              <span>{'\uC7AC\uACE0 \uC218\uB7C9'}</span>
              <input name="stockQty" value={productForm.stockQty} onChange={onProductFormChange} />
            </label>
            <label>
              <span>{'\uC6D0\uC0B0\uC9C0'}</span>
              <input name="origin" value={productForm.origin} onChange={onProductFormChange} />
            </label>
            <label>
              <span>{'\uB2E8\uC704'}</span>
              <input name="unit" value={productForm.unit} onChange={onProductFormChange} />
            </label>
            <label>
              <span>{'\uD3EC\uC7A5 \uC911\uB7C9'}</span>
              <input name="packageWeight" value={productForm.packageWeight} onChange={onProductFormChange} />
            </label>
            <label>
              <span>{'\uD310\uB9E4 \uC0C1\uD0DC'}</span>
              <select name="saleStatus" value={productForm.saleStatus} onChange={onProductFormChange}>
                <option value="READY">{'\uC900\uBE44\uC911'}</option>
                <option value="SELLING">{'\uD310\uB9E4\uC911'}</option>
                <option value="SOLD_OUT">{'\uD488\uC808'}</option>
                <option value="STOP">{'\uD310\uB9E4\uC911\uC9C0'}</option>
              </select>
            </label>
            <label>
              <span>{'\uC81C\uCCA0 \uC0C1\uD488'}</span>
              <select name="isSeasonal" value={productForm.isSeasonal} onChange={onProductFormChange}>
                <option value="N">{'\uC77C\uBC18'}</option>
                <option value="Y">{'\uC81C\uCCA0'}</option>
              </select>
            </label>
          </div>
          <label className="admin-form-field admin-form-field--full">
            <span>{'\uC0C1\uD488 \uC124\uBA85'}</span>
            <textarea name="description" value={productForm.description} onChange={onProductFormChange} />
          </label>
          <div className="admin-form-field admin-form-field--full">
            <span>{'\uB4F1\uB85D\uB41C \uC0C1\uD488 \uC774\uBBF8\uC9C0'}</span>
            <div className="admin-file-upload__hint">
              {'\uC774\uBBF8\uC9C0\uB294 \uB9E4\uC785 \uB2E8\uACC4\uC5D0\uC11C \uB4F1\uB85D\uD569\uB2C8\uB2E4. \uC5EC\uAE30\uC11C\uB294 \uC5F0\uACB0\uB41C \uC774\uBBF8\uC9C0\uB97C \uD655\uC778\uB9CC \uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.'}
            </div>
            {productImagePreviews.length ? (
              <div className="admin-image-preview-grid">
                {productImagePreviews.map((image, index) => (
                  <article className="admin-image-preview" key={image.key || image.imageNo || index}>
                    <div className="admin-image-preview__thumb">
                      <img
                        src={image.previewUrl}
                        alt={image.name || '\uC0C1\uD488 \uC774\uBBF8\uC9C0'}
                      />
                    </div>
                    <div className="admin-image-preview__meta">
                      <strong>{image.name || '\uC0C1\uD488 \uC774\uBBF8\uC9C0'}</strong>
                      <span>{image.isMain ? '\uB300\uD45C \uC774\uBBF8\uC9C0' : '\uCD94\uAC00 \uC774\uBBF8\uC9C0 ' + (index + 1)}</span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="admin-image-empty">
                {'\uC5F0\uACB0\uB41C \uC774\uBBF8\uC9C0\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4. \uC774\uBBF8\uC9C0\uB294 \uB9E4\uC785 \uB4F1\uB85D \uB2E8\uACC4\uC5D0\uC11C \uCD94\uAC00\uD574\uC8FC\uC138\uC694.'}
              </div>
            )}
          </div>
          <div className="admin-page-actions">
            <button type="button" className="admin-action admin-action--soft" onClick={onResetProductForm}>
              {'\uB418\uB3CC\uB9AC\uAE30'}
            </button>
            <button type="button" className="admin-action admin-action--primary" onClick={onSaveProduct} disabled={submitting}>
              {submitting ? '\uC800\uC7A5 \uC911...' : '\uC0C1\uD488 \uC800\uC7A5'}
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
  onCancelPackageHistory,
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
  const purchaseMetrics = calculatePurchaseDraftMetrics(purchaseForm);
  const packageMetrics = calculatePackageDraftMetrics(selectedBatch, packageForm);
  const selectedBatchPackageHistories = selectedBatch
    ? packageHistories.filter((history) => history.batchNo === selectedBatch.batchNo)
    : [];

  return (
    <>
      <AdminPageHeader
        title={'\uB9E4\uC785 / \uC18C\uBD84 \uAD00\uB9AC'}
        description={'\uB9E4\uC785 \uB2E8\uACC4\uC5D0\uC11C \uBC30\uCE58\uAE4C\uC9C0 \uB4F1\uB85D\uD558\uACE0, \uC18C\uBD84 \uB2E8\uACC4\uC5D0\uC11C \uD310\uB9E4\uAC00\uB97C \uD655\uC815\uD574 \uD310\uB9E4 \uC0C1\uD488\uC73C\uB85C \uC804\uD658\uD569\uB2C8\uB2E4.'}
      />

      <section className="admin-grid admin-grid--split">
        <article className="admin-card admin-card--panel">
          <h2>{'\uB9E4\uC785 \uB4F1\uB85D'}</h2>
          <div className="admin-form-grid">
            <label>
              <span>{'\uC2DC\uC138 \uD488\uBAA9'}</span>
              <select
                name="referenceItemCode"
                value={purchaseForm.referenceItemCode}
                onChange={onPurchaseReferenceChange}
                disabled={!selectedPurchaseCategoryName}
              >
                <option value="">{'\uC120\uD0DD'}</option>
                {filteredPurchaseReferenceItems.map((item) => (
                  <option key={item.itemCode} value={item.itemCode}>
                    {item.displayLabel || item.productName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{'\uCE74\uD14C\uACE0\uB9AC'}</span>
              <select name="categoryNo" value={purchaseForm.categoryNo} onChange={onPurchaseFormChange}>
                <option value="">{'\uC120\uD0DD'}</option>
                {categories.map((category) => (
                  <option key={category.categoryNo} value={category.categoryNo}>
                    {category.categoryName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{'\uD488\uBAA9\uBA85'}</span>
              <input
                name="productName"
                value={purchaseForm.productName}
                readOnly
                placeholder={'\uC2DC\uC138 \uD488\uBAA9\uC744 \uC120\uD0DD\uD558\uBA74 \uC790\uB3D9 \uC785\uB825\uB429\uB2C8\uB2E4.'}
              />
            </label>
            <label>
              <span>{'\uACF5\uAE09\uCC98'}</span>
              <select name="supplierProfileKey" value={purchaseForm.supplierProfileKey} onChange={onPurchaseFormChange}>
                {PURCHASE_SUPPLIER_PROFILES.map((profile) => (
                  <option key={profile.key} value={profile.key}>
                    {profile.supplierName}
                  </option>
                ))}
              </select>
            </label>
            <label><span>{'\uB9E4\uC785 \uC218\uB7C9'}</span><input name="purchaseQty" value={purchaseForm.purchaseQty} onChange={onPurchaseFormChange} /></label>
            <label><span>{'\uC2E4\uC81C \uB9E4\uC785 \uB2E8\uAC00'}</span><input name="actualUnitPrice" value={purchaseForm.actualUnitPrice} onChange={onPurchaseFormChange} /></label>
            <label><span>{'\uB2E8\uC704'}</span><input name="purchaseUnit" value={purchaseForm.purchaseUnit} onChange={onPurchaseFormChange} /></label>
            <label><span>{'\uBB3C\uB958\uBE44'}</span><input name="logisticsCost" value={purchaseForm.logisticsCost} onChange={onPurchaseFormChange} /></label>
            <label><span>{'\uC218\uC218\uB8CC\uC728(%)'}</span><input name="commissionRate" value={purchaseForm.commissionRate} onChange={onPurchaseFormChange} /></label>
            <label><span>{'\uD3D0\uAE30\uC728(%)'}</span><input name="discardRate" value={purchaseForm.discardRate} onChange={onPurchaseFormChange} /></label>
            <label><span>{'\uAE30\uD0C0 \uBE44\uC6A9'}</span><input name="otherPurchaseCost" value={purchaseForm.otherPurchaseCost} onChange={onPurchaseFormChange} /></label>
            <label><span>{'\uB9E4\uC785\uC77C'}</span><input type="date" name="purchaseDate" value={purchaseForm.purchaseDate} onChange={onPurchaseFormChange} /></label>
          </div>
          <div className="admin-page-actions admin-page-actions--end admin-page-actions--compact">
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
              {quotingPurchase ? '\uC2DC\uC138 \uC870\uD68C \uC911...' : '\uC2DC\uC138 \uC790\uB3D9 \uCC44\uC6C0'}
            </button>
          </div>
          <div className="admin-kpi-grid">
            <div className="admin-kpi-card admin-kpi-card--primary">
              <div className="admin-kpi-card__label">{'\uCD1D \uB9E4\uC785 \uC6D0\uAC00'}</div>
              <div className="admin-kpi-card__value">{formatAdminCurrency(purchaseMetrics.totalPurchaseCost)}</div>
            </div>
            <div className="admin-kpi-card">
              <div className="admin-kpi-card__label">{'\uC2E4\uD310\uB9E4 \uAC00\uB2A5\uB7C9'}</div>
              <div className="admin-kpi-card__value">{formatDecimalInput(purchaseMetrics.sellableQty, 2)}{purchaseForm.purchaseUnit}</div>
            </div>
            <div className="admin-kpi-card">
              <div className="admin-kpi-card__label">{'\uC2E4\uC81C \uC6D0\uAC00/kg'}</div>
              <div className="admin-kpi-card__value">{formatAdminCurrency(purchaseMetrics.actualCostPerKg)}</div>
            </div>
          </div>
          <details className="admin-disclosure">
            <summary>{'\uC0C1\uC138 \uACC4\uC0B0 \uBCF4\uAE30'}</summary>
            <div className="admin-disclosure__content">
              <div className="admin-summary-grid">
                <div className="admin-summary-box">
                  <strong>{'\uD3D0\uAE30\uB7C9'}</strong>
                  <div className="admin-summary-box__kpi">{formatDecimalInput(purchaseMetrics.discardQty, 2)}{purchaseForm.purchaseUnit}</div>
                </div>
                <div className="admin-summary-box">
                  <strong>{'\uC218\uC218\uB8CC \uAE08\uC561'}</strong>
                  <div className="admin-summary-box__kpi">{formatAdminCurrency(purchaseMetrics.commissionCost)}</div>
                </div>
                <div className="admin-summary-box">
                  <strong>{'\uC2E4\uC81C \uC6D0\uBB3C \uB9E4\uC785\uC561'}</strong>
                  <div className="admin-summary-box__kpi">{formatAdminCurrency(purchaseMetrics.actualPurchaseAmount)}</div>
                </div>
                <div className="admin-summary-box">
                  <strong>{'\uCC38\uACE0 \uB9E4\uC785 \uB2E8\uAC00'}</strong>
                  <div className="admin-summary-box__kpi">{formatAdminCurrency(purchaseForm.referenceUnitPrice)}</div>
                </div>
                <div className="admin-summary-box">
                  <strong>{'\uCC38\uACE0 \uCD1D \uB9E4\uC785\uAC00'}</strong>
                  <div className="admin-summary-box__kpi">{formatAdminCurrency(purchaseMetrics.referenceTotalPrice)}</div>
                </div>
                <div className="admin-summary-box">
                  <strong>{'\uACF5\uAE09\uCC98'}</strong>
                  <div className="admin-muted">{purchaseForm.supplierName}</div>
                  <div className="admin-muted">{'\uB4F1\uAE09 '}{purchaseForm.grade || '-'}</div>
                  <div className="admin-muted">{'\uC6D0\uC0B0\uC9C0 '}{purchaseForm.origin || '-'}</div>
                </div>
              </div>
              {purchaseQuote ? (
                <div className="admin-summary-box admin-summary-box--note">
                  <strong>{'\uC2DC\uC138 \uCC38\uACE0 \uC815\uBCF4'}</strong>
                  <div className="admin-muted">
                    {purchaseQuote.matchedItemName} {'\u00B7 '} {purchaseQuote.snapshotDate || '-'} {'\u00B7 '} {purchaseQuote.priceBasisUnit || '1kg'}
                  </div>
                  <div className="admin-muted">
                    {hasAdminValue(purchaseQuote.wholesaleSourcePrice)
                      ? `${formatAdminCurrency(purchaseQuote.wholesaleSourcePrice)} / ${purchaseQuote.wholesaleSourceUnit || purchaseQuote.snapshotUnit || '-'}`
                      : '-'}
                  </div>
                </div>
              ) : null}
            </div>
          </details>
          <div className="admin-form-field admin-form-field--full">
            <span>{'\uB9E4\uC785 \uC774\uBBF8\uC9C0'}</span>
            <label className="admin-file-upload">
              <input type="file" accept="image/*" multiple onChange={onPurchaseImagesChange} />
              <strong>{'\uC774\uBBF8\uC9C0 \uC120\uD0DD'}</strong>
              <small>{'\uB9E4\uC785 \uB2E8\uACC4\uC5D0\uC11C \uB4F1\uB85D\uD55C \uC774\uBBF8\uC9C0\uB97C \uC18C\uBD84\uACFC \uC0C1\uD488\uAD00\uB9AC\uC5D0\uC11C\uB3C4 \uADF8\uB300\uB85C \uC0AC\uC6A9\uD569\uB2C8\uB2E4.'}</small>
            </label>
            <div className="admin-file-upload__hint">
              {'\uAD8C\uC7A5 \uC0AC\uC774\uC988 1200 x 1200px \uC774\uC0C1 / \uC815\uC0AC\uAC01\uD615 \uBE44\uC728 / JPG, PNG, WEBP'}
            </div>
            <div className="admin-page-actions">
              <button type="button" className="admin-action admin-action--line" onClick={onClearPurchaseImages}>
                {'\uC120\uD0DD \uC774\uBBF8\uC9C0 \uCD08\uAE30\uD654'}
              </button>
            </div>
            {purchaseImagePreviews.length ? (
              <div className="admin-image-preview-grid">
                {purchaseImagePreviews.map((image, index) => (
                  <article className="admin-image-preview" key={image.key || image.imageNo || index}>
                    <div className="admin-image-preview__thumb">
                      <img src={image.previewUrl} alt={image.name || '\uB9E4\uC785 \uC774\uBBF8\uC9C0'} />
                    </div>
                    <div className="admin-image-preview__meta">
                      <strong>{image.name || '\uB9E4\uC785 \uC774\uBBF8\uC9C0'}</strong>
                      <span>{image.isMain ? '\uB300\uD45C \uC774\uBBF8\uC9C0' : '\uCD94\uAC00 \uC774\uBBF8\uC9C0 ' + (index + 1)}</span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="admin-image-empty">
                {'\uB9E4\uC785 \uC774\uBBF8\uC9C0\uB97C \uCD5C\uC18C 1\uC7A5 \uC774\uC0C1 \uB4F1\uB85D\uD574\uC8FC\uC138\uC694.'}
              </div>
            )}
          </div>
          <div className="admin-page-actions admin-page-actions--end">
            <button type="button" className="admin-action admin-action--primary" onClick={onCreatePurchase} disabled={submittingPurchase}>
              {submittingPurchase ? '\uC800\uC7A5 \uC911...' : '\uB9E4\uC785 \uB4F1\uB85D'}
            </button>
          </div>
        </article>

        <article className="admin-card admin-card--panel">
          <h2>{'\uC18C\uBD84 / \uD310\uB9E4 \uC804\uD658'}</h2>
          <section className="admin-batch-overview">
            <div className="admin-summary-box admin-summary-box--compact">
              <strong>{'\uC120\uD0DD \uBC30\uCE58'}</strong>
              <div className="admin-muted">
                {selectedBatch
                  ? `${selectedBatch.batchNo} / ${selectedBatch.productName} / ${selectedBatch.purchaseQty}${selectedBatch.purchaseUnit}`
                  : '\uC544\uB798 \uB9E4\uC785 / \uC18C\uBD84 \uC774\uB825 \uD14C\uC774\uBE14\uC5D0\uC11C \uBC30\uCE58\uB97C \uC120\uD0DD\uD574\uC8FC\uC138\uC694.'}
              </div>
            </div>
            <div className="admin-summary-box admin-summary-box--compact admin-summary-box--accent">
              <strong>{'\uC794\uC5EC \uC7AC\uACE0'}</strong>
              <div className="admin-summary-box__kpi">
                {formatDecimalInput(selectedBatch?.remainingQty ?? selectedBatch?.sellableQty ?? 0, 2)}
                {selectedBatch?.purchaseUnit || ''}
              </div>
            </div>
          </section>
          {selectedBatchProduct ? (
            <div className="admin-summary-box admin-summary-box--note admin-summary-box--compact">
              <strong>{'\uC5F0\uACB0 \uC0C1\uD488'}</strong>
              <div className="admin-muted">
                {selectedBatchProduct.productName} / {selectedBatchProduct.categoryName} / {'\uC0C1\uD488\uBC88\uD638 '}{selectedBatchProduct.productNo}
              </div>
              {linkedProductPreviews.length ? (
                <div className="admin-image-preview-grid admin-image-preview-grid--compact">
                  {linkedProductPreviews.slice(0, 1).map((image, index) => (
                    <article className="admin-image-preview admin-image-preview--compact" key={image.key || image.imageNo || index}>
                      <div className="admin-image-preview__thumb">
                        <img src={image.previewUrl} alt={image.name || '\uC0C1\uD488 \uC774\uBBF8\uC9C0'} />
                      </div>
                      <div className="admin-image-preview__meta">
                        <strong>{image.name || '\uC0C1\uD488 \uC774\uBBF8\uC9C0'}</strong>
                        <span>{image.isMain ? '\uB300\uD45C \uC774\uBBF8\uC9C0' : '\uCD94\uAC00 \uC774\uBBF8\uC9C0'}</span>
                      </div>
                    </article>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
          <section className="admin-section-block">
            <div className="admin-section-block__head">
              <h3>{'\uC785\uB825 \uC601\uC5ED'}</h3>
            </div>
            <div className="admin-form-grid admin-form-grid--spaced admin-form-grid--priority">
            {needsLegacyProductLink ? (
              <label>
                <span>{'\uC5F0\uACB0 \uC0C1\uD488'}</span>
                <select name="productNo" value={packageForm.productNo} onChange={onPackageFormChange}>
                  <option value="">{'\uC120\uD0DD'}</option>
                  {products.map((product) => (
                    <option key={product.productNo} value={product.productNo}>
                      {product.productName}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label><span>{'\uC0DD\uC131 \uC218\uB7C9'}</span><input name="packagedQty" value={packageForm.packagedQty} onChange={onPackageFormChange} /></label>
            <label><span>{`1\uAC1C\uB2F9 \uC911\uB7C9 (${selectedBatch?.purchaseUnit || 'kg'})`}</span><input name="packagedWeight" value={packageForm.packagedWeight} onChange={onPackageFormChange} /></label>
            <label><span>{'\uD310\uB9E4\uAC00'}</span><input name="salePrice" value={packageForm.salePrice} onChange={onPackageFormChange} /></label>
            </div>
            <div className="admin-form-grid admin-form-grid--spaced admin-form-grid--secondary">
            <label><span>{'\uD3EC\uC7A5\uC7AC\uBE44'}</span><input name="packagingMaterialCost" value={packageForm.packagingMaterialCost} onChange={onPackageFormChange} /></label>
            <label><span>{'\uC18C\uBD84 \uC778\uAC74\uBE44'}</span><input name="packagingLaborCost" value={packageForm.packagingLaborCost} onChange={onPackageFormChange} /></label>
            <label><span>{'\uAE30\uD0C0 \uC18C\uBD84\uBE44'}</span><input name="otherPackagingCost" value={packageForm.otherPackagingCost} onChange={onPackageFormChange} /></label>
            <label>
              <span>{'\uD310\uB9E4 \uC0C1\uD0DC'}</span>
              <select name="saleStatus" value={packageForm.saleStatus} onChange={onPackageFormChange}>
                <option value="SELLING">{'\uD310\uB9E4\uC911'}</option>
                <option value="READY">{'\uC900\uBE44\uC911'}</option>
                <option value="SOLD_OUT">{'\uD488\uC808'}</option>
                <option value="STOP">{'\uD310\uB9E4\uC911\uC9C0'}</option>
              </select>
            </label>
            </div>
            <div className="admin-form-field admin-form-field--full admin-form-field--memo">
              <span>{'\uBA54\uBAA8'}</span>
              <textarea name="note" value={packageForm.note} onChange={onPackageFormChange} />
            </div>
          </section>
          {packageMetrics ? (
            <>
              <section className="admin-section-block">
                <div className="admin-section-block__head">
                  <h3>{'\uACB0\uACFC \uC694\uC57D'}</h3>
                </div>
                <div className="admin-kpi-grid">
                  <div className="admin-kpi-card">
                    <div className="admin-kpi-card__label">{'\uAC1C\uB2F9 \uC608\uC0C1 \uC6D0\uAC00'}</div>
                    <div className="admin-kpi-card__value">{formatAdminCurrency(packageMetrics.finalCostPerPackage)}</div>
                  </div>
                  <div className="admin-kpi-card admin-kpi-card--primary">
                    <div className="admin-kpi-card__label">{'\uAC1C\uB2F9 \uC608\uC0C1 \uC774\uC775'}</div>
                    <div className="admin-kpi-card__value">{formatAdminCurrency(packageMetrics.expectedProfitPerUnit)}</div>
                  </div>
                  <div className="admin-kpi-card">
                    <div className="admin-kpi-card__label">{'\uB9C8\uC9C4\uC728'}</div>
                    <div className="admin-kpi-card__value">{formatDecimalInput(packageMetrics.marginRate, 1)}%</div>
                  </div>
                </div>
                {packageMetrics.exceedsSellableQty ? (
                  <div className="admin-inline-error" style={{ marginTop: '12px' }}>
                    {'\uC18C\uBD84 \uC218\uB7C9\uC774 \uC794\uC5EC \uC7AC\uACE0\uB97C \uCD08\uACFC\uD588\uC2B5\uB2C8\uB2E4.'}
                  </div>
                ) : null}
              </section>
              <details className="admin-disclosure">
                <summary>{'\uC0C1\uC138 \uBCF4\uAE30'}</summary>
                <div className="admin-disclosure__content">
                  <div className="admin-summary-grid">
                    <div className="admin-summary-box">
                      <strong>{'\uC18C\uBD84 \uCD1D\uBE44\uC6A9'}</strong>
                      <div className="admin-summary-box__kpi">{formatAdminCurrency(packageMetrics.totalPackagingCost)}</div>
                    </div>
                    <div className="admin-summary-box">
                      <strong>{'\uCD1D \uC0AC\uC6A9\uB7C9'}</strong>
                      <div className="admin-summary-box__kpi">{formatDecimalInput(packageMetrics.requiredSellableQty, 2)}{selectedBatch?.purchaseUnit || ''}</div>
                    </div>
                    <div className="admin-summary-box">
                      <strong>{'\uC794\uC5EC \uC7AC\uACE0'}</strong>
                      <div className="admin-summary-box__kpi">{formatDecimalInput(packageMetrics.remainingQty, 2)}{selectedBatch?.purchaseUnit || ''}</div>
                    </div>
                    <div className="admin-summary-box">
                      <strong>{'\uCD5C\uC885 \uC6D0\uAC00/kg'}</strong>
                      <div className="admin-summary-box__kpi">{formatAdminCurrency(packageMetrics.finalCostPerKg)}</div>
                    </div>
                    <div className="admin-summary-box">
                      <strong>{'\uC608\uC0C1 \uCD1D\uB9E4\uCD9C'}</strong>
                      <div className="admin-summary-box__kpi">{formatAdminCurrency(packageMetrics.expectedTotalSales)}</div>
                    </div>
                    <div className="admin-summary-box">
                      <strong>{'\uC608\uC0C1 \uCD1D\uC774\uC775'}</strong>
                      <div className="admin-summary-box__kpi">{formatAdminCurrency(packageMetrics.expectedTotalProfit)}</div>
                    </div>
                  </div>
                </div>
              </details>
              <div className="admin-page-actions admin-page-actions--end admin-page-actions--spaced-top">
                <button
                  type="button"
                  className="admin-action admin-action--primary"
                  onClick={onCreatePackageHistory}
                  disabled={!selectedBatch || submittingPackage}
                >
                  {submittingPackage ? '\uCC98\uB9AC \uC911...' : '\uC18C\uBD84 \uC2E4\uD589'}
                </button>
              </div>
            </>
          ) : null}
          {selectedBatchPackageHistories.length ? (
            <section className="admin-section-block admin-section-block--separated">
              <div className="admin-section-block__head">
                <h3>{'\uC18C\uBD84 \uC774\uB825 \uAD00\uB9AC'}</h3>
              </div>
              <div className="admin-summary-box admin-summary-box--note">
              <div className="admin-history-note-head">
                <strong>{'\uC774\uC804 \uC18C\uBD84 \uC791\uC5C5'}</strong>
                <span>{formatAdminDate(selectedBatchPackageHistories[0]?.packagedAt)}</span>
              </div>
              <div className="admin-history-list">
                {selectedBatchPackageHistories.map((history) => (
                  <div className="admin-history-item admin-history-item--row" key={history.packageNo}>
                    <div className="admin-history-item__meta">{'\uC0DD\uC131 : '}{history.packagedQty}{'\uAC1C'}</div>
                    <div className="admin-history-item__meta">{'\uAC1C\uB2F9 : '}{formatDecimalInput(history.packagedWeight, 2)}{selectedBatch?.purchaseUnit || ''}</div>
                    <div className="admin-history-item__meta">{'\uD310\uB9E4\uAC00 : '}{formatAdminCurrency(history.salePrice)}</div>
                    <button
                      type="button"
                      className="admin-action admin-action--danger"
                      onClick={() => onCancelPackageHistory(history)}
                      disabled={submittingPackage}
                    >
                      {'\uC7AC\uACE0 \uBCF5\uAD6C'}
                    </button>
                  </div>
                ))}
              </div>
              </div>
            </section>
          ) : null}
        </article>
      </section>

      <section className="admin-card admin-card--panel">
        <h2>{'\uB9E4\uC785 / \uC18C\uBD84 \uC774\uB825'}</h2>
        <table className="admin-table admin-table--clickable">
          <thead>
            <tr>
              <th>{'\uBC30\uCE58\uBC88\uD638'}</th>
              <th>{'\uD488\uBAA9'}</th>
              <th>{'\uB9E4\uC785\uC218\uB7C9'}</th>
              <th>{'\uCD1D \uB9E4\uC785\uC6D0\uAC00'}</th>
              <th>{'\uC2E4\uD310\uB9E4 \uAC00\uB2A5\uB7C9'}</th>
              <th>{'\uC794\uC5EC \uC7AC\uACE0'}</th>
              <th>{'\uC0C1\uD0DC'}</th>
              <th>{'\uCD5C\uADFC \uC18C\uBD84'}</th>
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
                  <td>{formatAdminCurrency(purchase.totalPurchaseCost || purchase.purchasePrice)}</td>
                  <td>{formatDecimalInput(purchase.sellableQty || 0, 2)}{purchase.purchaseUnit}</td>
                  <td>{formatDecimalInput(purchase.remainingQty ?? purchase.sellableQty ?? 0, 2)}{purchase.purchaseUnit}</td>
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
                      {'\uC0AD\uC81C'}
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
  const authUser = getAuthUser();
  const canManageAdminRole = isSuperAdminUser(authUser);
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
      setLoadError(error.message || '\uAD00\uB9AC\uC790 \uB370\uC774\uD130\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.');
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
          setActionError(error.message || '\uC8FC\uBB38 \uC0C1\uC138\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.');
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

  const purchaseCategories = useMemo(
    () => categories.filter(
      (category) => !ADMIN_DISABLED_PURCHASE_CATEGORY_NAMES.has(String(category?.categoryName || '').trim())
    ),
    [categories]
  );

  const purchaseReferenceItemsForFlow = useMemo(
    () => normalizedPurchaseReferenceItems.filter(
      (item) => !ADMIN_DISABLED_PURCHASE_CATEGORY_NAMES.has(String(item?.categoryName || '').trim())
    ),
    [normalizedPurchaseReferenceItems]
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
          nextForm.referenceUnitPrice = formatDecimalInput(
            Number(purchaseQuote.pricingBasePrice || purchaseQuote.purchasePrice || 0)
            / Math.max(Number(purchaseQuote.pricingBaseQty || purchaseQuote.purchaseQty || 1), 1),
            2
          );
          nextForm.referenceTotalPrice = formatDecimalInput(nextPurchasePrice, 2);
          nextForm.purchasePrice = formatDecimalInput(nextPurchasePrice, 2);
        }
      }

      if (name === 'supplierProfileKey') {
        const selectedSupplierProfile = findPurchaseSupplierProfile(value);
        const suggestedActualUnitPrice = calculateSupplierSuggestedUnitPrice(
          nextForm.referenceUnitPrice,
          selectedSupplierProfile
        );
        nextForm.supplierName = selectedSupplierProfile.supplierName;
        nextForm.supplierType = selectedSupplierProfile.supplierType;
        nextForm.logisticsCost = formatDecimalInput(selectedSupplierProfile.defaultLogisticsCost, 0);
        nextForm.commissionRate = formatDecimalInput(selectedSupplierProfile.defaultCommissionRate, 2);
        nextForm.discardRate = formatDecimalInput(selectedSupplierProfile.defaultDiscardRate, 2);
        if (suggestedActualUnitPrice > 0) {
          nextForm.actualUnitPrice = formatDecimalInput(suggestedActualUnitPrice, 2);
          nextForm.actualPurchaseAmount = formatDecimalInput(
            suggestedActualUnitPrice * toNumber(nextForm.purchaseQty, 0),
            2
          );
        }
      }

      if (name === 'referenceUnitPrice' || name === 'purchaseQty') {
        const selectedSupplierProfile = findPurchaseSupplierProfile(nextForm.supplierProfileKey);
        const suggestedActualUnitPrice = calculateSupplierSuggestedUnitPrice(
          nextForm.referenceUnitPrice,
          selectedSupplierProfile
        );
        if (suggestedActualUnitPrice > 0) {
          nextForm.actualUnitPrice = formatDecimalInput(suggestedActualUnitPrice, 2);
          nextForm.actualPurchaseAmount = formatDecimalInput(
            suggestedActualUnitPrice * toNumber(nextForm.purchaseQty, 0),
            2
          );
        }
      }

      if (name === 'actualUnitPrice') {
        nextForm.actualPurchaseAmount = formatDecimalInput(
          toNumber(nextForm.actualUnitPrice, 0) * toNumber(nextForm.purchaseQty, 0),
          2
        );
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
      setActionError('\uC2DC\uC138 \uD488\uBAA9\uC744 \uC120\uD0DD\uD55C \uB4A4 \uC2DC\uC138 \uC790\uB3D9 \uCC44\uC6C0\uC744 \uB20C\uB7EC\uC8FC\uC138\uC694.');
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
      setPurchaseForm((current) => {
        const nextPurchaseQty =
          quote.purchaseQty == null ? current.purchaseQty : formatDecimalInput(quote.purchaseQty, 2);
        const nextReferenceUnitPrice =
          quote.purchaseQty && quote.purchasePrice != null
            ? Number(quote.purchasePrice) / Math.max(Number(quote.purchaseQty), 1)
            : toNumber(current.referenceUnitPrice, 0);
        const selectedSupplierProfile = findPurchaseSupplierProfile(current.supplierProfileKey);
        const suggestedActualUnitPrice = calculateSupplierSuggestedUnitPrice(
          nextReferenceUnitPrice,
          selectedSupplierProfile
        );

        return {
          ...current,
          purchaseUnit: quote.purchaseUnit || current.purchaseUnit,
          purchaseQty: nextPurchaseQty,
          referenceUnitPrice: formatDecimalInput(nextReferenceUnitPrice, 2),
          referenceTotalPrice:
            quote.purchasePrice == null ? current.referenceTotalPrice : formatDecimalInput(quote.purchasePrice, 2),
          referenceSnapshotDate: quote.snapshotDate || current.referenceSnapshotDate,
          actualUnitPrice:
            suggestedActualUnitPrice > 0
              ? formatDecimalInput(suggestedActualUnitPrice, 2)
              : current.actualUnitPrice,
          actualPurchaseAmount:
            suggestedActualUnitPrice > 0
              ? formatDecimalInput(suggestedActualUnitPrice * toNumber(nextPurchaseQty, 0), 2)
              : current.actualPurchaseAmount,
          purchasePrice:
            quote.purchasePrice == null ? current.purchasePrice : formatDecimalInput(quote.purchasePrice, 2),
        };
      });
      setActionSuccess(
        quote.quoteSource === 'RETAIL_FALLBACK'
          ? `${quote.matchedItemName || productName} \uC18C\uB9E4 \uC2DC\uC138\uB97C \uAE30\uC900\uC73C\uB85C \uB9E4\uC785 \uC815\uBCF4\uB97C \uC790\uB3D9 \uC785\uB825\uD588\uC2B5\uB2C8\uB2E4.`
          : `${quote.matchedItemName || productName} \uCD5C\uC2E0 \uB3C4\uB9E4 \uC2DC\uC138\uB97C \uAE30\uC900\uC73C\uB85C \uB9E4\uC785 \uC815\uBCF4\uB97C \uC790\uB3D9 \uC785\uB825\uD588\uC2B5\uB2C8\uB2E4.`
      );
    } catch (error) {
      setPurchaseQuote(null);
      setActionError(error.message || '\uC2DC\uC138 \uAE30\uBC18 \uB9E4\uC785 \uC815\uBCF4\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.');
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
      setActionSuccess('\uC0C1\uD488 \uC815\uBCF4\uAC00 \uC815\uC0C1\uC801\uC73C\uB85C \uC218\uC815\uB418\uC5C8\uC2B5\uB2C8\uB2E4.');
    } catch (error) {
      setActionError(error.message || '\uC0C1\uD488 \uC800\uC7A5\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.');
    } finally {
      setSavingProduct(false);
    }
  }

  async function handleRetireProduct(product) {
    if (!product?.productNo) {
      return;
    }

    const shouldDelete = window.confirm(
      `'${product.productName}' \uC0C1\uD488\uC744 \uC601\uAD6C \uC0AD\uC81C\uD560\uAE4C\uC694?\n\n\uC8FC\uBB38 \uC774\uB825\uC774 \uC788\uB294 \uC0C1\uD488\uC740 \uC0AD\uC81C\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.`
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
      setActionSuccess('\uC0C1\uD488\uC744 \uC0AD\uC81C\uD588\uC2B5\uB2C8\uB2E4.');
    } catch (error) {
      setActionError(error.message || '\uC0C1\uD488 \uC0AD\uC81C \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.');
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
      setActionError(error.message || '\uC8FC\uBB38 \uC0C1\uD0DC \uBCC0\uACBD\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.');
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
      setActionError('\uBC30\uC1A1 \uC644\uB8CC\uB41C \uC8FC\uBB38\uB9CC \uC815\uBCF4\uB97C \uC0AD\uC81C\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.');
      return;
    }

    const shouldDelete = window.confirm(
      `'${order.orderId}' \uC8FC\uBB38 \uC815\uBCF4\uB97C \uC0AD\uC81C\uD560\uAE4C\uC694?\n\n\uBC30\uC1A1 \uC644\uB8CC \uC8FC\uBB38\uB9CC \uC0AD\uC81C\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.`
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
      setActionSuccess('\uBC30\uC1A1 \uC644\uB8CC \uC8FC\uBB38 \uC815\uBCF4\uB97C \uC0AD\uC81C\uD588\uC2B5\uB2C8\uB2E4.');
    } catch (error) {
      setActionError(error.message || '\uC8FC\uBB38 \uC815\uBCF4 \uC0AD\uC81C\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.');
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
      setActionError(error.message || '\uD68C\uC6D0 \uC0C1\uD0DC \uBCC0\uACBD\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.');
    } finally {
      setUpdatingUser(false);
    }
  }

  async function handleUpdateUserRole(userNo, role) {
    setUpdatingUser(true);
    setActionError('');
    setActionSuccess('');

    try {
      await updateAdminUserRole(userNo, role);
      const nextUsers = await fetchAdminUsers();
      setUsers(nextUsers);
      setActionSuccess(
        role === 'ADMIN' ? '\uAD00\uB9AC\uC790 \uAD8C\uD55C\uC744 \uBD80\uC5EC\uD588\uC2B5\uB2C8\uB2E4.' : '\uAD00\uB9AC\uC790 \uAD8C\uD55C\uC744 \uD574\uC81C\uD588\uC2B5\uB2C8\uB2E4.'
      );
    } catch (error) {
      setActionError(error.message || '\uAD00\uB9AC\uC790 \uAD8C\uD55C \uBCC0\uACBD\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.');
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
      const { referenceItemCode, supplierProfileKey, ...purchasePayload } = purchaseForm;
      const purchaseMetrics = calculatePurchaseDraftMetrics(purchaseForm);
      const savedBatch = await createAdminPurchaseBatch({
        ...purchasePayload,
        categoryNo: Number(purchaseForm.categoryNo),
        purchaseQty: Number(purchaseForm.purchaseQty),
        referenceUnitPrice: Number(purchaseForm.referenceUnitPrice),
        referenceTotalPrice: Number(purchaseForm.referenceTotalPrice || purchaseMetrics.referenceTotalPrice),
        actualUnitPrice: Number(purchaseForm.actualUnitPrice),
        actualPurchaseAmount: Number(
          purchaseForm.actualPurchaseAmount || purchaseMetrics.actualPurchaseAmount
        ),
        logisticsCost: Number(purchaseForm.logisticsCost),
        commissionRate: Number(purchaseForm.commissionRate),
        commissionCost: Number(purchaseMetrics.commissionCost),
        otherPurchaseCost: Number(purchaseForm.otherPurchaseCost),
        discardRate: Number(purchaseForm.discardRate),
        discardQty: Number(purchaseMetrics.discardQty),
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
      setActionSuccess('\uB9E4\uC785\uACFC \uCD08\uC548 \uC0C1\uD488 \uB4F1\uB85D\uC774 \uC644\uB8CC\uB418\uC5C8\uC2B5\uB2C8\uB2E4. \uC18C\uBD84 \uB2E8\uACC4\uC5D0\uC11C \uD310\uB9E4 \uC815\uBCF4\uB97C \uD655\uC815\uD574\uC8FC\uC138\uC694.');
    } catch (error) {
      setActionError(error.message || '\uB9E4\uC785 \uB4F1\uB85D\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.');
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
        packagingMaterialCost: Number(packageForm.packagingMaterialCost),
        packagingLaborCost: Number(packageForm.packagingLaborCost),
        otherPackagingCost: Number(packageForm.otherPackagingCost),
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
      setActionSuccess('\uC18C\uBD84 \uC815\uBCF4\uAC00 \uC0C1\uD488\uC5D0 \uBC18\uC601\uB418\uC5C8\uC2B5\uB2C8\uB2E4. \uC0C1\uD488\uAD00\uB9AC\uC5D0\uC11C\uB294 \uC218\uC815/\uC0AD\uC81C\uB9CC \uC9C4\uD589\uD558\uBA74 \uB429\uB2C8\uB2E4.');
    } catch (error) {
      setActionError(error.message || '\uC18C\uBD84 \uCC98\uB9AC\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.');
    } finally {
      setSavingPackage(false);
    }
  }

  async function handleDeletePurchaseBatch(purchase) {
    if (!purchase?.batchNo) {
      return;
    }

    const shouldDelete = window.confirm(
      `'${purchase.productName}' \uB9E4\uC785/\uC18C\uBD84 \uC774\uB825\uC744 \uC0AD\uC81C\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?\n\n\uC5F0\uACB0\uB41C \uC18C\uBD84 \uC774\uB825\uC740 \uD568\uAED8 \uC0AD\uC81C\uB418\uACE0, \uC0C1\uD488 \uC815\uBCF4\uB294 \uC720\uC9C0\uB429\uB2C8\uB2E4.`
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
      setActionSuccess('\uB9E4\uC785/\uC18C\uBD84 \uC774\uB825\uC744 \uC0AD\uC81C\uD588\uC2B5\uB2C8\uB2E4.');
    } catch (error) {
      setActionError(error.message || '\uB9E4\uC785/\uC18C\uBD84 \uC774\uB825 \uC0AD\uC81C\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.');
    } finally {
      setSavingPurchase(false);
    }
  }

  async function handleCancelPackageHistory(packageHistory) {
    if (!packageHistory?.packageNo) {
      return;
    }

    const shouldCancel = window.confirm(
      '이 소분 작업을 되돌리시겠습니까?\n\n재고와 상품 재고가 함께 복구됩니다.'
    );
    if (!shouldCancel) {
      return;
    }

    setSavingPackage(true);
    setActionError('');
    setActionSuccess('');

    try {
      await cancelAdminPackageHistory(packageHistory.packageNo);
      const [nextPurchases, nextPackageHistories, nextProducts] = await Promise.all([
        fetchAdminPurchases(),
        fetchAdminPackageHistories(),
        fetchAdminProducts(),
      ]);
      setPurchases(nextPurchases);
      setPackageHistories(nextPackageHistories);
      setProducts(nextProducts);
      setActionSuccess('소분 이력을 취소하고 재고를 복구했습니다.');
    } catch (error) {
      setActionError(error.message || '소분 취소에 실패했습니다.');
    } finally {
      setSavingPackage(false);
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
      setActionError(error.message || '\uB808\uC2DC\uD53C \uB3D9\uAE30\uD654\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.');
    } finally {
      setSyncingRecipes(false);
    }
  }

  if (!adminMode) {
    return (
      <div className="admin-access">
        <div className="admin-access__card">
          <h1>{'\uAD00\uB9AC\uC790 \uBBF8\uB9AC\uBCF4\uAE30'}</h1>
          <p>{'\uB85C\uADF8\uC778 \uAE30\uB2A5 \uC774\uC804\uC5D0 \uC784\uC2DC \uC804\uD658 \uBC84\uD2BC\uC73C\uB85C \uAD00\uB9AC\uC790 \uD654\uBA74\uC5D0 \uC9C4\uC785\uD569\uB2C8\uB2E4.'}</p>
          <div className="admin-page-actions">
            <button type="button" className="admin-action admin-action--line" onClick={() => leaveAdminPage('#/')}>
              {'\uC0AC\uC6A9\uC790 \uD654\uBA74\uC73C\uB85C'}
            </button>
            <button type="button" className="admin-action admin-action--primary" onClick={() => openAdminPage('#/admin')}>
              {'\uAD00\uB9AC\uC790 \uD654\uBA74 \uC5F4\uAE30'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout
      activePage={currentPage === 'dashboard' ? 'dashboard' : currentPage}
      onLeaveUserService={() => leaveAdminPage('#/')}
      onLogout={() => {
        clearAuthUser();
        leaveAdminPage('#/login');
      }}
    >
      {loading ? <div className="admin-loading">{'\uAD00\uB9AC\uC790 \uB370\uC774\uD130\uB97C \uBD88\uB7EC\uC624\uB294 \uC911\uC785\uB2C8\uB2E4.'}</div> : null}
      {!loading && loadError ? <div className="admin-error">{loadError}</div> : null}
      {!loading && !loadError && actionError ? <div className="admin-inline-error">{actionError}</div> : null}
      {!loading && !loadError && actionSuccess ? (
        <div className="admin-inline-success">{actionSuccess}</div>
      ) : null}
      {!loading && !loadError && false ? (
        <div className="admin-page-actions admin-page-actions--spaced">
          <span className="admin-muted">
            ???????????????????? {currentUser.nickname} ({currentUser.userId})
          </span>
          <button
            type="button"
            className="admin-action admin-action--danger"
            onClick={() => handleDeleteUser(currentUser)}
            disabled={updatingUser}
          >
            ????????????????????????
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
              onUpdateUserRole={handleUpdateUserRole}
              onDeleteUser={handleDeleteUser}
              canManageAdminRole={canManageAdminRole}
              updating={updatingUser}
            />
          ) : null}
          {currentPage === 'purchase' ? (
            <PurchasePage
              categories={purchaseCategories}
              products={products}
              purchases={purchases}
              packageHistories={packageHistories}
              purchaseReferenceItems={purchaseReferenceItemsForFlow}
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
              onCancelPackageHistory={handleCancelPackageHistory}
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
