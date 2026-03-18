import { startTransition, useEffect, useState } from 'react';
import AccountApp from './AccountApp';
import MainNav from './components/MainNav';
import ProductApp from './components/ProductApp';

function resolveAppFromHash(hash) {
  const normalized = hash.replace(/^#\/?/, '').trim();

  if (!normalized) {
    return 'product';
  }

  const [firstSegment] = normalized.split('/');
  return ['dashboard', 'mypage', 'orders'].includes(firstSegment) ? 'account' : 'product';
}

function resolveActiveSection(hash) {
  const normalized = hash.replace(/^#\/?/, '').trim();

  if (normalized.startsWith('recipes')) {
    return 'recipes';
  }

  if (normalized.startsWith('orders') || normalized.startsWith('mypage')) {
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
      {currentApp === 'account' ? <AccountApp /> : <ProductApp />}
    </>
  );
}

export default App;
