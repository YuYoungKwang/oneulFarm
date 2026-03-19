import { startTransition, useEffect, useState } from 'react';
import AccountApp from './AccountApp';
import MainNav from './components/MainNav';
import ProductApp from './components/ProductApp';
import MainPage from './components/Mainpage';
import SiteFooter from './components/SiteFooter';

function resolveAppFromHash(hash) {
  const normalized = hash.replace(/^#\/?/, '').trim();

  if (!normalized) {
    return 'main';   // ✅ 기본 페이지를 메인으로
  }

  const [firstSegment] = normalized.split('/');

  if (firstSegment === 'dashboard' || firstSegment === 'mypage') {
    return 'account';
  }

  if (firstSegment === 'products') {
    return 'product';
  }

  return 'main'; // ✅ 나머지는 메인
}

function resolveActiveSection(hash) {
  const normalized = hash.replace(/^#\/?/, '').trim();

  if (
    normalized.startsWith('orders') ||
    normalized.startsWith('mypage')
  ) {
    return 'mypage';
  }

  if (normalized.startsWith('dashboard')) {
    return 'dashboard';
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
      <MainNav activeSection={activeSection} cartCount={cartCount} />
     {currentApp === 'main' && <MainPage />}
    {currentApp === 'product' && <ProductApp />}
    {currentApp === 'account' && <AccountApp />}
    <SiteFooter />   {/* ✅ 푸터 추가 */}

  </>
);
}

export default App;
