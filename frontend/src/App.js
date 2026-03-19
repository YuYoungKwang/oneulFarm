import { startTransition, useEffect, useState } from 'react';
import AccountApp from './AccountApp';
import { clearAuthUser, getAuthUser } from './auth';
import MainNav from './components/MainNav';
import PasswordChangeRequiredPage from './components/PasswordChangeRequiredPage';
import ProductApp from './components/ProductApp';

function resolveAppFromHash(hash) {
  const normalized = hash.replace(/^#\/?/, '').trim();

  if (!normalized) {
    return 'product';
  }

  const [firstSegment] = normalized.split('/');
  return firstSegment === 'dashboard' || firstSegment === 'mypage'
    ? 'account'
    : 'product';
}

function resolveActiveSection(hash) {
  const normalized = hash.replace(/^#\/?/, '').trim();

  if (normalized.startsWith('recipes')) {
    return 'recipes';
  }

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
  const [authUser, setAuthUser] = useState(() => getAuthUser());

  const navigateTo = (hash) => {
    window.location.hash = hash;
  };

  useEffect(() => {
    const syncApp = () => {
      startTransition(() => {
        setCurrentApp(resolveAppFromHash(window.location.hash));
        setActiveSection(resolveActiveSection(window.location.hash));
        setCartCount(readCartCount());
        setAuthUser(getAuthUser());
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
      <MainNav
        activeSection={activeSection}
        authUser={authUser}
        cartCount={cartCount}
        onOpenLogin={() => navigateTo('#/login')}
        onOpenSignup={() => navigateTo('#/signup')}
        onOpenCart={() => navigateTo('#/cart')}
        onLogout={() => {
          clearAuthUser();
          navigateTo('#/products');
        }}
      />
      {authUser?.passwordChangeRequired ? (
        <PasswordChangeRequiredPage authUser={authUser} />
      ) : currentApp === 'account' ? (
        <AccountApp />
      ) : (
        <ProductApp authUser={authUser} />
      )}
    </>
  );
}

export default App;
