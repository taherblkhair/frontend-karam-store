export function getCartKey(item) {
  return item.variant_id ? `${item.product_id}-${item.variant_id}` : `${item.product_id}`;
}
