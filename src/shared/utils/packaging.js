/**
 * Product packaging — mirrors backend shared/constants/enums.js PACKAGING_TYPES.
 * A description of what comes with the item (not a purchase option, never priced).
 */
export const DEFAULT_PACKAGING_TYPE = 'full_package';

export const PACKAGING_OPTIONS = [
  { value: 'full_package', label: 'كيسة + بوكس' },
  { value: 'box_only', label: 'بوكس فقط' },
  { value: 'bag_only', label: 'كيسة فقط' },
  { value: 'no_package', label: 'بدون تغليف' },
];

const LABELS = Object.fromEntries(PACKAGING_OPTIONS.map((o) => [o.value, o.label]));

/** Arabic label, or null for a missing / unknown value (older cart lines and order lines). */
export function packagingLabel(type) {
  return LABELS[type] || null;
}
