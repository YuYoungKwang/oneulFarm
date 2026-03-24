import PriceAnalysisSection from './PriceAnalysisSection';
import PriceEmptyState from './PriceEmptyState';
import PriceProductCard from './PriceProductCard';

export default function BestBuyProductsSection({
  className = '',
  items = [],
  onOpenAll,
  onOpenProduct,
}) {
  return (
    <PriceAnalysisSection
      className={className}
      actionLabel="상품 전체 보기"
      eyebrow="구매 추천"
      subtitle="지금 바로 보러갈 만한 상품만 짧게 정리했습니다."
      title="지금 구매하기 좋은 상품"
      onAction={onOpenAll}
    >
      {items.length ? (
        <div className="market-product-grid">
          {items.map((item) => (
            <PriceProductCard
              key={item.optionKey}
              badgeLabel={item.reasonLabel}
              badgeTone="green"
              ctaLabel="상품 보러가기"
              product={item.product}
              reasonDetail={item.reason}
              reasonLabel="구매 포인트"
              variant="best-buy"
              onAction={() => onOpenProduct(item.product?.productNo)}
            />
          ))}
        </div>
      ) : (
        <PriceEmptyState
          actionLabel="다른 상품 보기"
          icon="BB"
          subtitle="지금 메리트가 큰 품목이 충분하지 않습니다. 다른 품목을 먼저 살펴보세요."
          title="바로 추천할 구매 후보가 없습니다."
          onAction={onOpenAll}
        />
      )}
    </PriceAnalysisSection>
  );
}
