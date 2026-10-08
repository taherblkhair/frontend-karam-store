/** Display labels for Darb Assabil shipment status (mirrors backend mapping). */
export const SABIL_STATUS_LABELS = {
  pending: 'قيد الانتظار',
  accepted: 'تم القبول',
  assigned: 'تم التعيين',
  in_transit: 'في الطريق',
  arrived: 'وصلت',
  delivered: 'تم التسليم',
  cancelled: 'ملغاة',
  rejected: 'مرفوضة',
  delayed: 'متأخرة',
  returning: 'قيد الإرجاع',
  returned: 'مرتجعة',
  released: 'تم الإفراج',
};

export const SABIL_EVENT_LABELS = {
  booked: 'حُجزت',
  accepted: 'قُبلت',
  assigned: 'عُيّن مندوب',
  shipped: 'خرجت للشحن',
  arrived: 'وصلت',
  completed: 'اكتملت',
  'partially-completed': 'اكتملت جزئياً',
  cancelled: 'أُلغيت',
  'cancel-confirmed': 'تأكيد الإلغاء',
  rejected: 'رُفضت',
  delayed: 'تأخير',
  returning: 'قيد الإرجاع',
  returned: 'أُرجعت',
  released: 'أُفرج عنها',
  'payment-required': 'مطلوب دفع',
  'payment-received': 'تم الدفع',
  'payment-refunded': 'استرداد مبلغ',
  info: 'ملاحظة',
  warning: 'تنبيه',
  danger: 'تحذير',
  waiting: 'انتظار',
  referenced: 'ربط مرجعي',
  disengaged: 'فك الارتباط',
};

export function sabilStatusLabel(status, fallback) {
  if (fallback) return fallback;
  const key = String(status || '').trim();
  return SABIL_STATUS_LABELS[key] || key || '—';
}

export function sabilEventLabel(type) {
  const key = String(type || '').trim().toLowerCase();
  return SABIL_EVENT_LABELS[key] || type || 'حدث';
}
