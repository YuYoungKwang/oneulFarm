import { startTransition, useEffect, useState } from 'react';
import AccountApp from './AccountApp';
import AdminApp from './AdminApp';
import MainNav from './components/MainNav';
import ProductApp from './components/ProductApp';
import MainPage from './components/Mainpage';
import SiteFooter from './components/SiteFooter';

const MAIN_ROUTE_SEGMENTS = new Set(['', 'main', 'mainpage', 'home']);
const PRODUCT_ROUTE_SEGMENTS = new Set([
  'productapp',
  'products',
  'cart',
  'checkout',
  'recipes',
  'orders',
  'order-complete',
  'payment-success',
  'payment-fail',
]);
const ACCOUNT_ROUTE_SEGMENTS = new Set(['dashboard', 'mypage']);
const ADMIN_ROUTE_SEGMENTS = new Set(['admin']);

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

  if (MAIN_ROUTE_SEGMENTS.has(firstSegment)) {
    return 'main';
  }

  if (ACCOUNT_ROUTE_SEGMENTS.has(firstSegment)) {
    return 'account';
  }

  if (ADMIN_ROUTE_SEGMENTS.has(firstSegment)) {
    return 'admin';
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

  if (ADMIN_ROUTE_SEGMENTS.has(firstSegment)) {
    return null;
  }

  if (firstSegment === 'recipes') {
    return 'recipes';
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

function readCartCount() {
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
  const [cartCount, setCartCount] = useState(() => readCartCount());

  useEffect(() => {
    const syncApp = () => {
      startTransition(() => {
        setCurrentApp(resolveAppFromHash(window.location.hash));
        setActiveSection(resolveActiveSection(window.location.hash));
        setCartCount(readCartCount());
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

  return (
    <>
      {currentApp !== 'admin' ? (
        <MainNav activeSection={activeSection} cartCount={cartCount} />
      ) : null}
      {currentApp === 'main' && <MainPage />}
      {currentApp === 'product' && <ProductApp />}
      {currentApp === 'account' && <AccountApp />}
      {currentApp === 'admin' && <AdminApp />}
      {currentApp === 'main' && <SiteFooter />}
    </>
  );
}

export default App;
