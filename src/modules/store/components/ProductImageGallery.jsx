import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { OptimizedImage, OptimizedThumb } from '@shared/components/OptimizedImage';

const SWIPE_THRESHOLD = 40;

/**
 * Build unique gallery: product images first, then variant images not already listed.
 */
export function buildDetailGallery(product) {
  const items = [];
  const seen = new Set();

  const push = ({ id, image, color_id = null, variant_id = null, color_name = null, hex_code = null, label = '' }) => {
    if (!image || seen.has(image)) return;
    seen.add(image);
    items.push({
      id,
      image,
      color_id,
      variant_id,
      color_name,
      hex_code,
      label,
    });
  };

  for (const [i, img] of (product?.images || []).entries()) {
    push({
      id: `img-${img.id ?? i}`,
      image: img.url || img.image,
      label: img.is_primary ? 'رئيسية' : `صورة ${i + 1}`,
    });
  }

  if (product?.primary_image) {
    push({
      id: 'primary',
      image: product.primary_image,
      label: 'رئيسية',
    });
  }

  for (const v of product?.variants || []) {
    if (!v.image) continue;
    push({
      id: `var-${v.id}`,
      image: v.image,
      color_id: v.color_id || null,
      variant_id: v.id,
      color_name: v.color_name || null,
      hex_code: v.hex_code || null,
      label: v.color_name || 'متغير',
    });
  }

  return items;
}

/**
 * Full product image gallery with thumbnails + swipe + arrows.
 * Navigating to a variant-linked image calls `onVariantImageSelect`.
 */
export function ProductImageGallery({
  product,
  selectedVariant = null,
  onVariantImageSelect,
  className = '',
}) {
  const gallery = useMemo(() => buildDetailGallery(product), [product]);
  const [index, setIndex] = useState(0);
  const touchRef = useRef({ x: 0, active: false });
  const viewportRef = useRef(null);

  const count = gallery.length;
  const safeIndex = count ? Math.min(index, count - 1) : 0;
  const current = count ? gallery[safeIndex] : null;

  const goTo = useCallback(
    (i) => {
      if (!count) return;
      const next = ((i % count) + count) % count;
      setIndex(next);
      const slide = gallery[next];
      if (slide?.variant_id && onVariantImageSelect) {
        onVariantImageSelect(slide);
      }
    },
    [count, gallery, onVariantImageSelect]
  );

  const go = useCallback((dir) => goTo(safeIndex + dir), [goTo, safeIndex]);

  // Sync gallery when user picks a color/variant with its own image
  useEffect(() => {
    if (!selectedVariant?.image || !count) return;
    const idx = gallery.findIndex((g) => g.image === selectedVariant.image);
    if (idx >= 0 && idx !== safeIndex) setIndex(idx);
  }, [selectedVariant?.id, selectedVariant?.image, gallery, count]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset when product changes
  useEffect(() => {
    setIndex(0);
  }, [product?.id]);

  // Keyboard
  useEffect(() => {
    const onKey = (e) => {
      if (count <= 1) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        go(1); // RTL: left arrow → next visual
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        go(-1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [count, go]);

  // Touch swipe
  useEffect(() => {
    const el = viewportRef.current;
    if (!el || count <= 1) return undefined;

    const onStart = (e) => {
      touchRef.current = { x: e.touches[0].clientX, active: true };
    };
    const onEnd = (e) => {
      if (!touchRef.current.active) return;
      const dx = e.changedTouches[0].clientX - touchRef.current.x;
      touchRef.current.active = false;
      if (Math.abs(dx) < SWIPE_THRESHOLD) return;
      // Finger left → next (LTR track mental model for images)
      go(dx < 0 ? 1 : -1);
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchend', onEnd);
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchend', onEnd);
    };
  }, [count, go]);

  if (!count) {
    return (
      <div className={`aspect-square rounded-2xl bg-tertiary-100 dark:bg-gray-800 flex items-center justify-center text-ink-300 ${className}`}>
        لا توجد صورة
      </div>
    );
  }

  return (
    <div className={className} dir="ltr">
      {/* Main stage */}
      <div
        ref={viewportRef}
        className="relative aspect-square rounded-2xl overflow-hidden bg-tertiary-100 dark:bg-gray-800 group select-none touch-pan-y"
        aria-roledescription="carousel"
        aria-label="صور المنتج"
      >
        <OptimizedImage
          key={current.image}
          src={current.image}
          alt={current.label || product?.name_ar || 'صورة المنتج'}
          className="w-full h-full"
          sizes="(max-width: 768px) 100vw, 50vw"
          widths={[400, 800, 1200]}
          priority={safeIndex === 0}
        />

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/90 text-ink-800 shadow hover:bg-white opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition"
              aria-label="الصورة السابقة"
            >
              <ChevronLeft size={22} />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/90 text-ink-800 shadow hover:bg-white opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition"
              aria-label="الصورة التالية"
            >
              <ChevronRight size={22} />
            </button>

            <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5 z-10">
              {gallery.map((slide, i) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`صورة ${i + 1}`}
                  aria-current={i === safeIndex ? 'true' : undefined}
                  className={`h-1.5 rounded-full transition-all ${
                    i === safeIndex ? 'w-6 bg-primary-600' : 'w-1.5 bg-white/70 hover:bg-white'
                  }`}
                />
              ))}
            </div>

            <span className="absolute top-3 right-3 z-10 text-xs font-medium px-2 py-1 rounded-full bg-black/45 text-white backdrop-blur-sm">
              {safeIndex + 1} / {count}
            </span>
          </>
        )}

        {current.color_name && (
          <span className="absolute top-3 left-3 z-10 text-xs font-medium px-2 py-1 rounded-full bg-white/90 text-ink-800 shadow-sm">
            {current.color_name}
          </span>
        )}
      </div>

      {/* All images as thumbnails — always show when ≥1 for consistency when many */}
      {count > 0 && (
        <div
          className="mt-3 flex gap-2 overflow-x-auto pb-1 snap-x"
          role="tablist"
          aria-label="معرض صور المنتج"
          dir="rtl"
        >
          {gallery.map((slide, i) => {
            const active = i === safeIndex;
            return (
              <button
                key={slide.id}
                type="button"
                role="tab"
                aria-selected={active}
                title={slide.label || slide.color_name || `صورة ${i + 1}`}
                onClick={() => goTo(i)}
                className={`relative shrink-0 w-[4.5rem] h-[4.5rem] rounded-xl overflow-hidden border-2 snap-start transition ${
                  active
                    ? 'border-primary-600 ring-2 ring-primary-600/25'
                    : 'border-ink-100 hover:border-primary-300'
                }`}
              >
                <OptimizedThumb src={slide.image} alt="" className="w-full h-full" />
                {slide.hex_code && (
                  <span
                    className="absolute bottom-1 start-1 w-3 h-3 rounded-full border border-white shadow"
                    style={{ backgroundColor: slide.hex_code }}
                    aria-hidden
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
