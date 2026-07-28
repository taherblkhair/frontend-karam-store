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

export function isValidLibyaMobile(input) {
  if (input == null || String(input).trim() === '') return false;
  const phone = normalizeLibyaPhone(input);
  if (!/^09[1-5]\d{7}$/.test(phone)) return false;
  return LIBYA_MOBILE_PREFIXES.some((prefix) => phone.startsWith(prefix));
}
