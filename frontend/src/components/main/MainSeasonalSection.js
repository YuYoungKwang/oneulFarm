import MainSeasonalProductCard from "./MainSeasonalProductCard";

function openProduct(productNo) {
  if (productNo) {
    window.location.hash = `#/products/${productNo}`;
    return;
  }

  window.location.hash = "#/products";
}

export default function MainSeasonalSection({ items = [] }) {
  const productItems = Array.isArray(items) ? items.slice(0, 4) : [];

  return (
    <section className="home-section" id="seasonal-section">
      <div className="home-section__header">
        <div>
          <p className="home-section__eyebrow">Seasonal Pick</p>
          <h2 className="home-section__title">지금 담기 좋은 제철 재료</h2>
        </div>
        <a className="home-section__link" href="#/products?sort=RECOMMENDED">
          상품 전체 보기
        </a>
      </div>

      {productItems.length ? (
        <div className="home-product-grid">
          {productItems.map((item, index) => (
            <MainSeasonalProductCard
              key={item.product.productNo}
              badges={item.badges}
              featured={index === 0}
              linkedRecipes={item.linkedRecipes}
              onOpen={() => openProduct(item.product.productNo)}
              product={item.product}
              typeLabel={item.typeLabel}
            />
          ))}
        </div>
      ) : (
        <div className="home-section__empty">
          <strong>제철 재료가 아직 없습니다.</strong>
        </div>
      )}
    </section>
  );
}
