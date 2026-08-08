import { useCallback, useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatPrice } from '@core/constants';
import { OptimizedImage } from '@shared/components/OptimizedImage';
import { productPath } from '@modules/store/utils/productPaths';

const WISHLIST_KEY = 'karam-wishlist-ids';

function readWishlist() {
  try {
    const raw = localStorage.getItem(WISHLIST_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.map(String) : [];
  } catch {
    return [];
  }
}

function writeWishlist(ids) {
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(ids));
  window.dispatchEvent(new CustomEvent('karam-wishlist'));
}

export function useWishlist() {
  const [ids, setIds] = useState(() =>
    typeof window === 'undefined' ? [] : readWishlist()
  );

  useEffect(() => {
    const sync = () => setIds(readWishlist());
    window.addEventListener('storage', sync);
    window.addEventListener('karam-wishlist', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('karam-wishlist', sync);
    };
  }, []);

  const isSaved = useCallback((id) => ids.includes(String(id)), [ids]);

  const toggle = useCallback((id) => {
    const key = String(id);
    setIds((prev) => {
      const next = prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key];
      writeWishlist(next);
      return next;
    });
  }, []);

  return { ids, isSaved, toggle };
}

function productImage(product) {
  return (
    product?.primary_image ||
    product?.variants?.find((v) => v?.image)?.image ||
    null
  );
}

/**
 * Unified storefront product card (design system):
 * 4:5 image · favorite · badge · name · price
 * Used for: وصل حديثاً · الأكثر مبيعاً · grid listings
 */
export function StoreProductCard({
  product,
  badge,
  showNewBadge = false,
  className = '',
}) {
  const { isSaved, toggle } = useWishlist();
  const image = productImage(product);
  const href = productPath(product);
  const saved = isSaved(product.id);
  const hasDiscount =
    product.compare_price &&
    parseFloat(product.compare_price) > parseFloat(product.price);
  const outOfStock = product.total_stock != null && Number(product.total_stock) <= 0;

  const label =
    badge ||
    (showNewBadge || product.is_new ? 'جديد' : null) ||
    (hasDiscount ? 'عرض' : null);

  return (
    <article className={`group ${className}`}>
      <div className="relative overflow-hidden rounded-xl bg-tertiary-100">
        <Link to={href} className="block aspect-[4/5] overflow-hidden">
          {image ? (
            <OptimizedImage
              src={image}
              alt={product.name_ar}
              className="h-full w-full"
              imgClassName="transition-transform duration-500 group-hover:scale-[1.03]"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px"
              widths={[400, 800]}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-ink-300 text-sm">
              لا توجد صورة
            </div>
          )}
        </Link>

        {/* Favorite — top-left (design) */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggle(product.id);
          }}
          aria-label={saved ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
          aria-pressed={saved}
          className="absolute top-2.5 left-2.5 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-ink-700 shadow-sm ring-1 ring-black/5 transition hover:scale-105 hover:text-primary-600"
        >
          <Heart
            size={18}
            strokeWidth={2}
            className={saved ? 'fill-primary-600 text-primary-600' : ''}
          />
        </button>

        {/* Status badge — bottom-right */}
        {label && !outOfStock && (
          <span className="absolute bottom-2.5 right-2.5 z-10 rounded-md bg-white/95 px-2 py-0.5 text-[11px] font-semibold text-ink-800 shadow-sm ring-1 ring-black/5">
            {label}
          </span>
        )}
        {outOfStock && (
          <span className="absolute bottom-2.5 right-2.5 z-10 rounded-md bg-ink-800/90 px-2 py-0.5 text-[11px] font-semibold text-white">
            غير متوفر
          </span>
        )}
      </div>

      <Link to={href} className="mt-3 block px-0.5 text-start">
        <h3 className="font-display text-[15px] sm:text-base font-bold text-ink-800 leading-snug line-clamp-2 group-hover:text-primary-600 transition-colors">
          {product.name_ar}
        </h3>
        <div className="mt-1.5 flex flex-wrap items-baseline gap-2">
          <p className="text-sm sm:text-[15px] font-medium text-ink-500">
            {formatPrice(product.price)}
          </p>
          {hasDiscount && (
            <p className="text-xs text-ink-300 line-through">
              {formatPrice(product.compare_price)}
            </p>
          )}
        </div>
      </Link>
    </article>
  );
}

/**
 * Shared section shell: title + «عرض الكل» + product grid.
 * Same pattern for: عروض مميزة · وصل حديثاً · الأكثر مبيعاً
 */
export function StoreProductSection({
  title,
  to,
  linkLabel = 'عرض الكل',
  products = [],
  badge,
  showNewBadge = false,
  className = '',
  limit,
}) {
  const list = limit ? products.slice(0, limit) : products;
  if (!list.length) return null;

  return (
    <section className={`container mx-auto px-4 py-10 sm:py-12 ${className}`}>
      <div className="mb-5 sm:mb-6 flex items-center justify-between gap-3">
        <h2 className="font-display text-xl sm:text-2xl md:text-[1.65rem] font-bold text-ink-800 tracking-tight">
          {title}
        </h2>
        {to ? (
          <Link
            to={to}
            className="shrink-0 text-sm sm:text-base font-medium text-primary-600 underline underline-offset-4 decoration-primary-600/40 hover:decoration-primary-600 transition"
          >
            {linkLabel}
          </Link>
        ) : null}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-6 sm:gap-x-4 sm:gap-y-8">
        {list.map((p) => (
          <StoreProductCard
            key={p.id}
            product={p}
            badge={badge}
            showNewBadge={showNewBadge}
          />
        ))}
      </div>
    </section>
  );
}
