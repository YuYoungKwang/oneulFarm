import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  afterEach(() => {
    window.location.hash = '';
    window.localStorage.clear();
  });

  test('상품 목록 화면을 렌더링한다', () => {
    render(<App />);

    expect(screen.getByText('오늘 장보기')).toBeInTheDocument();
    expect(screen.getByText('양파 1kg')).toBeInTheDocument();
  });

  test('해시 경로에 따라 상품 상세 화면을 렌더링한다', () => {
    window.location.hash = '#/products/1002';

    render(<App />);

    expect(screen.getAllByText('양파 1kg').length).toBeGreaterThan(0);
    expect(screen.getByText('상품 정보')).toBeInTheDocument();
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
});
