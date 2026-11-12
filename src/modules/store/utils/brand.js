/**
 * One brand identity for the storefront, SEO and footer.
 * Names come from admin settings (store_name / store_name_en); these are the agreed defaults.
 */
export const BRAND_AR = 'كرم للحقائب';
export const BRAND_EN = 'Karam Bags';
export const BRAND_TAGLINE = 'حقائب وأحذية نسائية في ليبيا';

const clean = (v) => String(v ?? '').trim();

/** @returns {{ ar: string, en: string, full: string, tagline: string, about: string, logo: string }} */
export function brandFromSettings(settings = {}) {
  const ar = clean(settings.store_name) || BRAND_AR;
  const en = clean(settings.store_name_en) || BRAND_EN;
  return {
    ar,
    en,
    full: `${en} | ${ar}`,
    tagline: clean(settings.store_tagline) || BRAND_TAGLINE,
    about: clean(settings.store_about),
    logo: clean(settings.logo),
  };
}
