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
    <svg viewBox="0 0 24 24" fill="none">
      <path
        d="M12 21.35 5.6 15.48A5.44 5.44 0 0 1 4 11.53C4 8.48 6.42 6 9.4 6c1.5 0 2.94.67 3.9 1.8A5.08 5.08 0 0 1 17.2 6c2.98 0 5.4 2.48 5.4 5.53 0 1.5-.59 2.94-1.64 3.95L12 21.35Z"
        fill="currentColor"
      />
      <path
        d="M15.7 8.95c1.37 0 2.48 1.14 2.48 2.53"
        stroke="#fff"
        strokeLinecap="round"
        strokeWidth="1.65"
      />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none">
      <path
        d="M12 21.35 5.6 15.48A5.44 5.44 0 0 1 4 11.53C4 8.48 6.42 6 9.4 6c1.5 0 2.94.67 3.9 1.8A5.08 5.08 0 0 1 17.2 6c2.98 0 5.4 2.48 5.4 5.53 0 1.5-.59 2.94-1.64 3.95L12 21.35Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.85"
      />
      <path
        d="M16.1 8.9c1.16 0 2.11.97 2.11 2.15"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}
