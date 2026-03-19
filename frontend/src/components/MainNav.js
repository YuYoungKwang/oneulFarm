import '../styles/mainNav.css';
import { CartIcon, SearchIcon } from './ProductIcons';

const NAV_ITEMS = [
  { id: 'market', label: '시세분석', hash: '#/dashboard', section: null },
  { id: 'products', label: '상품', hash: '#/products', section: 'products' },
  { id: 'recipes', label: '레시피', hash: '#/recipes', section: 'recipes' },
  { id: 'recommend', label: '추천', hash: '#/products', section: null },
  { id: 'dashboard', label: '대시보드', hash: '#/dashboard', section: 'dashboard' },
  { id: 'mypage', label: '마이페이지', hash: '#/mypage', section: 'mypage' },
];

function navigateTo(hash) {
  window.location.hash = hash;
}

function MainNav({ activeSection, cartCount = 0, onOpenCart }) {
  return (
    <header className="main-nav-shell">
      <div className="main-nav">
        <button
          type="button"
          className="main-nav__logo"
          onClick={() => navigateTo('#/')}
        >
          <span className="main-nav__logo-mark" />
          <span>oneulFarm</span>
        </button>

        <nav className="main-nav__links" aria-label="주요 메뉴">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`main-nav__link ${
                item.section && item.section === activeSection ? 'is-active' : ''
              }`}
              onClick={() => navigateTo(item.hash)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="main-nav__actions">
          <button className="main-nav__icon" type="button" aria-label="검색">
            <SearchIcon />
          </button>
          <button
            className="main-nav__icon main-nav__icon--cart"
            type="button"
            aria-label="장바구니"
            onClick={onOpenCart || (() => navigateTo('#/cart'))}
          >
            <CartIcon />
            {cartCount > 0 ? <span className="main-nav__cart-badge">{cartCount}</span> : null}
          </button>
          <button className="main-nav__btn-outline" type="button">
            로그인
          </button>
          <button className="main-nav__btn" type="button">
            가입
          </button>
        </div>
      </div>
    </header>
  );
}

export default MainNav;
