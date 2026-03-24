export default function MarketStatusPanel({ status }) {
  if (!status) {
    return null;
  }

  return (
    <aside className={`market-status-panel tone-${status.tone}`}>
      <div className="market-status-panel__head">
        <span className={`price-status-badge tone-${status.tone}`}>{status.badge}</span>
        <h2>{status.title}</h2>
      </div>

      <p className="market-status-panel__description">{status.description}</p>

      <ul className="market-status-panel__reasons">
        {status.reasons?.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>

      <div className="market-status-panel__metrics">
        {status.metrics?.map((metric) => (
          <div className="market-status-panel__metric" key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
          </div>
        ))}
      </div>
    </aside>
  );
}
