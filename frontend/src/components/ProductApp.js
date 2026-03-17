import { startTransition, useEffect, useState } from 'react';
import { findProductByNo, productCatalog } from '../data/productData';
import { CartIcon, SearchIcon } from './ProductIcons';
import CartPage from './CartPage';
import ProductDetailPage from './ProductDetailPage';
import ProductListPage from './ProductListPage';
import LoginPage from './LoginPage';
import SignupPage from './SignupPage';
import {
  DEFAULT_ROUTE,
  defaultFilters,
  navigateToHash,
  parseHash,
  persistValue,
  readStoredValue,
} from './productUiUtils';

export default function ProductApp() {
  const [route, setRoute] = useState(() => parseHash(window.location.hash));
  const [filters, setFilters] = useState(defaultFilters);
  const [wishlist, setWishlist] = useState(() =>
    readStoredValue('oneulFarmWishlist', [])
  );
  const [cart, setCart] = useState(() => readStoredValue('oneulFarmCart', {}));

  useEffect(() => {
    if (!window.location.hash) {
      navigateToHash(DEFAULT_ROUTE);
    }

    const syncRoute = () => {
      startTransition(() => {
        setRoute(parseHash(window.location.hash));
      });
    };

    syncRoute();
    window.addEventListener('hashchange', syncRoute);

    return () => {
      window.removeEventListener('hashchange', syncRoute);
    };
  }, []);

  useEffect(() => {
    persistValue('oneulFarmWishlist', wishlist);
  }, [wishlist]);

  useEffect(() => {
    persistValue('oneulFarmCart', cart);
  }, [cart]);

  useEffect(() => {
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    if (typeof window.scrollTo === 'function') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [route.page, route.productNo]);

  const categories = Array.from(
    new Set(productCatalog.map((product) => product.categoryName))
  );
  const cartCount = Object.values(cart).reduce(
    (sum, quantity) => sum + quantity,
    0
  );
  const cartItems = Object.entries(cart)
    .map(([productNo, quantity]) => ({
      product: findProductByNo(Number(productNo)),
      quantity,
    }))
    .filter((item) => item.product);
  const currentProduct =
    route.page === 'product-detail' ? findProductByNo(route.productNo) : null;

  function updateFilter(key, value) {
    setFilters((previousFilters) => ({
      ...previousFilters,
      [key]: value,
    }));
  }

  function toggleTag(tag) {
    setFilters((previousFilters) => ({
      ...previousFilters,
      tags: previousFilters.tags.includes(tag)
        ? previousFilters.tags.filter((currentTag) => currentTag !== tag)
        : [...previousFilters.tags, tag],
    }));
  }

  function resetFilters() {
    setFilters(defaultFilters);
  }

  function openProduct(productNo) {
    navigateToHash(`#/products/${productNo}`);
  }

  function openProductList() {
    navigateToHash(DEFAULT_ROUTE);
  }

  function openCart() {
    navigateToHash('#/cart');
  }

  function openLogin() {
    navigateToHash('#/login');
  }

  function goToSignup() {
    window.location.hash = '#/signup';
  }

  function toggleWishlist(productNo) {
    setWishlist((previousWishlist) =>
      previousWishlist.includes(productNo)
        ? previousWishlist.filter((currentNo) => currentNo !== productNo)
        : [...previousWishlist, productNo]
    );
  }

  function addToCart(productNo, quantity = 1) {
    setCart((previousCart) => ({
      ...previousCart,
      [productNo]: (previousCart[productNo] || 0) + quantity,
    }));
  }

  function updateCartQuantity(productNo, nextQuantity) {
    setCart((previousCart) => {
      if (nextQuantity <= 0) {
        const nextCart = { ...previousCart };
        delete nextCart[productNo];
        return nextCart;
      }

      return {
        ...previousCart,
        [productNo]: nextQuantity,
      };
    });
  }

  function removeFromCart(productNo) {
    setCart((previousCart) => {
      const nextCart = { ...previousCart };
      delete nextCart[productNo];
      return nextCart;
    });
  }

  function clearCart() {
    setCart({});
  }

  return (
    <div className="page-shell">
      {/* 로그인 페이지에서는 헤더 숨김 */}
      {route.page !== 'login' && route.page !== 'signup' && (
        <SiteHeader cartCount={cartCount} onOpenCart={openCart} onOpenLogin={openLogin} onOpenSignup={goToSignup} />
      )}
      <main className="container">
        {route.page === 'signup' ? (
          <SignupPage onBack={openProductList} />
        ) : route.page === 'login' ? (
          <LoginPage onBack={openProductList} />
        ) : route.page === 'cart' ? (
          <CartPage
            cartItems={cartItems}
            onClearCart={clearCart}
            onDecreaseQuantity={(productNo) =>
              updateCartQuantity(productNo, (cart[productNo] || 1) - 1)
            }
            onIncreaseQuantity={(productNo) => {
              const product = findProductByNo(productNo);
              const nextQuantity = (cart[productNo] || 0) + 1;

              updateCartQuantity(
                productNo,
                Math.min(product?.stockQty || nextQuantity, nextQuantity)
              );
            }}
            onOpenProduct={openProduct}
            onRemoveItem={removeFromCart}
            onReturnToProducts={openProductList}
          />
        ) : route.page === 'product-detail' ? (
          currentProduct ? (
            <ProductDetailPage
              cartQuantity={cart[currentProduct.productNo] || 0}
              isWished={wishlist.includes(currentProduct.productNo)}
              onAddToCart={addToCart}
              onBack={openProductList}
              onToggleWishlist={toggleWishlist}
              product={currentProduct}
            />
          ) : (
            <NotFoundPage onBack={openProductList} />
          )
        ) : (
          <ProductListPage
            cart={cart}
            categories={categories}
            filters={filters}
            onAddToCart={addToCart}
            onOpenProduct={openProduct}
            onResetFilters={resetFilters}
            onToggleTag={toggleTag}
            onToggleWishlist={toggleWishlist}
            onUpdateFilter={updateFilter}
            products={productCatalog}
            wishlist={wishlist}
          />
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function SiteHeader({ cartCount, onOpenCart, onOpenLogin, onOpenSignup }) {
  return (
    <header className="top-nav">
      <a className="logo" href={DEFAULT_ROUTE}>
        <span className="logo-mark" />
        <span>oneulFarm</span>
      </a>
      <nav className="nav-links" aria-label="주요 메뉴">
        <button className="nav-link" type="button">
          시세분석
        </button>
        <button className="nav-link is-active" type="button">
          상품
        </button>
        <button className="nav-link" type="button">
          레시피
        </button>
        <button className="nav-link" type="button">
          추천
        </button>
        <button className="nav-link" type="button">
          마이페이지
        </button>
      </nav>
      <div className="nav-actions">
        <button className="icon-btn" type="button" aria-label="검색">
          <SearchIcon />
        </button>
        <button
          className="icon-btn cart-icon"
          type="button"
          aria-label="장바구니"
          onClick={onOpenCart}
        >
          <CartIcon />
          {cartCount > 0 ? <span className="cart-badge">{cartCount}</span> : null}
        </button>
        <button className="btn-outline" type="button" onClick={onOpenLogin}>
          로그인
        </button>
        <button className="btn" type="button" onClick={onOpenSignup}>
          가입
        </button>
      </div>
    </header>
  );
}

function NotFoundPage({ onBack }) {
  return (
    <section className="empty-state detail-empty">
      <div className="empty-icon">📦</div>
      <h1>상품을 찾을 수 없습니다.</h1>
      <p>삭제되었거나 잘못된 경로입니다. 상품 목록으로 돌아가세요.</p>
      <button className="btn" type="button" onClick={onBack}>
        상품 목록으로 이동
      </button>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-links">
        <button type="button">개인정보처리방침</button>
        <button type="button">이용약관</button>
        <button type="button">고객센터</button>
      </div>
      <div>© 2026 oneulFarm. Product UI preview.</div>
    </footer>
  );
}
