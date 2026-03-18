import { fireEvent, render, screen } from '@testing-library/react';
import { findProductByNo } from './data/productData';
import App from './App';

function setAuthUser(overrides = {}) {
  window.localStorage.setItem(
    'oneulFarmAuthUser',
    JSON.stringify({
      userNo: 1,
      userId: 'tester',
      nickname: '테스터',
      ...overrides,
    })
  );
}

describe('App', () => {
  afterEach(() => {
    window.location.hash = '';
    window.localStorage.clear();
  });

  test('renders product list by default', () => {
    render(<App />);

    expect(screen.getByText(findProductByNo(1002).productName)).toBeInTheDocument();
  });

  test('renders product detail from hash route', () => {
    window.location.hash = '#/products/1002';

    render(<App />);

    expect(screen.getAllByText(findProductByNo(1002).productName).length).toBeGreaterThan(0);
  });

  test('shows login notice when cart is opened without login', () => {
    window.location.hash = '#/cart';

    render(<App />);

    expect(screen.getByText('로그인이 필요합니다.')).toBeInTheDocument();
    expect(screen.getByText('장바구니는 로그인 후 이용할 수 있습니다.')).toBeInTheDocument();
  });

  test('forces password change when login response requires it', () => {
    setAuthUser({ passwordChangeRequired: true });

    render(<App />);

    expect(screen.getByText('임시 비밀번호를 변경해 주세요')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '비밀번호 변경' })).toBeInTheDocument();
  });

  test('allows cart interaction after login', () => {
    const onion = findProductByNo(1002).productName;
    const potato = findProductByNo(1001).productName;

    setAuthUser();
    window.localStorage.setItem(
      'oneulFarmCart',
      JSON.stringify({ 1002: 2, 1001: 1 })
    );
    window.location.hash = '#/cart';

    render(<App />);

    expect(screen.getByText(onion)).toBeInTheDocument();
    expect(screen.getByText(potato)).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(`${onion} 수량 증가`));
    fireEvent.click(screen.getByLabelText(`${onion} 삭제`));

    expect(screen.queryByText(onion)).not.toBeInTheDocument();
  });
});
