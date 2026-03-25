import PriceMetricCard from './PriceMetricCard';

export default function KPIStatsRow({ items = [] }) {
  if (!items.length) {
    return null;
  }

  return (
    <section className="price-kpi-grid" aria-label="핵심 지표">
      {items.map((item, index) => (
        <PriceMetricCard
          key={item.label}
          delta={item.delta}
          featured={index === 0}
          hint={item.hint}
          label={item.label}
          tone={item.tone}
          value={item.value}
        />
      ))}
    </section>
  );
}
