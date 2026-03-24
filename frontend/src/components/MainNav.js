import '../styles/mainNav.css';
import { openAdminPage } from '../admin/adminSession';
import { CartIcon, SearchIcon } from './ProductIcons';

const NAV_ITEMS = [
  { id: 'market', label: '시세분석', hash: '#/price-analysis', section: 'market' },
  { id: 'products', label: '상품', hash: '#/products', section: 'products' },
  { id: 'recipes', label: '레시피', hash: '#/recipes', section: 'recipes' },
  { id: 'recommend', label: '추천', hash: '#/recommend', section: 'recommend' },
  {
    id: 'meal-plan',
    label: '맞춤 식단',
    hash: '#/meal-plan',
    section: 'meal-plan',
    supLabel: 'ai',
  },
  { id: 'mypage', label: '마이페이지', hash: '#/mypage', section: 'mypage' },
];

function navigateTo(hash) {
  window.location.hash = hash;
}

export default function MainNav({
  activeSection,
  authUser,
  cartCount = 0,
  onOpenCart,
  onOpenLogin,
  onOpenSignup,
  onLogout,
}) {
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
              aria-label={item.supLabel ? `${item.label} ${item.supLabel}` : item.label}
              className={`main-nav__link ${
                item.section && item.section === activeSection ? 'is-active' : ''
              }`}
              onClick={() => navigateTo(item.hash)}
            >
              <span className="main-nav__link-label">
                {item.label}
                {item.supLabel ? (
                  <span className="main-nav__link-sup">{item.supLabel}</span>
                ) : null}
              </span>
            </button>
          ))}
          <button
            type="button"
            className="main-nav__link main-nav__link--admin"
            onClick={() => openAdminPage('#/admin')}
          >
            관리자계정 전환
          </button>
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
            {cartCount > 0 ? (
              <span className="main-nav__cart-badge">{cartCount}</span>
            ) : null}
          </button>
          {authUser ? (
            <>
              <button
                className="main-nav__btn-outline"
                type="button"
                onClick={() => navigateTo('#/mypage')}
              >
                {authUser.nickname || authUser.userId}
              </button>
              <button className="main-nav__btn" type="button" onClick={onLogout}>
                로그아웃
              </button>
            </>
          ) : (
            <>
              <button
                className="main-nav__btn-outline"
                type="button"
                onClick={onOpenLogin}
              >
                로그인
              </button>
              <button
                className="main-nav__btn"
                type="button"
                onClick={onOpenSignup}
              >
                가입하기
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
