import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Eye, Heart, Loader2, ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { formatPrice } from '@core/constants';
import { OptimizedImage } from '@shared/components/OptimizedImage';
import { notifyError, notifySuccess } from '@shared/services/toast.service';
import { storeApi } from '@modules/store/api/store.api';
import { useCart } from '@modules/store/context/CartContext';
import { productPath } from '@modules/store/utils/productPaths';
import { QuickBuyModal } from '@modules/store/components/QuickBuyModal';

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

  // in_stock is absent on older payloads — treat unknown as available.
  const availableByImage = new Map();
  for (const v of list) {
    if (!v?.image || v.in_stock === undefined) continue;
    availableByImage.set(v.image, availableByImage.get(v.image) || Boolean(v.in_stock));
  }

  for (const v of list) {
    push({
      key: `v-${v.id ?? items.length}`,
      image: v.image,
      color_name: v.color_name || null,
      hex_code: v.hex_code || null,
    });
  }

  return items.map((item) => ({
    ...item,
    unavailable: availableByImage.get(item.image) === false,
  }));
}

const SWIPE_THRESHOLD = 40;

function CardIconButton({ label, onClick, pressed, disabled, busy, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      aria-busy={busy || undefined}
      className={`flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border transition active:scale-95 ${
        pressed
          ? 'border-primary-600 bg-primary-50 text-primary-600 dark:bg-primary-900/30'
          : 'border-ink-100 bg-white text-ink-600 hover:border-primary-600 hover:bg-primary-600 hover:text-white dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200'
      } disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-ink-100 disabled:hover:bg-white disabled:hover:text-ink-600`}
    >
      {busy ? <Loader2 size={17} className="animate-spin" /> : children}
    </button>
  );
}

/**
 * Unified storefront product card:
 * swipeable photos · quick actions (view / wishlist / cart) · name · price · «عرض الصنف».
 * The lean list payload has no variants, so quick actions load the full product on demand.
 */
export function StoreProductCard({
  product,
  badge,
  showNewBadge = false,
  showVariantImages = true,
  priority = false,
  className = '',
}) {
  const queryClient = useQueryClient();
  const { addItem } = useCart();
  const { isSaved, toggle } = useWishlist();
  const gallery = useMemo(() => {
    const all = buildCardImageGallery(product);
    return showVariantImages ? all : all.slice(0, 1);
  }, [product, showVariantImages]);
  const outOfStock = product.total_stock != null && Number(product.total_stock) <= 0;
  const defaultIndex = Math.max(0, outOfStock ? 0 : gallery.findIndex((g) => !g.unavailable));
  const [index, setIndex] = useState(defaultIndex);
  const [busyAction, setBusyAction] = useState(null);
  const [modalProduct, setModalProduct] = useState(null);
  const touchRef = useRef(null);
  const swipedRef = useRef(false);

  useEffect(() => {
    setIndex(defaultIndex);
  }, [product?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const count = gallery.length;
  const active = gallery[index] || gallery[0] || null;
  const image = active?.image || null;
  const activeUnavailable = !outOfStock && Boolean(active?.unavailable);
  const href = productPath(product);
  const saved = isSaved(product.id);
  const hasDiscount =
    product.compare_price &&
    parseFloat(product.compare_price) > parseFloat(product.price);

  const label =
    badge ||
    (showNewBadge || product.is_new ? 'جديد' : null) ||
    (hasDiscount ? 'عرض' : null);

  const go = (step) => setIndex((i) => (i + step + count) % count);

  const onTouchStart = (e) => {
    const t = e.touches[0];
    touchRef.current = { x: t.clientX, y: t.clientY };
    swipedRef.current = false;
  };
  const onTouchEnd = (e) => {
    const start = touchRef.current;
    touchRef.current = null;
    if (!start || count < 2) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(t.clientY - start.y)) return;
    swipedRef.current = true;
    // RTL: dragging toward the right reveals the next photo.
    go(dx > 0 ? 1 : -1);
  };

  const loadFullProduct = () =>
    queryClient
      .fetchQuery({
        queryKey: ['product', product.slug],
        queryFn: () => storeApi.productBySlug(product.slug),
        staleTime: 60_000,
      })
      .then((res) => res?.data);

  const runQuickAction = async (action) => {
    if (busyAction) return;
    setBusyAction(action);
    try {
      const full = await loadFullProduct();
      if (!full) throw new Error('missing');
      const variants = full.variants || [];
      if (action === 'cart' && variants.length === 0) {
        const result = addItem(full, null, 1);
        if (result?.ok) notifySuccess({ message: `تمت إضافة «${full.name_ar}» إلى السلة` });
        else notifyError({ message: result?.message });
        return;
      }
      setModalProduct(full);
    } catch {
      notifyError({ message: 'تعذر تحميل المنتج، حاول مرة أخرى' });
    } finally {
      setBusyAction(null);
    }
  };

  const closeModal = useCallback(() => setModalProduct(null), []);

  return (
    <article
      className={`group flex flex-col rounded-2xl border border-ink-100/80 bg-white p-2 shadow-sm transition hover:border-primary-600/25 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 ${className}`}
    >
      <div
        className="relative overflow-hidden rounded-xl bg-tertiary-100 ring-1 ring-black/[0.04]"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <Link
          to={href}
          onClick={(e) => {
            if (swipedRef.current) {
              e.preventDefault();
              swipedRef.current = false;
            }
          }}
          className="block aspect-[4/5] overflow-hidden bg-tertiary-200"
          draggable={false}
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
              className={`h-full w-full ${activeUnavailable ? 'opacity-60 grayscale-[60%]' : ''}`}
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

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="الصورة السابقة"
              className="absolute right-1.5 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink-700 shadow-sm ring-1 ring-black/5 transition hover:bg-white hover:text-primary-600 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 focus-visible:opacity-100"
            >
              <ChevronRight size={18} />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="الصورة التالية"
              className="absolute left-1.5 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink-700 shadow-sm ring-1 ring-black/5 transition hover:bg-white hover:text-primary-600 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 focus-visible:opacity-100"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="pointer-events-none absolute inset-x-0 bottom-2 z-10 flex justify-center gap-1" aria-hidden>
              {gallery.slice(0, 6).map((g, i) => (
                <span
                  key={g.key}
                  className={`h-1.5 rounded-full transition-all ${
                    i === index ? 'w-4 bg-primary-600' : 'w-1.5 bg-white/90 ring-1 ring-black/10'
                  }`}
                />
              ))}
            </div>
          </>
        )}

        <div className="absolute top-2 right-2 z-10 flex flex-col items-end gap-1">
          {outOfStock || activeUnavailable ? (
            <span className="rounded-md bg-ink-800/90 px-2 py-0.5 text-[11px] font-semibold text-white">
              {activeUnavailable && active?.color_name ? `${active.color_name} غير متوفر` : 'غير متوفر'}
            </span>
          ) : label ? (
            <span className="rounded-md bg-secondary-400 px-2 py-0.5 text-[11px] font-bold text-primary-900 shadow-sm">
              {label}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-center gap-2.5" role="group" aria-label="إجراءات سريعة">
        <CardIconButton label="عرض سريع" onClick={() => runQuickAction('view')} busy={busyAction === 'view'}>
          <Eye size={17} />
        </CardIconButton>
        <CardIconButton
          label={saved ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
          onClick={() => toggle(product.id)}
          pressed={saved}
        >
          <Heart size={17} className={saved ? 'fill-primary-600' : ''} />
        </CardIconButton>
        <CardIconButton
          label={outOfStock ? 'غير متوفر' : 'أضف إلى السلة'}
          onClick={() => runQuickAction('cart')}
          disabled={outOfStock}
          busy={busyAction === 'cart'}
        >
          <ShoppingCart size={17} />
        </CardIconButton>
      </div>

      <Link to={href} className="mt-2 block flex-1 px-1 text-start">
        <h3 className="font-display text-sm sm:text-[15px] font-bold text-ink-800 leading-snug line-clamp-2 group-hover:text-primary-600 transition-colors dark:text-gray-100">
          {product.name_ar}
        </h3>
        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <p className="text-base sm:text-lg font-extrabold tabular-nums text-primary-600 dark:text-primary-300">
            {formatPrice(product.price)}
          </p>
          {hasDiscount && (
            <p className="text-xs text-ink-300 line-through tabular-nums">
              {formatPrice(product.compare_price)}
            </p>
          )}
        </div>
      </Link>

      <Link
        to={href}
        className="mt-2.5 flex h-10 w-full items-center justify-center rounded-xl border border-primary-600 text-sm font-bold text-primary-600 transition hover:bg-primary-600 hover:text-white active:scale-[0.99] dark:border-primary-400 dark:text-primary-300"
      >
        عرض الصنف
      </Link>

      <QuickBuyModal
        product={modalProduct}
        open={Boolean(modalProduct)}
        onClose={closeModal}
        isSaved={isSaved}
        onToggleWishlist={toggle}
      />
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
