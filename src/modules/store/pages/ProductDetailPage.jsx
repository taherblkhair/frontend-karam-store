import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ShoppingCart, Minus, Plus, Link2, Check, Zap } from 'lucide-react';
import { notifySuccess, notifyError } from '@shared/services/toast.service';
import { storeApi } from '@modules/store/api/store.api';
import StoreLayout from '@shared/layouts/StoreLayout';
import { LoadingSpinner } from '@shared/ui';
import { ProductImageGallery } from '@modules/store/components/ProductImageGallery';
import { ProductDetailAccordions } from '@modules/store/components/ProductDetailAccordions';
import { StoreProductSection } from '@modules/store/components/StoreProductCard';
import { useCart } from '@modules/store/context/CartContext';
import { startBuyNow } from '@modules/store/utils/buyNow';
import {
  decodeProductSlug,
  productAbsoluteUrl,
  productPath,
} from '@modules/store/utils/productPaths';

const PICKS_LIMIT = 8;

/**
 * Featured picks first; if few results, fill with same-category products.
 * Always excludes the current product.
 */
async function fetchPicksForYou(product) {
  const excludeId = String(product.id);
  const seen = new Set([excludeId]);
  const picks = [];

  const pushAll = (list = []) => {
    for (const p of list) {
      if (!p?.id) continue;
      const id = String(p.id);
      if (seen.has(id)) continue;
      seen.add(id);
      picks.push(p);
      if (picks.length >= PICKS_LIMIT) break;
    }
  };

  const featuredRes = await storeApi.products({
    featured: 'true',
    limit: PICKS_LIMIT + 4,
    page: 1,
  });
  pushAll(featuredRes?.data || []);

  if (picks.length < PICKS_LIMIT && product.category_id) {
    const catRes = await storeApi.products({
      category: product.category_id,
      limit: PICKS_LIMIT + 4,
      page: 1,
    });
    pushAll(catRes?.data || []);
  }

  if (picks.length < PICKS_LIMIT) {
    const latestRes = await storeApi.products({
      limit: PICKS_LIMIT + 4,
      page: 1,
      sortBy: 'created_at',
      sortOrder: 'DESC',
    });
    pushAll(latestRes?.data || []);
  }

  return picks.slice(0, PICKS_LIMIT);
}

const isInStock = (variant) => Number(variant?.stock) > 0;

/** "290" instead of "290.00" — keeps the headline price short and scannable. */
const formatAmount = (value) => {
  const n = parseFloat(value || 0);
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
};

function OptionChip({
  active,
  disabled = false,
  soldOutLabel = true,
  onClick,
  children,
  className = '',
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={disabled ? 'نفد' : undefined}
      className={`min-h-11 px-3.5 sm:px-4 py-2.5 rounded-xl border text-sm font-medium transition inline-flex items-center gap-2 ${
        disabled
          ? `border-dashed bg-tertiary-100 text-ink-300 cursor-not-allowed dark:border-gray-700 dark:bg-ink-900 dark:text-gray-500 ${
              active ? 'border-ink-400 ring-2 ring-ink-300/40' : 'border-ink-200'
            }`
          : active
            ? 'active:scale-[0.98] border-primary-600 bg-primary-50 text-primary-800 ring-2 ring-primary-600/20 dark:bg-primary-900/30 dark:text-primary-100'
            : 'active:scale-[0.98] border-ink-200 bg-white text-ink-700 hover:border-primary-600/40 dark:border-gray-600 dark:bg-ink-800 dark:text-gray-100'
      } ${className}`}
    >
      {children}
      {disabled && soldOutLabel && <span className="text-[11px] font-bold text-ink-400">نفد</span>}
    </button>
  );
}

export default function ProductDetailPage() {
  const { slug: slugParam } = useParams();
  const slug = decodeProductSlug(slugParam);
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [linkCopied, setLinkCopied] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => storeApi.productBySlug(slug),
    enabled: Boolean(slug),
  });

  const product = data?.data;

  const { data: picks = [] } = useQuery({
    queryKey: ['picks-for-you', product?.id, product?.category_id],
    queryFn: () => fetchPicksForYou(product),
    enabled: Boolean(product?.id),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!product?.slug) return;
    if (product.slug !== slug) {
      navigate(productPath(product), { replace: true });
    }
  }, [product, slug, navigate]);

  useEffect(() => {
    setSelectedVariant(null);
    setQuantity(1);
    setLinkCopied(false);
  }, [slug]);

  const handleVariantImageSelect = useCallback(
    (slide) => {
      if (!product || !slide?.variant_id) return;
      // Viewing a sold-out photo selects its variant so the buy buttons lock instead of
      // silently keeping a different (in-stock) selection behind the image.
      const variant =
        product.variants?.find(
          (v) => v.id === slide.variant_id && (slide.unavailable || isInStock(v))
        ) ||
        product.variants?.find(
          (v) => v.color_id && v.color_id === slide.color_id && isInStock(v)
        );
      if (variant) setSelectedVariant(variant);
    },
    [product]
  );

  const handleCopyLink = async () => {
    const url = productAbsoluteUrl(product || slug);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const input = document.createElement('input');
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setLinkCopied(true);
      notifySuccess({ message: 'تم نسخ رابط المنتج' });
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      notifyError({ message: 'تعذر نسخ الرابط' });
    }
  };

  if (isLoading) {
    return (
      <StoreLayout>
        <LoadingSpinner />
      </StoreLayout>
    );
  }
  if (!product) {
    return (
      <StoreLayout>
        <div className="text-center py-16 sm:py-20 px-4">المنتج غير موجود</div>
      </StoreLayout>
    );
  }

  const variants = product.variants || [];
  const hasVariants = variants.length > 0;
  const productSoldOut = hasVariants
    ? !variants.some(isInStock)
    : Number(product.total_stock) <= 0;
  const currentStock = selectedVariant?.stock ?? product.total_stock;
  const maxQty = Math.max(1, Number(currentStock) || 1);
  const outOfStock = selectedVariant ? !isInStock(selectedVariant) : productSoldOut;
  const variantSoldOut = outOfStock && !productSoldOut;
  const variantSoldOutText = selectedVariant?.color_id
    ? 'هذا اللون غير متوفر — اختر لونًا متوفرًا'
    : 'هذا الخيار غير متوفر — اختر خيارًا متوفرًا';

  const effectivePrice = (v) => parseFloat(v.price || product.price) || 0;
  const pricedVariants = variants.some(isInStock) ? variants.filter(isInStock) : variants;
  const variantPrices = pricedVariants.map(effectivePrice);
  const minVariantPrice = variantPrices.length ? Math.min(...variantPrices) : null;
  const priceFrom =
    !selectedVariant &&
    variantPrices.length > 0 &&
    Math.max(...variantPrices) !== minVariantPrice;
  const currentPrice = selectedVariant
    ? effectivePrice(selectedVariant)
    : (minVariantPrice ?? product.price);
  const comparePrice = selectedVariant?.compare_price || product.compare_price;
  const saving =
    !priceFrom && comparePrice ? parseFloat(comparePrice) - parseFloat(currentPrice) : 0;
  const hasDiscount = saving > 0;

  const ensureVariant = () => {
    if (hasVariants && !selectedVariant) {
      const parts = [uniqueColors.length && 'اللون', uniqueSizes.length && 'المقاس'].filter(Boolean);
      notifyError({ message: `يرجى اختيار ${parts.join(' و') || 'الخيار'}` });
      return false;
    }
    if (outOfStock) {
      notifyError({ message: variantSoldOut ? variantSoldOutText : 'المنتج غير متوفر' });
      return false;
    }
    return true;
  };

  const handleAddToCart = () => {
    if (!ensureVariant()) return;
    const result = addItem(product, selectedVariant, quantity);
    if (!result?.ok) {
      notifyError({ message: result?.message });
      return;
    }
    notifySuccess({ message: result?.message || 'تمت الإضافة للسلة' });
  };

  const handleOrderNow = () => {
    if (!ensureVariant()) return;
    const result = startBuyNow(product, selectedVariant, quantity);
    if (!result?.ok) {
      notifyError({ message: result?.message });
      return;
    }
    navigate('/checkout?mode=buy-now');
  };

  // Keep the other dimension when that combination is in stock; otherwise
  // fall back to any in-stock variant so the selection never lands on a sold-out one.
  const selectColor = (colorId) => {
    const variant =
      variants.find(
        (v) =>
          v.color_id === colorId &&
          isInStock(v) &&
          (!selectedVariant?.size_id || v.size_id === selectedVariant.size_id)
      ) || variants.find((v) => v.color_id === colorId && isInStock(v));
    if (variant) setSelectedVariant(variant);
  };

  const selectSize = (sizeId) => {
    const variant =
      variants.find(
        (v) =>
          v.size_id === sizeId &&
          isInStock(v) &&
          (!selectedVariant?.color_id || v.color_id === selectedVariant.color_id)
      ) || variants.find((v) => v.size_id === sizeId && isInStock(v));
    if (variant) setSelectedVariant(variant);
  };

  const uniqueColors = [
    ...new Map(
      variants
        .filter((v) => v.color_id)
        .map((v) => [
          v.color_id,
          { id: v.color_id, name: v.color_name, hex: v.hex_code },
        ])
    ).values(),
  ].map((c) => ({
    ...c,
    available: variants.some((v) => v.color_id === c.id && isInStock(v)),
  }));
  const uniqueSizes = [
    ...new Map(
      variants
        .filter((v) => v.size_id)
        .map((v) => [v.size_id, { id: v.size_id, name: v.size_name }])
    ).values(),
  ].map((s) => ({
    ...s,
    available: variants.some((v) => v.size_id === s.id && isInStock(v)),
  }));

  const someColorsOut = uniqueColors.some((c) => !c.available);
  const someSizesOut = uniqueSizes.some((s) => !s.available);
  let partialStockHint = null;
  if (!productSoldOut) {
    if (someColorsOut && someSizesOut) partialStockHint = 'بعض الخيارات نفدت — اختر من المتوفر';
    else if (someColorsOut) partialStockHint = 'بعض الألوان نفدت — اختر لونًا متوفرًا';
    else if (someSizesOut) partialStockHint = 'بعض المقاسات نفدت — اختر مقاسًا متوفرًا';
  }

  const soldOutBadge = productSoldOut ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-700/90 px-3.5 py-1.5 text-xs sm:text-sm font-bold text-secondary-300 shadow-sm ring-1 ring-secondary-400/40 backdrop-blur-sm">
      <span className="h-1.5 w-1.5 rounded-full bg-secondary-400" aria-hidden />
      نفدت الكمية
    </span>
  ) : null;

  const qtyControl = (
    <div className="inline-flex items-center rounded-xl border border-ink-200 dark:border-gray-600 overflow-hidden bg-white dark:bg-ink-800">
      <button
        type="button"
        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
        className="flex h-11 w-11 items-center justify-center hover:bg-tertiary-100 dark:hover:bg-ink-700 transition"
        aria-label="إنقاص الكمية"
      >
        <Minus size={18} />
      </button>
      <span className="min-w-[2.5rem] text-center font-semibold tabular-nums px-1">
        {quantity}
      </span>
      <button
        type="button"
        onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
        className="flex h-11 w-11 items-center justify-center hover:bg-tertiary-100 dark:hover:bg-ink-700 transition"
        aria-label="زيادة الكمية"
      >
        <Plus size={18} />
      </button>
    </div>
  );

  const buyButtons = (
    <>
      <button
        type="button"
        onClick={handleOrderNow}
        disabled={outOfStock}
        className="inline-flex flex-1 min-h-12 items-center justify-center gap-2 rounded-xl bg-secondary-400 hover:bg-secondary-500 text-ink-800 font-bold text-base sm:text-lg px-4 sm:px-6 py-3 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Zap size={20} strokeWidth={2.25} className="shrink-0" />
        <span className="truncate">اطلب الآن</span>
      </button>
      <button
        type="button"
        onClick={handleAddToCart}
        disabled={outOfStock}
        className="btn-primary flex-1 min-h-12 text-base sm:text-lg px-4 sm:px-6 py-3 disabled:opacity-50"
      >
        <ShoppingCart size={20} className="shrink-0" />
        <span className="truncate">أضف للسلة</span>
      </button>
    </>
  );

  return (
    <StoreLayout>
      {/* Extra bottom space on mobile: sticky CTA + bottom nav */}
      <div className="container mx-auto px-3 sm:px-4 pt-4 sm:pt-8 pb-32 md:pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-8 lg:gap-12 lg:items-start">
          {/* Gallery */}
          <div className="min-w-0 -mx-3 sm:mx-0 px-0 sm:px-0">
            <div className="sm:rounded-none px-3 sm:px-0">
              <ProductImageGallery
                product={product}
                selectedVariant={selectedVariant}
                onVariantImageSelect={handleVariantImageSelect}
                badge={soldOutBadge}
                markUnavailable={!productSoldOut}
              />
            </div>
          </div>

          {/* Buy box */}
          <div className="min-w-0 flex flex-col">
            {product.category_name && (
              <p className="text-xs sm:text-sm text-ink-500 mb-1">{product.category_name}</p>
            )}

            <div className="flex items-start gap-2 sm:gap-3 mb-2">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold flex-1 leading-snug break-words">
                {product.name_ar}
              </h1>
              <button
                type="button"
                onClick={handleCopyLink}
                className="btn-outline shrink-0 h-10 w-10 sm:h-auto sm:w-auto sm:rounded-full sm:px-3 sm:py-2 p-0 rounded-full inline-flex items-center justify-center gap-1.5 text-sm"
                title="نسخ رابط المنتج"
                aria-label={linkCopied ? 'تم النسخ' : 'نسخ الرابط'}
              >
                {linkCopied ? (
                  <Check size={18} className="text-primary-600" />
                ) : (
                  <Link2 size={18} />
                )}
                <span className="hidden sm:inline">
                  {linkCopied ? 'تم النسخ' : 'نسخ الرابط'}
                </span>
              </button>
            </div>

            <div className="mb-4 sm:mb-6 pb-4 sm:pb-5 border-b border-ink-100 dark:border-gray-700">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
                <p className="inline-flex items-baseline gap-1.5 text-primary-600 dark:text-primary-300">
                  {priceFrom && (
                    <span className="text-sm sm:text-base font-semibold text-ink-500">يبدأ من</span>
                  )}
                  <span className="text-4xl sm:text-5xl font-extrabold tabular-nums leading-none">
                    {formatAmount(currentPrice)}
                  </span>
                  <span className="text-xl sm:text-2xl font-bold">د.ل</span>
                </p>
                {hasDiscount && (
                  <>
                    <span className="text-base sm:text-lg text-ink-400 line-through tabular-nums">
                      {formatAmount(comparePrice)} د.ل
                    </span>
                    <span className="rounded-full bg-secondary-400 px-2.5 py-0.5 text-xs sm:text-sm font-bold text-ink-800 tabular-nums">
                      خصم {formatAmount(saving)} د.ل
                    </span>
                  </>
                )}
              </div>

              <p
                className={`mt-3 inline-flex items-center gap-2 text-sm font-semibold ${
                  outOfStock ? 'text-ink-500 dark:text-gray-400' : 'text-primary-600 dark:text-primary-300'
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${outOfStock ? 'bg-red-500' : 'bg-primary-500'}`}
                  aria-hidden
                />
                {variantSoldOut ? variantSoldOutText : outOfStock ? 'غير متوفر حاليًا' : 'متوفر الآن'}
              </p>
            </div>

            {uniqueColors.length > 0 && (
              <div className="mb-4">
                <h3 className="font-bold mb-2 text-sm sm:text-base">
                  اللون
                  {selectedVariant?.color_name ? (
                    <span className="font-medium text-ink-500"> · {selectedVariant.color_name}</span>
                  ) : null}
                </h3>
                <div className="flex gap-2 flex-wrap">
                  {uniqueColors.map((c) => (
                    <OptionChip
                      key={c.id}
                      active={selectedVariant?.color_id === c.id}
                      disabled={!c.available}
                      soldOutLabel={!productSoldOut}
                      onClick={() => selectColor(c.id)}
                    >
                      {c.hex && (
                        <span className="relative inline-block w-4 h-4 shrink-0">
                          <span
                            className={`block w-4 h-4 rounded-full border border-black/10 ${
                              c.available ? '' : 'opacity-40'
                            }`}
                            style={{ backgroundColor: c.hex }}
                          />
                          {!c.available && (
                            <span
                              className="absolute left-1/2 top-1/2 h-[1.5px] w-5 -translate-x-1/2 -translate-y-1/2 -rotate-45 rounded bg-ink-500"
                              aria-hidden
                            />
                          )}
                        </span>
                      )}
                      <span className={`truncate max-w-[8rem] ${c.available ? '' : 'line-through'}`}>
                        {c.name}
                      </span>
                    </OptionChip>
                  ))}
                </div>
              </div>
            )}

            {uniqueSizes.length > 0 && (
              <div className="mb-4">
                <h3 className="font-bold mb-2 text-sm sm:text-base">
                  المقاس
                  {selectedVariant?.size_name ? (
                    <span className="font-medium text-ink-500"> · {selectedVariant.size_name}</span>
                  ) : null}
                </h3>
                <div className="flex gap-2 flex-wrap">
                  {uniqueSizes.map((s) => (
                    <OptionChip
                      key={s.id}
                      active={selectedVariant?.size_id === s.id}
                      disabled={!s.available}
                      soldOutLabel={!productSoldOut}
                      onClick={() => selectSize(s.id)}
                      className="min-w-[2.75rem] justify-center"
                    >
                      <span className={s.available ? '' : 'line-through'}>{s.name}</span>
                    </OptionChip>
                  ))}
                </div>
              </div>
            )}

            {partialStockHint && !variantSoldOut && (
              <p className="mb-4 inline-flex items-center gap-2 self-start rounded-lg border border-secondary-300/70 bg-secondary-50 px-3 py-2 text-sm font-medium text-ink-700 dark:border-secondary-700/50 dark:bg-secondary-900/20 dark:text-secondary-100">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-secondary-500" aria-hidden />
                {partialStockHint}
              </p>
            )}

            {!outOfStock && (
              <div className="flex items-center gap-3 mb-4 sm:mb-6">
                <span className="text-sm text-ink-500 shrink-0">الكمية</span>
                {qtyControl}
              </div>
            )}

            {/* Desktop / tablet actions (hidden on small phones — sticky bar) */}
            <div className="hidden sm:flex flex-col sm:flex-row gap-3">
              {buyButtons}
            </div>
            <p className="hidden sm:block mt-3 text-xs text-ink-400 leading-relaxed">
              «اطلب الآن» ينقلك مباشرة لإتمام الطلب لهذا المنتج فقط دون التأثير على محتويات السلة.
            </p>

            {product.description && (
              <div className="mt-5 sm:mt-6">
                <h3 className="font-bold mb-1.5 text-sm sm:text-base">الوصف</h3>
                <p className="text-sm sm:text-base text-ink-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap break-words">
                  {product.description}
                </p>
              </div>
            )}

            {/* Shipping & inspection — under cart CTAs */}
            <ProductDetailAccordions />
          </div>
        </div>
      </div>

      {/* Sticky mobile purchase bar — above bottom tab nav */}
      <div
        className="sm:hidden fixed inset-x-0 z-40 border-t border-ink-100 bg-white/95 backdrop-blur-md dark:bg-ink-900/95 dark:border-gray-700"
        style={{
          bottom: 'calc(4rem + env(safe-area-inset-bottom, 0px))',
          paddingBottom: '0.5rem',
        }}
      >
        <div className="container mx-auto px-3 pt-2.5 flex items-center gap-2">
          <div className="shrink-0 pe-1 leading-tight">
            <p className="text-lg font-extrabold text-primary-600 dark:text-primary-300 tabular-nums whitespace-nowrap">
              {formatAmount(currentPrice)} <span className="text-sm font-bold">د.ل</span>
            </p>
            {outOfStock && (
              <p className="text-[11px] font-semibold text-ink-400">
                {variantSoldOut ? 'غير متوفر' : 'نفدت الكمية'}
              </p>
            )}
          </div>
          {buyButtons}
        </div>
      </div>

      {picks.length > 0 && (
        <div className="border-t border-ink-100 dark:border-gray-800 bg-tertiary-100/60 dark:bg-ink-900/40 pb-4 sm:pb-0">
          <StoreProductSection
            title="عروض اخترنا لك"
            to="/products?featured=true"
            linkLabel="عرض الكل"
            products={picks}
            badge="اخترنا لك"
            limit={PICKS_LIMIT}
            className="!py-8 sm:!py-12"
          />
        </div>
      )}
    </StoreLayout>
  );
}
