export default function PriceEmptyState({
  actionLabel,
  icon = 'PR',
  onAction,
  onSecondaryAction,
  secondaryActionLabel,
  subtitle,
  title,
}) {
  return (
    <section className="price-empty-state">
      <div className="price-empty-state__icon">{icon}</div>
      <h3>{title}</h3>
      {subtitle ? <p>{subtitle}</p> : null}
      {(actionLabel || secondaryActionLabel) ? (
        <div className="price-empty-state__actions">
          {actionLabel ? (
            <button
              className="price-btn price-btn--primary"
              type="button"
              onClick={onAction}
            >
              {actionLabel}
            </button>
          ) : null}
          {secondaryActionLabel ? (
            <button
              className="price-btn price-btn--ghost"
              type="button"
              onClick={onSecondaryAction}
            >
              {secondaryActionLabel}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
