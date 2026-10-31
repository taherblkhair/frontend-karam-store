export const ITEM_STATUS = {
  pending: { label: 'متبقٍ', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200' },
  partially_delivered: {
    label: 'تسليم جزئي',
    color: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-200',
  },
  delivered: {
    label: 'تم التسليم',
    color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200',
  },
  cancelled: { label: 'ملغي', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200' },
  returned: { label: 'مرتجع', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200' },
};

export const ITEM_ACTION_LABELS = {
  deliver: 'تسليم',
  cancel: 'إلغاء',
  return: 'إرجاع',
};

export function ItemStatusBadge({ status }) {
  const s = ITEM_STATUS[status] || ITEM_STATUS.pending;
  return <span className={`badge ${s.color}`}>{s.label}</span>;
}

/** Units still waiting for delivery on a line (active quantity minus delivered). */
export function itemRemaining(item) {
  return Math.max(0, (Number(item.quantity) || 0) - (Number(item.delivered_quantity) || 0));
}

export function itemOrderedQuantity(item) {
  return Number(item.ordered_quantity ?? item.quantity) || 0;
}
