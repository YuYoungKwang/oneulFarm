import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { findProductByNo } from './data/productData';
import App from './App';
import { createOrderFromCart } from './components/orderUiUtils';

function buildStoredOrder() {
  return createOrderFromCart(
    [{ product: findProductByNo(1002), quantity: 2 }],
    {
      recipientName: '허륜',
      recipientPhone: '010-1234-5678',
      zipCode: '06236',
      address1: '서울 강남구 테헤란로 123',
      address2: '8층 oneulFarm',
      deliveryMessage: '문 앞에 두고 가주세요.',
      paymentMethod: 'CARD',
    },
    []
  );
}

describe('App', () => {
  afterEach(() => {
    window.location.hash = '';
    window.localStorage.clear();
  });

  test('상품 목록 화면이 렌더링된다', () => {
    render(<App />);

    expect(screen.getByText('오늘 장보기')).toBeInTheDocument();
    expect(screen.getByText('양파 1kg')).toBeInTheDocument();
  });

  test('해시 경로에 따라 상품 상세 화면이 렌더링된다', () => {
    window.location.hash = '#/products/1002';

    render(<App />);

    expect(screen.getAllByText('양파 1kg').length).toBeGreaterThan(0);
    expect(screen.getByText('상품 정보')).toBeInTheDocument();
  });

  test('상품 화면의 마이페이지 네비는 마이페이지 경로로 이동한다', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '마이페이지' }));

    expect(window.location.hash).toBe('#/mypage');
  });

  test('대시보드에서 상품으로 이동해도 같은 네비 구성을 유지한다', () => {
    window.location.hash = '#/dashboard';

    render(<App />);

    const navigation = screen.getByRole('navigation', { name: '주요 메뉴' });
    const beforeLabels = within(navigation)
      .getAllByRole('button')
      .map((button) => button.textContent);

    fireEvent.click(within(navigation).getByRole('button', { name: '상품' }));

    const nextNavigation = screen.getByRole('navigation', { name: '주요 메뉴' });
    const afterLabels = within(nextNavigation)
      .getAllByRole('button')
      .map((button) => button.textContent);

    expect(window.location.hash).toBe('#/products');
    expect(afterLabels).toEqual(beforeLabels);
    expect(afterLabels).toContain('대시보드');
    expect(afterLabels).toContain('마이페이지');
  });

  test('장바구니 페이지에서 수량 변경과 삭제가 가능하다', () => {
    window.localStorage.setItem(
      'oneulFarmCart',
      JSON.stringify({ 1002: 2, 1001: 1 })
    );
    window.location.hash = '#/cart';

    render(<App />);

    expect(screen.getByText('장바구니')).toBeInTheDocument();
    expect(screen.getByText('양파 1kg')).toBeInTheDocument();
    expect(screen.getByText('햇감자 1kg')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('양파 1kg 수량 증가'));
    expect(screen.getByText('총 수량')).toBeInTheDocument();
    expect(screen.getByText('4개')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('양파 1kg 삭제'));
    expect(screen.queryByText('양파 1kg')).not.toBeInTheDocument();
  });

  test('주문서를 제출하면 주문 완료 화면으로 이동한다', async () => {
    window.localStorage.setItem('oneulFarmCart', JSON.stringify({ 1002: 2 }));
    window.location.hash = '#/checkout';

    render(<App />);

    expect(screen.getByText('주문서 작성')).toBeInTheDocument();

    fireEvent.click(screen.getByText('결제하고 주문 생성'));

    expect(await screen.findByText('주문이 완료되었습니다.')).toBeInTheDocument();

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

  test('주문 상태 화면에서 배송 상태를 다음 단계로 변경할 수 있다', async () => {
    const storedOrder = buildStoredOrder();

    window.localStorage.setItem(
      'oneulFarmOrders',
      JSON.stringify([storedOrder])
    );
    window.location.hash = '#/orders';

    render(<App />);

    expect(screen.getByText('주문 상태 관리')).toBeInTheDocument();

    fireEvent.click(screen.getByText('배송 시작'));

    await waitFor(() => {
      const storedOrders = JSON.parse(
        window.localStorage.getItem('oneulFarmOrders') || '[]'
      );

      expect(storedOrders[0].orderStatus).toBe('SHIPPING');
      expect(screen.getAllByText('배송중').length).toBeGreaterThan(0);
    });
  });
});
