import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Expand, ZoomIn } from 'lucide-react';
import { OptimizedImage, OptimizedThumb } from '@shared/components/OptimizedImage';
import { ProductImageLightbox } from '@modules/store/components/ProductImageLightbox';

const SWIPE_THRESHOLD = 40;

/**
 * Build unique gallery: product images first, then variant images not already listed.
 */
export function buildDetailGallery(product) {
  const items = [];
  const seen = new Set();

  const push = ({
    id,
    image,
    color_id = null,
    variant_id = null,
    color_name = null,
    hex_code = null,
    label = '',
  }) => {
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
 * Full product image gallery with thumbnails + swipe + fullscreen zoom viewer.
 */
export function ProductImageGallery({
  product,
  selectedVariant = null,
  onVariantImageSelect,
  className = '',
}) {
  const gallery = useMemo(() => buildDetailGallery(product), [product]);
  const [index, setIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
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

  const openLightbox = useCallback(() => {
    if (!count) return;
    setLightboxOpen(true);
  }, [count]);

  // Sync gallery when user picks a color/variant with its own image
  useEffect(() => {
    if (!selectedVariant?.image || !count) return;
    const idx = gallery.findIndex((g) => g.image === selectedVariant.image);
    if (idx >= 0 && idx !== safeIndex) setIndex(idx);
  }, [selectedVariant?.id, selectedVariant?.image, gallery, count]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setIndex(0);
    setLightboxOpen(false);
  }, [product?.id]);

  // Keyboard only when lightbox closed (lightbox handles its own keys)
  useEffect(() => {
    if (lightboxOpen) return undefined;
    const onKey = (e) => {
      if (count <= 1) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        go(1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        go(-1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [count, go, lightboxOpen]);

  // Touch swipe — skip multi-touch (pinch handled in lightbox)
  useEffect(() => {
    const el = viewportRef.current;
    if (!el || count <= 1) return undefined;

    const onStart = (e) => {
      if (e.touches.length !== 1) return;
      touchRef.current = { x: e.touches[0].clientX, active: true };
    };
    const onEnd = (e) => {
      if (!touchRef.current.active || e.changedTouches.length !== 1) return;
      const dx = e.changedTouches[0].clientX - touchRef.current.x;
      touchRef.current.active = false;
      if (Math.abs(dx) < SWIPE_THRESHOLD) return;
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
      <div
        className={`aspect-square rounded-2xl bg-tertiary-100 dark:bg-gray-800 flex items-center justify-center text-ink-300 ${className}`}
      >
        لا توجد صورة
      </div>
    );
  }

  return (
    <div className={className} dir="ltr">
      <div
        ref={viewportRef}
        className="relative aspect-square rounded-2xl overflow-hidden bg-tertiary-100 dark:bg-gray-800 group select-none touch-pan-y"
        aria-roledescription="carousel"
        aria-label="صور المنتج"
      >
        <button
          type="button"
          onClick={openLightbox}
          className="absolute inset-0 z-[1] block w-full h-full cursor-zoom-in text-start"
          aria-label="تكبير الصورة"
        >
          <OptimizedImage
            key={current.image}
            src={current.image}
            alt={current.label || product?.name_ar || 'صورة المنتج'}
            className="w-full h-full pointer-events-none"
            imgClassName="transition-transform duration-500 group-hover:scale-[1.03]"
            sizes="(max-width: 768px) 100vw, 50vw"
            widths={[400, 800, 1200]}
            priority={safeIndex === 0}
          />
        </button>

        <div className="absolute bottom-3 left-3 z-10 flex gap-2 pointer-events-none sm:pointer-events-auto">
          <button
            type="button"
            onClick={openLightbox}
            className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-ink-900/75 px-3 py-1.5 text-xs font-semibold text-white shadow-sm backdrop-blur-sm transition hover:bg-ink-900"
            aria-label="فتح المعاينة بالتكبير"
          >
            <ZoomIn size={14} strokeWidth={2.25} />
            تكبير
          </button>
          <button
            type="button"
            onClick={openLightbox}
            className="pointer-events-auto hidden sm:inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-ink-800 shadow-sm transition hover:bg-white"
            aria-label="عرض بملء الشاشة"
          >
            <Expand size={14} strokeWidth={2.25} />
            ملء الشاشة
          </button>
        </div>

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                go(-1);
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/90 text-ink-800 shadow hover:bg-white opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition"
              aria-label="الصورة السابقة"
            >
              <ChevronLeft size={22} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                go(1);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/90 text-ink-800 shadow hover:bg-white opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition"
              aria-label="الصورة التالية"
            >
              <ChevronRight size={22} />
            </button>

            <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5 z-10 pointer-events-none">
              {gallery.map((slide, i) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`صورة ${i + 1}`}
                  aria-current={i === safeIndex ? 'true' : undefined}
                  className={`pointer-events-auto h-1.5 rounded-full transition-all ${
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
                onDoubleClick={() => {
                  goTo(i);
                  setLightboxOpen(true);
                }}
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

      <ProductImageLightbox
        open={lightboxOpen}
        images={gallery}
        index={safeIndex}
        onClose={() => setLightboxOpen(false)}
        onIndexChange={(i) => goTo(i)}
        productName={product?.name_ar || ''}
      />
    </div>
  );
}
