import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Heart, Minus, Plus, ShoppingCart, X } from 'lucide-react';
import { OptimizedImage } from '@shared/components/OptimizedImage';
import { notifyError, notifySuccess } from '@shared/services/toast.service';
import { useCart } from '@modules/store/context/CartContext';
import { productPath } from '@modules/store/utils/productPaths';
import { flyToCart } from '@modules/store/utils/flyToCart';

const inStock = (v) => Number(v?.stock) > 0;
const amount = (value) => {
  const n = parseFloat(value || 0);
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
};

function uniqueBy(variants, idKey, build) {
  const map = new Map();
  for (const v of variants) {
    const id = v[idKey];
    if (id == null || map.has(id)) continue;
    map.set(id, build(v));
  }
  return [...map.values()];
}

function Chip({ selected, disabled, onClick, children, swatch }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      title={disabled ? 'غير متوفر' : undefined}
      className={`relative inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl border px-3.5 text-sm font-semibold transition ${
        disabled
          ? 'cursor-not-allowed border-dashed border-ink-200 bg-tertiary-100 text-ink-300 line-through decoration-ink-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-500'
          : selected
            ? 'border-primary-600 bg-primary-600 text-white shadow-sm'
            : 'border-ink-200 bg-white text-ink-700 hover:border-primary-600/50 active:scale-[0.97] dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100'
      }`}
    >
      {swatch && (
        <span
          className={`h-4 w-4 shrink-0 rounded-full border ${selected && !disabled ? 'border-white/70' : 'border-black/10'}`}
          style={{ backgroundColor: swatch }}
          aria-hidden
        />
      )}
      {children}
    </button>
  );
}

/**
 * Quick buy / quick view sheet. Expects the full product payload (with `variants`).
 * Picks the first in-stock variant by default; sold-out options are disabled.
 */
export function QuickBuyModal({ product, open, onClose, isSaved, onToggleWishlist }) {
  const { addItem } = useCart();
  const closeRef = useRef(null);
  const thumbRef = useRef(null);
  const variants = useMemo(() => product?.variants || [], [product]);

  const colors = useMemo(
    () => uniqueBy(variants, 'color_id', (v) => ({ id: v.color_id, name: v.color_name, hex: v.hex_code })),
    [variants]
  );
  const sizes = useMemo(
    () => uniqueBy(variants, 'size_id', (v) => ({ id: v.size_id, name: v.size_name })),
    [variants]
  );
  const simple = variants.length === 0;
  const untyped = !simple && colors.length === 0 && sizes.length === 0;

  const firstAvailable = variants.find(inStock) || null;
  const [colorId, setColorId] = useState(null);
  const [sizeId, setSizeId] = useState(null);
  const [variantId, setVariantId] = useState(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (!open) return;
    setColorId(firstAvailable?.color_id ?? null);
    setSizeId(firstAvailable?.size_id ?? null);
    setVariantId(firstAvailable?.id ?? null);
    setQuantity(1);
  }, [open, product?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  const selected = useMemo(() => {
    if (untyped) return variants.find((v) => v.id === variantId) || null;
    return (
      variants.find(
        (v) =>
          (colors.length === 0 || v.color_id === colorId) &&
          (sizes.length === 0 || v.size_id === sizeId)
      ) || null
    );
  }, [variants, untyped, variantId, colors.length, sizes.length, colorId, sizeId]);

  if (!open || !product) return null;

  const colorAvailable = (id) => variants.some((v) => v.color_id === id && inStock(v));
  // Sizes are judged against the chosen color, so the shopper never lands on a dead combination.
  const sizeAvailable = (id) =>
    variants.some((v) => v.size_id === id && inStock(v) && (colors.length === 0 || v.color_id === colorId));

  const pickColor = (id) => {
    setColorId(id);
    const keepsSize = variants.some((v) => v.color_id === id && v.size_id === sizeId && inStock(v));
    if (!keepsSize) {
      setSizeId(variants.find((v) => v.color_id === id && inStock(v))?.size_id ?? null);
    }
    setQuantity(1);
  };

  const stock = Number(simple ? product.total_stock : selected?.stock) || 0;
  const available = (simple || Boolean(selected)) && stock > 0;
  const price = selected?.price != null ? selected.price : product.price;
  const comparePrice = selected?.compare_price || product.compare_price;
  const hasDiscount = comparePrice && parseFloat(comparePrice) > parseFloat(price);
  const image = selected?.image || product.primary_image || product.images?.[0]?.url;

  const selectionText = [
    colors.length > 0 && selected?.color_name && `اللون: ${selected.color_name}`,
    sizes.length > 0 && selected?.size_name && `المقاس: ${selected.size_name}`,
  ]
    .filter(Boolean)
    .join(' · ');

  const handleAdd = () => {
    if (!simple && !selected) {
      notifyError({ message: `يرجى اختيار ${[colors.length && 'اللون', sizes.length && 'المقاس'].filter(Boolean).join(' و') || 'الخيار'}` });
      return;
    }
    if (!available) {
      notifyError({ message: 'هذا الخيار غير متوفر — اختر خيارًا آخر' });
      return;
    }
    const result = addItem(product, simple ? null : selected, quantity);
    if (!result?.ok) {
      notifyError({ message: result?.message });
      return;
    }
    // Measure the thumbnail before the sheet unmounts; the flying copy lives on <body>.
    flyToCart(thumbRef.current);
    onClose();
    notifySuccess({ message: `تمت إضافة «${product.name_ar}» إلى السلة` });
  };

  const saved = isSaved?.(product.id);

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4" role="presentation">
      <div className="absolute inset-0 bg-ink-900/50 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-buy-title"
        className="relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-md sm:rounded-3xl dark:bg-gray-800"
      >
        <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-ink-100 sm:hidden" aria-hidden />
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="إغلاق"
          className="absolute end-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-tertiary-100 text-ink-600 transition hover:bg-tertiary-200 hover:text-ink-800 dark:bg-gray-700 dark:text-gray-200"
        >
          <X size={18} />
        </button>

        <div className="overflow-y-auto overscroll-contain px-5 pb-4 pt-4 sm:pt-5">
          <div className="flex items-start gap-3.5 pe-10">
            <Link
              ref={thumbRef}
              to={productPath(product)}
              onClick={onClose}
              className="h-24 w-20 shrink-0 overflow-hidden rounded-2xl bg-tertiary-100 ring-1 ring-black/5"
            >
              {image ? (
                <OptimizedImage src={image} alt={product.name_ar} className="h-full w-full" sizes="80px" widths={[400]} preferSrcWidth={400} />
              ) : null}
            </Link>
            <div className="min-w-0 pt-0.5">
              <h2 id="quick-buy-title" className="font-display text-base font-bold leading-snug text-ink-800 line-clamp-2 dark:text-gray-100">
                {product.name_ar}
              </h2>
              <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
                <span className="text-2xl font-extrabold tabular-nums text-primary-600 dark:text-primary-300">
                  {amount(price)} <span className="text-base font-bold">د.ل</span>
                </span>
                {hasDiscount && (
                  <span className="text-sm text-ink-300 line-through tabular-nums">{amount(comparePrice)} د.ل</span>
                )}
              </div>
              <p className="mt-1 text-xs font-semibold tracking-wide text-ink-500 dark:text-gray-300" aria-live="polite">
                {simple
                  ? available
                    ? 'متوفر'
                    : 'غير متوفر حاليًا'
                  : selectionText || (untyped && selected ? selected.sku || 'الخيار المحدد' : 'اختر الخيار المناسب')}
              </p>
            </div>
          </div>

          {colors.length > 0 && (
            <fieldset className="mt-5">
              <legend className="mb-2 text-sm font-bold text-ink-700 dark:text-gray-200">
                اللون{selected?.color_name ? <span className="font-medium text-ink-400">: {selected.color_name}</span> : null}
              </legend>
              <div className="flex flex-wrap gap-2">
                {colors.map((c) => (
                  <Chip key={c.id} selected={colorId === c.id} disabled={!colorAvailable(c.id)} onClick={() => pickColor(c.id)} swatch={c.hex}>
                    {c.name}
                  </Chip>
                ))}
              </div>
            </fieldset>
          )}

          {sizes.length > 0 && (
            <fieldset className="mt-5">
              <legend className="mb-2 text-sm font-bold text-ink-700 dark:text-gray-200">
                المقاس{selected?.size_name ? <span className="font-medium text-ink-400">: {selected.size_name}</span> : null}
              </legend>
              <div className="flex flex-wrap gap-2">
                {sizes.map((s) => (
                  <Chip
                    key={s.id}
                    selected={sizeId === s.id}
                    disabled={!sizeAvailable(s.id)}
                    onClick={() => {
                      setSizeId(s.id);
                      setQuantity(1);
                    }}
                  >
                    {s.name}
                  </Chip>
                ))}
              </div>
            </fieldset>
          )}

          {untyped && (
            <fieldset className="mt-5">
              <legend className="mb-2 text-sm font-bold text-ink-700 dark:text-gray-200">الخيار</legend>
              <div className="flex flex-wrap gap-2">
                {variants.map((v, i) => (
                  <Chip key={v.id} selected={variantId === v.id} disabled={!inStock(v)} onClick={() => setVariantId(v.id)}>
                    {v.sku || `خيار ${i + 1}`}
                  </Chip>
                ))}
              </div>
            </fieldset>
          )}

          {selected && !available && (
            <p className="mt-3 rounded-xl bg-tertiary-100 px-3 py-2 text-sm text-ink-600 dark:bg-gray-900 dark:text-gray-300">
              هذا الخيار غير متوفر حاليًا — اختر خيارًا آخر
            </p>
          )}

          <div className="mt-5 flex items-center gap-3">
            <div className="flex h-12 items-center rounded-xl border border-ink-200 bg-white dark:border-gray-600 dark:bg-gray-800">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(stock || 1, q + 1))}
                disabled={!available || quantity >= stock}
                aria-label="زيادة الكمية"
                className="flex h-full w-11 items-center justify-center text-primary-600 transition hover:bg-primary-50 disabled:text-ink-200 disabled:hover:bg-transparent rounded-s-xl dark:hover:bg-primary-900/30"
              >
                <Plus size={18} />
              </button>
              <span className="w-10 text-center text-base font-bold tabular-nums text-ink-800 dark:text-gray-100" aria-live="polite">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                aria-label="تقليل الكمية"
                className="flex h-full w-11 items-center justify-center text-primary-600 transition hover:bg-primary-50 disabled:text-ink-200 disabled:hover:bg-transparent rounded-e-xl dark:hover:bg-primary-900/30"
              >
                <Minus size={18} />
              </button>
            </div>
            <button
              type="button"
              onClick={() => onToggleWishlist?.(product.id)}
              aria-pressed={saved}
              aria-label={saved ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
              className={`flex h-12 w-12 items-center justify-center rounded-xl border transition ${
                saved
                  ? 'border-primary-600 bg-primary-50 text-primary-600 dark:bg-primary-900/30'
                  : 'border-ink-200 bg-white text-ink-500 hover:border-primary-600/50 hover:text-primary-600 dark:border-gray-600 dark:bg-gray-800'
              }`}
            >
              <Heart size={20} className={saved ? 'fill-primary-600' : ''} />
            </button>
            {available && stock <= 5 && (
              <span className="text-xs font-medium text-secondary-700 dark:text-secondary-300">متبقي {stock} فقط</span>
            )}
          </div>
        </div>

        <div className="border-t border-ink-100 bg-white px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 dark:border-gray-700 dark:bg-gray-800">
          <button
            type="button"
            onClick={handleAdd}
            disabled={!available}
            className="btn-primary flex h-13 min-h-[3.25rem] w-full items-center justify-center gap-2 rounded-2xl text-base font-bold disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ShoppingCart size={20} />
            {available ? 'أضف إلى السلة' : 'غير متوفر'}
          </button>
          <Link
            to={productPath(product)}
            onClick={onClose}
            className="mt-2 block text-center text-sm font-medium text-primary-600 underline-offset-4 hover:underline"
          >
            عرض كل تفاصيل المنتج
          </Link>
        </div>
      </div>
    </div>,
    document.body
  );
}
