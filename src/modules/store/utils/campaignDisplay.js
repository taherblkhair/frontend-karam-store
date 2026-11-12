/** "حتى ٢٠ نوفمبر" style end date for campaign cards (null when unknown / invalid). */
export function formatCampaignEnd(endsAt) {
  if (!endsAt) return null;
  const d = new Date(endsAt);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('ar-LY', { day: 'numeric', month: 'long', year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined });
}
