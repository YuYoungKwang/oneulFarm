import { useCallback, useEffect, useRef, useState } from 'react';
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
  imageFiles: [],
  existingImages: [],
  removedImageNos: [],
};

function notifyReviewChange(productNo) {
  const safeProductNo = Number(productNo);
  if (!Number.isFinite(safeProductNo) || safeProductNo <= 0) {
    return;
  }

  window.dispatchEvent(
    new CustomEvent('oneulFarm:review-change', {
      detail: { productNo: safeProductNo },
    })
  );
}

const ACCOUNT_ROUTES = {
  dashboard: '#/dashboard',
  mypage: '#/mypage',
  activity: '#/mypage/activity',
  orders: '#/mypage/orders',
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
    return '?òÎ†π?∏ÏùÑ ?ÖÎ†•??Ï£ºÏÑ∏??';
  }

  if (!recipientPhone) {
    return '?∞ÎùΩÏ≤òÎ? ?ÖÎ†•??Ï£ºÏÑ∏??';
  }

  if (!/^01[0-9]-?\d{3,4}-?\d{4}$/.test(recipientPhone)) {
    return '?∞ÎùΩÏ≤??ïÏãù???¨Î∞îÎ•¥Ï? ?äÏäµ?àÎã§. ?? 010-1234-5678';
  }

  if (!zipCode) {
    return '?∞Ìé∏Î≤àÌò∏Î•??ÖÎ†•??Ï£ºÏÑ∏??';
  }

  if (!/^\d{5}$/.test(zipCode)) {
    return '?∞Ìé∏Î≤àÌò∏??5?êÎ¶¨ ?´ÏûêÎ°??ÖÎ†•??Ï£ºÏÑ∏??';
  }

  if (!address1) {
    return 'Í∏∞Î≥∏ Ï£ºÏÜåÎ•??ÖÎ†•??Ï£ºÏÑ∏??';
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
    return '?âÍ∑†Í∞Ä ?¥Ìïò';
  }

  if (product?.isSeasonal === 'Y') {
    return '?úÏ≤† Ï∂îÏ≤ú';
  }

  if (product?.isSingleFriendly) {
    return '1??Ï∂îÏ≤ú';
  }

  return 'Í¥Ä???ÅÌíà';
}

function buildWishlistSummary(product) {
  const savingRate = Number(product?.priceMatch?.savingRate ?? product?.savingRate ?? 0);
  const reviewCount = Number(product?.reviewCount || 0);
  const averageRating = Number(product?.averageRating || 0);

  if (savingRate > 0) {
    return `?âÍ∑†Í∞ÄÎ≥¥Îã§ ${Math.round(savingRate)}% ?àÏïΩ`;
  }

  if (reviewCount > 0) {
    return `∆Ú¡° ${averageRating.toFixed(1)} °§ ∏Æ∫‰ ${reviewCount}∞«`;
  }

  if (product?.origin) {
    return `${product.origin}${product.unit ? ` ¬∑ ${product.unit}` : ''}`;
  }

  return '?ÅÌíà ?ÅÏÑ∏?êÏÑú Í∞ÄÍ≤©Í≥º Î¶¨Î∑∞Î•??ïÏù∏??Î≥¥ÏÑ∏??';
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
  const addressModalRouteHandledRef = useRef(false);
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
          '?ëÏÑ± Í∞Ä?•Ìïú Î¶¨Î∑∞ Î™©Î°ù??Î∂àÎü¨?§Ï? Î™ªÌñà?µÎãà??'
        ),
        requestAuthApi(
          `${REVIEW_API_PATH}/me`,
          {
            headers: accountHeaders(authUser),
          },
          '??Î¶¨Î∑∞ Î™©Î°ù??Î∂àÎü¨?§Ï? Î™ªÌñà?µÎãà??'
        ),
      ]);

      setWritableReviews(Array.isArray(writablePayload.data) ? writablePayload.data : []);
      setMyReviews(Array.isArray(myReviewsPayload.data) ? myReviewsPayload.data : []);
    } catch (error) {
      setWritableReviews([]);
      setMyReviews([]);
      setReviewsError(error.message || 'Î¶¨Î∑∞ Î™©Î°ù??Î∂àÎü¨?§Ï? Î™ªÌñà?µÎãà??');
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
            imageUrl: product.mainImage?.imageUrl || '',
            emoji: product.display?.symbol || '?õí',
          }));

        setWishlistItems(nextItems);
      } catch (error) {
        if (!cancelled) {
          setWishlistItems([]);
          setWishlistError(error.message || 'Ï∞úÌïú ?ÅÌíà??Î∂àÎü¨?§Ï? Î™ªÌñà?µÎãà??');
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
          'Ï£ºÎ¨∏ Î™©Î°ù??Î∂àÎü¨?§Ï? Î™ªÌñà?µÎãà??'
        );
        setOrders(Array.isArray(payload.data) ? payload.data : []);
      } catch (error) {
        if (error.name !== 'AbortError') {
          setOrdersError(error.message || 'Ï£ºÎ¨∏ Î™©Î°ù??Î∂àÎü¨?§Ï? Î™ªÌñà?µÎãà??');
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
          '?Ä?úÎ≥¥???îÏïΩ??Î∂àÎü¨?§Ï? Î™ªÌñà?µÎãà??'
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
            '?Ä?úÎ≥¥??Ï∞®Ìä∏ ?∞Ïù¥?∞Î? Î∂àÎü¨?§Ï? Î™ªÌñà?µÎãà??'
          ),
          Promise.resolve({ data: [] }),
          requestAuthApi(
            `${DASHBOARD_API_PATH}/patterns`,
            {
              headers: accountHeaders(authUser),
              signal: controller.signal,
            },
            '?Ä?úÎ≥¥???åÎπÑ ?®ÌÑ¥ ?∞Ïù¥?∞Î? Î∂àÎü¨?§Ï? Î™ªÌñà?µÎãà??'
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
          setDashboardError(error.message || '?Ä?úÎ≥¥???ÅÏÑ∏ ?∞Ïù¥?∞Î? Î∂àÎü¨?§Ï? Î™ªÌñà?µÎãà??');
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
          '?åÏõê?ïÎ≥¥Î•?Î∂àÎü¨?§Ï? Î™ªÌñà?µÎãà??'
        );
        const nextProfile = payload.data ? { ...EMPTY_PROFILE, ...payload.data } : EMPTY_PROFILE;
        setProfile(nextProfile);
        setProfileForm(toProfileForm(nextProfile));
      } catch (error) {
        if (error.name !== 'AbortError') {
          setProfileError(error.message || '?åÏõê?ïÎ≥¥Î•?Î∂àÎü¨?§Ï? Î™ªÌñà?µÎãà??');
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
          'Ï£ºÎ¨∏ ?ÅÏÑ∏Î•?Î∂àÎü¨?§Ï? Î™ªÌñà?µÎãà??'
        );
        setOrderDetail(payload.data || null);
      } catch (error) {
        if (error.name !== 'AbortError') {
          setOrderDetail(null);
          setDetailError(error.message || 'Ï£ºÎ¨∏ ?ÅÏÑ∏Î•?Î∂àÎü¨?§Ï? Î™ªÌñà?µÎãà??');
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
        '?ÑÎ°ú???¨ÏßÑ Î≥ÄÍ≤ΩÏóê ?§Ìå®?àÏäµ?àÎã§.'
      );

      await refreshProfile();
      return true;
    } catch (error) {
      setProfileImageError(error.message || '?ÑÎ°ú???¨ÏßÑ Î≥ÄÍ≤ΩÏóê ?§Ìå®?àÏäµ?àÎã§.');
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
          message: fieldKey === 'email' ? '?¥Î©î?ºÏùÑ ?ÖÎ†•??Ï£ºÏÑ∏??' : '?âÎÑ§?ÑÏùÑ ?ÖÎ†•??Ï£ºÏÑ∏??',
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
          message: '?¨Î∞îÎ•??¥Î©î???ïÏãù?ºÎ°ú ?ÖÎ†•??Ï£ºÏÑ∏??',
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
          message: fieldKey === 'email' ? '?ÑÏû¨ ?¨Ïö© Ï§ëÏù∏ ?¥Î©î?ºÏûÖ?àÎã§.' : '?ÑÏû¨ ?¨Ïö© Ï§ëÏù∏ ?âÎÑ§?ÑÏûÖ?àÎã§.',
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
        fieldKey === 'email' ? '?¥Î©î??Ï§ëÎ≥µ ?ïÏù∏???§Ìå®?àÏäµ?àÎã§.' : '?âÎÑ§??Ï§ëÎ≥µ ?ïÏù∏???§Ìå®?àÏäµ?àÎã§.'
      );
      const available = Boolean(payload.data?.available);

      setDuplicateState((current) => ({
        ...current,
        [fieldKey]: {
          checking: false,
          available,
          message: available
            ? fieldKey === 'email'
              ? '?¨Ïö© Í∞Ä?•Ìïú ?¥Î©î?ºÏûÖ?àÎã§.'
              : '?¨Ïö© Í∞Ä?•Ìïú ?âÎÑ§?ÑÏûÖ?àÎã§.'
            : fieldKey === 'email'
              ? '?¥Î? ?¨Ïö© Ï§ëÏù∏ ?¥Î©î?ºÏûÖ?àÎã§.'
              : '?¥Î? ?¨Ïö© Ï§ëÏù∏ ?âÎÑ§?ÑÏûÖ?àÎã§.',
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
            ? '?¥Î©î??Ï§ëÎ≥µ ?ïÏù∏???§Ìå®?àÏäµ?àÎã§.'
            : '?âÎÑ§??Ï§ëÎ≥µ ?ïÏù∏???§Ìå®?àÏäµ?àÎã§.'),
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
          '?Ä?•Ïóê ?§Ìå®?àÏäµ?àÎã§. ?âÎÑ§??Ï§ëÎ≥µ ?ïÏù∏???ÑÎ£å??Ï£ºÏÑ∏??'
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
        '?åÏõê?ïÎ≥¥Î•??Ä?•ÌïòÏßÄ Î™ªÌñà?µÎãà??'
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
            message: fieldKey === 'email' ? '?¥Î©î?ºÏù¥ ?Ä?•Îêò?àÏäµ?àÎã§.' : '?âÎÑ§?ÑÏù¥ ?Ä?•Îêò?àÏäµ?àÎã§.',
            checkedValue: String(profileForm[fieldKey] || '').trim(),
          },
        }));
      }

      return true;
    } catch (error) {
      setProfileSubmitError(error.message || '?åÏõê?ïÎ≥¥Î•??Ä?•ÌïòÏßÄ Î™ªÌñà?µÎãà??');
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
        'ÎπÑÎ?Î≤àÌò∏Î•?Î≥ÄÍ≤ΩÌïòÏßÄ Î™ªÌñà?µÎãà??'
      );
      setPasswordForm(EMPTY_PASSWORD_FORM);
      return true;
    } catch (error) {
      setPasswordError(error.message || 'ÎπÑÎ?Î≤àÌò∏Î•?Î≥ÄÍ≤ΩÌïòÏßÄ Î™ªÌñà?µÎãà??');
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
      '?ïÎßê ?åÏõê ?àÌá¥Î•?ÏßÑÌñâ?òÏãúÍ≤†Ïäµ?àÍπå? ?àÌá¥ ?¥ÌõÑ?êÎäî ?ÑÏû¨ Í≥ÑÏ†ï?ºÎ°ú ÎßàÏù¥?òÏù¥ÏßÄ Í∏∞Îä•??Í≥ÑÏÜç ?¨Ïö©?????ÜÏäµ?àÎã§.'
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
        '?åÏõê ?àÌá¥ Ï≤òÎ¶¨???§Ìå®?àÏäµ?àÎã§.'
      );
      window.alert('?åÏõê ?àÌá¥Í∞Ä ?ÑÎ£å?òÏóà?µÎãà??');
      window.location.hash = '#/products';
      return true;
    } catch (error) {
      setWithdrawError(error.message || '?åÏõê ?àÌá¥ Ï≤òÎ¶¨???§Ìå®?àÏäµ?àÎã§.');
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
      '?åÏõê?ïÎ≥¥Î•?Î∂àÎü¨?§Ï? Î™ªÌñà?µÎãà??'
    );
    if (payload.data) {
      const nextProfile = { ...EMPTY_PROFILE, ...payload.data };
      setProfile(nextProfile);
      setProfileForm(toProfileForm(nextProfile));
    }
  }

  const fetchAddresses = useCallback(async () => {
    setAddressesLoading(true);
    setAddressesError('');

    try {
      const payload = await requestAuthApi(
        ADDRESS_API_PATH,
        {
          headers: accountHeaders(authUser),
        },
        'Î∞∞ÏÜ°ÏßÄ Î™©Î°ù??Î∂àÎü¨?§Ï? Î™ªÌñà?µÎãà??'
      );
      setAddresses(Array.isArray(payload.data) ? payload.data : []);
    } catch (error) {
      setAddressesError(error.message || 'Î∞∞ÏÜ°ÏßÄ Î™©Î°ù??Î∂àÎü¨?§Ï? Î™ªÌñà?µÎãà??');
    } finally {
      setAddressesLoading(false);
    }
  }, [authUser]);

  const openAddressModal = useCallback(() => {
    setIsAddressModalOpen(true);
    setAddressForm(EMPTY_ADDRESS_FORM);
    setAddressFormError('');
    setIsAddressFormOpen(false);
    setEditingAddressNo(null);
    fetchAddresses();
  }, [fetchAddresses]);

  function closeAddressModal() {
    addressModalRouteHandledRef.current = false;
    setIsAddressModalOpen(false);
    setAddressesError('');
    setChangingAddressNo(null);
    setDeletingAddressNo(null);
    setEditingAddressNo(null);
    setAddressFormError('');
    setAddressSubmitting(false);
    setIsAddressFormOpen(false);
  }

  useEffect(() => {
    if (currentPage !== 'mypage') {
      addressModalRouteHandledRef.current = false;
      return;
    }

    const [, queryString = ''] = window.location.hash.split('?');
    const params = new URLSearchParams(queryString);
    const shouldOpenAddressModal = params.get('address') === 'manage';

    if (!shouldOpenAddressModal || addressModalRouteHandledRef.current) {
      return;
    }

    addressModalRouteHandledRef.current = true;
    openAddressModal();
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${window.location.search}${ACCOUNT_ROUTES.mypage}`
    );
  }, [currentPage, openAddressModal]);

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
        isEditMode ? 'Î∞∞ÏÜ°ÏßÄ ?òÏ†ï???§Ìå®?àÏäµ?àÎã§.' : 'Î∞∞ÏÜ°ÏßÄ ?±Î°ù???§Ìå®?àÏäµ?àÎã§.'
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
        (isEditMode ? 'Î∞∞ÏÜ°ÏßÄ ?òÏ†ï???§Ìå®?àÏäµ?àÎã§.' : 'Î∞∞ÏÜ°ÏßÄ ?±Î°ù???§Ìå®?àÏäµ?àÎã§.')
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
        'Í∏∞Î≥∏ Î∞∞ÏÜ°ÏßÄ Î≥ÄÍ≤ΩÏóê ?§Ìå®?àÏäµ?àÎã§.'
      );
      setAddresses(Array.isArray(payload.data) ? payload.data : []);
      await refreshProfile();
    } catch (error) {
      setAddressesError(error.message || 'Í∏∞Î≥∏ Î∞∞ÏÜ°ÏßÄ Î≥ÄÍ≤ΩÏóê ?§Ìå®?àÏäµ?àÎã§.');
    } finally {
      setChangingAddressNo(null);
    }
  }

  async function handleDeleteAddress(address) {
    const addressNo = address?.addressNo;
    const addressLabel = address?.addressName || address?.recipientName || '?†ÌÉù??Î∞∞ÏÜ°ÏßÄ';

    if (!addressNo) {
      return;
    }

    const confirmed = window.confirm(`'${addressLabel}' Î∞∞ÏÜ°ÏßÄÎ•???†ú?òÏãúÍ≤†Ïäµ?àÍπå?`);
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
        'Î∞∞ÏÜ°ÏßÄ ??†ú???§Ìå®?àÏäµ?àÎã§.'
      );
      setAddresses(Array.isArray(payload.data) ? payload.data : []);
      await refreshProfile();
    } catch (error) {
      setAddressesError(error.message || 'Î∞∞ÏÜ°ÏßÄ ??†ú???§Ìå®?àÏäµ?àÎã§.');
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
      setWishlistError(error.message || '?•Î∞îÍµ¨Îãà ?¥Í∏∞???§Ìå®?àÏäµ?àÎã§.');
    } finally {
      setWishlistActionProductNo(null);
    }
  }

  function handleRemoveWishlistItem(productNo) {
    const confirmed = window.confirm('Ï∞úÌïú ?ÅÌíà?êÏÑú ?úÍ±∞?òÏãúÍ≤†Ïäµ?àÍπå?');
    if (!confirmed) {
      return;
    }

    const nextWishlist = wishlistProductNos.filter(
      (currentProductNo) => Number(currentProductNo) !== Number(productNo)
    );
    persistValue(WISHLIST_STORAGE_KEY, nextWishlist);
    setWishlistProductNos(nextWishlist);
  }

  function handleStartCreateReviewFromOrder(item, orderDetail) {
    if (!item) {
      return;
    }

    handleStartCreateReview({
      orderItemNo: item.orderItemNo,
      productNo: item.productNo,
      productName: item.productName,
      orderId: orderDetail?.orderId || '',
      imageNo: item.imageNo || null,
    });
    setActiveTab('reviews');
    moveToPage('activity');
  }

  function handleStartCreateReview(review) {
    setReviewEditor({
      mode: 'create',
      reviewNo: null,
      productNo: review.productNo,
      productName: review.productName,
      orderId: review.orderId,
      imageNo: review.imageNo || null,
      reviewImageNo: null,
    });
    setReviewForm({
      orderItemNo: review.orderItemNo,
      rating: 5,
      content: '',
      imageFiles: [],
      existingImages: [],
      removedImageNos: [],
    });
    setReviewFormError('');
  }

  function handleStartEditReview(review) {
    setReviewEditor({
      mode: 'edit',
      reviewNo: review.reviewNo,
      productNo: review.productNo,
      productName: review.productName,
      orderId: review.orderId,
      imageNo: review.imageNo || null,
      reviewImageNo: review.reviewImageNo || null,
    });
    setReviewForm({
      orderItemNo: review.orderItemNo,
      rating: Number(review.rating || 5),
      content: review.content || '',
      imageFiles: [],
      existingImages: Array.isArray(review.imageList) ? review.imageList : [],
      removedImageNos: [],
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

  function handleReviewImageChange(event) {
    const files = Array.from(event.target.files || []).filter(Boolean);
    const activeExistingCount = (reviewForm.existingImages || []).filter(
      (image) => !reviewForm.removedImageNos.includes(image.reviewImageNo)
    ).length;
    const nextImageFiles = [...(reviewForm.imageFiles || []), ...files];

    if (activeExistingCount + nextImageFiles.length > 3) {
      setReviewFormError('Î¶¨Î∑∞ ?¨ÏßÑ?Ä ÏµúÎ? 3?•ÍπåÏßÄ ?±Î°ù?????àÏäµ?àÎã§.');
      event.target.value = '';
      return;
    }

    setReviewFormError('');
    setReviewForm((current) => ({
      ...current,
      imageFiles: nextImageFiles,
    }));
    event.target.value = '';
  }

  function handleRemoveReviewImage(target) {
    setReviewFormError('');
    setReviewForm((current) => ({
      ...current,
      imageFiles: target?.type === 'new'
        ? current.imageFiles.filter((_, index) => index !== target.index)
        : current.imageFiles,
      removedImageNos: target?.type === 'existing' && target.reviewImageNo
        ? Array.from(new Set([...current.removedImageNos, target.reviewImageNo]))
        : current.removedImageNos,
    }));
  }

  async function handleReviewSubmit(event) {
    event.preventDefault();
    setReviewSubmitting(true);
    setReviewFormError('');

    if (!String(reviewForm.content || '').trim()) {
      setReviewFormError('Î¶¨Î∑∞ ?¥Ïö©???ÖÎ†•??Ï£ºÏÑ∏??');
      setReviewSubmitting(false);
      return false;
    }

    try {
      const isEditMode = reviewEditor?.mode === 'edit' && reviewEditor?.reviewNo;
      const formData = new FormData();
      if (reviewForm.orderItemNo) {
        formData.append('orderItemNo', String(reviewForm.orderItemNo));
      }
      formData.append('rating', String(reviewForm.rating));
      formData.append('content', String(reviewForm.content || ''));
      formData.append('removeImage', 'false');
      (reviewForm.removedImageNos || []).forEach((reviewImageNo) => {
        formData.append('removeImageNos', String(reviewImageNo));
      });
      (reviewForm.imageFiles || []).forEach((imageFile) => {
        formData.append('reviewImages', imageFile);
      });

      await requestAuthApi(
        isEditMode ? `${REVIEW_API_PATH}/${reviewEditor.reviewNo}` : REVIEW_API_PATH,
        {
          method: isEditMode ? 'PATCH' : 'POST',
          headers: accountHeaders(authUser),
          body: formData,
        },
        isEditMode ? 'Î¶¨Î∑∞ ?òÏ†ï???§Ìå®?àÏäµ?àÎã§.' : 'Î¶¨Î∑∞ ?ëÏÑ±???§Ìå®?àÏäµ?àÎã§.'
      );

      await loadReviewsData();
      notifyReviewChange(reviewEditor?.productNo);
      handleCancelReviewEditor();
      return true;
    } catch (error) {
      setReviewFormError(
        error.message || (reviewEditor?.mode === 'edit'
          ? 'Î¶¨Î∑∞ ?òÏ†ï???§Ìå®?àÏäµ?àÎã§.'
          : 'Î¶¨Î∑∞ ?ëÏÑ±???§Ìå®?àÏäµ?àÎã§.')
      );
      return false;
    } finally {
      setReviewSubmitting(false);
    }
  }

  async function handleDeleteReview(reviewNo) {
    const confirmed = window.confirm('??Î¶¨Î∑∞Î•???†ú?òÏãúÍ≤†Ïäµ?àÍπå?');
    if (!confirmed) {
      return;
    }

    const targetReview = myReviews.find(
      (currentReview) => Number(currentReview.reviewNo) === Number(reviewNo)
    );
    const targetProductNo =
      targetReview?.productNo ||
      (reviewEditor?.mode === 'edit' && reviewEditor.reviewNo === reviewNo
        ? reviewEditor.productNo
        : null);

    setDeletingReviewNo(reviewNo);
    setReviewsError('');

    try {
      await requestAuthApi(
        `${REVIEW_API_PATH}/${reviewNo}`,
        {
          method: 'DELETE',
          headers: accountHeaders(authUser),
        },
        'Î¶¨Î∑∞ ??†ú???§Ìå®?àÏäµ?àÎã§.'
      );
      await loadReviewsData();
      notifyReviewChange(targetProductNo);

      if (reviewEditor?.mode === 'edit' && reviewEditor.reviewNo === reviewNo) {
        handleCancelReviewEditor();
      }
    } catch (error) {
      setReviewsError(error.message || 'Î¶¨Î∑∞ ??†ú???§Ìå®?àÏäµ?àÎã§.');
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
                <h1>Î°úÍ∑∏?∏Ïù¥ ?ÑÏöî?©Îãà??</h1>
                <p>ÎßàÏù¥?òÏù¥ÏßÄ?Ä ?Ä?úÎ≥¥?úÎäî Î°úÍ∑∏?????¥Ïö©?????àÏäµ?àÎã§.</p>
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
                Î°úÍ∑∏?∏Ìïò??Í∞ÄÍ∏?
              </button>
              <button
                className="btn-outline"
                type="button"
                onClick={() => {
                  window.location.hash = '#/signup';
                }}
              >
                ?åÏõêÍ∞Ä??
              </button>
            </div>
          </section>
        </main>

        <footer className="site-footer">
          <div className="footer-links">
            <a href="#/products">Í∞úÏù∏?ïÎ≥¥Ï≤òÎ¶¨Î∞©Ïπ®</a>
            <a href="#/products">?¥Ïö©?ΩÍ?</a>
            <a href="#/products">Í≥†Í∞ù?ºÌÑ∞</a>
          </div>
          <div>¬© 2026 oneulFarm. All rights reserved.</div>
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
            Í∞úÏù∏?ïÎ≥¥ Í¥ÄÎ¶?
          </button>
          <button
            type="button"
            className={`account-local-nav__link ${currentPage === 'activity' ? 'is-active' : ''}`}
            onClick={() => moveToPage('activity')}
          >
              ???úÎèô
          </button>
          <button
            type="button"
            className={`account-local-nav__link ${currentPage === 'orders' ? 'is-active' : ''}`}
            onClick={() => moveToPage('orders')}
          >
            Ï£ºÎ¨∏Í¥ÄÎ¶?
          </button>
          <button
            type="button"
            className={`account-local-nav__link ${currentPage === 'dashboard' ? 'is-active' : ''}`}
            onClick={() => moveToPage('dashboard')}
          >
            ?Ä?úÎ≥¥??
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
            onReviewImageChange={handleReviewImageChange}
            onRemoveReviewImage={handleRemoveReviewImage}
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
            onStartCreateReview={handleStartCreateReviewFromOrder}
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
          <a href="#/products">Í∞úÏù∏?ïÎ≥¥Ï≤òÎ¶¨Î∞©Ïπ®</a>
          <a href="#/products">?¥Ïö©?ΩÍ?</a>
          <a href="#/products">Í≥†Í∞ù?ºÌÑ∞</a>
        </div>
        <div>¬© 2026 oneulFarm. All rights reserved.</div>
      </footer>
    </div>
  );
}

export default AccountApp;


