import { leaveAdminPage } from './adminSession';

const MENU_ITEMS = [
  { id: 'dashboard', label: '\uAD00\uB9AC\uC790 \uB300\uC2DC\uBCF4\uB4DC', hash: '#/admin' },
  { id: 'products', label: '\uC0C1\uD488 \uAD00\uB9AC', hash: '#/admin/products' },
  { id: 'purchase', label: '\uB9E4\uC785 / \uC18C\uBD84', hash: '#/admin/purchase' },
  { id: 'orders', label: '\uC8FC\uBB38 \uAD00\uB9AC', hash: '#/admin/orders' },
  { id: 'users', label: '\uD68C\uC6D0 \uAD00\uB9AC', hash: '#/admin/users' },
  { id: 'content', label: '\uBC30\uB108 / \uB808\uC2DC\uD53C', hash: '#/admin/content' },
];

function navigateTo(hash) {
  window.location.hash = hash;
}

function AdminLayout({
  activePage,
  children,
}) {
  return (
    <div className="admin-app">
      <header className="admin-app__header">
        <div className="admin-app__container admin-app__nav">
          <button
            type="button"
            className="admin-app__brand"
            onClick={() => navigateTo('#/admin')}
          >
            <span className="admin-app__logo" />
            <span>oneulFarm</span>
          </button>

          <nav className="admin-app__menu" aria-label={'\uAD00\uB9AC\uC790 \uBA54\uB274'}>
            {MENU_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`admin-app__menu-link ${
                  item.id === activePage ? 'is-active' : ''
                }`}
                onClick={() => navigateTo(item.hash)}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="admin-app__actions">
            <button
              type="button"
              className="admin-app__action admin-app__action--soft"
              onClick={() => leaveAdminPage('#/mypage')}
            >
              {'\uC0AC\uC6A9\uC790 \uC11C\uBE44\uC2A4'}
            </button>
            <button
              type="button"
              className="admin-app__action admin-app__action--primary"
              onClick={() => navigateTo('#/admin')}
            >
              {'\uB300\uC2DC\uBCF4\uB4DC'}
            </button>
            <button
              type="button"
              className="admin-app__action admin-app__action--line"
              onClick={() => leaveAdminPage('#/')}
            >
              {'\uB85C\uADF8\uC544\uC6C3'}
            </button>
          </div>
        </div>
      </header>

      <main className="admin-app__container admin-app__main">{children}</main>
      <footer className="admin-app__footer admin-app__container">
        {'oneulFarm | \uC6B4\uC601 \uB300\uC2DC\uBCF4\uB4DC | \uC0C1\uD488 \u00B7 \uC8FC\uBB38 \u00B7 \uD68C\uC6D0 \uAD00\uB9AC'}
      </footer>
    </div>
  );
}

export default AdminLayout;
