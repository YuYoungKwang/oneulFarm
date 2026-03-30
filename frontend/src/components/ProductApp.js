import { startTransition, useEffect, useRef, useState } from 'react';
import '../styles/product.css';
import {
  DEFAULT_PORTONE_CONFIG,
  completePortOnePaymentOnApi,
  fetchPortOnePaymentConfigFromApi,
} from '../api/paymentApi';
import {
  addCartItemToApi,
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
  clearPendingPortOnePayment,
  createPortOnePaymentDraft,
  readPendingPortOnePayment,
  readPortOneCallbackParams,
  requestPortOnePayment,
  storePendingPortOnePayment,
} from '../payment/portonePayments';
import CartPage from './CartPage';
import CheckoutPage from './CheckoutPage';
import OrderCompletePage from './OrderCompletePage';
import OrdersPage from './OrdersPage';
import ProductDetailPage from './ProductDetailPage';
import ProductListPage from './ProductListPage';
import LoginPage from './LoginPage';
import SignupPage from './SignupPage';
import PriceAnalysisPage from './PriceAnalysisPage';
import RecipeDetailPage from './RecipeDetailPage';
import RecipeListPage from './RecipeListPage';
import { createOrderFromCart } from './orderUiUtils';
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
  const [cartDetails, setCartDetails] = useState(() =>
    readStoredValue('oneulFarmCartDetails', [])
  );
  const [orders, setOrders] = useState(() =>
    readStoredValue('oneulFarmOrders', [])
  );
  const [products, setProducts] = useState([]);
  const [productsStatus, setProductsStatus] = useState('loading');
  const [productsError, setProductsError] = useState('');
  const [productReloadToken, setProductReloadToken] = useState(0);
  const [productDetails, setProductDetails] = useState({});
  const [productDetailStates, setProductDetailStates] = useState({});
  const [productDetailReloadTokens, setProductDetailReloadTokens] = useState({});
  const productDetailsRef = useRef(productDetails);
  const productDetailStatesRef = useRef(productDetailStates);
  const [paymentConfig, setPaymentConfig] = useState(DEFAULT_PORTONE_CONFIG);
  const [paymentFlowState, setPaymentFlowState] = useState({
    status: 'idle',
    title: '',
    description: '',
  });
  const [cartToastMessage, setCartToastMessage] = useState('');
  const isLoggedIn = isAuthenticated(authUser);
  const cartToastTimerRef = useRef(null);

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
    persistValue('oneulFarmCartDetails', cartDetails);
  }, [cartDetails]);

  useEffect(() => {
    persistValue('oneulFarmOrders', orders);
  }, [orders]);

  useEffect(() => {
    productDetailsRef.current = productDetails;
  }, [productDetails]);

  useEffect(() => {
    productDetailStatesRef.current = productDetailStates;
  }, [productDetailStates]);

  useEffect(() => {
    return () => {
      if (cartToastTimerRef.current) {
        window.clearTimeout(cartToastTimerRef.current);
      }
    };
  }, []);

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
      setCartDetails([]);
      setOrders([]);
      return;
    }

    let cancelled = false;

    async function loadInitialData() {

      try {
        const nextCart = await fetchCartFromApi();
        if (!cancelled) {
          applyCartPayload(nextCart);
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
        const nextPaymentConfig = await fetchPortOnePaymentConfigFromApi();
        if (!cancelled) {
          setPaymentConfig(nextPaymentConfig);
        }
      } catch (error) {
        // Keep PortOne disabled when config is unavailable.
      }
    }

    loadInitialData();
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  useEffect(() => {
    if (route.page !== 'product-detail' || route.productNo == null) {
      return;
    }

    const existingDetail = productDetailsRef.current[route.productNo];
    const detailState = productDetailStatesRef.current[route.productNo];
    if (detailState === 'loading') {
      return;
    }

    const reloadToken = productDetailReloadTokens[route.productNo] || 0;
    if (existingDetail && reloadToken < 1) {
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
        setProductDetailReloadTokens((previousTokens) => ({
          ...previousTokens,
          [detailProduct.productNo]: 0,
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
  }, [productDetailReloadTokens, route.page, route.productNo]);

  useEffect(() => {
    const handleReviewChange = (event) => {
      const productNo = Number(event.detail?.productNo);
      if (!Number.isFinite(productNo) || productNo <= 0) {
        return;
      }

      setProductDetailReloadTokens((previousTokens) => ({
        ...previousTokens,
        [productNo]: (previousTokens[productNo] || 0) + 1,
      }));
    };

    window.addEventListener('oneulFarm:review-change', handleReviewChange);

    return () => {
      window.removeEventListener('oneulFarm:review-change', handleReviewChange);
    };
  }, []);

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
      const callbackParams = readPortOneCallbackParams();
      clearPendingPortOnePayment();
      setPaymentFlowState({
        status: 'error',
        title: '\uACB0\uC81C\uAC00 \uCDE8\uC18C\uB418\uC5C8\uAC70\uB098 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.',
        description:
          callbackParams.message ||
          callbackParams.pgMessage ||
          '\uB2E4\uC2DC \uC8FC\uBB38\uC11C\uB85C \uB3CC\uC544\uAC00 \uACB0\uC81C\uB97C \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.',
      });
      return;
    }

    let cancelled = false;

    async function completePortOnePayment() {
      const callbackParams = readPortOneCallbackParams();
      const pendingPayment = readPendingPortOnePayment();

      setPaymentFlowState({
        status: 'pending',
        title: '\uACB0\uC81C \uC2B9\uC778\uC744 \uD655\uC778\uD558\uB294 \uC911\uC785\uB2C8\uB2E4.',
        description:
          'PortOne \uACB0\uC81C \uC751\uB2F5\uC744 \uD655\uC778\uD55C \uB4A4 \uC8FC\uBB38\uC744 \uC800\uC7A5\uD569\uB2C8\uB2E4.',
      });

      try {
        if (!pendingPayment) {
          throw new Error(
            '\uACB0\uC81C \uCD08\uC548 \uC815\uBCF4\uB97C \uCC3E\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.'
          );
        }

        const resolvedPaymentId = callbackParams.paymentId || pendingPayment.paymentId;
        if (!resolvedPaymentId) {
          throw new Error(
            '\uACB0\uC81C \uC644\uB8CC \uD30C\uB77C\uBBF8\uD130\uAC00 \uB204\uB77D\uB418\uC5C8\uC2B5\uB2C8\uB2E4.'
          );
        }

        const paymentResult = await completePortOnePaymentOnApi({
          paymentId: resolvedPaymentId,
          amount: pendingPayment.amount,
        });

        if (paymentResult?.status !== 'PAID') {
          throw new Error('\uACB0\uC81C \uC0C1\uD0DC\uAC00 \uC644\uB8CC(PAID)\uAC00 \uC544\uB2D9\uB2C8\uB2E4.');
        }

        const newOrder = await createOrderOnApi({
          ...pendingPayment.checkoutForm,
          orderId: resolvedPaymentId,
          paymentKey: resolvedPaymentId,
          paymentProvider: pendingPayment.paymentProvider || 'PORTONE',
        });

        if (cancelled) {
          return;
        }

        clearPendingPortOnePayment();
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

    completePortOnePayment();
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

  useEffect(() => {
    if (route.page !== 'products') {
      return;
    }

    if (!route.productCategory && !route.productTag && !route.productSearch && !route.productSort) {
      return;
    }

    setFilters({
      ...defaultFilters,
      category: route.productCategory || 'ALL',
      search: route.productSearch || '',
      sort: route.productSort || defaultFilters.sort,
      tags: route.productTag ? [route.productTag] : [],
    });
  }, [route.page, route.productCategory, route.productTag, route.productSearch, route.productSort]);

  const categories = Array.from(
    new Set(products.map((product) => product.categoryName).filter(Boolean))
  );
  const cartItems =
    Array.isArray(cartDetails) && cartDetails.length
      ? cartDetails
          .map((item) => {
            const product = findProduct(products, productDetails, Number(item.productNo));
            if (!product) {
              return null;
            }
            return {
              cartItemNo: item.cartItemNo,
              cartGroupNo: item.cartGroupNo,
              groupKey: item.groupKey,
              groupType: item.groupType,
              groupName: item.groupName,
              recipeNo: item.recipeNo,
              product,
              quantity: item.quantity,
            };
          })
          .filter(Boolean)
      : Object.entries(cart)
          .map(([productNo, quantity]) => ({
            cartItemNo: null,
            cartGroupNo: null,
            groupKey: '',
            groupType: 'PRODUCT',
            groupName: '',
            recipeNo: null,
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
    route.page === 'price-analysis' ||
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

  function openRecipeList(searchState) {
    if (searchState?.ingredientKeyword) {
      const queryString = new URLSearchParams({
        ingredientKeyword: searchState.ingredientKeyword,
      }).toString();
      navigateToHash(`#/recipes?${queryString}`);
      return;
    }

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

  function openMyOrders() {
    if (!isLoggedIn) {
      navigateToHash('#/login');
      return;
    }

    navigateToHash('#/mypage/orders');
  }

  function openAddressSetup() {
    if (!isLoggedIn) {
      navigateToHash('#/login');
      return;
    }

    navigateToHash('#/mypage?address=manage');
  }

  function openOrderPreview(orderId) {
    if (!isLoggedIn) {
      navigateToHash('#/login');
      return;
    }

    navigateToHash(
      orderId ? `#/orders/${encodeURIComponent(orderId)}` : '#/orders'
    );
  }

  function getProductStockLimit(productNo) {
    const targetProduct = findProduct(products, productDetails, productNo);
    const stockQty = Number(targetProduct?.stockQty || 0);
    return Number.isFinite(stockQty) ? Math.max(stockQty, 0) : 0;
  }

  function toggleWishlist(productNo) {
    setWishlist((previousWishlist) =>
      previousWishlist.includes(productNo)
        ? previousWishlist.filter((currentNo) => currentNo !== productNo)
        : [...previousWishlist, productNo]
    );
  }

  function showCartToast(message) {
    if (cartToastTimerRef.current) {
      window.clearTimeout(cartToastTimerRef.current);
    }

    setCartToastMessage(message);
    cartToastTimerRef.current = window.setTimeout(() => {
      setCartToastMessage('');
      cartToastTimerRef.current = null;
    }, 1800);
  }

  function applyCartPayload(payload) {
    const nextQuantityMap = payload?.quantityMap || {};
    setCart(nextQuantityMap);
    setCartDetails(Array.isArray(payload?.items) ? payload.items : []);
  }

  function buildQuantityMapFromCartDetails(details) {
    return (Array.isArray(details) ? details : []).reduce((map, item) => {
      const productNo = Number(item?.productNo);
      const quantity = Number(item?.quantity || 0);

      if (!Number.isFinite(productNo) || productNo <= 0 || quantity <= 0) {
        return map;
      }

      return {
        ...map,
        [productNo]: Number(map[productNo] || 0) + quantity,
      };
    }, {});
  }

  function getLocalCartDetailBase() {
    if (Array.isArray(cartDetails) && cartDetails.length) {
      return cartDetails.map((item) => ({ ...item }));
    }

    return Object.entries(cart).map(([productNo, quantity]) => ({
      cartItemNo: null,
      cartGroupNo: null,
      productNo: Number(productNo),
      quantity: Number(quantity || 0),
      groupKey: `PRODUCT:${productNo}`,
      groupType: 'PRODUCT',
      groupName: '',
      recipeNo: null,
    }));
  }

  function applyLocalCartDetails(nextDetails) {
    const normalizedDetails = (Array.isArray(nextDetails) ? nextDetails : []).filter(
      (item) => Number(item?.quantity || 0) > 0
    );
    setCartDetails(normalizedDetails);
    setCart(buildQuantityMapFromCartDetails(normalizedDetails));
  }

  function resolveLocalGroupOptions(productNo, groupOptions = {}) {
    const groupType = groupOptions?.groupType === 'RECIPE' ? 'RECIPE' : 'PRODUCT';
    const recipeNo =
      groupType === 'RECIPE' && Number.isFinite(Number(groupOptions?.recipeNo))
        ? Number(groupOptions.recipeNo)
        : null;
    const groupKey =
      groupOptions?.groupKey ||
      (groupType === 'RECIPE'
        ? recipeNo != null
          ? `RECIPE:${recipeNo}`
          : `RECIPE:${productNo}`
        : `PRODUCT:${productNo}`);
    const groupName =
      groupOptions?.groupName ||
      (groupType === 'RECIPE' ? '레시피 담기' : '');

    return {
      groupKey,
      groupType,
      groupName,
      recipeNo,
    };
  }

  function isSameLocalCartItem(leftItem, rightItem) {
    const leftCartItemNo = Number(leftItem?.cartItemNo);
    const rightCartItemNo = Number(rightItem?.cartItemNo);

    if (Number.isFinite(leftCartItemNo) && Number.isFinite(rightCartItemNo)) {
      return leftCartItemNo === rightCartItemNo;
    }

    return (
      Number(leftItem?.productNo) === Number(rightItem?.productNo) &&
      (leftItem?.groupType || 'PRODUCT') === (rightItem?.groupType || 'PRODUCT') &&
      (leftItem?.groupKey || '') === (rightItem?.groupKey || '') &&
      Number(leftItem?.recipeNo || 0) === Number(rightItem?.recipeNo || 0)
    );
  }

  function appendLocalCartItem(productNo, quantity, groupOptions = {}) {
    const safeProductNo = Number(productNo);
    const safeQuantity = Number(quantity || 0);
    if (!Number.isFinite(safeProductNo) || safeProductNo <= 0 || safeQuantity <= 0) {
      return;
    }

    const nextGroupOptions = resolveLocalGroupOptions(safeProductNo, groupOptions);
    const nextDetails = getLocalCartDetailBase();
    const matchedIndex = nextDetails.findIndex(
      (item) =>
        Number(item?.productNo) === safeProductNo &&
        (item?.groupType || 'PRODUCT') === nextGroupOptions.groupType &&
        (item?.groupKey || '') === nextGroupOptions.groupKey
    );

    if (matchedIndex >= 0) {
      nextDetails[matchedIndex] = {
        ...nextDetails[matchedIndex],
        quantity: Number(nextDetails[matchedIndex].quantity || 0) + safeQuantity,
      };
    } else {
      nextDetails.push({
        cartItemNo: null,
        cartGroupNo: null,
        productNo: safeProductNo,
        quantity: safeQuantity,
        groupKey: nextGroupOptions.groupKey,
        groupType: nextGroupOptions.groupType,
        groupName: nextGroupOptions.groupName,
        recipeNo: nextGroupOptions.recipeNo,
      });
    }

    applyLocalCartDetails(nextDetails);
  }

  function updateLocalCartItemQuantity(targetItem, nextQuantity) {
    const nextDetails = getLocalCartDetailBase()
      .map((item) => {
        if (!isSameLocalCartItem(item, targetItem)) {
          return item;
        }

        return {
          ...item,
          quantity: nextQuantity,
        };
      })
      .filter((item) => Number(item?.quantity || 0) > 0);

    applyLocalCartDetails(nextDetails);
  }

  function removeLocalCartItem(targetItem) {
    const nextDetails = getLocalCartDetailBase().filter(
      (item) => !isSameLocalCartItem(item, targetItem)
    );
    applyLocalCartDetails(nextDetails);
  }

  async function addToCart(productNo, quantity = 1) {
    if (!isLoggedIn) {
      navigateToHash('#/login');
      return;
    }

    const currentQuantity = Number(cart[productNo] || 0);
    const stockLimit = getProductStockLimit(productNo);
    const remainingStock = Math.max(stockLimit - currentQuantity, 0);
    const safeQuantity = Math.min(Math.max(Number(quantity) || 1, 1), remainingStock);

    if (stockLimit < 1 || safeQuantity < 1) {
      return;
    }

    const targetProduct = findProduct(products, productDetails, productNo);
    const productLabel = targetProduct?.productName || '\uC0C1\uD488';
    const cartToastMessage = `${productLabel} \uC7A5\uBC14\uAD6C\uB2C8\uC5D0 \uB2F4\uACBC\uC2B5\uB2C8\uB2E4.`;

    if (process.env.NODE_ENV !== 'test') {
      try {
        const nextCart = await addCartItemToApi(productNo, safeQuantity);
        applyCartPayload(nextCart);
        showCartToast(cartToastMessage);
        return;
      } catch (error) {
        // Fall back to local cart state.
      }
    }

    appendLocalCartItem(productNo, safeQuantity);
    showCartToast(cartToastMessage);
  }

  async function addMatchedProductsToCart(productList, groupOptions = {}) {
    if (!isLoggedIn) {
      navigateToHash('#/login');
      return 0;
    }

    const quantityMap = new Map();

    (Array.isArray(productList) ? productList : []).forEach((entry) => {
      const sourceProduct = entry?.product || entry?.selectedProduct || entry;
      const productNo = Number(sourceProduct?.productNo ?? entry?.productNo);

      if (!Number.isFinite(productNo) || productNo <= 0) {
        return;
      }

      const quantity = Math.max(
        Number(entry?.quantity ?? sourceProduct?.quantity ?? 1) || 1,
        1
      );
      quantityMap.set(productNo, (quantityMap.get(productNo) || 0) + quantity);
    });

    let addedCount = 0;
    for (const [productNo, quantity] of quantityMap.entries()) {
      const stockLimit = getProductStockLimit(productNo);
      const currentQuantity = Number(cart[productNo] || 0);
      const remainingStock = Math.max(stockLimit - currentQuantity, 0);
      if (remainingStock < 1) {
        continue;
      }

      const safeQuantity = Math.min(quantity, remainingStock);
      if (process.env.NODE_ENV !== 'test') {
        try {
          const nextCart = await addCartItemToApi(productNo, safeQuantity, groupOptions);
          applyCartPayload(nextCart);
          addedCount += 1;
          continue;
        } catch (error) {
          // Fall back to default addToCart below.
        }
      }

      appendLocalCartItem(productNo, safeQuantity, groupOptions);
      addedCount += 1;
    }

    return addedCount;
  }

  async function updateCartQuantity(cartItem, nextQuantity) {
    const productNo = Number(cartItem?.product?.productNo ?? cartItem?.productNo);
    const stockLimit = getProductStockLimit(productNo);
    const normalizedQuantity =
      nextQuantity <= 0 ? 0 : Math.min(Math.max(nextQuantity, 1), stockLimit);
    const safeCartItemNo = Number(cartItem?.cartItemNo);

    if (process.env.NODE_ENV !== 'test' && Number.isFinite(safeCartItemNo) && safeCartItemNo > 0) {
      try {
        const nextCart = await updateCartItemOnApi(safeCartItemNo, normalizedQuantity);
        applyCartPayload(nextCart);
        return;
      } catch (error) {
        // Fall back to local cart state.
      }
    }

    updateLocalCartItemQuantity(
      {
        ...cartItem,
        productNo,
      },
      normalizedQuantity
    );
  }

  async function removeFromCart(cartItem) {
    const safeCartItemNo = Number(cartItem?.cartItemNo);
    const productNo = Number(cartItem?.product?.productNo ?? cartItem?.productNo);

    if (process.env.NODE_ENV !== 'test' && Number.isFinite(safeCartItemNo) && safeCartItemNo > 0) {
      try {
        const nextCart = await removeCartItemFromApi(safeCartItemNo);
        applyCartPayload(nextCart);
        return;
      } catch (error) {
        // Fall back to local cart state.
      }
    }

    removeLocalCartItem({
      ...cartItem,
      productNo,
    });
  }

  async function clearCart() {
    if (process.env.NODE_ENV !== 'test') {
      try {
        const nextCart = await clearCartOnApi();
        applyCartPayload(nextCart);
        return;
      } catch (error) {
        // Fall back to local cart state.
      }
    }

    setCart({});
    setCartDetails([]);
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

    if (process.env.NODE_ENV !== 'test' && paymentConfig?.ready) {
      const paymentDraft = createPortOnePaymentDraft(
        paymentConfig,
        checkoutForm,
        cartItems
      );

      try {
        storePendingPortOnePayment(paymentDraft);
        const paymentResponse = await requestPortOnePayment(paymentConfig, paymentDraft);

        if (paymentResponse?.code !== undefined) {
          clearPendingPortOnePayment();
          throw new Error(paymentResponse?.message || '결제를 진행하지 못했습니다.');
        }

        if (paymentResponse?.paymentId) {
          navigateToHash(
            `#/payment-success?paymentId=${encodeURIComponent(paymentResponse.paymentId)}`
          );
        }
        return;
      } catch (error) {
        clearPendingPortOnePayment();
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
    setCartDetails([]);
    navigateToHash(`#/order-complete/${encodeURIComponent(newOrder.orderId)}`);
  }

  function applySuccessfulOrder(newOrder) {
    setOrders((previousOrders) => [
      newOrder,
      ...previousOrders.filter((order) => order.orderNo !== newOrder.orderNo),
    ]);
    setCart({});
    setCartDetails([]);
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
              onDecreaseQuantity={(item) =>
                updateCartQuantity(item, Math.max((item.quantity || 1) - 1, 0))
              }
              onIncreaseQuantity={(item) => {
                const product = item.product;
                const nextQuantity = (item.quantity || 0) + 1;

                updateCartQuantity(item, Math.min(product?.stockQty || nextQuantity, nextQuantity));
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
              onOpenAddressSetup={openAddressSetup}
              onSubmitOrder={submitOrder}
              paymentConfig={paymentConfig}
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
              'PortOne 결제 응답을 확인하고 있습니다.'
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
            onOpenOrders={openMyOrders}
            onReturnToProducts={openProductList}
            order={currentOrder}
          />
        ) : route.page === 'orders' ? (
          isLoggedIn ? (
            <OrdersPage
              onSelectOrder={openOrderPreview}
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
          <RecipeDetailPage
            authUser={authUser}
            cartItems={cartItems}
            onAddMatchedProductsToCart={addMatchedProductsToCart}
            recipeNo={route.recipeNo}
            onBack={openRecipeList}
          />
        ) : route.page === 'recipes' ? (
          <RecipeListPage
            initialIngredientKeyword={route.recipeIngredientKeyword}
            initialKeyword={route.recipeKeyword}
            initialSort={route.recipeSort}
            onOpenRecipe={openRecipe}
          />
        ) : route.page === 'price-analysis' ? (
          <PriceAnalysisPage
            products={products}
            onOpenProduct={openProduct}
            onOpenRecipe={openRecipe}
          />
        ) : route.page === 'product-detail' ? (
          currentProduct ? (
            <ProductDetailPage
              cartQuantity={cart[currentProduct.productNo] || 0}
              isWished={wishlist.includes(currentProduct.productNo)}
              onAddToCart={addToCart}
              onBack={openProductList}
              onOpenRecipe={openRecipe}
              onOpenRecipeList={openRecipeList}
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
      {cartToastMessage ? (
        <div aria-live="polite" className="product-toast" role="status">
          <div className="product-toast__bubble">{cartToastMessage}</div>
        </div>
      ) : null}
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
