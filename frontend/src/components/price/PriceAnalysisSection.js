export default function PriceAnalysisSection({
  actionLabel,
  actionTone = 'secondary',
  actions,
  children,
  className = '',
  eyebrow,
  id,
  onAction,
  subtitle,
  title,
}) {
  const buttonClassName =
    actionTone === 'ghost'
      ? 'price-btn price-btn--ghost'
      : actionTone === 'primary'
        ? 'price-btn price-btn--primary'
        : 'price-btn price-btn--secondary';

  return (
    <section className={`price-section ${className}`.trim()} id={id}>
      <header className="price-section__head">
        <div className="price-section__copy">
          {eyebrow ? <span className="price-eyebrow">{eyebrow}</span> : null}
          {title ? <h2>{title}</h2> : null}
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {actions ? (
          <div className="price-section__actions">{actions}</div>
        ) : actionLabel ? (
          <button className={buttonClassName} type="button" onClick={onAction}>
            {actionLabel}
          </button>
        ) : null}
      </header>
      {children}
    </section>
  );
}
