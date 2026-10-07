import { useEffect, useRef, useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '@modules/store/context/CartContext';
import { CART_BUMP_EVENT, hasPendingFlights } from '@modules/store/utils/flyToCart';

const FLIGHT_TIMEOUT_MS = 1500;

/**
 * Cart icon + counter used in the store header and mobile bottom nav.
 * When an item is flying in, the counter waits for it to land, then the icon bounces.
 */
export function CartIcon({ size = 22, strokeWidth = 2, badgeClassName = '' }) {
  const { itemCount } = useCart();
  const [shown, setShown] = useState(itemCount);
  const iconRef = useRef(null);
  const badgeRef = useRef(null);
  const countRef = useRef(itemCount);
  countRef.current = itemCount;

  useEffect(() => {
    if (itemCount <= shown || !hasPendingFlights()) {
      setShown(itemCount);
      return undefined;
    }
    const t = setTimeout(() => setShown(countRef.current), FLIGHT_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [itemCount]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onBump = () => {
      setShown(countRef.current);
      iconRef.current?.animate?.(
        [
          { transform: 'scale(1) rotate(0deg)' },
          { transform: 'scale(1.28) rotate(-10deg)', offset: 0.3 },
          { transform: 'scale(0.92) rotate(6deg)', offset: 0.6 },
          { transform: 'scale(1.06) rotate(-2deg)', offset: 0.8 },
          { transform: 'scale(1) rotate(0deg)' },
        ],
        { duration: 520, easing: 'ease-out' }
      );
      requestAnimationFrame(() =>
        badgeRef.current?.animate?.(
          [
            { transform: 'scale(1)', backgroundColor: '#FFD600', color: '#00332B' },
            { transform: 'scale(1.45)', offset: 0.4 },
            { transform: 'scale(1)' },
          ],
          { duration: 480, easing: 'cubic-bezier(.34,1.56,.64,1)' }
        )
      );
    };
    window.addEventListener(CART_BUMP_EVENT, onBump);
    return () => window.removeEventListener(CART_BUMP_EVENT, onBump);
  }, []);

  return (
    <span ref={iconRef} data-cart-target className="relative inline-flex will-change-transform">
      <ShoppingCart size={size} strokeWidth={strokeWidth} />
      {shown > 0 && (
        <span
          ref={badgeRef}
          className={`absolute flex items-center justify-center rounded-full bg-primary-600 font-bold leading-none text-white tabular-nums ${badgeClassName}`}
        >
          {shown > 99 ? '99+' : shown}
        </span>
      )}
    </span>
  );
}
