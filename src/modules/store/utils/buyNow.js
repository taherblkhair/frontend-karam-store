/** sessionStorage key for one-click “order now” checkout (does not touch main cart). */
export const BUY_NOW_KEY = 'karam-buy-now';

/**
 * Build a checkout line item from product + optional variant.
 */
export function buildLineItem(product, variant = null, quantity = 1) {
  const stock = variant?.stock ?? product.total_stock ?? 0;
  const qty = Math.max(1, Math.min(quantity, stock || quantity));
  const key = variant ? `${product.id}-${variant.id}` : `${product.id}`;
  const price = parseFloat(variant?.price || product.price);

  return {
    key,
    product_id: product.id,
    variant_id: variant?.id || null,
    name: product.name_ar,
    variant_info: variant
      ? [variant.color_name, variant.size_name].filter(Boolean).join(' - ')
      : null,
    price,
    compare_price: parseFloat(variant?.compare_price || product.compare_price || 0),
    image: variant?.image || product.primary_image || product.images?.[0]?.url,
    quantity: qty,
    stock,
  };
}

export function setBuyNowItems(items) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(BUY_NOW_KEY, JSON.stringify(items));
}

export function getBuyNowItems() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(BUY_NOW_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function clearBuyNowItems() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(BUY_NOW_KEY);
}

export function startBuyNow(product, variant = null, quantity = 1) {
  const stock = variant?.stock ?? product.total_stock ?? 0;
  if (stock <= 0) {
    return { ok: false, message: 'المنتج غير متوفر' };
  }
  if (quantity > stock) {
    return { ok: false, message: `الحد الأقصى للمخزون: ${stock}` };
  }
  setBuyNowItems([buildLineItem(product, variant, quantity)]);
  return { ok: true };
}
