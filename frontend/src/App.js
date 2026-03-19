import { startTransition, useEffect, useState } from 'react';
import AccountApp from './AccountApp';
import {
  clearAuthUser,
  getAuthUser,
  isAuthenticated,
  requiresPasswordChange,
} from './auth';
import MainNav from './components/MainNav';
import PasswordChangeRequiredPage from './components/PasswordChangeRequiredPage';
import ProductApp from './components/ProductApp';
import MainPage from './components/Mainpage';
import SiteFooter from './components/SiteFooter';
import RecommendPage from './components/RecommendPage'; // 추가

const MAIN_ROUTE_SEGMENTS = new Set(['', 'main', 'mainpage', 'home']);
const PRODUCT_ROUTE_SEGMENTS = new Set([
  'productapp',
  'products',
  'cart',
  'checkout',
  'recipes',
  'order-complete',
  'payment-success',
  'payment-fail',
  'login',
  'signup',
  'password-change',
]);
const ACCOUNT_ROUTE_SEGMENTS = new Set(['dashboard', 'mypage', 'orders']);

function getFirstSegment(hash) {
  const normalized = hash.replace(/^#\/?/, '').trim().toLowerCase();
  if (!normalized) {
    const normalizedPathname = (window.location.pathname || '')
      .replace(/^\/+|\/+$/g, '')
      .trim()
      .toLowerCase();

    if (!normalizedPathname) {
      return '';
    }

    const [pathnameSegment] = normalizedPathname.split('/');
    return pathnameSegment;
  }

  const [firstSegment] = normalized.split('/');
  return firstSegment;
}

function resolveAppFromHash(hash) {
  const firstSegment = getFirstSegment(hash);

      if (firstSegment === 'recommend') {
    return 'recommend';   // ✅ 추가
  }

  if (MAIN_ROUTE_SEGMENTS.has(firstSegment)) {
    return 'main';
  }

  if (ACCOUNT_ROUTE_SEGMENTS.has(firstSegment)) {
    return 'account';
  }

  if (PRODUCT_ROUTE_SEGMENTS.has(firstSegment)) {
    return 'product';
  }


  return 'main';
}

function resolveActiveSection(hash) {
  const firstSegment = getFirstSegment(hash);

  if (MAIN_ROUTE_SEGMENTS.has(firstSegment)) {
    return null;
  }

  if (firstSegment === 'recipes') {
    return 'recipes';
  }

  if (firstSegment === 'recommend') {
  return 'recommend';
}
  if (
    firstSegment === 'orders' ||
    firstSegment === 'order-complete' ||
    firstSegment === 'mypage'
  ) {
    return 'mypage';
  }

  if (firstSegment === 'dashboard') {
    return 'dashboard';
  }


  if (
    firstSegment === 'productapp' ||
    firstSegment === 'products' ||
    firstSegment === 'cart' ||
    firstSegment === 'checkout' ||
    firstSegment === 'payment-success' ||
    firstSegment === 'payment-fail'
  ) {
    return 'products';
  }

  return 'products';
}

function readCartCount(authUser) {
  if (!isAuthenticated(authUser)) {
    return 0;
  }

  try {
    const storedCart = JSON.parse(window.localStorage.getItem('oneulFarmCart') || '{}');
    return Object.values(storedCart).reduce(
      (sum, quantity) => sum + Number(quantity || 0),
      0
    );
  } catch (error) {
    return 0;
  }
}

function App() {
  const [currentApp, setCurrentApp] = useState(() =>
    resolveAppFromHash(window.location.hash)
  );
  const [activeSection, setActiveSection] = useState(() =>
    resolveActiveSection(window.location.hash)
  );
  const [authUser, setAuthUser] = useState(() => getAuthUser());
  const [cartCount, setCartCount] = useState(() => readCartCount(getAuthUser()));

  const navigateTo = (hash) => {
    window.location.hash = hash;
  };

  useEffect(() => {
    const syncApp = () => {
      startTransition(() => {
        const nextAuthUser = getAuthUser();
        setCurrentApp(resolveAppFromHash(window.location.hash));
        setActiveSection(resolveActiveSection(window.location.hash));
        setCartCount(readCartCount(nextAuthUser));
        setAuthUser(nextAuthUser);
      });
    };

    syncApp();
    window.addEventListener('hashchange', syncApp);
    window.addEventListener('storage', syncApp);
    window.addEventListener('oneulFarm:storage-change', syncApp);

    return () => {
      window.removeEventListener('hashchange', syncApp);
      window.removeEventListener('storage', syncApp);
      window.removeEventListener('oneulFarm:storage-change', syncApp);
    };
  }, []);

  const isPasswordChangeRequired = requiresPasswordChange(authUser);

  return (
    <>
      {isPasswordChangeRequired ? (
        <PasswordChangeRequiredPage authUser={authUser} />
      ) : (
        <>
          <MainNav
            activeSection={activeSection}
            authUser={authUser}
            cartCount={cartCount}
            onOpenCart={() => navigateTo(isAuthenticated(authUser) ? '#/cart' : '#/login')}
            onOpenLogin={() => navigateTo('#/login')}
            onOpenSignup={() => navigateTo('#/signup')}
            onLogout={() => {
              clearAuthUser();
              navigateTo('#/login');
            }}
          />
          {currentApp === 'main' && <MainPage />}
          {currentApp === 'product' && <ProductApp authUser={authUser} />}
          {currentApp === 'account' && <AccountApp authUser={authUser} />}
          {currentApp === 'recommend' && <RecommendPage authUser={authUser} />}
          {currentApp === 'main' && <SiteFooter />}
        </>
      )}
    </>
  );
}

export default App;
