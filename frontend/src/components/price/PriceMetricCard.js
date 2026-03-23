export default function PriceMetricCard({
  delta,
  featured = false,
  hint,
  label,
  tone = 'default',
  value,
}) {
  return (
    <article
      className={`price-metric-card price-metric-card--${tone} ${
        featured ? 'is-featured' : ''
      }`}
    >
      <div className="price-metric-card__eyebrow">{label}</div>
      <div className="price-metric-card__value">{value}</div>
      {delta ? <div className="price-metric-card__delta">{delta}</div> : null}
      {hint ? <div className="price-metric-card__hint">{hint}</div> : null}
    </article>
  );
}
