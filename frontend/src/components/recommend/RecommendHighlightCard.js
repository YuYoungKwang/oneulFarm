export default function RecommendHighlightCard({
  description,
  label,
  tone = 'default',
  value,
}) {
  return (
    <article className={`recommend-highlight-card is-${tone}`}>
      <span className="recommend-highlight-card__label">{label}</span>
      <strong className="recommend-highlight-card__value">{value}</strong>
      <p className="recommend-highlight-card__description">{description}</p>
    </article>
  );
}
