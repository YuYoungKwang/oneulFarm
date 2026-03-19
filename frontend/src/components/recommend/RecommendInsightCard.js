export default function RecommendInsightCard({ description, meta, title }) {
  return (
    <article className="recommend-insight-card">
      <strong>{title}</strong>
      {meta ? <span className="recommend-insight-card__meta">{meta}</span> : null}
      <p>{description}</p>
    </article>
  );
}
