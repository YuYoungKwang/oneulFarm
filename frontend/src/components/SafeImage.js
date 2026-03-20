import { useEffect, useState } from 'react';

export default function SafeImage({
  alt,
  className,
  fallback = null,
  loading = 'lazy',
  src,
}) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (!src || hasError) {
    return fallback;
  }

  return (
    <img
      alt={alt}
      className={className}
      loading={loading}
      onError={() => setHasError(true)}
      src={src}
    />
  );
}
