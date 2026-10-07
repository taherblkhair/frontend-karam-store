export const CART_BUMP_EVENT = 'karam-cart-bump';

const DURATION_MS = 820;
const CURVE_STEPS = 24;
let pendingFlights = 0;

/** True while a product image is still on its way to the cart icon. */
export const hasPendingFlights = () => pendingFlights > 0;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** The header icon on desktop, the bottom-nav icon on mobile — whichever is on screen. */
function findCartTarget() {
  const vh = window.innerHeight;
  return [...document.querySelectorAll('[data-cart-target]')].find((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < vh;
  });
}

const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

function buildClone(src, size) {
  const el = document.createElement(src ? 'img' : 'div');
  if (src) {
    el.src = src;
    el.alt = '';
    el.decoding = 'async';
  }
  Object.assign(el.style, {
    position: 'fixed',
    left: '0px',
    top: '0px',
    width: `${size}px`,
    height: `${size}px`,
    objectFit: 'cover',
    borderRadius: '18px',
    background: src ? '#F0EEE9' : '#004D40',
    boxShadow: '0 12px 30px -8px rgba(0, 77, 64, 0.45), 0 0 0 3px #FFD600',
    pointerEvents: 'none',
    zIndex: '80',
    willChange: 'transform, opacity',
  });
  el.setAttribute('aria-hidden', 'true');
  return el;
}

function bump() {
  window.dispatchEvent(new CustomEvent(CART_BUMP_EVENT));
}

/**
 * Floats a copy of the product photo from `sourceEl` to the cart icon along a
 * curved path (transform/opacity only, so it stays on the compositor).
 * The cart icon bounces and updates its counter when the copy lands.
 */
export function flyToCart(sourceEl) {
  const target = typeof document !== 'undefined' ? findCartTarget() : null;
  const from = sourceEl?.getBoundingClientRect?.();
  if (!target || !from || from.width === 0 || prefersReducedMotion() || !Element.prototype.animate) {
    bump();
    return;
  }

  const img = sourceEl.querySelector('img');
  const src = img?.currentSrc || img?.src || null;
  const size = Math.round(Math.min(from.width, from.height, 150));
  const to = target.getBoundingClientRect();

  // Path is computed for the clone's centre.
  const start = { x: from.left + from.width / 2, y: from.top + from.height / 2 };
  const end = { x: to.left + to.width / 2, y: to.top + to.height / 2 };
  // Control point lifts the path into an arc, but never above the top of the screen.
  const control = {
    x: start.x + (end.x - start.x) * 0.35,
    y: Math.max(48, Math.min(start.y, end.y) - Math.max(90, Math.abs(end.x - start.x) * 0.25)),
  };
  const endScale = Math.max(0.12, Math.min(to.width, to.height) / size);
  const half = size / 2;

  const keyframes = Array.from({ length: CURVE_STEPS + 1 }, (_, i) => {
    const t = easeInOutCubic(i / CURVE_STEPS);
    const u = 1 - t;
    const x = u * u * start.x + 2 * u * t * control.x + t * t * end.x - half;
    const y = u * u * start.y + 2 * u * t * control.y + t * t * end.y - half;
    const scale = 1 - (1 - endScale) * t;
    const opacity = t < 0.55 ? 1 : 1 - ((t - 0.55) / 0.45) * 0.9;
    return {
      offset: i / CURVE_STEPS,
      transform: `translate3d(${x}px, ${y}px, 0) scale(${scale})`,
      opacity,
    };
  });

  const clone = buildClone(src, size);
  document.body.appendChild(clone);
  pendingFlights += 1;

  const animation = clone.animate(keyframes, { duration: DURATION_MS, easing: 'linear', fill: 'forwards' });
  const land = () => {
    pendingFlights = Math.max(0, pendingFlights - 1);
    clone.remove();
    bump();
  };
  animation.onfinish = land;
  animation.oncancel = land;
}
