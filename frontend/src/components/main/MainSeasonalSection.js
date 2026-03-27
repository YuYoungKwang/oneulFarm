import RecommendProductCard from "../recommend/RecommendProductCard";

function openProduct(productNo) {
  window.location.hash = `#/products/${productNo}`;
}

export default function MainSeasonalSection({ items }) {
  return (
    <section className="section" id="seasonal-section">
      <div className="section-head">
        <div>
          <div className="section-title">
            {"\uC9C0\uAE08 \uC81C\uCCA0 \uC7AC\uB8CC\uB85C \uB9CC\uB4DC\uB294 \uC694\uB9AC"}
          </div>
          <div className="section-sub">
            {
              "\uC81C\uCCA0 \uC7AC\uB8CC\uB97C \uC911\uC2EC\uC73C\uB85C \uD65C\uC6A9\uD560 \uC218 \uC788\uB294 \uB808\uC2DC\uD53C\uB97C \uBC14\uB85C \uBCF4\uC5EC\uC90D\uB2C8\uB2E4."
            }
          </div>
        </div>
      </div>

      {items.length ? (
        <div className="recommend-product-grid is-compact">
          {items.map((item) => (
            <RecommendProductCard
              key={item.product.productNo}
              badges={item.badges}
              detail={item.detail}
              metricLabel={item.metricLabel}
              metricValue={item.metricValue}
              onOpen={() => openProduct(item.product.productNo)}
              product={item.product}
              summary={item.summary}
              typeLabel={item.typeLabel}
            />
          ))}
        </div>
      ) : (
        <div className="recommend-section-empty">
          <strong>
            {"\uC81C\uCCA0 \uC7AC\uB8CC\uAC00 \uC544\uC9C1 \uC5C6\uC2B5\uB2C8\uB2E4."}
          </strong>
          <p>
            {
              "\uACC4\uC808\uC131 \uB370\uC774\uD130\uAC00 \uB354 \uBAA8\uC774\uBA74 \uC5EC\uAE30\uC5D0\uC11C \uBCF4\uC5EC\uB4DC\uB9BD\uB2C8\uB2E4."
            }
          </p>
        </div>
      )}
    </section>
  );
}
