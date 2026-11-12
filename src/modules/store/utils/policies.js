/** Store policy pages. Content is written by the owner in admin settings; a page without content is never linked. */
export const POLICY_PAGES = [
  { slug: 'privacy', key: 'policy_privacy', title: 'سياسة الخصوصية', path: '/pages/privacy' },
  { slug: 'returns', key: 'policy_returns', title: 'سياسة الاستبدال والاسترجاع', path: '/pages/returns' },
];

export const policyBySlug = (slug) => POLICY_PAGES.find((p) => p.slug === slug) || null;
