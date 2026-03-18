export const pageTabs = [
  { id: 'dashboard', label: '대시보드' },
  { id: 'mypage', label: '마이페이지' },
];

export const tabs = [
  { id: 'orders', label: '주문내역' },
  { id: 'wishlist', label: '찜한상품' },
  { id: 'reviews', label: '리뷰관리' },
];

export const wishlist = [
  { name: '방울토마토 1kg', price: 4200, avg: '평균가보다 12% 저렴', badge: '추천 상품', emoji: '🍅' },
  { name: '제주 당근 1kg', price: 2500, avg: '이번 주 관심 상품', badge: '찜 추천', emoji: '🥕' },
  { name: '국내산 양파 1kg', price: 3200, avg: '재입고 알림 설정', badge: '알림', emoji: '🧅' },
];

export const writableReviews = [
  { name: '양파 1kg', orderId: 'TEST-ORDER-20260317-001', date: '2026.03.15', emoji: '🧅' },
];

export const myReviews = [
  {
    name: '감자 1kg',
    rating: '★★★★★',
    content: '배송도 빠르고 상태가 좋아서 다음에도 다시 주문할 것 같습니다.',
    date: '2026.03.16',
    emoji: '🥔',
  },
];

export const monthlySavings = [
  { month: '1월', value: 500 },
  { month: '2월', value: 2400 },
  { month: '3월', value: 2100 },
];

export const productSavings = [
  { name: '감자 1kg', value: 3400 },
  { name: '양파 1kg', value: 1100 },
  { name: '당근 1kg', value: 500 },
];

export const topProducts = [
  { name: '감자 1kg', quantity: '3개', saved: '3,400원 절약' },
  { name: '양파 1kg', quantity: '2개', saved: '1,100원 절약' },
  { name: '당근 1kg', quantity: '1개', saved: '500원 절약' },
];

export const recentProducts = [
  { name: '당근 1kg', orderedAt: '2026.03.16', detail: '최근 주문 1순위' },
  { name: '감자 1kg', orderedAt: '2026.03.15', detail: '리뷰 작성 완료' },
  { name: '양파 1kg', orderedAt: '2026.03.15', detail: '리뷰 작성 가능' },
];
