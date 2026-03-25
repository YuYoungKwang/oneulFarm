import PriceAnalysisSection from './PriceAnalysisSection';
import PriceEmptyState from './PriceEmptyState';
import PriceProductCard from './PriceProductCard';

export default function SimilarProductsSection({
  className = '',
  items = [],
  onCompare,
  onOpenAll,
}) {
  return (
    <PriceAnalysisSection
      className={className}
      actionLabel="전체 상품 보기"
      actionTone="ghost"
      eyebrow="대체 비교"
      subtitle="대체재로 비교해볼 만한 상품만 간단하게 모았습니다."
      title="비슷한 상품 추천"
      onAction={onOpenAll}
    >
      {items.length ? (
        <div className="market-product-grid">
          {items.map((item) => (
            <PriceProductCard
              key={item.optionKey}
              badgeLabel="대체 비교"
              badgeTone="slate"
              ctaLabel="비교 차트 보기"
              product={item.product}
              reasonDetail={item.reason}
              reasonLabel="비슷한 상품"
              variant="similar"
              onAction={() => onCompare(item)}
            />
          ))}
        </div>
      ) : (
        <PriceEmptyState
          actionLabel="전체 상품 보기"
          icon="CP"
          subtitle="같은 카테고리와 단위 기준으로 바로 비교할 수 있는 상품이 아직 부족합니다."
          title="함께 비교할 대체 상품이 없습니다."
          onAction={onOpenAll}
        />
      )}
    </PriceAnalysisSection>
  );
}
