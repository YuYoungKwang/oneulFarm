import { startTransition, useEffect, useState } from 'react';
import '../styles/product.css';
import {
  DEFAULT_TOSS_CONFIG,
  confirmTossPaymentOnApi,
  fetchTossPaymentConfigFromApi,
} from '../api/paymentApi';
import {
  addCartItemToApi,
  advanceOrderOnApi,
  clearCartOnApi,
  createOrderOnApi,
  fetchCartFromApi,
  fetchOrdersFromApi,
  fetchProductDetailFromApi,
  fetchProductsFromApi,
  removeCartItemFromApi,
  updateCartItemOnApi,
} from '../api/productApi';
import {
  clearPendingTossPayment,
  createTossPaymentDraft,
  isTossReady,
  readPendingTossPayment,
  readTossCallbackParams,
  requestTossPayment,
  storePendingTossPayment,
} from '../payment/tossPayments';
import CartPage from './CartPage';
import CheckoutPage from './CheckoutPage';
import OrderCompletePage from './OrderCompletePage';
import OrdersPage from './OrdersPage';
import ProductDetailPage from './ProductDetailPage';
import ProductListPage from './ProductListPage';
import LoginPage from './LoginPage';
import SignupPage from './SignupPage';
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
import { isAuthenticated } from '../auth';

export default function ProductApp({ authUser }) {
  const [route, setRoute] = useState(() => parseHash(window.location.hash));
  const [filters, setFilters] = useState(defaultFilters);
  const [wishlist, setWishlist] = useState(() =>
    readStoredValue('oneulFarmWishlist', [])
  );
  const [cart, setCart] = useState(() => readStoredValue('oneulFarmCart', {}));
  const [orders, setOrders] = useState(() =>
    readStoredValue('oneulFarmOrders', [])
  );
  const [products, setProducts] = useState([]);
  const [productsStatus, setProductsStatus] = useState('loading');
  const [productsError, setProductsError] = useState('');
  const [productReloadToken, setProductReloadToken] = useState(0);
  const [productDetails, setProductDetails] = useState({});
  const [productDetailStates, setProductDetailStates] = useState({});
  const [tossConfig, setTossConfig] = useState(DEFAULT_TOSS_CONFIG);
  const [paymentFlowState, setPaymentFlowState] = useState({
    status: 'idle',
    title: '',
    description: '',
  });
  const isLoggedIn = isAuthenticated(authUser);

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
    let cancelled = false;

    async function loadProducts() {
      try {
        if (!cancelled) {
          setProductsStatus('loading');
          setProductsError('');
        }

        const nextProducts = await fetchProductsFromApi();
        if (!cancelled) {
          setProducts(nextProducts);
          setProductsStatus('success');
        }
      } catch (error) {
        if (!cancelled) {
          setProducts([]);
          setProductDetails({});
          setProductsStatus('error');
          setProductsError(
            error?.message ||
              '상품 목록을 불러오지 못했습니다. 백엔드와 DB 연결 상태를 확인해 주세요.'
          );
        }
      }
    }

    loadProducts();
    return () => {
      cancelled = true;
    };
  }, [productReloadToken]);

  useEffect(() => {
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    if (!isLoggedIn) {
      setCart({});
      setOrders([]);
      return;
    }

    let cancelled = false;

    async function loadInitialData() {

      try {
        const nextCart = await fetchCartFromApi();
        if (!cancelled) {
          setCart(nextCart);
        }
      } catch (error) {
        // Keep local cart as fallback.
      }

      try {
        const nextOrders = await fetchOrdersFromApi();
        if (!cancelled) {
          setOrders(nextOrders);
        }
      } catch (error) {
        // Keep local orders as fallback.
      }

      try {
        const nextTossConfig = await fetchTossPaymentConfigFromApi();
        if (!cancelled) {
          setTossConfig(nextTossConfig);
        }
      } catch (error) {
        // Keep Toss Payments disabled when config is unavailable.
      }
    }

    loadInitialData();
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  useEffect(() => {
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    if (route.page !== 'product-detail' || route.productNo == null) {
      return;
    }

    const existingDetail = productDetails[route.productNo];
    const detailState = productDetailStates[route.productNo];
    if (
      existingDetail?.recipes?.length ||
      existingDetail?.reviews?.length ||
      detailState === 'loading'
    ) {
      return;
    }

    let cancelled = false;

    async function loadProductDetail() {
      try {
        setProductDetailStates((previousStates) => ({
          ...previousStates,
          [route.productNo]: 'loading',
        }));

        const detailProduct = await fetchProductDetailFromApi(route.productNo);
        if (cancelled) {
          return;
        }

        setProductDetails((previousDetails) => ({
          ...previousDetails,
          [detailProduct.productNo]: detailProduct,
        }));
        setProducts((previousProducts) =>
          mergeProducts(previousProducts, detailProduct)
        );
        setProductDetailStates((previousStates) => ({
          ...previousStates,
          [detailProduct.productNo]: 'success',
        }));
      } catch (error) {
        if (!cancelled) {
          setProductDetailStates((previousStates) => ({
            ...previousStates,
            [route.productNo]: 'error',
          }));
        }
      }
    }

    loadProductDetail();
    return () => {
      cancelled = true;
    };
  }, [productDetailStates, productDetails, route.page, route.productNo]);

  useEffect(() => {
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    if (route.page !== 'payment-success' && route.page !== 'payment-fail') {
      setPaymentFlowState({
        status: 'idle',
        title: '',
        description: '',
      });
      return;
    }

    if (route.page === 'payment-fail') {
      const callbackParams = readTossCallbackParams();
      clearPendingTossPayment();
      setPaymentFlowState({
        status: 'error',
        title: '\uACB0\uC81C\uAC00 \uCDE8\uC18C\uB418\uC5C8\uAC70\uB098 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.',
        description:
          callbackParams.message ||
          '\uB2E4\uC2DC \uC8FC\uBB38\uC11C\uB85C \uB3CC\uC544\uAC00 \uACB0\uC81C\uB97C \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.',
      });
      return;
    }

    let cancelled = false;

    async function completeTossPayment() {
      const callbackParams = readTossCallbackParams();
      const pendingPayment = readPendingTossPayment();

      setPaymentFlowState({
        status: 'pending',
        title: '\uACB0\uC81C \uC2B9\uC778\uC744 \uD655\uC778\uD558\uB294 \uC911\uC785\uB2C8\uB2E4.',
        description:
          'Toss Payments \uC2B9\uC778 \uACB0\uACFC\uB97C \uD655\uC778\uD55C \uB4A4 \uC8FC\uBB38\uC744 \uC800\uC7A5\uD569\uB2C8\uB2E4.',
      });

      try {
        if (!pendingPayment) {
          throw new Error(
            '\uACB0\uC81C \uCD08\uC548 \uC815\uBCF4\uB97C \uCC3E\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.'
          );
        }

        if (
          !callbackParams.paymentKey ||
          !callbackParams.orderId ||
          !callbackParams.amount
        ) {
          throw new Error(
            '\uACB0\uC81C \uC644\uB8CC \uD30C\uB77C\uBBF8\uD130\uAC00 \uB204\uB77D\uB418\uC5C8\uC2B5\uB2C8\uB2E4.'
          );
        }

        if (pendingPayment.orderId !== callbackParams.orderId) {
          throw new Error(
            '\uACB0\uC81C \uC8FC\uBB38\uBC88\uD638\uAC00 \uC77C\uCE58\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.'
          );
        }

        if (Number(pendingPayment.amount) !== Number(callbackParams.amount)) {
          throw new Error(
            '\uACB0\uC81C \uAE08\uC561\uC774 \uC8FC\uBB38 \uAE08\uC561\uACFC \uC77C\uCE58\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.'
          );
        }

        await confirmTossPaymentOnApi({
          paymentKey: callbackParams.paymentKey,
          orderId: callbackParams.orderId,
          amount: callbackParams.amount,
        });

        const newOrder = await createOrderOnApi({
          ...pendingPayment.checkoutForm,
          orderId: callbackParams.orderId,
          paymentKey: callbackParams.paymentKey,
          paymentProvider: 'TOSS',
        });

        if (cancelled) {
          return;
        }

        clearPendingTossPayment();
        applySuccessfulOrder(newOrder);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setPaymentFlowState({
          status: 'error',
          title: '\uACB0\uC81C \uC644\uB8CC \uCC98\uB9AC\uB97C \uB05D\uB0B4\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.',
          description:
            error?.message ||
            '\uC2B9\uC778 \uD655\uC778 \uB610\uB294 \uC8FC\uBB38 \uC800\uC7A5 \uACFC\uC815\uC5D0\uC11C \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.',
        });
      }
    }

    completeTossPayment();
    return () => {
      cancelled = true;
    };
  }, [route.page]);

  useEffect(() => {
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    if (typeof window.scrollTo === 'function') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [route.page, route.productNo, route.orderId]);

  const categories = Array.from(
    new Set(products.map((product) => product.categoryName).filter(Boolean))
  );
  const cartItems = Object.entries(cart)
    .map(([productNo, quantity]) => ({
      product: findProduct(products, productDetails, Number(productNo)),
      quantity,
    }))
    .filter((item) => item.product);
  const currentProduct =
    route.page === 'product-detail'
      ? findProduct(products, productDetails, route.productNo)
      : null;
  const currentOrder =
    route.orderId != null
      ? orders.find((order) => order.orderId === route.orderId) || null
      : null;
  const currentDetailState =
    route.productNo != null ? productDetailStates[route.productNo] : '';
  const routeNeedsProducts =
    route.page === 'cart' ||
    route.page === 'checkout' ||
    route.page === 'product-detail' ||
    route.page === 'products';

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

  function retryProductLoad() {
    setProductReloadToken((previousToken) => previousToken + 1);
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
    if (!isLoggedIn) {
      navigateToHash('#/login');
      return;
    }

    navigateToHash('#/cart');
  }

  function openCheckout() {
    if (!isLoggedIn) {
      navigateToHash('#/login');
      return;
    }

    navigateToHash('#/checkout');
  }

  function openOrders(orderId) {
    if (!isLoggedIn) {
      navigateToHash('#/login');
      return;
    }

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

  async function addToCart(productNo, quantity = 1) {
    if (!isLoggedIn) {
      navigateToHash('#/login');
      return;
    }

    if (process.env.NODE_ENV !== 'test') {
      try {
        const nextCart = await addCartItemToApi(productNo, quantity);
        setCart(nextCart);
        return;
      } catch (error) {
        // Fall back to local cart state.
      }
    }

    setCart((previousCart) => ({
      ...previousCart,
      [productNo]: (previousCart[productNo] || 0) + quantity,
    }));
  }

  async function updateCartQuantity(productNo, nextQuantity) {
    if (process.env.NODE_ENV !== 'test') {
      try {
        const nextCart = await updateCartItemOnApi(productNo, nextQuantity);
        setCart(nextCart);
        return;
      } catch (error) {
        // Fall back to local cart state.
      }
    }

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

  async function removeFromCart(productNo) {
    if (process.env.NODE_ENV !== 'test') {
      try {
        const nextCart = await removeCartItemFromApi(productNo);
        setCart(nextCart);
        return;
      } catch (error) {
        // Fall back to local cart state.
      }
    }

    setCart((previousCart) => {
      const nextCart = { ...previousCart };
      delete nextCart[productNo];
      return nextCart;
    });
  }

  async function clearCart() {
    if (process.env.NODE_ENV !== 'test') {
      try {
        const nextCart = await clearCartOnApi();
        setCart(nextCart);
        return;
      } catch (error) {
        // Fall back to local cart state.
      }
    }

    setCart({});
  }

  async function submitOrder(checkoutForm) {
    if (!isLoggedIn) {
      navigateToHash('#/login');
      return;
    }

    if (!cartItems.length) {
      navigateToHash('#/cart');
      return;
    }

    if (process.env.NODE_ENV !== 'test' && isTossReady(tossConfig)) {
      const paymentDraft = createTossPaymentDraft(checkoutForm, cartItems);
      storePendingTossPayment(paymentDraft);

      try {
        await requestTossPayment(tossConfig, paymentDraft);
        return;
      } catch (error) {
        clearPendingTossPayment();
        throw error;
      }
    }

    if (process.env.NODE_ENV !== 'test') {
      try {
        const newOrder = await createOrderOnApi(checkoutForm);
        applySuccessfulOrder(newOrder);
        return;
      } catch (error) {
        // Fall back to local order state.
      }
    }

    const newOrder = createOrderFromCart(cartItems, checkoutForm, orders);
    setOrders((previousOrders) => [newOrder, ...previousOrders]);
    setCart({});
    navigateToHash(`#/order-complete/${encodeURIComponent(newOrder.orderId)}`);
  }

  function applySuccessfulOrder(newOrder) {
    setOrders((previousOrders) => [
      newOrder,
      ...previousOrders.filter((order) => order.orderNo !== newOrder.orderNo),
    ]);
    setCart({});
    setProducts((previousProducts) =>
      updateProductsAfterOrder(previousProducts, newOrder)
    );
    setProductDetails((previousDetails) =>
      updateProductDetailsAfterOrder(previousDetails, newOrder)
    );

    const nextHash = `#/order-complete/${encodeURIComponent(newOrder.orderId)}`;
    window.location.hash = nextHash;
    window.history.replaceState(null, '', `${window.location.pathname}${nextHash}`);
  }

  async function moveOrderToNextStatus(orderId) {
    const targetOrder = orders.find((order) => order.orderId === orderId);
    if (!targetOrder) {
      return;
    }

    if (process.env.NODE_ENV !== 'test') {
      try {
        const updatedOrder = await advanceOrderOnApi(
          targetOrder.orderNo,
          targetOrder.deliveryMessage
        );
        setOrders((previousOrders) =>
          previousOrders.map((order) =>
            order.orderId === orderId ? updatedOrder : order
          )
        );
        return;
      } catch (error) {
        // Fall back to local order state.
      }
    }

    setOrders((previousOrders) =>
      previousOrders.map((order) =>
        order.orderId === orderId ? advanceOrderStatus(order) : order
      )
    );
  }

  return (
    <div className="product-app page-shell">
      <main className="container">
        {route.page === 'login' ? (
          <LoginPage />
        ) : route.page === 'signup' ? (
          <SignupPage />
        ) : routeNeedsProducts && productsStatus === 'loading' ? (
          <ProductsLoadingPage />
        ) : routeNeedsProducts && productsStatus === 'error' ? (
          <ProductsErrorPage
            message={productsError}
            onRetry={retryProductLoad}
            onReturnToProducts={openProductList}
          />
        ) : route.page === 'cart' ? (
          isLoggedIn ? (
            <CartPage
              cartItems={cartItems}
              onClearCart={clearCart}
              onDecreaseQuantity={(productNo) =>
                updateCartQuantity(productNo, (cart[productNo] || 1) - 1)
              }
              onIncreaseQuantity={(productNo) => {
                const product = findProduct(products, productDetails, productNo);
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
          ) : (
            <LoginRequiredCartNotice
              title="濡쒓렇?몄씠 ?꾩슂?⑸땲??"
              description="?λ컮援щ땲??濡쒓렇?????댁슜?????덉뒿?덈떎."
            />
          )
        ) : route.page === 'checkout' ? (
          isLoggedIn ? (
            <CheckoutPage
              cartItems={cartItems}
              onBackToCart={openCart}
              onSubmitOrder={submitOrder}
              tossConfig={tossConfig}
            />
          ) : (
            <LoginRequiredCartNotice
              title="二쇰Ц ???꾪븳 濡쒓렇?몄씠 ?꾩슂?⑸땲??"
              description="寃곗젣瑜??꾪븯硫?癒쇱? 濡쒓렇?명빐 二쇱꽭??"
            />
          )
        ) : route.page === 'payment-success' || route.page === 'payment-fail' ? (
          <PaymentFlowPage
            description={
              paymentFlowState.description ||
              'Toss Payments \uACB0\uC81C \uC751\uB2F5\uC744 \uD655\uC778\uD558\uACE0 \uC788\uC2B5\uB2C8\uB2E4.'
            }
            isPending={paymentFlowState.status !== 'error'}
            onPrimaryAction={
              paymentFlowState.status === 'error' ? openCheckout : undefined
            }
            onSecondaryAction={openProductList}
            primaryLabel={
              paymentFlowState.status === 'error'
                ? '\uC8FC\uBB38\uC11C\uB85C \uB3CC\uC544\uAC00\uAE30'
                : undefined
            }
            secondaryLabel={'\uC0C1\uD488 \uBAA9\uB85D\uC73C\uB85C \uC774\uB3D9'}
            title={
              paymentFlowState.title ||
              '\uACB0\uC81C \uCC98\uB9AC \uC0C1\uD0DC\uB97C \uD655\uC778\uD558\uB294 \uC911\uC785\uB2C8\uB2E4.'
            }
          />
        ) : route.page === 'order-complete' ? (
          <OrderCompletePage
            onOpenOrders={() => openOrders(route.orderId)}
            onReturnToProducts={openProductList}
            order={currentOrder}
          />
        ) : route.page === 'orders' ? (
          isLoggedIn ? (
            <OrdersPage
              onAdvanceStatus={moveOrderToNextStatus}
              onOpenOrder={openOrders}
              onReturnToProducts={openProductList}
              orders={orders}
              selectedOrderId={route.orderId}
            />
          ) : (
            <LoginRequiredCartNotice
              title="二쇰Ц ?댁뿭 議고쉶瑜??꾪빐 濡쒓렇?명빐 二쇱꽭??"
              description="二쇰Ц ?댁뿭? 濡쒓렇?????뺤씤?????덉뒿?덈떎."
            />
          )
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
          ) : currentDetailState === 'loading' ? (
            <ProductsLoadingPage />
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
            products={products}
            wishlist={wishlist}
          />
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function findProduct(products, productDetails, productNo) {
  return (
    productDetails[productNo] ||
    products.find((product) => product.productNo === productNo) ||
    null
  );
}

function mergeProducts(previousProducts, nextProduct) {
  const exists = previousProducts.some(
    (product) => product.productNo === nextProduct.productNo
  );

  if (!exists) {
    return [...previousProducts, nextProduct];
  }

  return previousProducts.map((product) =>
    product.productNo === nextProduct.productNo
      ? { ...product, ...nextProduct }
      : product
  );
}

function updateProductsAfterOrder(previousProducts, order) {
  return previousProducts.map((product) => {
    const orderedItem = order.items.find(
      (item) => item.productNo === product.productNo
    );

    if (!orderedItem) {
      return product;
    }

    const nextStockQty = Math.max(0, (product.stockQty || 0) - orderedItem.quantity);
    return {
      ...product,
      stockQty: nextStockQty,
      saleStatus: nextStockQty > 0 ? product.saleStatus : 'SOLD_OUT',
    };
  });
}

function updateProductDetailsAfterOrder(previousDetails, order) {
  const nextDetails = { ...previousDetails };

  order.items.forEach((item) => {
    const detailProduct = nextDetails[item.productNo];
    if (!detailProduct) {
      return;
    }

    const nextStockQty = Math.max(0, (detailProduct.stockQty || 0) - item.quantity);
    nextDetails[item.productNo] = {
      ...detailProduct,
      stockQty: nextStockQty,
      saleStatus: nextStockQty > 0 ? detailProduct.saleStatus : 'SOLD_OUT',
    };
  });

  return nextDetails;
}

function PaymentFlowPage({
  description,
  isPending,
  onPrimaryAction,
  onSecondaryAction,
  primaryLabel,
  secondaryLabel,
  title,
}) {
  return (
    <section className="empty-state detail-empty">
      <div className="empty-icon">{isPending ? 'PAY' : 'ERR'}</div>
      <h1>{title}</h1>
      <p>{description}</p>
      {primaryLabel ? (
        <button className="btn" type="button" onClick={onPrimaryAction}>
          {primaryLabel}
        </button>
      ) : null}
      <button className="btn-outline" type="button" onClick={onSecondaryAction}>
        {secondaryLabel}
      </button>
    </section>
  );
}

function ProductsLoadingPage() {
  return (
    <section className="empty-state detail-empty">
      <div className="empty-icon">DB</div>
      <h1>{'\uC0C1\uD488 \uB370\uC774\uD130\uB97C \uBD88\uB7EC\uC624\uB294 \uC911\uC785\uB2C8\uB2E4.'}</h1>
      <p>
        {
          '\uC2E4\uC81C DB\uC5D0 \uC800\uC7A5\uB41C \uC0C1\uD488 \uBAA9\uB85D\uC744 \uAC00\uC838\uC624\uACE0 \uC788\uC2B5\uB2C8\uB2E4.'
        }
      </p>
    </section>
  );
}

function ProductsErrorPage({ message, onRetry, onReturnToProducts }) {
  return (
    <section className="empty-state detail-empty">
      <div className="empty-icon">API</div>
      <h1>{'\uC0C1\uD488 \uBAA9\uB85D\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.'}</h1>
      <p>
        {message ||
          '\uBC31\uC5D4\uB4DC \uC11C\uBC84\uC640 DB \uC5F0\uB3D9 \uC0C1\uD0DC\uB97C \uD655\uC778\uD55C \uB4A4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.'}
      </p>
      <button className="btn" type="button" onClick={onRetry}>
        {'\uB2E4\uC2DC \uBD88\uB7EC\uC624\uAE30'}
      </button>
      <button className="btn-outline" type="button" onClick={onReturnToProducts}>
        {'\uC0C1\uD488 \uBAA9\uB85D\uC73C\uB85C \uC774\uB3D9'}
      </button>
    </section>
  );
}

function NotFoundPage({ onBack }) {
  return (
    <section className="empty-state detail-empty">
      <div className="empty-icon">📦</div>
      <h1>상품을 찾을 수 없습니다.</h1>
      <p>삭제되었거나 잘못된 경로입니다. 상품 목록으로 돌아가 주세요.</p>
      <button className="btn" type="button" onClick={onBack}>
        상품 목록으로 이동
      </button>
    </section>
  );
}

function LoginRequiredCartNotice() {
  return (
    <section className="card">
      <div className="page-head" style={{ marginBottom: '8px' }}>
        <div>
          <h1>로그인이 필요합니다.</h1>
          <p>장바구니는 로그인 후 이용할 수 있습니다.</p>
        </div>
      </div>
      <div className="page-actions">
        <button
          className="btn"
          type="button"
          onClick={() => {
            window.location.hash = '#/login';
          }}
        >
          로그인하러 가기
        </button>
        <button
          className="btn-outline"
          type="button"
          onClick={() => {
            window.location.hash = '#/signup';
          }}
        >
          회원가입
        </button>
      </div>
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
