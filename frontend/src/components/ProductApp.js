import { startTransition, useEffect, useState } from 'react';
import '../styles/product.css';
import { findProductByNo, productCatalog } from '../data/productData';
import CartPage from './CartPage';
import CheckoutPage from './CheckoutPage';
import OrderCompletePage from './OrderCompletePage';
import OrdersPage from './OrdersPage';
import ProductDetailPage from './ProductDetailPage';
import ProductListPage from './ProductListPage';
import RecipeDetailPage from './RecipeDetailPage';
import RecipeListPage from './RecipeListPage';
import { advanceOrderStatus, createOrderFromCart } from './orderUiUtils';
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
  const [orders, setOrders] = useState(() =>
    readStoredValue('oneulFarmOrders', [])
  );

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
    persistValue('oneulFarmOrders', orders);
  }, [orders]);

  useEffect(() => {
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    if (typeof window.scrollTo === 'function') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [route.page, route.productNo, route.orderId]);

  const categories = Array.from(
    new Set(productCatalog.map((product) => product.categoryName))
  );
  const cartItems = Object.entries(cart)
    .map(([productNo, quantity]) => ({
      product: findProductByNo(Number(productNo)),
      quantity,
    }))
    .filter((item) => item.product);
  const currentProduct =
    route.page === 'product-detail' ? findProductByNo(route.productNo) : null;
  const currentOrder =
    route.orderId != null
      ? orders.find((order) => order.orderId === route.orderId) || null
      : null;

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

  function openRecipe(recipeNo) {
    navigateToHash(`#/recipes/${recipeNo}`);
  }

  function openRecipeList() {
    navigateToHash('#/recipes');
  }

  function openCart() {
    navigateToHash('#/cart');
  }

  function openCheckout() {
    navigateToHash('#/checkout');
  }

  function openOrders(orderId) {
    navigateToHash(
      orderId ? `#/orders/${encodeURIComponent(orderId)}` : '#/orders'
    );
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

  function submitOrder(checkoutForm) {
    if (!cartItems.length) {
      navigateToHash('#/cart');
      return;
    }

    const newOrder = createOrderFromCart(cartItems, checkoutForm, orders);
    setOrders((previousOrders) => [newOrder, ...previousOrders]);
    clearCart();
    navigateToHash(`#/order-complete/${encodeURIComponent(newOrder.orderId)}`);
  }

  function moveOrderToNextStatus(orderId) {
    setOrders((previousOrders) =>
      previousOrders.map((order) =>
        order.orderId === orderId ? advanceOrderStatus(order) : order
      )
    );
  }

  return (
    <div className="product-app page-shell">
      <main className="container">
        {route.page === 'cart' ? (
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
            onProceedToCheckout={openCheckout}
            onRemoveItem={removeFromCart}
            onReturnToProducts={openProductList}
          />
        ) : route.page === 'checkout' ? (
          <CheckoutPage
            cartItems={cartItems}
            onBackToCart={openCart}
            onSubmitOrder={submitOrder}
          />
        ) : route.page === 'order-complete' ? (
          <OrderCompletePage
            onOpenOrders={() => openOrders(route.orderId)}
            onReturnToProducts={openProductList}
            order={currentOrder}
          />
        ) : route.page === 'orders' ? (
          <OrdersPage
            onAdvanceStatus={moveOrderToNextStatus}
            onOpenOrder={openOrders}
            onReturnToProducts={openProductList}
            orders={orders}
            selectedOrderId={route.orderId}
          />
        ) : route.page === 'recipe-detail' ? (
          <RecipeDetailPage recipeNo={route.recipeNo} onBack={openRecipeList} />
        ) : route.page === 'recipes' ? (
          <RecipeListPage onOpenRecipe={openRecipe} />
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

function NotFoundPage({ onBack }) {
  return (
    <section className="empty-state detail-empty">
      <div className="empty-icon">🔎</div>
      <h1>상품을 찾을 수 없습니다.</h1>
      <p>삭제되었거나 잘못된 경로입니다. 상품 목록으로 돌아가주세요.</p>
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
