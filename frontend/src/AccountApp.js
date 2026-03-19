import { useEffect, useState } from 'react';
import './styles/account.css';
import DashboardView from './DashboardView';
import MyPageView from './MyPageView';
import ActivityView from './ActivityView';
import OrdersView from './OrdersView';
import AddressModal from './AddressModal';
import { addCartItemToApi, fetchProductsFromApi } from './api/productApi';
import { persistValue, readStoredValue } from './components/productUiUtils';

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || '').replace(/\/+$/, '');
const ORDER_API_BASE = `${API_BASE_URL}/api/orders`;
const DASHBOARD_API_BASE = `${API_BASE_URL}/api/dashboard`;
const USER_API_BASE = `${API_BASE_URL}/api/users`;
const ADDRESS_API_BASE = `${USER_API_BASE}/me/addresses`;
const REVIEW_API_BASE = `${API_BASE_URL}/api/reviews`;
const DEMO_USER_NO = '1';
const WISHLIST_STORAGE_KEY = 'oneulFarmWishlist';
const CART_STORAGE_KEY = 'oneulFarmCart';

const EMPTY_PROFILE = {
  userId: '',
  nickname: '',
  email: '',
  phone: '',
  defaultAddress: '',
  totalSavedAmount: 0,
};

const EMPTY_SUMMARY = {
  totalSavedAmount: 0,
  monthlySavedAmount: 0,
  totalOrderCount: 0,
  totalPurchaseAmount: 0,
};

const EMPTY_DASHBOARD_PATTERNS = {
  averagePurchaseUnitPrice: 0,
  averageSavingRate: 0,
  topPurchasedProducts: [],
  recentPurchasedProducts: [],
};

const EMPTY_PROFILE_FORM = {
  nickname: '',
  email: '',
  phone: '',
};

const EMPTY_PASSWORD_FORM = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

const EMPTY_WITHDRAW_FORM = {
  currentPassword: '',
};

const EMPTY_ORDER_FILTERS = {
  deliveryStatus: 'ALL',
  dateFrom: '',
  dateTo: '',
};

const EMPTY_DUPLICATE_STATE = {
  email: {
    checking: false,
    available: null,
    message: '',
    checkedValue: '',
  },
  nickname: {
    checking: false,
    available: null,
    message: '',
    checkedValue: '',
  },
};

const EMPTY_ADDRESS_FORM = {
  addressName: '',
  recipientName: '',
  recipientPhone: '',
  zipCode: '',
  address1: '',
  address2: '',
  deliveryMessage: '',
  isDefault: 'N',
};

const EMPTY_REVIEW_FORM = {
  orderItemNo: '',
  rating: 5,
  content: '',
};

const ACCOUNT_ROUTES = {
  dashboard: '#/dashboard',
  mypage: '#/mypage',
  activity: '#/mypage/activity',
  orders: '#/orders',
};

function getAccountPageFromHash(hash) {
  if (hash.startsWith(ACCOUNT_ROUTES.dashboard)) {
    return 'dashboard';
  }

  if (hash.startsWith(ACCOUNT_ROUTES.activity)) {
    return 'activity';
  }

  if (hash.startsWith('#/activity')) {
    return 'activity';
  }

  if (hash.startsWith(ACCOUNT_ROUTES.orders)) {
    return 'orders';
  }

  return 'mypage';
}

function validateAddressForm(form) {
  const recipientName = String(form.recipientName || '').trim();
  const recipientPhone = String(form.recipientPhone || '').trim();
  const zipCode = String(form.zipCode || '').trim();
  const address1 = String(form.address1 || '').trim();

  if (!recipientName) {
    return '수령인을 입력해 주세요.';
  }

  if (!recipientPhone) {
    return '연락처를 입력해 주세요.';
  }

  if (!/^01[0-9]-?\d{3,4}-?\d{4}$/.test(recipientPhone)) {
    return '연락처 형식이 올바르지 않습니다. 예: 010-1234-5678';
  }

  if (!zipCode) {
    return '우편번호를 입력해 주세요.';
  }

  if (!/^\d{5}$/.test(zipCode)) {
    return '우편번호는 5자리 숫자로 입력해 주세요.';
  }

  if (!address1) {
    return '기본 주소를 입력해 주세요.';
  }

  return '';
}

function extractHtmlErrorMessage(text) {
  if (!text || !text.includes('<html')) {
    return '';
  }

  const messageMatch = text.match(/<p><b>메시지<\/b>\s*([^<]+)<\/p>/i);
  if (messageMatch?.[1]) {
    return messageMatch[1].trim();
  }

  const titleMatch = text.match(/<h1>([^<]+)<\/h1>/i);
  if (titleMatch?.[1]) {
    return titleMatch[1].trim();
  }

  return '';
}

async function parseResponse(response, fallbackMessage) {
  const text = await response.text();
  let payload = null;

  try {
    payload = text ? JSON.parse(text) : null;
  } catch (error) {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(payload?.message || extractHtmlErrorMessage(text) || text || fallbackMessage);
  }

  return payload || {};
}

function toProfileForm(profile) {
  return {
    nickname: profile.nickname || '',
    email: profile.email || '',
    phone: profile.phone || '',
  };
}

function buildWishlistBadge(product) {
  if (product?.badgeType === 'UNDER_AVG') {
    return '평균가 이하';
  }

  if (product?.isSeasonal === 'Y') {
    return '제철 추천';
  }

  if (product?.isSingleFriendly) {
    return '1인 추천';
  }

  return '관심 상품';
}

function buildWishlistSummary(product) {
  const savingRate = Number(product?.priceMatch?.savingRate ?? product?.savingRate ?? 0);
  const reviewCount = Number(product?.reviewCount || 0);
  const averageRating = Number(product?.averageRating || 0);

  if (savingRate > 0) {
    return `평균가보다 ${Math.round(savingRate)}% 절약`;
  }

  if (reviewCount > 0) {
    return `평점 ${averageRating.toFixed(1)} · 리뷰 ${reviewCount}건`;
  }

  if (product?.origin) {
    return `${product.origin}${product.unit ? ` · ${product.unit}` : ''}`;
  }

  return '상품 상세에서 가격과 리뷰를 확인해 보세요.';
}

function AccountApp() {
  const [currentPage, setCurrentPage] = useState(() =>
    getAccountPageFromHash(window.location.hash)
  );
  const [activeTab, setActiveTab] = useState('wishlist');

  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState('');
  const [orderFilters, setOrderFilters] = useState(EMPTY_ORDER_FILTERS);
  const [appliedOrderFilters, setAppliedOrderFilters] = useState(EMPTY_ORDER_FILTERS);
  const [selectedOrderNo, setSelectedOrderNo] = useState(null);
  const [orderDetail, setOrderDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [monthlySavings, setMonthlySavings] = useState([]);
  const [productSavings, setProductSavings] = useState([]);
  const [dashboardPatterns, setDashboardPatterns] = useState(EMPTY_DASHBOARD_PATTERNS);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState('');

  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState('');
  const [profileForm, setProfileForm] = useState(EMPTY_PROFILE_FORM);
  const [profileSubmitError, setProfileSubmitError] = useState('');
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [duplicateState, setDuplicateState] = useState(EMPTY_DUPLICATE_STATE);
  const [passwordForm, setPasswordForm] = useState(EMPTY_PASSWORD_FORM);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState(EMPTY_WITHDRAW_FORM);
  const [withdrawError, setWithdrawError] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [addressesError, setAddressesError] = useState('');
  const [changingAddressNo, setChangingAddressNo] = useState(null);
  const [deletingAddressNo, setDeletingAddressNo] = useState(null);
  const [editingAddressNo, setEditingAddressNo] = useState(null);
  const [addressForm, setAddressForm] = useState(EMPTY_ADDRESS_FORM);
  const [addressFormError, setAddressFormError] = useState('');
  const [addressSubmitting, setAddressSubmitting] = useState(false);
  const [isAddressFormOpen, setIsAddressFormOpen] = useState(false);
  const [wishlistProductNos, setWishlistProductNos] = useState(() =>
    readStoredValue(WISHLIST_STORAGE_KEY, [])
  );
  const [wishlistItems, setWishlistItems] = useState([]);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [wishlistError, setWishlistError] = useState('');
  const [wishlistActionProductNo, setWishlistActionProductNo] = useState(null);
  const [writableReviews, setWritableReviews] = useState([]);
  const [myReviews, setMyReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState('');
  const [reviewEditor, setReviewEditor] = useState(null);
  const [reviewForm, setReviewForm] = useState(EMPTY_REVIEW_FORM);
  const [reviewFormError, setReviewFormError] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [deletingReviewNo, setDeletingReviewNo] = useState(null);

  async function loadReviewsData() {
    setReviewsLoading(true);
    setReviewsError('');

    try {
      const [writableResponse, myReviewsResponse] = await Promise.all([
        fetch(`${REVIEW_API_BASE}/me/writable`, {
          headers: { 'X-USER-NO': DEMO_USER_NO },
        }),
        fetch(`${REVIEW_API_BASE}/me`, {
          headers: { 'X-USER-NO': DEMO_USER_NO },
        }),
      ]);

      const [writablePayload, myReviewsPayload] = await Promise.all([
        parseResponse(writableResponse, '작성 가능한 리뷰 목록을 불러오지 못했습니다.'),
        parseResponse(myReviewsResponse, '내 리뷰 목록을 불러오지 못했습니다.'),
      ]);

      setWritableReviews(Array.isArray(writablePayload.data) ? writablePayload.data : []);
      setMyReviews(Array.isArray(myReviewsPayload.data) ? myReviewsPayload.data : []);
    } catch (error) {
      setWritableReviews([]);
      setMyReviews([]);
      setReviewsError(error.message || '리뷰 목록을 불러오지 못했습니다.');
    } finally {
      setReviewsLoading(false);
    }
  }

  useEffect(() => {
    const syncPage = () => {
      if (window.location.hash.startsWith('#/activity')) {
        window.location.replace(`${window.location.pathname}${window.location.search}${ACCOUNT_ROUTES.activity}`);
        return;
      }

      setCurrentPage(getAccountPageFromHash(window.location.hash));
    };

    syncPage();
    window.addEventListener('hashchange', syncPage);

    return () => {
      window.removeEventListener('hashchange', syncPage);
    };
  }, []);

  useEffect(() => {
    const syncWishlist = () => {
      setWishlistProductNos(readStoredValue(WISHLIST_STORAGE_KEY, []));
    };

    syncWishlist();
    window.addEventListener('storage', syncWishlist);
    window.addEventListener('oneulFarm:storage-change', syncWishlist);

    return () => {
      window.removeEventListener('storage', syncWishlist);
      window.removeEventListener('oneulFarm:storage-change', syncWishlist);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchWishlistItems() {
      setWishlistLoading(true);
      setWishlistError('');

      try {
        const products = await fetchProductsFromApi();
        if (cancelled) {
          return;
        }

        const productMap = new Map(products.map((product) => [Number(product.productNo), product]));
        const nextItems = wishlistProductNos
          .map((productNo) => productMap.get(Number(productNo)))
          .filter(Boolean)
          .map((product) => ({
            productNo: product.productNo,
            name: product.productName,
            price: product.salePrice,
            avg: buildWishlistSummary(product),
            badge: buildWishlistBadge(product),
            emoji: product.display?.symbol || '🛒',
          }));

        setWishlistItems(nextItems);
      } catch (error) {
        if (!cancelled) {
          setWishlistItems([]);
          setWishlistError(error.message || '찜한 상품을 불러오지 못했습니다.');
        }
      } finally {
        if (!cancelled) {
          setWishlistLoading(false);
        }
      }
    }

    fetchWishlistItems();
    return () => {
      cancelled = true;
    };
  }, [wishlistProductNos]);

  useEffect(() => {
    loadReviewsData();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchOrders() {
      setOrdersLoading(true);
      setOrdersError('');

      try {
        const query = new URLSearchParams();
        if (appliedOrderFilters.deliveryStatus && appliedOrderFilters.deliveryStatus !== 'ALL') {
          query.set('deliveryStatus', appliedOrderFilters.deliveryStatus);
        }
        if (appliedOrderFilters.dateFrom) {
          query.set('dateFrom', appliedOrderFilters.dateFrom);
        }
        if (appliedOrderFilters.dateTo) {
          query.set('dateTo', appliedOrderFilters.dateTo);
        }

        const response = await fetch(
          `${ORDER_API_BASE}/me${query.toString() ? `?${query.toString()}` : ''}`,
          {
            headers: { 'X-USER-NO': DEMO_USER_NO },
            signal: controller.signal,
          }
        );
        const payload = await parseResponse(response, '주문 목록을 불러오지 못했습니다.');
        setOrders(Array.isArray(payload.data) ? payload.data : []);
      } catch (error) {
        if (error.name !== 'AbortError') {
          setOrdersError(error.message || '주문 목록을 불러오지 못했습니다.');
        }
      } finally {
        setOrdersLoading(false);
      }
    }

    fetchOrders();
    return () => controller.abort();
  }, [appliedOrderFilters]);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchSummary() {
      setSummaryLoading(true);

      try {
        const response = await fetch(`${DASHBOARD_API_BASE}/summary`, {
          headers: { 'X-USER-NO': DEMO_USER_NO },
          signal: controller.signal,
        });
        const payload = await parseResponse(response, '대시보드 요약을 불러오지 못했습니다.');
        setSummary(payload.data ? { ...EMPTY_SUMMARY, ...payload.data } : EMPTY_SUMMARY);
      } catch (error) {
        if (error.name !== 'AbortError') {
          setSummary(EMPTY_SUMMARY);
        }
      } finally {
        setSummaryLoading(false);
      }
    }

    fetchSummary();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchDashboardDetails() {
      setDashboardLoading(true);
      setDashboardError('');

      try {
        const [monthlyResponse, productResponse, patternsResponse] = await Promise.all([
          fetch(`${DASHBOARD_API_BASE}/monthly-savings`, {
            headers: { 'X-USER-NO': DEMO_USER_NO },
            signal: controller.signal,
          }),
          fetch(`${DASHBOARD_API_BASE}/product-savings`, {
            headers: { 'X-USER-NO': DEMO_USER_NO },
            signal: controller.signal,
          }),
          fetch(`${DASHBOARD_API_BASE}/patterns`, {
            headers: { 'X-USER-NO': DEMO_USER_NO },
            signal: controller.signal,
          }),
        ]);

        const [monthlyPayload, productPayload, patternsPayload] = await Promise.all([
          parseResponse(monthlyResponse, '대시보드 차트 데이터를 불러오지 못했습니다.'),
          parseResponse(productResponse, '대시보드 품목 분석 데이터를 불러오지 못했습니다.'),
          parseResponse(patternsResponse, '대시보드 소비 패턴 데이터를 불러오지 못했습니다.'),
        ]);

        setMonthlySavings(Array.isArray(monthlyPayload.data) ? monthlyPayload.data : []);
        setProductSavings(Array.isArray(productPayload.data) ? productPayload.data : []);
        setDashboardPatterns(
          patternsPayload.data
            ? { ...EMPTY_DASHBOARD_PATTERNS, ...patternsPayload.data }
            : EMPTY_DASHBOARD_PATTERNS
        );
      } catch (error) {
        if (error.name !== 'AbortError') {
          setMonthlySavings([]);
          setProductSavings([]);
          setDashboardPatterns(EMPTY_DASHBOARD_PATTERNS);
          setDashboardError(error.message || '대시보드 상세 데이터를 불러오지 못했습니다.');
        }
      } finally {
        setDashboardLoading(false);
      }
    }

    fetchDashboardDetails();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchProfile() {
      setProfileLoading(true);
      setProfileError('');

      try {
        const response = await fetch(`${USER_API_BASE}/me`, {
          headers: { 'X-USER-NO': DEMO_USER_NO },
          signal: controller.signal,
        });
        const payload = await parseResponse(response, '회원정보를 불러오지 못했습니다.');
        const nextProfile = payload.data ? { ...EMPTY_PROFILE, ...payload.data } : EMPTY_PROFILE;
        setProfile(nextProfile);
        setProfileForm(toProfileForm(nextProfile));
      } catch (error) {
        if (error.name !== 'AbortError') {
          setProfileError(error.message || '회원정보를 불러오지 못했습니다.');
        }
      } finally {
        setProfileLoading(false);
      }
    }

    fetchProfile();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!selectedOrderNo) {
      setOrderDetail(null);
      setDetailError('');
      return;
    }

    const controller = new AbortController();

    async function fetchOrderDetail() {
      setDetailLoading(true);
      setDetailError('');

      try {
        const response = await fetch(`${ORDER_API_BASE}/me/${selectedOrderNo}`, {
          headers: { 'X-USER-NO': DEMO_USER_NO },
          signal: controller.signal,
        });
        const payload = await parseResponse(response, '주문 상세를 불러오지 못했습니다.');
        setOrderDetail(payload.data || null);
      } catch (error) {
        if (error.name !== 'AbortError') {
          setOrderDetail(null);
          setDetailError(error.message || '주문 상세를 불러오지 못했습니다.');
        }
      } finally {
        setDetailLoading(false);
      }
    }

    fetchOrderDetail();
    return () => controller.abort();
  }, [selectedOrderNo]);

  useEffect(() => {
    if (selectedOrderNo && !orders.some((order) => order.orderNo === selectedOrderNo)) {
      setSelectedOrderNo(null);
      setOrderDetail(null);
      setDetailError('');
    }
  }, [orders, selectedOrderNo]);

  function moveToPage(page) {
    window.location.hash = ACCOUNT_ROUTES[page] || ACCOUNT_ROUTES.mypage;
  }

  function handleProfileFormChange(event) {
    const { name, value } = event.target;
    setProfileSubmitError('');
    setProfileForm((current) => ({
      ...current,
      [name]: value,
    }));

    if (name === 'email' || name === 'nickname') {
      setDuplicateState((current) => ({
        ...current,
        [name]: {
          checking: false,
          available: null,
          message: '',
          checkedValue: '',
        },
      }));
    }
  }

  function resetProfileForm() {
    setProfileForm(toProfileForm(profile));
    setProfileSubmitError('');
    setDuplicateState(EMPTY_DUPLICATE_STATE);
  }

  async function handleDuplicateCheck(fieldKey) {
    const rawValue = String(profileForm[fieldKey] || '').trim();
    const currentValue = String(profile[fieldKey] || '').trim();

    if (!rawValue) {
      setDuplicateState((current) => ({
        ...current,
        [fieldKey]: {
          checking: false,
          available: false,
          message: fieldKey === 'email' ? '이메일을 입력해 주세요.' : '닉네임을 입력해 주세요.',
          checkedValue: '',
        },
      }));
      return;
    }

    if (fieldKey === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawValue)) {
      setDuplicateState((current) => ({
        ...current,
        email: {
          checking: false,
          available: false,
          message: '올바른 이메일 형식으로 입력해 주세요.',
          checkedValue: '',
        },
      }));
      return;
    }

    if (rawValue === currentValue) {
      setDuplicateState((current) => ({
        ...current,
        [fieldKey]: {
          checking: false,
          available: true,
          message: fieldKey === 'email' ? '현재 사용 중인 이메일입니다.' : '현재 사용 중인 닉네임입니다.',
          checkedValue: rawValue,
        },
      }));
      return;
    }

    setDuplicateState((current) => ({
      ...current,
      [fieldKey]: {
        ...current[fieldKey],
        checking: true,
        message: '',
      },
    }));

    try {
      const queryParam = fieldKey === 'email' ? 'email' : 'nickname';
      const response = await fetch(
        `${USER_API_BASE}/check-${fieldKey}?${queryParam}=${encodeURIComponent(rawValue)}`,
        {
          headers: { 'X-USER-NO': DEMO_USER_NO },
        }
      );
      const payload = await parseResponse(
        response,
        fieldKey === 'email' ? '이메일 중복 확인에 실패했습니다.' : '닉네임 중복 확인에 실패했습니다.'
      );
      const available = Boolean(payload.data?.available);

      setDuplicateState((current) => ({
        ...current,
        [fieldKey]: {
          checking: false,
          available,
          message: available
            ? fieldKey === 'email'
              ? '사용 가능한 이메일입니다.'
              : '사용 가능한 닉네임입니다.'
            : fieldKey === 'email'
              ? '이미 사용 중인 이메일입니다.'
              : '이미 사용 중인 닉네임입니다.',
          checkedValue: rawValue,
        },
      }));
    } catch (error) {
      setDuplicateState((current) => ({
        ...current,
        [fieldKey]: {
          checking: false,
          available: false,
          message: error.message || (fieldKey === 'email'
            ? '이메일 중복 확인에 실패했습니다.'
            : '닉네임 중복 확인에 실패했습니다.'),
          checkedValue: '',
        },
      }));
    }
  }

  async function handleProfileSubmit(fieldKey, event) {
    event.preventDefault();
    setProfileSubmitting(true);
    setProfileSubmitError('');

    if (fieldKey === 'nickname') {
      const nextValue = String(profileForm[fieldKey] || '').trim();
      const currentValue = String(profile[fieldKey] || '').trim();
      const state = duplicateState[fieldKey];

        if (nextValue !== currentValue && (!state.available || state.checkedValue !== nextValue)) {
          setProfileSubmitError(
          '저장에 실패했습니다. 닉네임 중복 확인을 완료해 주세요.'
          );
          setProfileSubmitting(false);
          return false;
        }
    }

    try {
      const response = await fetch(`${USER_API_BASE}/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-USER-NO': DEMO_USER_NO,
        },
        body: JSON.stringify(profileForm),
      });
      const payload = await parseResponse(response, '회원정보를 저장하지 못했습니다.');

      if (payload.data) {
        const nextProfile = { ...EMPTY_PROFILE, ...payload.data };
        setProfile(nextProfile);
        setProfileForm(toProfileForm(nextProfile));
      }

      if (fieldKey === 'email' || fieldKey === 'nickname') {
        setDuplicateState((current) => ({
          ...current,
          [fieldKey]: {
            checking: false,
            available: true,
            message: fieldKey === 'email' ? '이메일이 저장되었습니다.' : '닉네임이 저장되었습니다.',
            checkedValue: String(profileForm[fieldKey] || '').trim(),
          },
        }));
      }

      return true;
    } catch (error) {
      setProfileSubmitError(error.message || '회원정보를 저장하지 못했습니다.');
      return false;
    } finally {
      setProfileSubmitting(false);
    }
  }

  function handlePasswordFormChange(event) {
    const { name, value } = event.target;
    setPasswordForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function resetPasswordForm() {
    setPasswordForm(EMPTY_PASSWORD_FORM);
    setPasswordError('');
  }

  function handleWithdrawFormChange(event) {
    const { name, value } = event.target;
    setWithdrawForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();
    setPasswordSubmitting(true);
    setPasswordError('');

    try {
      const response = await fetch(`${USER_API_BASE}/me/password`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-USER-NO': DEMO_USER_NO,
        },
        body: JSON.stringify(passwordForm),
      });
      await parseResponse(response, '비밀번호를 변경하지 못했습니다.');
      setPasswordForm(EMPTY_PASSWORD_FORM);
      return true;
    } catch (error) {
      setPasswordError(error.message || '비밀번호를 변경하지 못했습니다.');
      return false;
    } finally {
      setPasswordSubmitting(false);
    }
  }

  async function handleWithdrawSubmit(event) {
    event.preventDefault();
    setWithdrawing(true);
    setWithdrawError('');

    const confirmed = window.confirm(
      '정말 회원 탈퇴를 진행하시겠습니까? 탈퇴 이후에는 현재 계정으로 마이페이지 기능을 계속 사용할 수 없습니다.'
    );
    if (!confirmed) {
      setWithdrawing(false);
      return false;
    }

    try {
      const response = await fetch(`${USER_API_BASE}/me/withdraw`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-USER-NO': DEMO_USER_NO,
        },
        body: JSON.stringify(withdrawForm),
      });
      await parseResponse(response, '회원 탈퇴 처리에 실패했습니다.');
      window.alert('회원 탈퇴가 완료되었습니다.');
      window.location.hash = '#/products';
      return true;
    } catch (error) {
      setWithdrawError(error.message || '회원 탈퇴 처리에 실패했습니다.');
      return false;
    } finally {
      setWithdrawing(false);
    }
  }

  async function refreshProfile() {
    const response = await fetch(`${USER_API_BASE}/me`, {
      headers: { 'X-USER-NO': DEMO_USER_NO },
    });
    const payload = await parseResponse(response, '회원정보를 불러오지 못했습니다.');
    if (payload.data) {
      const nextProfile = { ...EMPTY_PROFILE, ...payload.data };
      setProfile(nextProfile);
      setProfileForm(toProfileForm(nextProfile));
    }
  }

  async function fetchAddresses() {
    setAddressesLoading(true);
    setAddressesError('');

    try {
      const response = await fetch(ADDRESS_API_BASE, {
        headers: { 'X-USER-NO': DEMO_USER_NO },
      });
      const payload = await parseResponse(response, '배송지 목록을 불러오지 못했습니다.');
      setAddresses(Array.isArray(payload.data) ? payload.data : []);
    } catch (error) {
      setAddressesError(error.message || '배송지 목록을 불러오지 못했습니다.');
    } finally {
      setAddressesLoading(false);
    }
  }

  function openAddressModal() {
    setIsAddressModalOpen(true);
    setAddressForm(EMPTY_ADDRESS_FORM);
    setAddressFormError('');
    setIsAddressFormOpen(false);
    setEditingAddressNo(null);
    fetchAddresses();
  }

  function closeAddressModal() {
    setIsAddressModalOpen(false);
    setAddressesError('');
    setChangingAddressNo(null);
    setDeletingAddressNo(null);
    setEditingAddressNo(null);
    setAddressFormError('');
    setAddressSubmitting(false);
    setIsAddressFormOpen(false);
  }

  function handleStartCreateAddress() {
    setAddressForm(EMPTY_ADDRESS_FORM);
    setAddressFormError('');
    setEditingAddressNo(null);
    setIsAddressFormOpen(true);
  }

  function handleStartEditAddress(address) {
    setAddressForm({
      addressName: address.addressName || '',
      recipientName: address.recipientName || '',
      recipientPhone: address.recipientPhone || '',
      zipCode: address.zipCode || '',
      address1: address.address1 || '',
      address2: address.address2 || '',
      deliveryMessage: address.deliveryMessage || '',
      isDefault: address.isDefault || 'N',
    });
    setAddressFormError('');
    setEditingAddressNo(address.addressNo);
    setIsAddressFormOpen(true);
  }

  function handleCloseAddressForm() {
    setAddressForm(EMPTY_ADDRESS_FORM);
    setAddressFormError('');
    setEditingAddressNo(null);
    setIsAddressFormOpen(false);
  }

  function handleAddressFormChange(event) {
    const { name, value, type, checked } = event.target;
    setAddressForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? (checked ? 'Y' : 'N') : value,
    }));
  }

  function handleBlockedDefaultUncheck(message) {
    setAddressForm((current) => ({
      ...current,
      isDefault: 'Y',
    }));
    setAddressFormError(message);
  }

  async function handleAddressFormSubmit(event) {
    event.preventDefault();
    setAddressSubmitting(true);
    setAddressFormError('');

    const isEditMode = editingAddressNo !== null;
    const validationMessage = validateAddressForm(addressForm);

    if (validationMessage) {
      setAddressFormError(validationMessage);
      setAddressSubmitting(false);
      return;
    }

    try {
      const response = await fetch(
        isEditMode ? `${ADDRESS_API_BASE}/${editingAddressNo}` : ADDRESS_API_BASE,
        {
          method: isEditMode ? 'PATCH' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-USER-NO': DEMO_USER_NO,
          },
          body: JSON.stringify(addressForm),
        }
      );

      const payload = await parseResponse(
        response,
        isEditMode ? '배송지 수정에 실패했습니다.' : '배송지 등록에 실패했습니다.'
      );

      setAddresses(Array.isArray(payload.data) ? payload.data : []);
      setAddressForm(EMPTY_ADDRESS_FORM);
      setAddressFormError('');
      setEditingAddressNo(null);
      setIsAddressFormOpen(false);
      await refreshProfile();
    } catch (error) {
      setAddressFormError(
        error.message ||
        (isEditMode ? '배송지 수정에 실패했습니다.' : '배송지 등록에 실패했습니다.')
      );
    } finally {
      setAddressSubmitting(false);
    }
  }

  async function handleChangeDefaultAddress(addressNo) {
    setChangingAddressNo(addressNo);
    setAddressesError('');

    try {
      const response = await fetch(`${ADDRESS_API_BASE}/${addressNo}/default`, {
        method: 'PATCH',
        headers: { 'X-USER-NO': DEMO_USER_NO },
      });
      const payload = await parseResponse(response, '기본 배송지 변경에 실패했습니다.');
      setAddresses(Array.isArray(payload.data) ? payload.data : []);
      await refreshProfile();
    } catch (error) {
      setAddressesError(error.message || '기본 배송지 변경에 실패했습니다.');
    } finally {
      setChangingAddressNo(null);
    }
  }

  async function handleDeleteAddress(address) {
    const addressNo = address?.addressNo;
    const addressLabel = address?.addressName || address?.recipientName || '선택한 배송지';

    if (!addressNo) {
      return;
    }

    const confirmed = window.confirm(`'${addressLabel}' 배송지를 삭제하시겠습니까?`);
    if (!confirmed) {
      return;
    }

    setDeletingAddressNo(addressNo);
    setAddressesError('');

    try {
      const response = await fetch(`${ADDRESS_API_BASE}/${addressNo}`, {
        method: 'DELETE',
        headers: { 'X-USER-NO': DEMO_USER_NO },
      });
      const payload = await parseResponse(response, '배송지 삭제에 실패했습니다.');
      setAddresses(Array.isArray(payload.data) ? payload.data : []);
      await refreshProfile();
    } catch (error) {
      setAddressesError(error.message || '배송지 삭제에 실패했습니다.');
    } finally {
      setDeletingAddressNo(null);
    }
  }

  function handleSelectOrder(orderNo) {
    setSelectedOrderNo((current) => (current === orderNo ? null : orderNo));
  }

  function handleOrderFilterChange(event) {
    const { name, value } = event.target;
    setOrderFilters((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleOrderFilterSubmit(event) {
    event.preventDefault();
    setAppliedOrderFilters({ ...orderFilters });
  }

  function handleOrderFilterReset() {
    setOrderFilters(EMPTY_ORDER_FILTERS);
    setAppliedOrderFilters(EMPTY_ORDER_FILTERS);
  }

  async function handleAddWishlistItemToCart(productNo) {
    setWishlistActionProductNo(productNo);
    setWishlistError('');

    try {
      const nextCart = await addCartItemToApi(productNo, 1);
      persistValue(CART_STORAGE_KEY, nextCart);
    } catch (error) {
      setWishlistError(error.message || '장바구니 담기에 실패했습니다.');
    } finally {
      setWishlistActionProductNo(null);
    }
  }

  function handleRemoveWishlistItem(productNo) {
    const nextWishlist = wishlistProductNos.filter(
      (currentProductNo) => Number(currentProductNo) !== Number(productNo)
    );
    persistValue(WISHLIST_STORAGE_KEY, nextWishlist);
    setWishlistProductNos(nextWishlist);
  }

  function handleStartCreateReview(review) {
    setReviewEditor({
      mode: 'create',
      reviewNo: null,
      productName: review.productName,
      orderId: review.orderId,
    });
    setReviewForm({
      orderItemNo: review.orderItemNo,
      rating: 5,
      content: '',
    });
    setReviewFormError('');
  }

  function handleStartEditReview(review) {
    setReviewEditor({
      mode: 'edit',
      reviewNo: review.reviewNo,
      productName: review.productName,
      orderId: review.orderId,
    });
    setReviewForm({
      orderItemNo: review.orderItemNo,
      rating: Number(review.rating || 5),
      content: review.content || '',
    });
    setReviewFormError('');
  }

  function handleCancelReviewEditor() {
    setReviewEditor(null);
    setReviewForm(EMPTY_REVIEW_FORM);
    setReviewFormError('');
  }

  function handleReviewFormChange(event) {
    const { name, value } = event.target;
    setReviewFormError('');
    setReviewForm((current) => ({
      ...current,
      [name]: name === 'rating' ? Number(value) : value,
    }));
  }

  async function handleReviewSubmit(event) {
    event.preventDefault();
    setReviewSubmitting(true);
    setReviewFormError('');

    if (!String(reviewForm.content || '').trim()) {
      setReviewFormError('리뷰 내용을 입력해 주세요.');
      setReviewSubmitting(false);
      return false;
    }

    try {
      const isEditMode = reviewEditor?.mode === 'edit' && reviewEditor?.reviewNo;
      const response = await fetch(
        isEditMode ? `${REVIEW_API_BASE}/${reviewEditor.reviewNo}` : REVIEW_API_BASE,
        {
          method: isEditMode ? 'PATCH' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-USER-NO': DEMO_USER_NO,
          },
          body: JSON.stringify(reviewForm),
        }
      );

      await parseResponse(
        response,
        isEditMode ? '리뷰 수정에 실패했습니다.' : '리뷰 작성에 실패했습니다.'
      );

      await loadReviewsData();
      handleCancelReviewEditor();
      return true;
    } catch (error) {
      setReviewFormError(
        error.message || (reviewEditor?.mode === 'edit'
          ? '리뷰 수정에 실패했습니다.'
          : '리뷰 작성에 실패했습니다.')
      );
      return false;
    } finally {
      setReviewSubmitting(false);
    }
  }

  async function handleDeleteReview(reviewNo) {
    const confirmed = window.confirm('이 리뷰를 삭제하시겠습니까?');
    if (!confirmed) {
      return;
    }

    setDeletingReviewNo(reviewNo);
    setReviewsError('');

    try {
      const response = await fetch(`${REVIEW_API_BASE}/${reviewNo}`, {
        method: 'DELETE',
        headers: { 'X-USER-NO': DEMO_USER_NO },
      });
      await parseResponse(response, '리뷰 삭제에 실패했습니다.');
      await loadReviewsData();

      if (reviewEditor?.mode === 'edit' && reviewEditor.reviewNo === reviewNo) {
        handleCancelReviewEditor();
      }
    } catch (error) {
      setReviewsError(error.message || '리뷰 삭제에 실패했습니다.');
    } finally {
      setDeletingReviewNo(null);
    }
  }

  return (
    <div className="account-app page-shell">
      <main className="container">
        <section className="account-local-nav">
          <button
            type="button"
            className={`account-local-nav__link ${currentPage === 'mypage' ? 'is-active' : ''}`}
            onClick={() => moveToPage('mypage')}
          >
            개인정보 관리
          </button>
          <button
            type="button"
            className={`account-local-nav__link ${currentPage === 'activity' ? 'is-active' : ''}`}
            onClick={() => moveToPage('activity')}
          >
            관심 활동
          </button>
          <button
            type="button"
            className={`account-local-nav__link ${currentPage === 'orders' ? 'is-active' : ''}`}
            onClick={() => moveToPage('orders')}
          >
            주문관리
          </button>
          <button
            type="button"
            className={`account-local-nav__link ${currentPage === 'dashboard' ? 'is-active' : ''}`}
            onClick={() => moveToPage('dashboard')}
          >
            대시보드
          </button>
        </section>

        {currentPage === 'mypage' ? (
          <MyPageView
            orders={orders}
            profile={profile}
            profileLoading={profileLoading}
            profileError={profileError}
            profileForm={profileForm}
            profileSubmitting={profileSubmitting}
            profileSubmitError={profileSubmitError}
            duplicateState={duplicateState}
            onProfileFormChange={handleProfileFormChange}
            onProfileSubmit={handleProfileSubmit}
            onResetProfileForm={resetProfileForm}
            onDuplicateCheck={handleDuplicateCheck}
            passwordForm={passwordForm}
            passwordSubmitting={passwordSubmitting}
            passwordError={passwordError}
            onPasswordFormChange={handlePasswordFormChange}
            onPasswordSubmit={handlePasswordSubmit}
            onResetPasswordForm={resetPasswordForm}
            withdrawForm={withdrawForm}
            withdrawing={withdrawing}
            withdrawError={withdrawError}
            onWithdrawFormChange={handleWithdrawFormChange}
            onWithdrawSubmit={handleWithdrawSubmit}
            onOpenAddressModal={openAddressModal}
          />
        ) : currentPage === 'activity' ? (
          <ActivityView
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            wishlistItems={wishlistItems}
            wishlistLoading={wishlistLoading}
            wishlistError={wishlistError}
            wishlistActionProductNo={wishlistActionProductNo}
            onAddWishlistItemToCart={handleAddWishlistItemToCart}
            onRemoveWishlistItem={handleRemoveWishlistItem}
            writableReviews={writableReviews}
            myReviews={myReviews}
            reviewsLoading={reviewsLoading}
            reviewsError={reviewsError}
            reviewEditor={reviewEditor}
            reviewForm={reviewForm}
            reviewFormError={reviewFormError}
            reviewSubmitting={reviewSubmitting}
            deletingReviewNo={deletingReviewNo}
            onStartCreateReview={handleStartCreateReview}
            onStartEditReview={handleStartEditReview}
            onCancelReviewEditor={handleCancelReviewEditor}
            onReviewFormChange={handleReviewFormChange}
            onReviewSubmit={handleReviewSubmit}
            onDeleteReview={handleDeleteReview}
          />
        ) : currentPage === 'orders' ? (
          <OrdersView
            orders={orders}
            ordersLoading={ordersLoading}
            ordersError={ordersError}
            orderFilters={orderFilters}
            selectedOrderNo={selectedOrderNo}
            orderDetail={orderDetail}
            detailLoading={detailLoading}
            detailError={detailError}
            onOrderFilterChange={handleOrderFilterChange}
            onOrderFilterSubmit={handleOrderFilterSubmit}
            onOrderFilterReset={handleOrderFilterReset}
            onSelectOrder={handleSelectOrder}
          />
        ) : (
          <DashboardView
            summary={summary}
            summaryLoading={summaryLoading}
            monthlySavings={monthlySavings}
            productSavings={productSavings}
            patterns={dashboardPatterns}
            dashboardLoading={dashboardLoading}
            dashboardError={dashboardError}
          />
        )}
      </main>

      <AddressModal
        open={isAddressModalOpen}
        addresses={addresses}
        loading={addressesLoading}
        error={addressesError}
        changingAddressNo={changingAddressNo}
        deletingAddressNo={deletingAddressNo}
        isFormOpen={isAddressFormOpen}
        editingAddressNo={editingAddressNo}
        form={addressForm}
        formError={addressFormError}
        submitting={addressSubmitting}
        onClose={closeAddressModal}
        onChangeDefault={handleChangeDefaultAddress}
        onDeleteAddress={handleDeleteAddress}
        onStartCreate={handleStartCreateAddress}
        onStartEdit={handleStartEditAddress}
        onCloseForm={handleCloseAddressForm}
        onFormChange={handleAddressFormChange}
        onDefaultToggleBlocked={handleBlockedDefaultUncheck}
        onFormSubmit={handleAddressFormSubmit}
      />

      <footer className="site-footer">
        <div className="footer-links">
          <a href="#/products">개인정보처리방침</a>
          <a href="#/products">이용약관</a>
          <a href="#/products">고객센터</a>
        </div>
        <div>© 2026 oneulFarm. All rights reserved.</div>
      </footer>
    </div>
  );
}

export default AccountApp;
