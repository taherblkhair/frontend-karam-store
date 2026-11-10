/** Campaign helpers shared by admin and storefront. */

export const CAMPAIGN_STATUS_META = {
  draft: {
    label: 'مسودة',
    className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
  },
  scheduled: {
    label: 'مجدولة',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  },
  active: {
    label: 'نشطة',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
  },
  expired: {
    label: 'منتهية',
    className: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200',
  },
  paused: {
    label: 'موقوفة',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  },
};

export const CAMPAIGN_STATUS_FILTERS = [
  { value: '', label: 'كل الحالات' },
  { value: 'active', label: 'نشطة' },
  { value: 'scheduled', label: 'مجدولة' },
  { value: 'draft', label: 'مسودة' },
  { value: 'paused', label: 'موقوفة' },
  { value: 'expired', label: 'منتهية' },
];

export const CAMPAIGN_PATH_PREFIX = '/campaigns';

export function campaignPath(campaignOrSlug) {
  const slug =
    typeof campaignOrSlug === 'string' ? campaignOrSlug : campaignOrSlug?.slug || '';
  return slug ? `${CAMPAIGN_PATH_PREFIX}/${slug}` : CAMPAIGN_PATH_PREFIX;
}

export function campaignAbsoluteUrl(campaignOrSlug) {
  const path = campaignPath(campaignOrSlug);
  if (typeof window === 'undefined') return path;
  return `${window.location.origin}${path}`;
}

/** ((original - discounted) / original) * 100 — same formula as the API. */
export function discountPercent(original, price) {
  const o = Number(original);
  const p = Number(price);
  if (!(o > 0) || !Number.isFinite(p) || p < 0 || p >= o) return 0;
  return Math.round(((o - p) / o) * 10000) / 100;
}

const pad = (n) => String(n).padStart(2, '0');

/** ISO/Date → value for <input type="datetime-local"> in the browser's local time. */
export function toDateTimeLocal(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** <input type="datetime-local"> value (local time) → ISO string for the API. */
export function fromDateTimeLocal(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('ar-LY', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
