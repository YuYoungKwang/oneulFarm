import { useEffect, useState } from 'react';
import './App.css';
import DashboardView from './DashboardView';
import MyPageView from './MyPageView';
import ProfileDetailView from './ProfileDetailView';
import AddressModal from './AddressModal';
import { pageTabs } from './mockData';

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

async function parseResponse(response, fallbackMessage) {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.message || fallbackMessage);
  }

  return payload;
}

function App() {
  const [currentPage, setCurrentPage] = useState('mypage');
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
  const [addressForm, setAddressForm] = useState(EMPTY_ADDRESS_FORM);
  const [addressFormError, setAddressFormError] = useState('');
  const [addressSubmitting, setAddressSubmitting] = useState(false);
  const [isAddressFormOpen, setIsAddressFormOpen] = useState(false);

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
        const nextOrders = Array.isArray(payload.data) ? payload.data : [];

        setOrders(nextOrders);
      } catch (error) {
        if (error.name === 'AbortError') {
          return;
        }
        setOrdersError(error.message || '주문 목록을 불러오지 못했습니다.');
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
        if (payload.data) {
          setSummary(payload.data);
        }
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

  async function loadProfile(signal) {
    setProfileLoading(true);
    setProfileError('');

    try {
      const response = await fetch(`${USER_API_BASE}/me`, {
        headers: { 'X-USER-NO': DEMO_USER_NO },
        signal,
      });

      const payload = await parseResponse(response, '회원정보를 불러오지 못했습니다.');
      if (payload.data) {
        const nextProfile = { ...EMPTY_PROFILE, ...payload.data };
        setProfile(nextProfile);
        setProfileForm({
          nickname: nextProfile.nickname || '',
          email: nextProfile.email || '',
          phone: nextProfile.phone || '',
        });
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        return;
      }
      setProfileError(error.message || '회원정보를 불러오지 못했습니다.');
    } finally {
      setProfileLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    loadProfile(controller.signal);
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
        if (error.name === 'AbortError') {
          return;
        }
        setOrderDetail(null);
        setDetailError(error.message || '주문 상세를 불러오지 못했습니다.');
      } finally {
        setDetailLoading(false);
      }
    }

    fetchOrderDetail();
    return () => controller.abort();
  }, [selectedOrderNo]);

  function openProfileDetail() {
    setProfileSubmitError('');
    setPasswordError('');
    setPasswordForm(EMPTY_PASSWORD_FORM);
    setCurrentPage('profile-detail');
  }

  function moveToMypage() {
    setCurrentPage('mypage');
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
          'X-USER-NO': DEMO_USER_NO,
        },
        body: JSON.stringify(profileForm),
      });

      const payload = await parseResponse(response, '회원정보를 저장하지 못했습니다.');

      if (payload.data) {
        const nextProfile = { ...EMPTY_PROFILE, ...payload.data };
        setProfile(nextProfile);
        setProfileForm({
          nickname: nextProfile.nickname || '',
          email: nextProfile.email || '',
          phone: nextProfile.phone || '',
        });
      }
    } catch (error) {
      setProfileSubmitError(error.message || '회원정보를 저장하지 못했습니다.');
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

  async function handlePasswordSubmit(event) {
    event.preventDefault();
    setPasswordSubmitting(true);
    setPasswordError('');

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('새 비밀번호와 비밀번호 확인이 일치하지 않습니다.');
      setPasswordSubmitting(false);
      return;
    }

    try {
      await parseResponse(
        await fetch(`${USER_API_BASE}/me/password`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-USER-NO': DEMO_USER_NO,
          },
          body: JSON.stringify(passwordForm),
        }),
        '비밀번호 변경에 실패했습니다.',
      );

      setPasswordForm(EMPTY_PASSWORD_FORM);
    } catch (error) {
      setPasswordError(error.message || '비밀번호 변경에 실패했습니다.');
    } finally {
      setPasswordSubmitting(false);
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
    fetchAddresses();
  }

  function closeAddressModal() {
    setIsAddressModalOpen(false);
    setAddressesError('');
    setChangingAddressNo(null);
    setDeletingAddressNo(null);
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

  async function handleAddressFormSubmit(event) {
    event.preventDefault();
    setAddressSubmitting(true);
    setAddressFormError('');

    try {
      const response = await fetch(ADDRESS_API_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-USER-NO': DEMO_USER_NO,
        },
        body: JSON.stringify(addressForm),
      });

      const payload = await parseResponse(response, '배송지 등록에 실패했습니다.');
      setAddresses(Array.isArray(payload.data) ? payload.data : []);
      setAddressForm(EMPTY_ADDRESS_FORM);
      setIsAddressFormOpen(false);

      await loadProfile();
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
        headers: { 'X-USER-NO': DEMO_USER_NO },
      });

      const payload = await parseResponse(response, '기본 배송지 변경에 실패했습니다.');
      setAddresses(Array.isArray(payload.data) ? payload.data : []);

      await loadProfile();
    } catch (error) {
      setAddressesError(error.message || '기본 배송지 변경에 실패했습니다.');
    } finally {
      setChangingAddressNo(null);
    }
  }

  async function handleDeleteAddress(addressNo) {
    const shouldDelete = window.confirm('이 배송지를 삭제할까요?');
    if (!shouldDelete) {
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

      await loadProfile();
    } catch (error) {
      setAddressesError(error.message || '배송지 삭제에 실패했습니다.');
    } finally {
      setDeletingAddressNo(null);
    }
  }

  function handleToggleAddressForm() {
    setAddressFormError('');
    setIsAddressFormOpen((current) => !current);
  }

  function handleSelectOrder(orderNo) {
    setSelectedOrderNo((current) => (current === orderNo ? null : orderNo));
  }

  return (
    <div className="page-shell">
      <header className="top-nav">
        <button type="button" className="logo logo-button" onClick={() => setCurrentPage('mypage')}>
          <span className="logo-mark" />
          <span>oneulFarm</span>
        </button>

        <nav className="nav-links">
          <a className="nav-link" href="/">메인</a>
          <a className="nav-link" href="/">시세분석</a>
          <a className="nav-link" href="/">상품</a>
          <a className="nav-link" href="/">레시피</a>
          {pageTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`nav-link nav-link-button ${
                (tab.id === 'mypage' && (currentPage === 'mypage' || currentPage === 'profile-detail'))
                || currentPage === tab.id
                  ? 'is-active'
                  : ''
              }`}
              onClick={() => setCurrentPage(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="nav-actions">
          <button type="button" className="icon-btn" aria-label="검색">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
          </button>
          <button type="button" className="icon-btn" aria-label="알림">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
              <path d="M15 17H5l1.4-1.6A2 2 0 0 0 7 14V10a5 5 0 1 1 10 0v4a2 2 0 0 0 .6 1.4L19 17h-4" />
              <path d="M10 19a2 2 0 0 0 4 0" />
            </svg>
          </button>
          <a className="btn-outline" href="/">로그아웃</a>
        </div>
      </header>

      <main className="container">
        {currentPage === 'mypage' ? (
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
        ) : currentPage === 'profile-detail' ? (
          <ProfileDetailView
            profile={profile}
            profileLoading={profileLoading}
            profileError={profileError}
            profileForm={profileForm}
            profileSubmitting={profileSubmitting}
            profileSubmitError={profileSubmitError}
            onProfileFormChange={handleProfileFormChange}
            onProfileSubmit={handleProfileSubmit}
            passwordForm={passwordForm}
            passwordSubmitting={passwordSubmitting}
            passwordError={passwordError}
            onPasswordFormChange={handlePasswordFormChange}
            onPasswordSubmit={handlePasswordSubmit}
            onBack={moveToMypage}
            onOpenAddressModal={openAddressModal}
          />
        ) : (
          <DashboardView
            onMoveToMypage={() => setCurrentPage('mypage')}
            summary={summary}
            summaryLoading={summaryLoading}
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
        form={addressForm}
        formError={addressFormError}
        submitting={addressSubmitting}
        onClose={closeAddressModal}
        onChangeDefault={handleChangeDefaultAddress}
        onDeleteAddress={handleDeleteAddress}
        onToggleForm={handleToggleAddressForm}
        onFormChange={handleAddressFormChange}
        onFormSubmit={handleAddressFormSubmit}
      />

      <footer className="site-footer">
        <div className="footer-links">
          <a href="/">개인정보처리방침</a>
          <a href="/">이용약관</a>
          <a href="/">고객센터</a>
        </div>
        <div>© 2026 oneulFarm. All rights reserved.</div>
      </footer>
    </div>
  );
}

export default App;
