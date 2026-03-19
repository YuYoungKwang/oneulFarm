import { useEffect, useState } from 'react';
import { getAuthUser, parseApiResponse } from './auth';
import './styles/account.css';
import DashboardView from './DashboardView';
import MyPageView from './MyPageView';
import ProfileEditModal from './ProfileEditModal';
import AddressModal from './AddressModal';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '/backend';
const ORDER_API_BASE = `${API_BASE_URL}/api/orders`;
const DASHBOARD_API_BASE = `${API_BASE_URL}/api/dashboard`;
const USER_API_BASE = `${API_BASE_URL}/api/users`;
const ADDRESS_API_BASE = `${USER_API_BASE}/me/addresses`;

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

const EMPTY_PROFILE_FORM = {
  nickname: '',
  email: '',
  phone: '',
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

function AccountApp() {
  const [authUser, setAuthUser] = useState(() => getAuthUser());
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
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState('');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileForm, setProfileForm] = useState(EMPTY_PROFILE_FORM);
  const [profileSubmitError, setProfileSubmitError] = useState('');
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [addressesError, setAddressesError] = useState('');
  const [changingAddressNo, setChangingAddressNo] = useState(null);
  const [addressForm, setAddressForm] = useState(EMPTY_ADDRESS_FORM);
  const [addressFormError, setAddressFormError] = useState('');
  const [addressSubmitting, setAddressSubmitting] = useState(false);
  const [isAddressFormOpen, setIsAddressFormOpen] = useState(false);

  useEffect(() => {
    const syncPage = () => {
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
    if (!authUser?.userNo) {
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
        const response = await fetch(`${ORDER_API_BASE}/me`, {
          headers: { 'X-USER-NO': String(authUser.userNo) },
          signal: controller.signal,
        });

        const payload = await parseApiResponse(response, '주문 목록을 불러오지 못했습니다.');
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
  }, [authUser]);

  useEffect(() => {
    if (!authUser?.userNo) {
      setSummary(EMPTY_SUMMARY);
      setSummaryLoading(false);
      return undefined;
    }

    const controller = new AbortController();

    async function fetchSummary() {
      setSummaryLoading(true);

      try {
        const response = await fetch(`${DASHBOARD_API_BASE}/summary`, {
          headers: { 'X-USER-NO': String(authUser.userNo) },
          signal: controller.signal,
        });

        const payload = await parseApiResponse(response, '대시보드 요약을 불러오지 못했습니다.');
        setSummary(payload.data || EMPTY_SUMMARY);
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
    if (!authUser?.userNo) {
      setProfile(EMPTY_PROFILE);
      setProfileLoading(false);
      setProfileError('');
      return undefined;
    }

    const controller = new AbortController();

    async function fetchProfile() {
      setProfileLoading(true);
      setProfileError('');

      try {
        const response = await fetch(`${USER_API_BASE}/me`, {
          headers: { 'X-USER-NO': String(authUser.userNo) },
          signal: controller.signal,
        });

        const payload = await parseApiResponse(response, '회원 정보를 불러오지 못했습니다.');
        setProfile(payload.data ? { ...EMPTY_PROFILE, ...payload.data } : EMPTY_PROFILE);
      } catch (error) {
        if (error.name !== 'AbortError') {
          setProfileError(error.message || '회원 정보를 불러오지 못했습니다.');
        }
      } finally {
        setProfileLoading(false);
      }
    }

    fetchProfile();
    return () => controller.abort();
  }, [authUser]);

  useEffect(() => {
    if (!authUser?.userNo || !selectedOrderNo) {
      setOrderDetail(null);
      setDetailError('');
      return undefined;
    }

    const controller = new AbortController();

    async function fetchOrderDetail() {
      setDetailLoading(true);
      setDetailError('');

      try {
        const response = await fetch(`${ORDER_API_BASE}/me/${selectedOrderNo}`, {
          headers: { 'X-USER-NO': String(authUser.userNo) },
          signal: controller.signal,
        });

        const payload = await parseApiResponse(response, '주문 상세를 불러오지 못했습니다.');
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

  function openProfileEdit() {
    setProfileForm({
      nickname: profile.nickname || '',
      email: profile.email || '',
      phone: profile.phone || '',
    });
    setProfileSubmitError('');
    setIsProfileModalOpen(true);
  }

  function closeProfileEdit() {
    setIsProfileModalOpen(false);
    setProfileSubmitError('');
    setProfileSubmitting(false);
  }

  function handleProfileFormChange(event) {
    const { name, value } = event.target;
    setProfileForm((current) => ({
      ...current,
      [name]: value,
    }));
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
          'X-USER-NO': String(authUser.userNo),
        },
        body: JSON.stringify(profileForm),
      });

      const payload = await parseApiResponse(response, '회원 정보를 수정하지 못했습니다.');
      if (payload.data) {
        setProfile({ ...EMPTY_PROFILE, ...payload.data });
      }
      setIsProfileModalOpen(false);
    } catch (error) {
      setProfileSubmitError(error.message || '회원 정보를 수정하지 못했습니다.');
    } finally {
      setProfileSubmitting(false);
    }
  }

  async function fetchAddresses() {
    setAddressesLoading(true);
    setAddressesError('');

    try {
      const response = await fetch(ADDRESS_API_BASE, {
        headers: { 'X-USER-NO': String(authUser.userNo) },
      });

      const payload = await parseApiResponse(response, '배송지 목록을 불러오지 못했습니다.');
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
    fetchAddresses();
  }

  function closeAddressModal() {
    setIsAddressModalOpen(false);
    setAddressesError('');
    setChangingAddressNo(null);
    setAddressFormError('');
    setAddressSubmitting(false);
    setIsAddressFormOpen(false);
  }

  function handleAddressFormChange(event) {
    const { name, value, type, checked } = event.target;
    setAddressForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? (checked ? 'Y' : 'N') : value,
    }));
  }

  async function refreshProfile() {
    const profileResponse = await fetch(`${USER_API_BASE}/me`, {
      headers: { 'X-USER-NO': String(authUser.userNo) },
    });
    const profilePayload = await parseApiResponse(profileResponse, '회원 정보를 불러오지 못했습니다.');
    if (profilePayload.data) {
      setProfile({ ...EMPTY_PROFILE, ...profilePayload.data });
    }
  }

  async function handleAddressFormSubmit(event) {
    event.preventDefault();
    setAddressSubmitting(true);
    setAddressFormError('');

    try {
      const response = await fetch(ADDRESS_API_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-USER-NO': String(authUser.userNo),
        },
        body: JSON.stringify(addressForm),
      });

      const payload = await parseApiResponse(response, '배송지 등록에 실패했습니다.');
      setAddresses(Array.isArray(payload.data) ? payload.data : []);
      setAddressForm(EMPTY_ADDRESS_FORM);
      setIsAddressFormOpen(false);
      await refreshProfile();
    } catch (error) {
      setAddressFormError(error.message || '배송지 등록에 실패했습니다.');
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
        headers: { 'X-USER-NO': String(authUser.userNo) },
      });

      const payload = await parseApiResponse(response, '기본 배송지 변경에 실패했습니다.');
      setAddresses(Array.isArray(payload.data) ? payload.data : []);
      await refreshProfile();
    } catch (error) {
      setAddressesError(error.message || '기본 배송지 변경에 실패했습니다.');
    } finally {
      setChangingAddressNo(null);
    }
  }

  function handleToggleAddressForm() {
    setAddressFormError('');
    setIsAddressFormOpen((current) => !current);
  }

  function handleSelectOrder(orderNo) {
    setSelectedOrderNo((current) => (current === orderNo ? null : orderNo));
  }

  function moveToPage(page) {
    window.location.hash = ACCOUNT_ROUTES[page] || ACCOUNT_ROUTES.mypage;
  }

  return (
    <div className="account-app page-shell">
      <main className="container">
        {!authUser?.userNo ? (
          <section className="card">
            <div className="page-head" style={{ marginBottom: '8px' }}>
              <div>
                <h1>로그인이 필요합니다.</h1>
                <p>마이페이지와 대시보드는 로그인 후 이용할 수 있습니다.</p>
              </div>
            </div>
            <div className="page-actions">
              <button className="btn" type="button" onClick={() => { window.location.hash = '#/login'; }}>
                로그인하러 가기
              </button>
              <button className="btn-outline" type="button" onClick={() => { window.location.hash = '#/signup'; }}>
                회원가입
              </button>
            </div>
          </section>
        ) : currentPage === 'mypage' ? (
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
            onOpenProfileEdit={openProfileEdit}
            onOpenAddressModal={openAddressModal}
          />
        ) : (
          <DashboardView
            onMoveToMypage={() => moveToPage('mypage')}
            summary={summary}
            summaryLoading={summaryLoading}
          />
        )}
      </main>

      <ProfileEditModal
        open={isProfileModalOpen}
        form={profileForm}
        onChange={handleProfileFormChange}
        onClose={closeProfileEdit}
        onSubmit={handleProfileSubmit}
        submitting={profileSubmitting}
        error={profileSubmitError}
      />
      <AddressModal
        open={isAddressModalOpen}
        addresses={addresses}
        loading={addressesLoading}
        error={addressesError}
        changingAddressNo={changingAddressNo}
        isFormOpen={isAddressFormOpen}
        form={addressForm}
        formError={addressFormError}
        submitting={addressSubmitting}
        onClose={closeAddressModal}
        onChangeDefault={handleChangeDefaultAddress}
        onToggleForm={handleToggleAddressForm}
        onFormChange={handleAddressFormChange}
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
