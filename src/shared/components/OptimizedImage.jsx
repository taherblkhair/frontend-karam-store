import { useEffect, useState } from 'react';
import { buildResponsiveMedia } from '@core/api/config.js';

/**
 * Optimized product/media image:
 * - lazy loading (unless priority)
 * - responsive srcset for WebP variants
 * - shimmer placeholder until load
 * - fade-in once ready
 */
export function OptimizedImage({
  src,
  alt = '',
  className = '',
  imgClassName = '',
  sizes = '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 400px',
  widths,
  priority = false,
  objectFit = 'cover',
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  const media = buildResponsiveMedia(src, { widths });
  const displaySrc = media.src;

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [displaySrc]);

  if (!displaySrc || failed) {
    return (
      <div
        className={`flex items-center justify-center bg-tertiary-100 text-ink-300 text-sm ${className}`}
        role="img"
        aria-label={alt || 'بدون صورة'}
      >
        {!displaySrc ? 'لا توجد صورة' : null}
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-tertiary-200 ${className}`}>
      {!loaded && (
        <div
          className="absolute inset-0 animate-pulse bg-gradient-to-br from-tertiary-100 via-tertiary-200 to-tertiary-100"
          aria-hidden
        />
      )}

      <img
        src={media.src}
        srcSet={media.srcSet || undefined}
        sizes={media.srcSet ? sizes : undefined}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        fetchPriority={priority ? 'high' : 'auto'}
        draggable={false}
        onLoad={() => setLoaded(true)}
        onError={() => {
          setFailed(true);
          setLoaded(true);
        }}
        className={`w-full h-full transition-opacity duration-300 ${
          loaded ? 'opacity-100' : 'opacity-0'
        } ${objectFit === 'contain' ? 'object-contain' : 'object-cover'} ${imgClassName}`}
      />
    </div>
  );
}

/** Tiny thumb — smaller sizes for galleries and lists. */
export function OptimizedThumb({ src, alt = '', className = '', priority = false }) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      className={className}
      sizes="80px"
      widths={[400]}
      priority={priority}
    />
  );
}
