import { useCallback, useEffect, useMemo, useState } from 'react';
import { Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatPrice } from '@core/constants';
import { OptimizedImage, OptimizedThumb } from '@shared/components/OptimizedImage';
import { productPath } from '@modules/store/utils/productPaths';

const WISHLIST_KEY = 'karam-wishlist-ids';
/** Max thumbnail chips — rest still available on product page */
const MAX_VISIBLE_THUMBS = 5;

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

/**
 * Primary + unique variant images for card preview.
 * Prefers API `variant_images` (lean home payload); falls back to `variants`.
 */
export function buildCardImageGallery(product) {
  const items = [];
  const seen = new Set();

  const push = (item) => {
    const img = item?.image;
    if (!img || seen.has(img)) return;
    seen.add(img);
    items.push(item);
  };

  if (product?.primary_image) {
    push({
      key: 'primary',
      image: product.primary_image,
      color_name: null,
      hex_code: null,
    });
  }

  const list = product?.variant_images?.length
    ? product.variant_images
    : product?.variants || [];

  for (const v of list) {
    push({
      key: `v-${v.id ?? items.length}`,
      image: v.image,
      color_name: v.color_name || null,
      hex_code: v.hex_code || null,
    });
  }

  return items;
}

/**
 * Unified storefront product card:
 * main photo · variant thumbs · badge · price
 * Images are lazy-loaded thumbs (400w) to keep homepage fast.
 */
export function StoreProductCard({
  product,
  badge,
  showNewBadge = false,
  showVariantImages = true,
  priority = false,
  className = '',
}) {
  const { isSaved, toggle } = useWishlist();
  const gallery = useMemo(() => buildCardImageGallery(product), [product]);
  const [activeKey, setActiveKey] = useState(gallery[0]?.key || null);

  useEffect(() => {
    setActiveKey(gallery[0]?.key || null);
  }, [product?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const active = gallery.find((g) => g.key === activeKey) || gallery[0] || null;
  const image = active?.image || null;
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

  const thumbs = showVariantImages ? gallery.slice(0, MAX_VISIBLE_THUMBS) : [];
  const showThumbs = thumbs.length > 1;

  return (
    <article className={`group flex flex-col ${className}`}>
      <div className="relative overflow-hidden rounded-xl bg-tertiary-100 ring-1 ring-black/[0.04]">
        <Link
          to={href}
          className="block aspect-[4/5] overflow-hidden bg-tertiary-200"
        >
          {image ? (
            <OptimizedImage
              key={active?.key || image}
              src={image}
              alt={
                active?.color_name
                  ? `${product.name_ar} — ${active.color_name}`
                  : product.name_ar
              }
              className="h-full w-full"
              imgClassName="transition-transform duration-500 ease-out group-hover:scale-[1.04]"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px"
              widths={[400, 800]}
              preferSrcWidth={400}
              priority={priority}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-ink-300 text-sm">
              لا توجد صورة
            </div>
          )}
        </Link>

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

        <div className="absolute bottom-2.5 right-2.5 z-10 flex flex-col items-end gap-1">
          {outOfStock ? (
            <span className="rounded-md bg-ink-800/90 px-2 py-0.5 text-[11px] font-semibold text-white">
              غير متوفر
            </span>
          ) : label ? (
            <span className="rounded-md bg-white/95 px-2 py-0.5 text-[11px] font-semibold text-ink-800 shadow-sm ring-1 ring-black/5">
              {label}
            </span>
          ) : null}
        </div>
      </div>

      {showThumbs && (
        <div
          className="mt-2 flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none"
          role="listbox"
          aria-label="صور المتغيرات"
        >
          {thumbs.map((item) => {
            const selected = item.key === (active?.key || gallery[0]?.key);
            return (
              <button
                key={item.key}
                type="button"
                role="option"
                aria-selected={selected}
                title={item.color_name || 'صورة المنتج'}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setActiveKey(item.key);
                }}
                onMouseEnter={() => {
                  // Desktop: preview without blocking scroll jank
                  if (window.matchMedia('(hover: hover)').matches) {
                    setActiveKey(item.key);
                  }
                }}
                className={`relative h-9 w-9 sm:h-10 sm:w-10 shrink-0 overflow-hidden rounded-md transition ${
                  selected
                    ? 'ring-2 ring-primary-600 ring-offset-1'
                    : 'ring-1 ring-ink-100 opacity-85 hover:opacity-100'
                }`}
              >
                <OptimizedThumb
                  src={item.image}
                  alt={item.color_name || ''}
                  className="h-full w-full"
                  imgClassName="object-cover"
                />
                {item.hex_code && (
                  <span
                    className="absolute bottom-0.5 right-0.5 h-2 w-2 rounded-full border border-white shadow-sm"
                    style={{ backgroundColor: item.hex_code }}
                    aria-hidden
                  />
                )}
              </button>
            );
          })}
        </div>
      )}

      <Link to={href} className="mt-2.5 block px-0.5 text-start flex-1">
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
 */
export function StoreProductSection({
  title,
  to,
  linkLabel = 'عرض الكل',
  products = [],
  badge,
  showNewBadge = false,
  showVariantImages = true,
  priorityFirst = false,
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
        {list.map((p, i) => (
          <StoreProductCard
            key={p.id}
            product={p}
            badge={badge}
            showNewBadge={showNewBadge}
            showVariantImages={showVariantImages}
            priority={priorityFirst && i === 0}
          />
        ))}
      </div>
    </section>
  );
}
