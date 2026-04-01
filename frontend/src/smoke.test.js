import { adaptCartResponse, buildProductModel } from './api/productApi';
import { createOrderFromCart } from './components/orderUiUtils';
import { createPortOnePaymentDraft, getPortOnePaymentOptions, isPortOneReady } from './payment/portonePayments';

describe('frontend smoke tests', () => {
  test('adaptCartResponse converts legacy quantity map to normalized cart state', () => {
    const cartState = adaptCartResponse({
      1001: 2,
      1002: 1,
    });

    expect(cartState.productQuantities).toEqual({
      1001: 2,
      1002: 1,
    });
    expect(cartState.totalQuantity).toBe(3);
    expect(cartState.groups).toEqual([]);
    expect(cartState.items).toEqual([]);
  });

  test('createOrderFromCart builds order totals from checkout data', () => {
    const product = buildProductModel({
      productNo: 1001,
      categoryNo: 1,
      categoryName: '채소',
      productName: '감자 1kg',
      origin: '국산',
      unit: 'kg',
      packageWeight: 1,
      salePrice: 3200,
      stockQty: 10,
      saleStatus: 'SELLING',
      avgPrice: 3800,
      comparedPrice: 3800,
      minPrice: 3400,
      maxPrice: 4100,
      savingRate: 15,
      priceGap: 600,
      priceSnapshot: null,
      images: [],
      recipes: [],
      reviews: [],
    });

    const order = createOrderFromCart(
      [{ product, quantity: 2 }],
      {
        recipientName: '허륜',
        recipientPhone: '010-1234-5678',
        zipCode: '06236',
        address1: '서울 강남구 테헤란로 123',
        address2: '8층 oneulFarm',
        deliveryMessage: '문 앞에 놓아주세요',
        paymentMethod: 'CARD',
      },
      []
    );

    expect(order.orderStatus).toBe('PAID');
    expect(order.finalAmount).toBe(6400);
    expect(order.totalSavedAmount).toBeGreaterThan(0);
    expect(order.items).toHaveLength(1);
    expect(order.items[0].subtotal).toBe(6400);
    expect(order.orderId).toMatch(/^OFT-\d{8}-\d{3}$/);
  });

  test('PortOne payment draft is created from configured channel', () => {
    const paymentConfig = {
      ready: true,
      storeId: 'store-test',
      channelKeys: {
        tossPay: 'channel-toss',
      },
    };

    const options = getPortOnePaymentOptions(paymentConfig);
    expect(options).toHaveLength(1);
    expect(isPortOneReady(paymentConfig)).toBe(true);

    const draft = createPortOnePaymentDraft(
      paymentConfig,
      {
        recipientName: '허륜',
        recipientPhone: '010-1234-5678',
        paymentMethod: 'EASY_PAY',
        paymentProvider: 'TOSSPAY',
      },
      [
        {
          product: {
            productName: '양파 1kg',
            salePrice: 2800,
          },
          quantity: 2,
        },
      ]
    );

    expect(draft.provider).toBe('PORTONE');
    expect(draft.amount).toBe(5600);
    expect(draft.channelKey).toBe('channel-toss');
    expect(draft.paymentProvider).toBe('TOSSPAY');
  });
});
