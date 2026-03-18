import { useEffect, useState } from 'react';
import './styles/account.css';
import DashboardView from './DashboardView';
import MyPageView from './MyPageView';
import ProfileDetailView from './ProfileDetailView';
import AddressModal from './AddressModal';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '';
const ORDER_API_BASE = `${API_BASE_URL}/api/orders`;
const DASHBOARD_API_BASE = `${API_BASE_URL}/api/dashboard`;
const USER_API_BASE = `${API_BASE_URL}/api/users`;
const ADDRESS_API_BASE = `${USER_API_BASE}/me/addresses`;
const DEMO_USER_NO = '1';

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

const ACCOUNT_ROUTES = {
  dashboard: '#/dashboard',
  mypage: '#/mypage',
};

function getAccountPageFromHash(hash) {
  return hash.startsWith(ACCOUNT_ROUTES.dashboard) ? 'dashboard' : 'mypage';
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

async function parseResponse(response, fallbackMessage) {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.message || fallbackMessage);
  }

  return payload;
}

function AccountApp() {
  const [currentPage, setCurrentPage] = useState(() =>
    getAccountPageFromHash(window.location.hash)
  );
  const [activeTab, setActiveTab] = useState('orders');

  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState('');
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
  const [isProfileDetailOpen, setIsProfileDetailOpen] = useState(false);
  const [profileForm, setProfileForm] = useState(EMPTY_PROFILE_FORM);
  const [profileSubmitError, setProfileSubmitError] = useState('');
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [passwordForm, setPasswordForm] = useState(EMPTY_PASSWORD_FORM);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

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

  useEffect(() => {
    const syncPage = () => {
      setCurrentPage(getAccountPageFromHash(window.location.hash));
    };

    syncPage();
    window.addEventListener('hashchange', syncPage);

    return () => {
      window.removeEventListener('hashchange', syncPage);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchOrders() {
      setOrdersLoading(true);
      setOrdersError('');

      try {
        const response = await fetch(`${ORDER_API_BASE}/me`, {
          headers: { 'X-USER-NO': DEMO_USER_NO },
          signal: controller.signal,
        });
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
  }, []);

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
          parseResponse(monthlyResponse, '대시보드 월별 데이터를 불러오지 못했습니다.'),
          parseResponse(productResponse, '대시보드 품목별 데이터를 불러오지 못했습니다.'),
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
        setProfile(payload.data ? { ...EMPTY_PROFILE, ...payload.data } : EMPTY_PROFILE);
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

  function moveToPage(page) {
    window.location.hash = ACCOUNT_ROUTES[page] || ACCOUNT_ROUTES.mypage;
  }

  function openProfileDetail() {
    setProfileForm({
      nickname: profile.nickname || '',
      email: profile.email || '',
      phone: profile.phone || '',
    });
    setPasswordForm(EMPTY_PASSWORD_FORM);
    setProfileSubmitError('');
    setPasswordError('');
    setIsProfileDetailOpen(true);
  }

  function closeProfileDetail() {
    setIsProfileDetailOpen(false);
    setProfileSubmitError('');
    setPasswordError('');
    setProfileSubmitting(false);
    setPasswordSubmitting(false);
  }

  function handleProfileFormChange(event) {
    const { name, value } = event.target;
    setProfileForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function resetProfileForm() {
    setProfileForm({
      nickname: profile.nickname || '',
      email: profile.email || '',
      phone: profile.phone || '',
    });
    setProfileSubmitError('');
  }

  async function handleProfileSubmit(event) {
    event.preventDefault();
    setProfileSubmitting(true);
    setProfileSubmitError('');

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
        setProfile({ ...EMPTY_PROFILE, ...payload.data });
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

  async function refreshProfile() {
    const response = await fetch(`${USER_API_BASE}/me`, {
      headers: { 'X-USER-NO': DEMO_USER_NO },
    });
    const payload = await parseResponse(response, '회원정보를 불러오지 못했습니다.');
    if (payload.data) {
      setProfile({ ...EMPTY_PROFILE, ...payload.data });
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

  async function handleDeleteAddress(addressNo) {
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

  return (
    <div className="account-app page-shell">
      <main className="container">
        {currentPage === 'mypage' ? (
          isProfileDetailOpen ? (
            <ProfileDetailView
              profile={profile}
              profileLoading={profileLoading}
              profileError={profileError}
              profileForm={profileForm}
              profileSubmitting={profileSubmitting}
              profileSubmitError={profileSubmitError}
              onProfileFormChange={handleProfileFormChange}
              onProfileSubmit={handleProfileSubmit}
              onResetProfileForm={resetProfileForm}
              passwordForm={passwordForm}
              passwordSubmitting={passwordSubmitting}
              passwordError={passwordError}
              onPasswordFormChange={handlePasswordFormChange}
              onPasswordSubmit={handlePasswordSubmit}
              onResetPasswordForm={resetPasswordForm}
              onBack={closeProfileDetail}
              onOpenAddressModal={openAddressModal}
            />
          ) : (
            <MyPageView
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              orders={orders}
              ordersLoading={ordersLoading}
              ordersError={ordersError}
              selectedOrderNo={selectedOrderNo}
              orderDetail={orderDetail}
              detailLoading={detailLoading}
              detailError={detailError}
              onSelectOrder={handleSelectOrder}
              summary={summary}
              summaryLoading={summaryLoading}
              profile={profile}
              profileLoading={profileLoading}
              profileError={profileError}
              onOpenProfileDetail={openProfileDetail}
              onOpenAddressModal={openAddressModal}
            />
          )
        ) : (
          <DashboardView
            onMoveToMypage={() => moveToPage('mypage')}
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
