/**
 * Public storefront availability (customers). Admin / POS stay open.
 * Mirrors backend/src/shared/utils/siteStatus.util.js
 */

export const SITE_STATUS = {
  ONLINE: 'online',
  MAINTENANCE: 'maintenance',
  DEVELOPMENT: 'development',
};

export const SITE_STATUS_VALUES = Object.values(SITE_STATUS);

export function normalizeSiteStatus(value) {
  const s = String(value || SITE_STATUS.ONLINE).trim().toLowerCase();
  if (s === 'open' || s === 'live' || s === 'active') return SITE_STATUS.ONLINE;
  if (s === 'closed' || s === 'offline' || s === 'down') return SITE_STATUS.MAINTENANCE;
  if (s === 'dev' || s === 'coming_soon' || s === 'soon') return SITE_STATUS.DEVELOPMENT;
  if (SITE_STATUS_VALUES.includes(s)) return s;
  return SITE_STATUS.ONLINE;
}

export function isSiteOnline(status) {
  return normalizeSiteStatus(status) === SITE_STATUS.ONLINE;
}

export function isSiteClosed(status) {
  return !isSiteOnline(status);
}

export function defaultSiteStatusMessage(status) {
  const s = normalizeSiteStatus(status);
  if (s === SITE_STATUS.DEVELOPMENT) {
    return 'الموقع قيد التطوير حالياً. نعود قريباً بإذن الله.';
  }
  if (s === SITE_STATUS.MAINTENANCE) {
    return 'الموقع قيد الصيانة حالياً. نرجو المحاولة لاحقاً.';
  }
  return '';
}

export function resolveSiteStatusMessage(status, customMessage) {
  const custom = customMessage != null ? String(customMessage).trim() : '';
  if (custom) return custom;
  return defaultSiteStatusMessage(status);
}

export function siteStatusLabelAr(status) {
  const s = normalizeSiteStatus(status);
  if (s === SITE_STATUS.DEVELOPMENT) return 'قيد التطوير';
  if (s === SITE_STATUS.MAINTENANCE) return 'قيد الصيانة';
  return 'مفتوح';
}

export function siteStatusTitleAr(status) {
  const s = normalizeSiteStatus(status);
  if (s === SITE_STATUS.DEVELOPMENT) return 'الموقع قيد التطوير';
  if (s === SITE_STATUS.MAINTENANCE) return 'الموقع قيد الصيانة';
  return 'المتجر متاح';
}
