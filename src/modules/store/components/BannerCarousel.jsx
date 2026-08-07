import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { resolveMediaUrl } from '@core/api/config.js';

const SWIPE_THRESHOLD_PX = 48;
const TRANSITION_MS = 500;

function FallbackHero() {
  return (
    <section className="relative w-full overflow-hidden bg-gradient-to-l from-primary-700 to-primary-900">
      <div className="aspect-[5/4] sm:aspect-[16/7] lg:aspect-[21/8] flex items-center">
        <div className="container mx-auto px-4 text-white py-10" dir="rtl">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 max-w-2xl leading-tight">
            متجر كرم — أفضل الحقائب في ليبيا
          </h1>
          <p className="text-base sm:text-lg opacity-90 mb-6 max-w-xl">
            أفضل المنتجات بأسعار منافسة — الدفع عند الاستلام
          </p>
          <Link to="/products" className="btn bg-white text-primary-700 hover:bg-gray-100">
            تسوق الآن
          </Link>
        </div>
      </div>
    </section>
  );
}

function SlideContent({ banner, priority }) {
  const href = banner.link?.trim() || '/products';
  const isExternal = /^https?:\/\//i.test(href);
  const media = resolveMediaUrl(banner.image);
  const hasText = Boolean(banner.title_ar || banner.subtitle_ar);
  const label = banner.title_ar || 'بنر';

  const inner = (
    <>
      <img
        src={media}
        alt={label}
        className="absolute inset-0 h-full w-full object-cover object-center"
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        draggable={false}
      />
      <div
        className={`absolute inset-0 pointer-events-none ${
          hasText
            ? 'bg-gradient-to-t from-black/70 via-black/35 to-black/10 sm:bg-gradient-to-l sm:from-black/65 sm:via-black/30 sm:to-transparent'
            : 'bg-black/10'
        }`}
      />
      {hasText && (
        <div
          className="relative z-10 h-full flex items-end sm:items-center pb-12 sm:pb-0"
          dir="rtl"
        >
          <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-0 text-white max-w-3xl">
            {banner.title_ar ? (
              <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold mb-2 sm:mb-4 leading-tight drop-shadow-md line-clamp-3">
                {banner.title_ar}
              </h2>
            ) : null}
            {banner.subtitle_ar ? (
              <p className="text-sm sm:text-lg md:text-xl text-white/90 mb-4 sm:mb-6 max-w-xl line-clamp-3 drop-shadow">
                {banner.subtitle_ar}
              </p>
            ) : null}
            <span className="btn bg-white text-primary-700 hover:bg-gray-100 text-sm sm:text-base shadow-md pointer-events-none">
              {banner.link ? 'اكتشف المزيد' : 'تسوق الآن'}
            </span>
          </div>
        </div>
      )}
    </>
  );

  if (isExternal) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="relative block h-full w-full"
        aria-label={label}
        draggable={false}
      >
        {inner}
      </a>
    );
  }

  return (
    <Link to={href} className="relative block h-full w-full" aria-label={label} draggable={false}>
      {inner}
    </Link>
  );
}

/**
 * Automatic responsive banner carousel:
 * - auto-rotates at a fixed interval
 * - smooth CSS slide transition
 * - touch swipe on mobile
 * - dots + arrow navigation indicators
 */
export function BannerCarousel({ banners = [], autoPlayMs = 5000 }) {
  const slides = Array.isArray(banners) ? banners.filter((b) => b?.image) : [];
  const count = slides.length;

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const viewportRef = useRef(null);
  const touchRef = useRef({ x: 0, y: 0, active: false, locked: null, dx: 0 });
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    reducedMotionRef.current = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)'
    )?.matches;
  }, []);

  const goTo = useCallback(
    (i) => {
      if (!count) return;
      setIndex(((i % count) + count) % count);
      setDragOffset(0);
      touchRef.current.dx = 0;
    },
    [count]
  );

  const go = useCallback(
    (dir) => {
      if (!count) return;
      setIndex((i) => (i + dir + count) % count);
      setDragOffset(0);
      touchRef.current.dx = 0;
    },
    [count]
  );

  // Auto-play at a fixed interval
  useEffect(() => {
    if (count <= 1 || paused || isDragging || autoPlayMs <= 0) return undefined;
    const id = setInterval(() => go(1), autoPlayMs);
    return () => clearInterval(id);
  }, [count, paused, isDragging, autoPlayMs, go]);

  useEffect(() => {
    if (count > 0 && index >= count) setIndex(0);
  }, [count, index]);

  // Non-passive touch handlers so horizontal swipe can prevent vertical scroll lock
  useEffect(() => {
    const el = viewportRef.current;
    if (!el || count <= 1) return undefined;

    const onStart = (e) => {
      const t = e.touches[0];
      touchRef.current = { x: t.clientX, y: t.clientY, active: true, locked: null, dx: 0 };
      setIsDragging(true);
      setPaused(true);
    };

    const onMove = (e) => {
      const state = touchRef.current;
      if (!state.active) return;
      const t = e.touches[0];
      const dx = t.clientX - state.x;
      const dy = t.clientY - state.y;

      if (state.locked == null) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        state.locked = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
      }
      if (state.locked !== 'h') return;

      e.preventDefault();
      state.dx = dx;
      setDragOffset(dx);
    };

    const onEnd = () => {
      const state = touchRef.current;
      if (!state.active) return;
      const dx = state.dx;
      state.active = false;
      setIsDragging(false);
      setPaused(false);

      if (Math.abs(dx) >= SWIPE_THRESHOLD_PX) {
        go(dx < 0 ? 1 : -1);
      } else {
        setDragOffset(0);
        state.dx = 0;
      }
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd);
    el.addEventListener('touchcancel', onEnd);

    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onEnd);
    };
  }, [count, go]);

  const onKeyDown = (e) => {
    if (count <= 1) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      go(1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      go(-1);
    }
  };

  if (!count) return <FallbackHero />;

  const trackWidthPct = count * 100;
  const basePct = -((index * 100) / count);
  const viewportW = viewportRef.current?.offsetWidth || 1;
  const dragPct = isDragging ? (dragOffset / viewportW) * (100 / count) : 0;
  const translatePct = basePct + dragPct;

  const transition =
    isDragging || reducedMotionRef.current
      ? 'none'
      : `transform ${TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`;

  return (
    <section
      className="relative w-full overflow-hidden bg-gray-900 select-none outline-none"
      aria-roledescription="carousel"
      aria-label="بنرات المتجر"
      tabIndex={0}
      onKeyDown={onKeyDown}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/* dir=ltr so slide math & swipe stay consistent under site RTL */}
      <div
        ref={viewportRef}
        className="relative aspect-[5/4] sm:aspect-[16/7] lg:aspect-[21/8] w-full touch-pan-y"
        dir="ltr"
      >
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="flex h-full will-change-transform"
            style={{
              width: `${trackWidthPct}%`,
              transform: `translate3d(${translatePct}%, 0, 0)`,
              transition,
            }}
          >
            {slides.map((banner, i) => (
              <div
                key={banner.id ?? i}
                className="relative h-full shrink-0"
                style={{ width: `${100 / count}%` }}
                aria-hidden={i !== index}
                role="group"
                aria-roledescription="slide"
                aria-label={`${i + 1} من ${count}`}
              >
                <SlideContent banner={banner} priority={i === 0 || i === index} />
              </div>
            ))}
          </div>
        </div>

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 z-20 items-center justify-center p-2.5 rounded-full bg-black/40 hover:bg-black/55 text-white backdrop-blur-sm transition shadow-lg"
              aria-label="الشريحة السابقة"
            >
              <ChevronLeft size={22} />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 z-20 items-center justify-center p-2.5 rounded-full bg-black/40 hover:bg-black/55 text-white backdrop-blur-sm transition shadow-lg"
              aria-label="الشريحة التالية"
            >
              <ChevronRight size={22} />
            </button>

            <div
              className="absolute bottom-3 sm:bottom-5 inset-x-0 z-20 flex justify-center items-center gap-2"
              role="tablist"
              aria-label="مؤشرات البنرات"
            >
              {slides.map((slide, i) => {
                const active = i === index;
                return (
                  <button
                    key={slide.id ?? i}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    aria-label={`الانتقال إلى البنر ${i + 1}`}
                    onClick={() => goTo(i)}
                    className={`rounded-full transition-all duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 ${
                      active
                        ? 'h-2 w-7 bg-white shadow'
                        : 'h-2 w-2 bg-white/45 hover:bg-white/70'
                    }`}
                  />
                );
              })}
            </div>

            <span className="sr-only" aria-live="polite">
              البنر {index + 1} من {count}
            </span>
          </>
        )}
      </div>
    </section>
  );
}
