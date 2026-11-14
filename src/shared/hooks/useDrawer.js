import { useEffect, useRef } from 'react';

/**
 * Behaviour shared by the slide-in menus (store phone menu, admin sidebar) while `open`:
 * - the page behind does not scroll (html + body; the scrollbar's gutter is kept so nothing
 *   shifts sideways on desktop),
 * - Escape closes,
 * - focus moves into the panel and goes back to what opened it on close.
 *
 * The open/close motion itself is CSS (see the drawer classes in each layout).
 */
export function useDrawer(open, onClose, panelRef) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const html = document.documentElement;
    const { body } = document;
    const prev = {
      htmlOverflow: html.style.overflow,
      htmlGutter: html.style.scrollbarGutter,
      bodyOverflow: body.style.overflow,
    };
    if (html.scrollHeight > html.clientHeight) html.style.scrollbarGutter = 'stable';
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';

    const opener = document.activeElement;
    const onKey = (e) => {
      if (e.key === 'Escape') onCloseRef.current?.();
    };
    window.addEventListener('keydown', onKey);
    // The panel only becomes focusable once its visibility transition has started (next frame)
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => {
        panelRef?.current?.querySelector('a[href],button')?.focus({ preventScroll: true });
      });
    });

    return () => {
      cancelAnimationFrame(raf);
      html.style.overflow = prev.htmlOverflow;
      html.style.scrollbarGutter = prev.htmlGutter;
      body.style.overflow = prev.bodyOverflow;
      window.removeEventListener('keydown', onKey);
      // Back to the menu button, unless focus already moved elsewhere (e.g. a link navigated)
      const active = document.activeElement;
      const focusLost = !active || active === document.body || panelRef?.current?.contains(active);
      if (opener instanceof HTMLElement && opener.isConnected && focusLost) {
        opener.focus({ preventScroll: true });
      }
    };
  }, [open, panelRef]);
}

/*
 * Motion for a drawer that slides in from the right edge (RTL start side) over a fading overlay.
 * Opening decelerates (feels immediate), closing accelerates away and is a little shorter.
 * The root keeps the drawer painted until the closing slide has finished (`visibility` switches
 * at the end of its transition), then hides it from clicks, focus and screen readers.
 * Reduced motion: no slide, a short cross-fade only.
 *
 * `root` wraps overlay + panel. Without a wrapper, pass `{ standalone: true }` so the overlay /
 * panel carry the same visibility switch themselves (one transition-property list per element).
 */
const hidden = (open) => (open ? 'visible' : 'invisible pointer-events-none');

export const drawerMotion = {
  root: (open) =>
    `transition-[visibility] duration-300 motion-reduce:duration-150 ${hidden(open)}`,
  overlay: (open, { standalone = false } = {}) =>
    `${standalone ? `transition-[opacity,visibility] ${hidden(open)}` : 'transition-opacity'} motion-reduce:duration-150 ${
      open ? 'opacity-100 duration-300 ease-out' : 'opacity-0 duration-[250ms] ease-in'
    }`,
  panel: (open, { standalone = false } = {}) =>
    `${standalone ? `transition-[transform,opacity,visibility] ${hidden(open)}` : 'transition-[transform,opacity]'} motion-reduce:duration-150 motion-reduce:translate-x-0 ${
      open
        ? 'translate-x-0 opacity-100 duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]'
        : 'translate-x-full motion-reduce:opacity-0 duration-[250ms] ease-[cubic-bezier(0.4,0,1,1)]'
    }`,
};
