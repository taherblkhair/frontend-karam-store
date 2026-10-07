/** Libyan mobile operators: 091 / 092 / 093 / 094 / 095 */
export const LIBYA_MOBILE_PREFIXES = ['091', '092', '093', '094', '095'];

export const LIBYA_PHONE_MESSAGE =
  'رقم الهاتف يجب أن يكون ليبياً ويبدأ بـ 091 أو 092 أو 093 أو 094 أو 095 ويتكون من 10 أرقام';

export function normalizeLibyaPhone(input) {
  let digits = String(input || '').replace(/\D/g, '');

  if (digits.startsWith('00218')) {
    digits = digits.slice(2);
  }
  if (digits.startsWith('218') && digits.length >= 12) {
    digits = `0${digits.slice(3)}`;
  }

  return digits;
}

/** Digits only, max 10 — but let +218 / 00218 pasted numbers through so they normalize to 09xxxxxxxx. */
export function sanitizePhoneInput(raw) {
  const digits = String(raw || '')
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/\D/g, '');
  if (digits.startsWith('00218') || digits.startsWith('218')) {
    const normalized = normalizeLibyaPhone(digits);
    return normalized.startsWith('0') ? normalized.slice(0, 10) : digits.slice(0, 14);
  }
  return digits.slice(0, 10);
}

export function isValidLibyaMobile(input) {
  if (input == null || String(input).trim() === '') return false;
  const phone = normalizeLibyaPhone(input);
  if (!/^09[1-5]\d{7}$/.test(phone)) return false;
  return LIBYA_MOBILE_PREFIXES.some((prefix) => phone.startsWith(prefix));
}
