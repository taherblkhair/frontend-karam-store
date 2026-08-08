import { buildLineItem as buildFromVariant } from './lineItem.js';

/** sessionStorage key for one-click “order now” checkout (does not touch main cart). */
export const BUY_NOW_KEY = 'karam-buy-now';

/**
 * Build a checkout line item from product + optional variant.
 * Returns null if product has variants but none was selected.
 */
export function buildLineItem(product, variant = null, quantity = 1) {
  return buildFromVariant(product, variant, quantity);
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
    return { ok: false, message: 'الكمية المطلوبة غير متاحة' };
  }
  const line = buildLineItem(product, variant, quantity);
  if (!line) {
    return { ok: false, message: 'يرجى اختيار اللون والمقاس' };
  }
  if (!line.variant_id && (product.has_variants || product.variants?.length)) {
    return { ok: false, message: 'يرجى اختيار اللون والمقاس' };
  }
  setBuyNowItems([line]);
  return { ok: true };
}
