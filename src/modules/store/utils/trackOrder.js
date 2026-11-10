/** Order-tracking links (guest-first: no account needed). */

export const TRACK_ORDER_PATH = '/track-order';

/**
 * Link that opens the tracking page directly. The token is an unguessable per-order key
 * from the API, so the phone never has to be put in a URL.
 */
export function trackOrderPath({ order_number: orderNumber, tracking_token: token } = {}) {
  if (!orderNumber) return TRACK_ORDER_PATH;
  const params = new URLSearchParams({ order: orderNumber });
  if (token) params.set('t', token);
  return `${TRACK_ORDER_PATH}?${params.toString()}`;
}

export function trackOrderAbsoluteUrl(order) {
  const path = trackOrderPath(order);
  if (typeof window === 'undefined') return path;
  return `${window.location.origin}${path}`;
}

/** WhatsApp share (no recipient chosen — the user picks the chat). */
export function trackOrderWhatsAppShareUrl(order, storeName = 'متجر كرم') {
  const text = `تتبع طلبي من ${storeName}\nرقم الطلب: ${order.order_number}\n${trackOrderAbsoluteUrl(order)}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
