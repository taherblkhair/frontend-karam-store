/**
 * Normalize variant + product into a storefront cart / buy-now line item.
 * Always preserves exact variant_id so checkout never falls back silently.
 */
export function formatVariantInfo(variant) {
  if (!variant) return null;
  const color = variant.color_name || null;
  const size = variant.size_name || null;
  const parts = [];
  if (color) parts.push(`اللون: ${color}`);
  if (size) parts.push(`المقاس: ${size}`);
  if (parts.length) return parts.join(' · ');
  return [color, size].filter(Boolean).join(' - ') || null;
}

export function buildLineItem(product, variant = null, quantity = 1) {
  const hasVariants = Boolean(
    product?.has_variants || (product?.variants && product.variants.length > 0)
  );

  if (hasVariants && !variant?.id) {
    return null;
  }

  const stock = variant?.stock ?? product.total_stock ?? 0;
  const qty = Math.max(1, Math.min(quantity, stock || quantity));
  const variantId = variant?.id != null ? Number(variant.id) : null;
  const key =
    variantId != null && !Number.isNaN(variantId)
      ? `${product.id}-${variantId}`
      : `${product.id}`;
  const price = parseFloat(variant?.price != null ? variant.price : product.price);
  const colorName = variant?.color_name || null;
  const sizeName = variant?.size_name || null;
  const sku = variant?.sku || product.sku || null;
  const image =
    variant?.image ||
    product.primary_image ||
    product.images?.[0]?.url ||
    null;

  return {
    key,
    product_id: Number(product.id),
    variant_id: variantId != null && !Number.isNaN(variantId) ? variantId : null,
    name: product.name_ar,
    color_name: colorName,
    size_name: sizeName,
    variant_info: formatVariantInfo(variant) || null,
    sku,
    price,
    compare_price: parseFloat(variant?.compare_price || product.compare_price || 0),
    image,
    quantity: qty,
    stock,
  };
}

/** Payload for create order API — keeps exact variant_id. */
export function toOrderItemPayload(item) {
  const productId = parseInt(item.product_id, 10);
  const rawVariant = item.variant_id;
  const variantId =
    rawVariant != null && rawVariant !== ''
      ? parseInt(rawVariant, 10)
      : null;

  return {
    product_id: productId,
    quantity: Math.max(1, parseInt(item.quantity, 10) || 1),
    ...(Number.isFinite(variantId) && variantId > 0
      ? { variant_id: variantId }
      : { variant_id: null }),
  };
}
