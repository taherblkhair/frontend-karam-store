import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';
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
 * Mobile-first: capped height, safe controls, horizontal thumbs.
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

  useEffect(() => {
    if (!selectedVariant?.image || !count) return;
    const idx = gallery.findIndex((g) => g.image === selectedVariant.image);
    if (idx >= 0 && idx !== safeIndex) setIndex(idx);
  }, [selectedVariant?.id, selectedVariant?.image, gallery, count]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setIndex(0);
    setLightboxOpen(false);
  }, [product?.id]);

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
        className={`aspect-[4/5] sm:aspect-square max-h-[min(70dvh,520px)] sm:max-h-none rounded-2xl bg-tertiary-100 dark:bg-gray-800 flex items-center justify-center text-ink-300 ${className}`}
      >
        لا توجد صورة
      </div>
    );
  }

  return (
    <div className={`w-full min-w-0 ${className}`} dir="ltr">
      <div
        ref={viewportRef}
        className="relative w-full aspect-[4/5] sm:aspect-square max-h-[min(68dvh,560px)] sm:max-h-[min(80vh,640px)] mx-auto rounded-xl sm:rounded-2xl overflow-hidden bg-tertiary-100 dark:bg-gray-800 group select-none touch-pan-y"
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
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 50vw"
            widths={[400, 800, 1200]}
            preferSrcWidth={800}
            priority={safeIndex === 0}
          />
        </button>

        {/* Zoom — top area on mobile to avoid dots clash */}
        <button
          type="button"
          onClick={openLightbox}
          className="absolute top-2.5 left-2.5 z-10 inline-flex h-9 w-9 sm:h-auto sm:w-auto items-center justify-center gap-1.5 rounded-full bg-ink-900/75 sm:px-3 sm:py-1.5 text-xs font-semibold text-white shadow-sm backdrop-blur-sm transition hover:bg-ink-900"
          aria-label="فتح المعاينة بالتكبير"
        >
          <ZoomIn size={16} strokeWidth={2.25} />
          <span className="hidden sm:inline">تكبير</span>
        </button>

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                go(-1);
              }}
              className="absolute left-1.5 sm:left-2 top-1/2 -translate-y-1/2 z-10 flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-white/90 text-ink-800 shadow hover:bg-white transition"
              aria-label="الصورة السابقة"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                go(1);
              }}
              className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 z-10 flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-white/90 text-ink-800 shadow hover:bg-white transition"
              aria-label="الصورة التالية"
            >
              <ChevronRight size={20} />
            </button>

            <div className="absolute bottom-2.5 inset-x-0 flex justify-center gap-1.5 z-10 pointer-events-none px-10">
              {gallery.map((slide, i) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`صورة ${i + 1}`}
                  aria-current={i === safeIndex ? 'true' : undefined}
                  className={`pointer-events-auto h-1.5 rounded-full transition-all ${
                    i === safeIndex ? 'w-5 sm:w-6 bg-primary-600' : 'w-1.5 bg-white/75 hover:bg-white'
                  }`}
                />
              ))}
            </div>

            <span className="absolute top-2.5 right-2.5 z-10 text-[11px] sm:text-xs font-medium px-2 py-1 rounded-full bg-black/45 text-white backdrop-blur-sm tabular-nums">
              {safeIndex + 1} / {count}
            </span>
          </>
        )}

        {current.color_name && (
          <span className="absolute bottom-8 sm:bottom-10 left-1/2 -translate-x-1/2 z-10 text-[11px] sm:text-xs font-medium px-2.5 py-1 rounded-full bg-white/95 text-ink-800 shadow-sm max-w-[80%] truncate">
            {current.color_name}
          </span>
        )}
      </div>

      {count > 1 && (
        <div
          className="mt-2.5 sm:mt-3 flex gap-2 overflow-x-auto overscroll-x-contain pb-1 snap-x snap-mandatory scrollbar-none -mx-0.5 px-0.5"
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
                className={`relative shrink-0 w-14 h-14 sm:w-[4.5rem] sm:h-[4.5rem] rounded-lg sm:rounded-xl overflow-hidden border-2 snap-start transition ${
                  active
                    ? 'border-primary-600 ring-2 ring-primary-600/25'
                    : 'border-ink-100 hover:border-primary-300 dark:border-gray-600'
                }`}
              >
                <OptimizedThumb src={slide.image} alt="" className="w-full h-full" />
                {slide.hex_code && (
                  <span
                    className="absolute bottom-1 start-1 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border border-white shadow"
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
