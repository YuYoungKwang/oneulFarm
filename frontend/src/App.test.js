import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import App from './App';
import { createOrderFromCart } from './components/orderUiUtils';
import {
  DEFAULT_TOSS_CONFIG,
  fetchTossPaymentConfigFromApi,
} from './api/paymentApi';
import {
  deleteAdminProduct,
  fetchAdminBanners,
  fetchAdminOrders,
  fetchAdminPackageHistories,
  fetchAdminProductCategories,
  fetchAdminProducts,
  fetchAdminPurchases,
  fetchAdminRecipeMappings,
  fetchAdminUsers,
  saveAdminProduct,
} from './admin/adminApi';
import { fetchProductDetailFromApi, fetchProductsFromApi } from './api/productApi';
import { fetchRecipeDetail, fetchRecipeList } from './components/recipeApi';

const mockImageUrl =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
jest.mock('./api/productApi', () => ({
  addCartItemToApi: jest.fn(),
  advanceOrderOnApi: jest.fn(),
  clearCartOnApi: jest.fn(),
  createOrderOnApi: jest.fn(),
  fetchCartFromApi: jest.fn(),
  fetchOrdersFromApi: jest.fn(),
  fetchProductDetailFromApi: jest.fn(),
  fetchProductsFromApi: jest.fn(),
  removeCartItemFromApi: jest.fn(),
  updateCartItemOnApi: jest.fn(),
}));

jest.mock('./api/paymentApi', () => ({
  DEFAULT_TOSS_CONFIG: {
    provider: 'TOSS',
    clientKey: '',
    clientKeyConfigured: false,
    secretKeyConfigured: false,
    ready: false,
    mode: 'UNCONFIGURED',
  },
  confirmTossPaymentOnApi: jest.fn(),
  fetchTossPaymentConfigFromApi: jest.fn(),
}));

jest.mock('./admin/adminApi', () => ({
  createAdminPackageHistory: jest.fn(),
  createAdminPurchaseBatch: jest.fn(),
  deleteAdminProduct: jest.fn(),
  fetchAdminBanners: jest.fn(),
  fetchAdminOrderDetail: jest.fn(),
  fetchAdminOrders: jest.fn(),
  fetchAdminPackageHistories: jest.fn(),
  fetchAdminProductCategories: jest.fn(),
  fetchAdminProducts: jest.fn(),
  fetchAdminPurchases: jest.fn(),
  fetchAdminRecipeMappings: jest.fn(),
  fetchAdminUsers: jest.fn(),
  getAdminBannerImageUrl: jest.fn(() => mockImageUrl),
  getAdminProductImageUrl: jest.fn(() => mockImageUrl),
  saveAdminProduct: jest.fn(),
  triggerAdminRecipeSync: jest.fn(),
  uploadAdminProductImages: jest.fn(),
  updateAdminOrder: jest.fn(),
  updateAdminUserStatus: jest.fn(),
}));

jest.mock('./components/recipeApi', () => ({
  fetchRecipeDetail: jest.fn(),
  fetchRecipeList: jest.fn(),
}));
function buildProduct(overrides = {}) {
  const productNo = overrides.productNo ?? 1001;
  const productName =
    overrides.productName ||
    (productNo === 1002 ? '\uC591\uD30C 1kg' : '\uAC10\uC790 1kg');
  const salePrice = overrides.salePrice ?? (productNo === 1002 ? 2800 : 3200);
  const avgPrice = overrides.avgPrice ?? salePrice + 600;
  const categoryName =
    overrides.categoryName || (productNo === 1002 ? '\uCC44\uC18C' : '\uCC44\uC18C');

  return {
    productNo,
    categoryNo: overrides.categoryNo ?? 1,
    categoryName,
    productName,
    origin: overrides.origin || '\uAD6D\uC0B0',
    unit: overrides.unit || 'kg',
    packageWeight: overrides.packageWeight ?? 1,
    salePrice,
    stockQty: overrides.stockQty ?? 20,
    description:
      overrides.description ||
      '\uC2E4\uC81C DB \uC5F0\uB3D9 \uD14C\uC2A4\uD2B8\uC6A9 \uC0C1\uD488 \uC124\uBA85\uC785\uB2C8\uB2E4.',
    isSeasonal: overrides.isSeasonal || 'Y',
    saleStatus: overrides.saleStatus || 'SELLING',
    createdAt: overrides.createdAt || '2026-03-19T09:00:00',
    featuredScore: overrides.featuredScore ?? 90,
    storageMethod:
      overrides.storageMethod ||
      '\uC11C\uB298\uD558\uACE0 \uAC74\uC870\uD55C \uACF3\uC5D0 \uBCF4\uAD00',
    purchaseNote:
      overrides.purchaseNote ||
      '\uC9C1\uC811 \uB9E4\uC785 \uD6C4 \uC18C\uBD84 \uD3EC\uC7A5',
    deliveryInfo:
      overrides.deliveryInfo ||
      '\uC624\uD6C4 2\uC2DC \uC774\uC804 \uC8FC\uBB38 \uC2DC \uB2F9\uC77C \uCD9C\uACE0',
    recommendedFor:
      overrides.recommendedFor || ['\uD3C9\uADE0\uAC00 \uC774\uD558', '\uC2F1\uAE00 \uCD94\uCC9C'],
    isSingleFriendly: overrides.isSingleFriendly ?? true,
    display: {
      symbol: overrides.display?.symbol || 'OF',
      softColor: overrides.display?.softColor || '#eef8ef',
      strongColor: overrides.display?.strongColor || '#81c784',
      glowColor: overrides.display?.glowColor || 'rgba(129, 199, 132, 0.34)',
    },
    images:
      overrides.images ||
      [
        {
          imageNo: productNo * 10 + 1,
          label: 'Image 1',
          symbol: 'OF',
          imageUrl: mockImageUrl,
          note: 'Main image',
          isMain: 'Y',
          sortOrder: 1,
        },
      ],
    priceSnapshot: {
      snapshotNo: overrides.priceSnapshot?.snapshotNo || productNo * 100,
      itemCode: overrides.priceSnapshot?.itemCode || `ITEM-${productNo}`,
      itemName: overrides.priceSnapshot?.itemName || productName,
      marketType: overrides.priceSnapshot?.marketType || 'RETAIL',
      unit: overrides.priceSnapshot?.unit || '1kg',
      avgPrice,
      minPrice: overrides.priceSnapshot?.minPrice || avgPrice - 200,
      maxPrice: overrides.priceSnapshot?.maxPrice || avgPrice + 300,
      changeRate: overrides.priceSnapshot?.changeRate || -1.2,
      snapshotDate: overrides.priceSnapshot?.snapshotDate || '2026-03-18',
      sourceName: overrides.priceSnapshot?.sourceName || 'KAMIS',
    },
    priceMatch: {
      matchNo: overrides.priceMatch?.matchNo || productNo * 1000,
      comparedPrice: overrides.priceMatch?.comparedPrice || salePrice,
      priceGap: overrides.priceMatch?.priceGap || avgPrice - salePrice,
      savingRate: overrides.priceMatch?.savingRate || 12,
      badgeType: overrides.priceMatch?.badgeType || 'UNDER_AVG',
    },
    recipes:
      overrides.recipes ||
      [
        {
          mapNo: productNo * 100 + 1,
          recipeNo: productNo * 100 + 11,
          recipeName: '\uC0D8\uD50C \uB808\uC2DC\uD53C',
          cookTime: '15 min',
          difficulty: 'Easy',
          matchScore: 92,
          symbol: 'RC',
        },
      ],
    reviews:
      overrides.reviews ||
      [
        {
          reviewNo: productNo * 100 + 21,
          author: '\uD14C\uC2A4\uD130',
          rating: 5,
          content: '\uB9CC\uC871\uD558\uB294 \uD14C\uC2A4\uD2B8 \uB9AC\uBDF0\uC785\uB2C8\uB2E4.',
          createdAt: '2026-03-18',
        },
      ],
  };
}

const PRODUCT_FIXTURES = [
  buildProduct({ productNo: 1001, productName: '\uAC10\uC790 1kg', salePrice: 3200 }),
  buildProduct({ productNo: 1002, productName: '\uC591\uD30C 1kg', salePrice: 2800 }),
];

const RECIPE_FIXTURES = [
  {
    recipeNo: 501,
    recipeName: '\uC591\uD30C \uACC4\uB780\uBCF6\uC74C',
    description:
      '\uC591\uD30C\uC640 \uACC4\uB780\uC744 \uAC04\uB2E8\uD558\uAC8C \uBCF6\uC544 \uB9CC\uB4DC\uB294 \uC9D1\uBC25 \uB808\uC2DC\uD53C',
    cookTime: '10\uBD84',
    difficulty: '\uC26C\uC6C0',
    calories: 220,
    imageUrl: mockImageUrl,
    sourceName: 'oneulFarm',
  },
  {
    recipeNo: 502,
    recipeName: '\uC591\uD30C \uAC10\uC790\uC870\uB9BC',
    description:
      '\uC591\uD30C\uC640 \uAC10\uC790\uB97C \uD568\uAED8 \uC870\uB9AC\uD574 \uB4E0\uB4E0\uD558\uAC8C \uBA39\uB294 \uBC18\uCC2C',
    cookTime: '20\uBD84',
    difficulty: '\uBCF4\uD1B5',
    calories: 280,
    imageUrl: '',
    sourceName: 'oneulFarm',
  },
  {
    recipeNo: 503,
    recipeName: '\uC591\uD30C \uB458\uB7EC\uD0D5',
    description: '\uB2F4\uBC31\uD558\uAC8C \uB04A\uC5EC \uBA39\uAE30 \uC88B\uC740 \uAD6D \uC694\uB9AC',
    cookTime: '25\uBD84',
    difficulty: '\uBCF4\uD1B5',
    calories: 160,
    imageUrl: '',
    sourceName: 'oneulFarm',
  },
  {
    recipeNo: 504,
    recipeName: '\uC591\uD30C \uC0D0\uB7EC\uB4DC',
    description: '\uC0C1\uD07C\uD558\uAC8C \uACF0\uB4E4\uC778 \uC591\uD30C \uAE30\uBC18 \uC0D0\uB7EC\uB4DC',
    cookTime: '8\uBD84',
    difficulty: '\uC26C\uC6C0',
    calories: 120,
    imageUrl: '',
    sourceName: 'oneulFarm',
  },
];

function findFixtureProduct(productNo) {
  return PRODUCT_FIXTURES.find((product) => product.productNo === productNo);
}

function buildStoredOrder() {
  return createOrderFromCart(
    [{ product: findFixtureProduct(1002), quantity: 2 }],
    {
      recipientName: '\uD5C8\uB96D',
      recipientPhone: '010-1234-5678',
      zipCode: '06236',
      address1: '\uC11C\uC6B8 \uAC15\uB0A8\uAD6C \uD14C\uD5E4\uB780\uB85C 123',
      address2: '8\uCE35 oneulFarm',
      deliveryMessage: '\uBB38 \uC55E\uC5D0 \uB193\uC544\uC8FC\uC138\uC694',
      paymentMethod: 'CARD',
    },
    []
  );
}

function signInTestUser() {
  window.localStorage.setItem(
    'oneulFarmAuthUser',
    JSON.stringify({
      userNo: 1,
      userId: 'heoryun',
      nickname: '허륜',
      accessToken: 'test-access-token',
    })
  );
}

describe('App', () => {
  beforeEach(() => {
    fetchProductsFromApi.mockResolvedValue(PRODUCT_FIXTURES);
    fetchProductDetailFromApi.mockResolvedValue(
      buildProduct({
        productNo: 1002,
        productName: '\uC591\uD30C 1kg',
        priceSnapshot: {
          sourceName: 'KAMIS_PERIOD_RETAIL_PRODUCT_LIST',
          snapshotDate: '2026-03-18',
        },
        reviews: [
          {
            reviewNo: 9001,
            author: '\uD5C8\uB96D',
            rating: 5,
            content: '\uC0C1\uC138 \uD398\uC774\uC9C0 \uB9AC\uBDF0 \uC5F0\uB3D9 \uD14C\uC2A4\uD2B8',
            createdAt: '2026-03-21T10:30:00',
          },
        ],
      })
    );
    fetchRecipeList.mockResolvedValue({
      count: RECIPE_FIXTURES.length,
      recipeList: RECIPE_FIXTURES,
    });
    fetchRecipeDetail.mockResolvedValue({
      recipeNo: 501,
      recipeName: '\uC591\uD30C \uACC4\uB780\uBCF6\uC74C',
      description: '\uB808\uC2DC\uD53C \uC0C1\uC138 \uD14C\uC2A4\uD2B8',
      cookTime: '10\uBD84',
      difficulty: '\uC26C\uC6C0',
      calories: 220,
      ingredientList: [],
      stepList: [],
      imageUrl: mockImageUrl,
      sourceName: 'oneulFarm',
    });
    fetchTossPaymentConfigFromApi.mockResolvedValue(DEFAULT_TOSS_CONFIG);
    fetchAdminProductCategories.mockResolvedValue([
      { categoryNo: 1, categoryName: '\uCC44\uC18C' },
    ]);
    fetchAdminProducts.mockResolvedValue(PRODUCT_FIXTURES);
    fetchAdminOrders.mockResolvedValue([]);
    fetchAdminUsers.mockResolvedValue([]);
    fetchAdminPurchases.mockResolvedValue([]);
    fetchAdminPackageHistories.mockResolvedValue([]);
    fetchAdminBanners.mockResolvedValue([]);
    fetchAdminRecipeMappings.mockResolvedValue([]);
    deleteAdminProduct.mockResolvedValue(null);
    saveAdminProduct.mockResolvedValue(buildProduct({ productNo: 1001, saleStatus: 'STOP' }));
    window.confirm = jest.fn(() => true);
  });

  afterEach(() => {
    window.location.hash = '';
    window.localStorage.clear();
    jest.clearAllMocks();
  });

  test('\uAE30\uBCF8 \uBA54\uC778 \uD398\uC774\uC9C0\uC5D0\uC11C\uB294 \uD65C\uC131 \uB124\uBE44\uAC00 \uC5C6\uB2E4', async () => {
    render(<App />);

    const navigation = screen.getByRole('navigation', {
      name: '\uC8FC\uC694 \uBA54\uB274',
    });

    await waitFor(() => {
      expect(navigation.querySelectorAll('.main-nav__link.is-active')).toHaveLength(0);
    });
  });

  test('\uC0C1\uD488 \uBAA9\uB85D \uD654\uBA74\uC774 \uB80C\uB354\uB9C1\uB41C\uB2E4', async () => {
    window.location.hash = '#/products';

    render(<App />);

    expect(await screen.findByText('\uC591\uD30C 1kg')).toBeInTheDocument();
    expect(screen.getByText('\uAC10\uC790 1kg')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '\uC591\uD30C 1kg' })).toBeInTheDocument();
  });

  test('\uD574\uC2DC \uACBD\uB85C\uC5D0 \uB530\uB77C \uC0C1\uD488 \uC0C1\uC138 \uD654\uBA74\uC774 \uB80C\uB354\uB9C1\uB41C\uB2E4', async () => {
    window.location.hash = '#/products/1002';

    render(<App />);

    expect(await screen.findAllByText('\uC591\uD30C 1kg')).not.toHaveLength(0);
    expect(fetchProductDetailFromApi).toHaveBeenCalledWith(1002);
    expect(
      screen.getByRole('button', { name: '\uBAA9\uB85D\uC73C\uB85C' })
    ).toBeInTheDocument();
    expect(await screen.findByText('KAMIS')).toBeInTheDocument();
    expect(
      await screen.findByText(
        '\uB9AC\uBDF0'
      )
    ).toBeInTheDocument();
    expect(screen.queryByText('Image 1')).not.toBeInTheDocument();
    expect(screen.queryByText('Main image')).not.toBeInTheDocument();
  });

  test('\uC0C1\uD488 \uC0C1\uC138\uC5D0\uC11C \uAD00\uB828 \uB808\uC2DC\uD53C 4\uAC1C\uB97C \uBD88\uB7EC\uC624\uACE0 \uB354 \uBCF4\uAE30 \uC2DC \uC7AC\uB8CC \uAC80\uC0C9 \uC0C1\uD0DC\uB85C \uC774\uB3D9\uD55C\uB2E4', async () => {
    window.location.hash = '#/products/1002';

    render(<App />);

    expect(await screen.findByText('\uC591\uD30C \uACC4\uB780\uBCF6\uC74C')).toBeInTheDocument();
    expect(fetchRecipeList).toHaveBeenCalledWith({
      ingredientKeyword: '\uC591\uD30C',
      sort: 'RECOMMENDED',
      limit: 4,
    });

    fireEvent.click(screen.getByRole('button', { name: '\uB808\uC2DC\uD53C \uB354 \uBCF4\uAE30' }));

    await waitFor(() => {
      expect(window.location.hash).toBe('#/recipes?ingredientKeyword=%EC%96%91%ED%8C%8C');
    });

    expect(await screen.findByRole('heading', { name: '\uB808\uC2DC\uD53C' })).toBeInTheDocument();

    await waitFor(() => {
      expect(fetchRecipeList).toHaveBeenCalledWith({
        keyword: '',
        ingredientKeyword: '\uC591\uD30C',
        sort: 'RECOMMENDED',
        limit: 18,
      });
    });
  });

  test('\uB9AC\uBDF0 \uBCC0\uACBD \uC774\uBCA4\uD2B8\uAC00 \uC624\uBA74 \uC0C1\uD488 \uC0C1\uC138 \uB9AC\uBDF0\uB97C \uB2E4\uC2DC \uBD88\uB7EC\uC628\uB2E4', async () => {
    fetchProductDetailFromApi
      .mockResolvedValueOnce(
        buildProduct({
          productNo: 1002,
          productName: '\uC591\uD30C 1kg',
          reviews: [],
        })
      )
      .mockResolvedValueOnce(
        buildProduct({
          productNo: 1002,
          productName: '\uC591\uD30C 1kg',
          reviews: [
            {
              reviewNo: 9101,
              author: '\uD5C8\uB96D',
              rating: 5,
              content: '\uB9C8\uC774\uD398\uC774\uC9C0\uC5D0\uC11C \uC791\uC131\uD55C \uB9AC\uBDF0',
              createdAt: '2026-03-23T09:30:00',
            },
          ],
        })
      );

    window.location.hash = '#/products/1002';

    render(<App />);

    expect(
      await screen.findByText('\uC544\uC9C1 \uB4F1\uB85D\uB41C \uB9AC\uBDF0\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.')
    ).toBeInTheDocument();

    await act(async () => {
      window.dispatchEvent(
        new CustomEvent('oneulFarm:review-change', {
          detail: { productNo: 1002 },
        })
      );
    });

    expect(
      await screen.findByText('\uB9C8\uC774\uD398\uC774\uC9C0\uC5D0\uC11C \uC791\uC131\uD55C \uB9AC\uBDF0')
    ).toBeInTheDocument();
    expect(fetchProductDetailFromApi).toHaveBeenCalledTimes(2);
  });

  test('\uC0C1\uD488 \uD654\uBA74\uC758 \uB9C8\uC774\uD398\uC774\uC9C0 \uB124\uBE44\uB294 \uB9C8\uC774\uD398\uC774\uC9C0 \uACBD\uB85C\uB85C \uC774\uB3D9\uD55C\uB2E4', async () => {
    window.location.hash = '#/products';

    render(<App />);

    await screen.findByText('\uC591\uD30C 1kg');
    fireEvent.click(screen.getByRole('button', { name: '\uB9C8\uC774\uD398\uC774\uC9C0' }));

    expect(window.location.hash).toBe('#/mypage');
  });

  test('\uB300\uC2DC\uBCF4\uB4DC\uC5D0\uC11C \uC0C1\uD488\uC73C\uB85C \uC774\uB3D9\uD574\uB3C4 \uAC19\uC740 \uB124\uBE44 \uAD6C\uC131\uC744 \uC720\uC9C0\uD55C\uB2E4', async () => {
    window.location.hash = '#/dashboard';

    render(<App />);

    const navigation = screen.getByRole('navigation', {
      name: '\uC8FC\uC694 \uBA54\uB274',
    });
    const beforeLabels = within(navigation)
      .getAllByRole('button')
      .map((button) => button.textContent);

    fireEvent.click(within(navigation).getByRole('button', { name: '\uC0C1\uD488' }));

    await screen.findByText('\uC591\uD30C 1kg');

    const nextNavigation = screen.getByRole('navigation', {
      name: '\uC8FC\uC694 \uBA54\uB274',
    });
    const afterLabels = within(nextNavigation)
      .getAllByRole('button')
      .map((button) => button.textContent);

    expect(window.location.hash).toBe('#/products');
    expect(afterLabels).toEqual(beforeLabels);
    expect(afterLabels).toContain('\uB300\uC2DC\uBCF4\uB4DC');
    expect(afterLabels).toContain('\uB9C8\uC774\uD398\uC774\uC9C0');
  });

  test('\uC0AC\uC6A9\uC790 \uB124\uBE44\uC5D0\uC11C \uAD00\uB9AC\uC790\uACC4\uC815 \uC804\uD658 \uBC84\uD2BC\uC73C\uB85C \uAD00\uB9AC\uC790 \uD398\uC774\uC9C0\uC5D0 \uC9C4\uC785\uD55C\uB2E4', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '\uAD00\uB9AC\uC790\uACC4\uC815 \uC804\uD658' }));

    await waitFor(() => {
      expect(window.location.hash).toBe('#/admin');
    });

    expect(
      await screen.findByRole('navigation', { name: '\uAD00\uB9AC\uC790 \uBA54\uB274' })
    ).toBeInTheDocument();
    expect(screen.getByText('oneulFarm')).toBeInTheDocument();
  });

  test('관리자 상품 목록에서 영구삭제 버튼으로 상품을 실제 삭제 요청할 수 있다', async () => {
    window.location.hash = '#/admin/products';

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '관리자 화면 열기' }));
    fireEvent.click(await screen.findByRole('button', { name: '상품 관리' }));

    const retireButtons = await screen.findAllByRole('button', { name: '영구삭제' });
    fireEvent.click(retireButtons[0]);

    await waitFor(() => {
      expect(deleteAdminProduct).toHaveBeenCalledWith(1001);
    });
  });

  test('\uC7A5\uBC14\uAD6C\uB2C8 \uD398\uC774\uC9C0\uC5D0\uC11C \uC218\uB7C9 \uBCC0\uACBD\uACFC \uC0AD\uC81C\uAC00 \uAC00\uB2A5\uD558\uB2E4', async () => {
    signInTestUser();
    window.localStorage.setItem(
      'oneulFarmCart',
      JSON.stringify({ 1002: 2, 1001: 1 })
    );
    window.location.hash = '#/cart';

    render(<App />);

    expect(await screen.findByText('\uC591\uD30C 1kg')).toBeInTheDocument();
    expect(screen.getByText('\uAC10\uC790 1kg')).toBeInTheDocument();

    fireEvent.click(
      screen.getByLabelText('\uC591\uD30C 1kg \uC218\uB7C9 \uC99D\uAC00')
    );

    expect(screen.getByText('\uCD1D \uC218\uB7C9')).toBeInTheDocument();
    expect(screen.getByText('4\uAC1C')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('\uC591\uD30C 1kg \uC0AD\uC81C'));
    expect(screen.queryByText('\uC591\uD30C 1kg')).not.toBeInTheDocument();
  });

  test('\uC8FC\uBB38\uC11C\uB97C \uC81C\uCD9C\uD558\uBA74 \uC8FC\uBB38 \uC644\uB8CC \uD654\uBA74\uC73C\uB85C \uC774\uB3D9\uD55C\uB2E4', async () => {
    signInTestUser();
    window.localStorage.setItem('oneulFarmCart', JSON.stringify({ 1002: 2 }));
    window.location.hash = '#/checkout';

    render(<App />);

    expect(
      await screen.findByText('\uC8FC\uBB38\uC11C \uC791\uC131')
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByText('\uC8FC\uBB38 \uC644\uB8CC\uD558\uAE30')
    );

    expect(
      await screen.findByText('\uC8FC\uBB38 \uC644\uB8CC!')
    ).toBeInTheDocument();

    await waitFor(() => {
      const storedOrders = JSON.parse(
        window.localStorage.getItem('oneulFarmOrders') || '[]'
      );
      const storedCart = JSON.parse(
        window.localStorage.getItem('oneulFarmCart') || '{}'
      );

      expect(storedOrders).toHaveLength(1);
      expect(storedOrders[0].orderId).toMatch(/^OFT-\d{8}-\d{3}$/);
      expect(storedCart).toEqual({});
    });
  });

  test('\uC0AC\uC6A9\uC790 \uC8FC\uBB38 \uD654\uBA74\uC5D0\uC11C\uB294 \uBC30\uC1A1 \uC0C1\uD0DC\uB97C \uC9C1\uC811 \uBCC0\uACBD\uD560 \uC218 \uC5C6\uB2E4', async () => {
    signInTestUser();
    const storedOrder = buildStoredOrder();

    window.localStorage.setItem(
      'oneulFarmOrders',
      JSON.stringify([storedOrder])
    );
    window.location.hash = '#/orders';

    render(<App />);

    expect(await screen.findByText('\uC8FC\uBB38 \uB0B4\uC5ED')).toBeInTheDocument();
    expect(screen.queryByText('\uBC30\uC1A1 \uC2DC\uC791')).not.toBeInTheDocument();
    expect(screen.queryByText('\uBC30\uC1A1 \uC644\uB8CC')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '\uC0C1\uC138 \uBCF4\uAE30' })).not.toBeInTheDocument();
  });
});
