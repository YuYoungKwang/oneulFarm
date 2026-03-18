export function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
      <circle cx="9" cy="20" r="1.5" />
      <circle cx="18" cy="20" r="1.5" />
      <path d="M3 4h2l2.4 10.2a1 1 0 0 0 1 .8H19a1 1 0 0 0 1-.8L22 8H7" />
    </svg>
  );
}

export function HeartIcon({ filled }) {
  return filled ? (
    <svg viewBox="0 0 24 24" fill="currentColor" strokeWidth="1.5">
      <path d="M12 20.8 4.9 13.9a4.8 4.8 0 0 1 0-6.9 5 5 0 0 1 7.1 0L12 7.1l.1-.1a5 5 0 0 1 7.1 0 4.8 4.8 0 0 1 0 6.9Z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
      <path d="M12 20.8 4.9 13.9a4.8 4.8 0 0 1 0-6.9 5 5 0 0 1 7.1 0L12 7.1l.1-.1a5 5 0 0 1 7.1 0 4.8 4.8 0 0 1 0 6.9Z" />
    </svg>
  );
}
