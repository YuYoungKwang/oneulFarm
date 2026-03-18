import { startTransition, useEffect, useState } from 'react';
import AccountApp from './AccountApp';
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

function App() {
  const [currentApp, setCurrentApp] = useState(() =>
    resolveAppFromHash(window.location.hash)
  );

  useEffect(() => {
    const syncApp = () => {
      startTransition(() => {
        setCurrentApp(resolveAppFromHash(window.location.hash));
      });
    };

    syncApp();
    window.addEventListener('hashchange', syncApp);

    return () => {
      window.removeEventListener('hashchange', syncApp);
    };
  }, []);

  return currentApp === 'account' ? <AccountApp /> : <ProductApp />;
}

export default App;
