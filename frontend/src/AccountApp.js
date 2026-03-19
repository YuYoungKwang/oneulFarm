import { useCallback, useEffect, useState } from 'react';
import { buildAuthHeaders, getAuthUser, isAuthenticated, requestAuthApi } from './auth';
import './styles/account.css';
import DashboardView from './DashboardView';
import MyPageView from './MyPageView';
import ActivityView from './ActivityView';
import OrdersView from './OrdersView';
import AddressModal from './AddressModal';
import { addCartItemToApi, fetchProductsFromApi } from './api/productApi';
import { persistValue, readStoredValue } from './components/productUiUtils';

const ORDER_API_PATH = '/api/orders';
const DASHBOARD_API_PATH = '/api/dashboard';
const USER_API_PATH = '/api/users';
const ADDRESS_API_PATH = '/api/users/me/addresses';
const REVIEW_API_PATH = '/api/reviews';
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

function accountHeaders(authUser, includeJson = false) {
  return buildAuthHeaders({
    includeJson,
    user: authUser,
  });
}

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

function buildWishlistSavingRate(product) {
  const savingRate = Number(product?.priceMatch?.savingRate ?? product?.savingRate ?? 0);

  if (!Number.isFinite(savingRate) || savingRate <= 0) {
    return 0;
  }

  return Math.round(savingRate);
}

function AccountApp({ authUser: initialAuthUser }) {
  const [authUser, setAuthUser] = useState(() => initialAuthUser || getAuthUser());
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
  const [profileImageUploading, setProfileImageUploading] = useState(false);
  const [profileImageError, setProfileImageError] = useState('');
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

  useEffect(() => {
    setAuthUser(initialAuthUser || getAuthUser());
  }, [initialAuthUser]);

  const loadReviewsData = useCallback(async () => {
    if (!isAuthenticated(authUser)) {
      setWritableReviews([]);
      setMyReviews([]);
      setReviewsError('');
      setReviewsLoading(false);
      return;
    }

    setReviewsLoading(true);
    setReviewsError('');

    try {
      const [writablePayload, myReviewsPayload] = await Promise.all([
        requestAuthApi(
          `${REVIEW_API_PATH}/me/writable`,
          {
            headers: accountHeaders(authUser),
          },
          '작성 가능한 리뷰 목록을 불러오지 못했습니다.'
        ),
        requestAuthApi(
          `${REVIEW_API_PATH}/me`,
          {
            headers: accountHeaders(authUser),
          },
          '내 리뷰 목록을 불러오지 못했습니다.'
        ),
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
  }, [authUser]);

  useEffect(() => {
    const syncPage = () => {
      if (window.location.hash.startsWith('#/activity')) {
        window.location.replace(`${window.location.pathname}${window.location.search}${ACCOUNT_ROUTES.activity}`);
        return;
      }

      setCurrentPage(getAccountPageFromHash(window.location.hash));
      setAuthUser(getAuthUser());
    };

    syncPage();
    window.addEventListener('hashchange', syncPage);
    window.addEventListener('storage', syncPage);
    window.addEventListener('oneulFarm:storage-change', syncPage);

    return () => {
      window.removeEventListener('hashchange', syncPage);
      window.removeEventListener('storage', syncPage);
      window.removeEventListener('oneulFarm:storage-change', syncPage);
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
            savingRate: buildWishlistSavingRate(product),
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
  }, [loadReviewsData]);

  useEffect(() => {
    if (!isAuthenticated(authUser)) {
      setOrders([]);
      setOrdersLoading(false);
      setOrdersError('');
      return undefined;
    }

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

        const payload = await requestAuthApi(
          `${ORDER_API_PATH}/me${query.toString() ? `?${query.toString()}` : ''}`,
          {
            headers: accountHeaders(authUser),
            signal: controller.signal,
          },
          '주문 목록을 불러오지 못했습니다.'
        );
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
  }, [authUser, appliedOrderFilters]);

  useEffect(() => {
    if (!isAuthenticated(authUser)) {
      setSummary(EMPTY_SUMMARY);
      setSummaryLoading(false);
      return undefined;
    }

    const controller = new AbortController();

    async function fetchSummary() {
      setSummaryLoading(true);

      try {
        const payload = await requestAuthApi(
          `${DASHBOARD_API_PATH}/summary`,
          {
            headers: accountHeaders(authUser),
            signal: controller.signal,
          },
          '대시보드 요약을 불러오지 못했습니다.'
        );
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
  }, [authUser]);

  useEffect(() => {
    if (!isAuthenticated(authUser)) {
      setMonthlySavings([]);
      setProductSavings([]);
      setDashboardPatterns(EMPTY_DASHBOARD_PATTERNS);
      setDashboardError('');
      setDashboardLoading(false);
      return undefined;
    }

    const controller = new AbortController();

    async function fetchDashboardDetails() {
      setDashboardLoading(true);
      setDashboardError('');

      try {
        const [monthlyPayload, productPayload, patternsPayload] = await Promise.all([
          requestAuthApi(
            `${DASHBOARD_API_PATH}/monthly-savings`,
            {
              headers: accountHeaders(authUser),
              signal: controller.signal,
            },
            '대시보드 차트 데이터를 불러오지 못했습니다.'
          ),
          requestAuthApi(
            `${DASHBOARD_API_PATH}/product-savings`,
            {
              headers: accountHeaders(authUser),
              signal: controller.signal,
            },
            '대시보드 품목 분석 데이터를 불러오지 못했습니다.'
          ),
          requestAuthApi(
            `${DASHBOARD_API_PATH}/patterns`,
            {
              headers: accountHeaders(authUser),
              signal: controller.signal,
            },
            '대시보드 소비 패턴 데이터를 불러오지 못했습니다.'
          ),
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
  }, [authUser]);

  useEffect(() => {
    if (!isAuthenticated(authUser)) {
      setProfile(EMPTY_PROFILE);
      setProfileForm(EMPTY_PROFILE_FORM);
      setProfileLoading(false);
      setProfileError('');
      return undefined;
    }

    const controller = new AbortController();

    async function fetchProfile() {
      setProfileLoading(true);
      setProfileError('');

      try {
        const payload = await requestAuthApi(
          `${USER_API_PATH}/me`,
          {
            headers: accountHeaders(authUser),
            signal: controller.signal,
          },
          '회원정보를 불러오지 못했습니다.'
        );
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
  }, [authUser]);

  useEffect(() => {
    if (!isAuthenticated(authUser) || !selectedOrderNo) {
      setOrderDetail(null);
      setDetailError('');
      return;
    }

    const controller = new AbortController();

    async function fetchOrderDetail() {
      setDetailLoading(true);
      setDetailError('');

      try {
        const payload = await requestAuthApi(
          `${ORDER_API_PATH}/me/${selectedOrderNo}`,
          {
            headers: accountHeaders(authUser),
            signal: controller.signal,
          },
          '주문 상세를 불러오지 못했습니다.'
        );
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
  }, [authUser, selectedOrderNo]);

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

  async function handleProfileImageUpload(file) {
    if (!file) {
      return false;
    }

    setProfileImageUploading(true);
    setProfileImageError('');

    try {
      const formData = new FormData();
      formData.append('profileImage', file);

      await requestAuthApi(
        `${USER_API_PATH}/me/profile-image`,
        {
          method: 'PATCH',
          headers: accountHeaders(authUser),
          body: formData,
        },
        '프로필 사진 변경에 실패했습니다.'
      );

      await refreshProfile();
      return true;
    } catch (error) {
      setProfileImageError(error.message || '프로필 사진 변경에 실패했습니다.');
      return false;
    } finally {
      setProfileImageUploading(false);
    }
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
      const payload = await requestAuthApi(
        `${USER_API_PATH}/check-${fieldKey}?${queryParam}=${encodeURIComponent(rawValue)}`,
        {
          headers: accountHeaders(authUser),
        },
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
      const payload = await requestAuthApi(
        `${USER_API_PATH}/me`,
        {
          method: 'PATCH',
          headers: accountHeaders(authUser, true),
          body: JSON.stringify(profileForm),
        },
        '회원정보를 저장하지 못했습니다.'
      );

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
      await requestAuthApi(
        `${USER_API_PATH}/me/password`,
        {
          method: 'PATCH',
          headers: accountHeaders(authUser, true),
          body: JSON.stringify(passwordForm),
        },
        '비밀번호를 변경하지 못했습니다.'
      );
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
      await requestAuthApi(
        `${USER_API_PATH}/me/withdraw`,
        {
          method: 'PATCH',
          headers: accountHeaders(authUser, true),
          body: JSON.stringify(withdrawForm),
        },
        '회원 탈퇴 처리에 실패했습니다.'
      );
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
    const payload = await requestAuthApi(
      `${USER_API_PATH}/me`,
      {
        headers: accountHeaders(authUser),
      },
      '회원정보를 불러오지 못했습니다.'
    );
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
      const payload = await requestAuthApi(
        ADDRESS_API_PATH,
        {
          headers: accountHeaders(authUser),
        },
        '배송지 목록을 불러오지 못했습니다.'
      );
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
      const payload = await requestAuthApi(
        isEditMode ? `${ADDRESS_API_PATH}/${editingAddressNo}` : ADDRESS_API_PATH,
        {
          method: isEditMode ? 'PATCH' : 'POST',
          headers: accountHeaders(authUser, true),
          body: JSON.stringify(addressForm),
        },
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
      const payload = await requestAuthApi(
        `${ADDRESS_API_PATH}/${addressNo}/default`,
        {
          method: 'PATCH',
          headers: accountHeaders(authUser),
        },
        '기본 배송지 변경에 실패했습니다.'
      );
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
      const payload = await requestAuthApi(
        `${ADDRESS_API_PATH}/${addressNo}`,
        {
          method: 'DELETE',
          headers: accountHeaders(authUser),
        },
        '배송지 삭제에 실패했습니다.'
      );
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
      await requestAuthApi(
        isEditMode ? `${REVIEW_API_PATH}/${reviewEditor.reviewNo}` : REVIEW_API_PATH,
        {
          method: isEditMode ? 'PATCH' : 'POST',
          headers: accountHeaders(authUser, true),
          body: JSON.stringify(reviewForm),
        },
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
      await requestAuthApi(
        `${REVIEW_API_PATH}/${reviewNo}`,
        {
          method: 'DELETE',
          headers: accountHeaders(authUser),
        },
        '리뷰 삭제에 실패했습니다.'
      );
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

  if (!isAuthenticated(authUser)) {
    return (
      <div className="account-app page-shell">
        <main className="container">
          <section className="card">
            <div className="page-head" style={{ marginBottom: '8px' }}>
              <div>
                <h1>로그인이 필요합니다.</h1>
                <p>마이페이지와 대시보드는 로그인 후 이용할 수 있습니다.</p>
              </div>
            </div>
            <div className="page-actions">
              <button
                className="btn"
                type="button"
                onClick={() => {
                  window.location.hash = '#/login';
                }}
              >
                로그인하러 가기
              </button>
              <button
                className="btn-outline"
                type="button"
                onClick={() => {
                  window.location.hash = '#/signup';
                }}
              >
                회원가입
              </button>
            </div>
          </section>
        </main>

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
            profileImageUploading={profileImageUploading}
            profileImageError={profileImageError}
            duplicateState={duplicateState}
            onProfileFormChange={handleProfileFormChange}
            onProfileSubmit={handleProfileSubmit}
            onProfileImageUpload={handleProfileImageUpload}
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


