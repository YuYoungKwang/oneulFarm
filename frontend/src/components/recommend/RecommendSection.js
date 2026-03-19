export default function RecommendSection({
  actionLabel,
  actionType = 'button',
  eyebrow,
  id,
  onAction,
  subtitle,
  title,
  children,
}) {
  return (
    <section className="recommend-section" id={id}>
      <div className="recommend-section__head">
        <div>
          {eyebrow ? <span className="recommend-section__eyebrow">{eyebrow}</span> : null}
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {actionLabel ? (
          <button
            className={`recommend-section__action ${
              actionType === 'ghost' ? 'is-ghost' : ''
            }`}
            type="button"
            onClick={onAction}
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
      {children}
    </section>
  );
}
