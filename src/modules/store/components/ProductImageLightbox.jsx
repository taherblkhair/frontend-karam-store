import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { buildResponsiveMedia } from '@core/api/config.js';

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const ZOOM_STEP = 0.45;
const DOUBLE_TAP_MS = 280;
const SWIPE_CLOSE_Y = 90;

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function getDistance(t1, t2) {
  const dx = t1.clientX - t2.clientX;
  const dy = t1.clientY - t2.clientY;
  return Math.hypot(dx, dy);
}

function midPoint(t1, t2) {
  return {
    x: (t1.clientX + t2.clientX) / 2,
    y: (t1.clientY + t2.clientY) / 2,
  };
}

/**
 * Fullscreen product image viewer (portal):
 * double-click / double-tap · pinch · wheel · pan · swipe navigation
 * Does not affect product page layout.
 */
export function ProductImageLightbox({
  open,
  images = [],
  index = 0,
  onClose,
  onIndexChange,
  productName = '',
}) {
  const count = images.length;
  const safeIndex = count ? clamp(index, 0, count - 1) : 0;
  const slide = count ? images[safeIndex] : null;

  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [animating, setAnimating] = useState(true);

  const scaleRef = useRef(1);
  const offsetRef = useRef({ x: 0, y: 0 });
  const dragRef = useRef(null);
  const pinchRef = useRef(null);
  const lastTapRef = useRef(0);
  const stageRef = useRef(null);
  const movedRef = useRef(false);

  const setTransform = useCallback((nextScale, nextOffset, animate = false) => {
    const s = clamp(nextScale, MIN_SCALE, MAX_SCALE);
    let x = nextOffset?.x ?? 0;
    let y = nextOffset?.y ?? 0;
    if (s <= 1.01) {
      x = 0;
      y = 0;
    }
    scaleRef.current = s;
    offsetRef.current = { x, y };
    setAnimating(animate);
    setScale(s);
    setOffset({ x, y });
  }, []);

  const resetZoom = useCallback(() => {
    setTransform(1, { x: 0, y: 0 }, true);
  }, [setTransform]);

  useEffect(() => {
    if (!open) return;
    resetZoom();
  }, [open, safeIndex, resetZoom]);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const go = useCallback(
    (dir) => {
      if (!count || !onIndexChange) return;
      const next = (safeIndex + dir + count) % count;
      onIndexChange(next);
    },
    [count, onIndexChange, safeIndex]
  );

  const zoomBy = useCallback(
    (delta, origin = null) => {
      const prev = scaleRef.current;
      const next = clamp(prev + delta, MIN_SCALE, MAX_SCALE);
      if (next === prev) return;

      if (origin && stageRef.current && prev > 0) {
        const rect = stageRef.current.getBoundingClientRect();
        const cx = origin.x - rect.left - rect.width / 2;
        const cy = origin.y - rect.top - rect.height / 2;
        const ratio = next / prev;
        const ox = offsetRef.current.x;
        const oy = offsetRef.current.y;
        setTransform(
          next,
          {
            x: cx - (cx - ox) * ratio,
            y: cy - (cy - oy) * ratio,
          },
          true
        );
      } else {
        setTransform(next, offsetRef.current, true);
      }
    },
    [setTransform]
  );

  const toggleZoom = useCallback(
    (clientX, clientY) => {
      if (scaleRef.current > 1.15) {
        resetZoom();
      } else {
        zoomBy(1.6, { x: clientX, y: clientY });
      }
    },
    [resetZoom, zoomBy]
  );

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
        return;
      }
      if (e.key === 'ArrowLeft' && scaleRef.current <= 1.05) {
        e.preventDefault();
        go(-1);
        return;
      }
      if (e.key === 'ArrowRight' && scaleRef.current <= 1.05) {
        e.preventDefault();
        go(1);
        return;
      }
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        zoomBy(ZOOM_STEP);
        return;
      }
      if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        zoomBy(-ZOOM_STEP);
        return;
      }
      if (e.key === '0') {
        e.preventDefault();
        resetZoom();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, go, zoomBy, resetZoom]);

  useEffect(() => {
    if (!open) return undefined;
    const el = stageRef.current;
    if (!el) return undefined;

    const onWheel = (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -ZOOM_STEP * 0.55 : ZOOM_STEP * 0.55;
      zoomBy(delta, { x: e.clientX, y: e.clientY });
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [open, zoomBy, slide?.image]);

  const onPointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    movedRef.current = false;
    const pan = scaleRef.current > 1.02;
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {
      /* ignore */
    }
    dragRef.current = {
      id: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      ox: offsetRef.current.x,
      oy: offsetRef.current.y,
      swipeX: e.clientX,
      swipeY: e.clientY,
      swipeOnly: !pan,
    };
  };

  const onPointerMove = (e) => {
    const d = dragRef.current;
    if (!d || d.id !== e.pointerId || pinchRef.current) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (Math.hypot(dx, dy) > 6) movedRef.current = true;

    if (!d.swipeOnly && scaleRef.current > 1.02) {
      setTransform(
        scaleRef.current,
        {
          x: d.ox + dx,
          y: d.oy + dy,
        },
        false
      );
    }
  };

  const onPointerUp = (e) => {
    const d = dragRef.current;
    if (!d || d.id !== e.pointerId) return;

    const dx = e.clientX - d.swipeX;
    const dy = e.clientY - d.swipeY;
    dragRef.current = null;

    if (scaleRef.current <= 1.05 && count > 1) {
      if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy)) {
        go(dx < 0 ? 1 : -1);
        return;
      }
    }

    if (scaleRef.current <= 1.05 && dy > SWIPE_CLOSE_Y && Math.abs(dy) > Math.abs(dx)) {
      onClose?.();
      return;
    }

    if (!movedRef.current) {
      const now = Date.now();
      if (now - lastTapRef.current < DOUBLE_TAP_MS) {
        lastTapRef.current = 0;
        toggleZoom(e.clientX, e.clientY);
      } else {
        lastTapRef.current = now;
      }
    }
  };

  useEffect(() => {
    if (!open) return undefined;
    const el = stageRef.current;
    if (!el) return undefined;

    const onTouchStart = (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const t0 = e.touches[0];
        const t1 = e.touches[1];
        pinchRef.current = {
          startDist: getDistance(t0, t1),
          startScale: scaleRef.current,
          startOffset: { ...offsetRef.current },
        };
        dragRef.current = null;
      }
    };

    const onTouchMove = (e) => {
      if (e.touches.length === 2 && pinchRef.current) {
        e.preventDefault();
        const t0 = e.touches[0];
        const t1 = e.touches[1];
        const dist = getDistance(t0, t1);
        const p = pinchRef.current;
        const ratio = dist / (p.startDist || 1);
        const next = clamp(p.startScale * ratio, MIN_SCALE, MAX_SCALE);
        const mid = midPoint(t0, t1);
        const rect = el.getBoundingClientRect();
        const cx = mid.x - rect.left - rect.width / 2;
        const cy = mid.y - rect.top - rect.height / 2;
        const scRatio = next / (p.startScale || 1);
        setTransform(
          next,
          {
            x: cx - (cx - p.startOffset.x) * scRatio,
            y: cy - (cy - p.startOffset.y) * scRatio,
          },
          false
        );
        movedRef.current = true;
      }
    };

    const onTouchEnd = (e) => {
      if (e.touches.length < 2) pinchRef.current = null;
    };

    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    el.addEventListener('touchcancel', onTouchEnd);
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [open, setTransform, slide?.image]);

  if (!open || !slide || typeof document === 'undefined') return null;

  const media = buildResponsiveMedia(slide.image, { widths: [800, 1200] });
  const label = slide.label || slide.color_name || productName || 'صورة المنتج';

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex flex-col bg-ink-900/95 text-white"
      role="dialog"
      aria-modal="true"
      aria-label="معاينة الصورة بالتكبير"
      dir="ltr"
    >
      <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-2 px-3 sm:px-4 py-3 bg-gradient-to-b from-black/70 to-transparent safe-pt">
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate max-w-[55vw] sm:max-w-md">{label}</p>
          {count > 1 && (
            <p className="text-xs text-white/60 tabular-nums">
              {safeIndex + 1} / {count}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => zoomBy(-ZOOM_STEP)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition"
            aria-label="تصغير"
          >
            <ZoomOut size={18} />
          </button>
          <span className="min-w-[3rem] text-center text-xs font-semibold tabular-nums text-white/80">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={() => zoomBy(ZOOM_STEP)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition"
            aria-label="تكبير"
          >
            <ZoomIn size={18} />
          </button>
          <button
            type="button"
            onClick={resetZoom}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition"
            aria-label="إعادة تعيين التكبير"
          >
            <RotateCcw size={17} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 hover:bg-white/25 transition"
            aria-label="إغلاق"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div
        ref={stageRef}
        className={`relative flex-1 min-h-0 touch-none select-none overflow-hidden ${
          scale > 1.02 ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in'
        }`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={(e) => {
          e.preventDefault();
          toggleZoom(e.clientX, e.clientY);
        }}
      >
        <div
          className="absolute inset-0 flex items-center justify-center will-change-transform"
          style={{
            transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`,
            transition: animating ? 'transform 0.18s ease-out' : 'none',
          }}
        >
          <img
            src={media.src}
            srcSet={media.srcSet || undefined}
            sizes="100vw"
            alt={label}
            draggable={false}
            className="max-h-[min(92dvh,100%)] max-w-[min(96vw,100%)] object-contain pointer-events-none select-none"
          />
        </div>

        {count > 1 && scale <= 1.05 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                go(-1);
              }}
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-10 p-2.5 rounded-full bg-white/12 hover:bg-white/22 backdrop-blur-sm transition"
              aria-label="الصورة السابقة"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                go(1);
              }}
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-10 p-2.5 rounded-full bg-white/12 hover:bg-white/22 backdrop-blur-sm transition"
              aria-label="الصورة التالية"
            >
              <ChevronRight size={24} />
            </button>
          </>
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 z-20 safe-pb bg-gradient-to-t from-black/75 to-transparent pt-10">
        <p className="text-center text-[11px] sm:text-xs text-white/55 px-4 mb-3">
          انقر مرتين أو قرّب الإصبعين للتكبير · اسحب للتحريك · مرر العجلة للتكبير
        </p>
        {count > 1 && (
          <div className="flex justify-center gap-2 overflow-x-auto px-4 pb-3" dir="rtl">
            {images.map((item, i) => {
              const m = buildResponsiveMedia(item.image, { widths: [400] });
              const active = i === safeIndex;
              return (
                <button
                  key={item.id || i}
                  type="button"
                  onClick={() => onIndexChange?.(i)}
                  className={`shrink-0 h-12 w-12 rounded-lg overflow-hidden border-2 transition ${
                    active
                      ? 'border-secondary-400 ring-2 ring-secondary-400/40'
                      : 'border-white/20 opacity-70 hover:opacity-100'
                  }`}
                  aria-label={`صورة ${i + 1}`}
                  aria-current={active ? 'true' : undefined}
                >
                  <img src={m.src} alt="" className="h-full w-full object-cover" draggable={false} />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
