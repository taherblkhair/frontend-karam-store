import { isValidLibyaMobile, normalizeLibyaPhone } from '@shared/utils/phone';

const ARABIC_DIGITS = /[٠-٩۰-۹]/g;
const PHONE_CANDIDATE = /(?:\+|00)?\d[\d\s\-.()]{6,18}\d/g;
const SEGMENT_SPLIT = /\s*(?:\r?\n|[,،;؛|]+)\s*/;
const LABEL_PREFIX =
  /^\s*(?:الاسم(?:\s*الكامل)?|اسم\s*الزبون|الإسم|name|رقم\s*(?:الهاتف|الجوال|التلفون)|الهاتف|الجوال|موبايل|تلفون|phone|mobile|tel|العنوان|عنوان|المدينة|المنطقة|address|city)\s*[:：\-–]\s*/i;
const LABEL_KIND = [
  [/^\s*(?:الاسم|اسم|الإسم|name)/i, 'name'],
  [/^\s*(?:العنوان|عنوان|المدينة|المنطقة|address|city)/i, 'address'],
];

function toLatinDigits(text) {
  return text.replace(ARABIC_DIGITS, (d) => String('٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹'.indexOf(d) % 10));
}

function cleanSegment(text) {
  return text.replace(/^[\s\-–—_:•*.]+|[\s\-–—_:•*.]+$/g, '').replace(/\s{2,}/g, ' ');
}

function phoneFromDigits(digits) {
  const normalized = normalizeLibyaPhone(digits);
  if (isValidLibyaMobile(normalized)) return { phone: normalized, score: 2 };
  if (/^9[1-5]\d{7}$/.test(normalized)) return { phone: `0${normalized}`, score: 2 };
  if (normalized.length >= 9 && normalized.length <= 10) return { phone: normalized, score: 1 };
  return null;
}

/** Arabic-insensitive form used to compare free text with city/area names. */
export function normalizeArabic(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function looksLikeName(text) {
  if (!text || /\d/.test(text)) return false;
  if (!/^[\p{L}\s.'’-]+$/u.test(text)) return false;
  const words = text.trim().split(/\s+/);
  return text.length >= 2 && text.length <= 60 && words.length <= 5;
}

/**
 * Splits free pasted text ("name / phone / city - area" in any order) into
 * `{ name, phone, address }`; anything not recognised is returned as ''.
 * `isPlace(segment)` keeps a bare city name ("طرابلس") from being read as the name.
 */
export function parseQuickFill(rawText, { isPlace = () => false } = {}) {
  const text = toLatinDigits(String(rawText || ''));

  let phone = '';
  let phoneScore = 0;
  let phoneMatch = '';
  for (const match of text.matchAll(PHONE_CANDIDATE)) {
    const found = phoneFromDigits(match[0].replace(/\D/g, ''));
    if (found && found.score > phoneScore) {
      phone = found.phone;
      phoneScore = found.score;
      phoneMatch = match[0];
    }
  }

  const rest = phoneMatch ? text.replace(phoneMatch, '\n') : text;
  let name = '';
  const addressParts = [];
  const free = [];

  for (const raw of rest.split(SEGMENT_SPLIT)) {
    const kind = LABEL_KIND.find(([re]) => LABEL_PREFIX.test(raw) && re.test(raw))?.[1];
    const segment = cleanSegment(raw.replace(LABEL_PREFIX, ''));
    if (!segment) continue;
    if (kind === 'name' && !name) name = segment;
    else if (kind === 'address') addressParts.push(segment);
    else free.push(segment);
  }

  for (const segment of free) {
    if (!name && looksLikeName(segment) && !/[-–—/]/.test(segment) && !isPlace(segment)) name = segment;
    else addressParts.push(segment);
  }

  return { name, phone, address: addressParts.join(' - ') };
}

/** Longest option whose name appears as whole words inside `text`. */
export function matchOptionInText(options, text) {
  const haystack = ` ${normalizeArabic(text)} `;
  let best = null;
  for (const option of options) {
    const needle = normalizeArabic(option.label);
    if (!needle) continue;
    const variants = needle.startsWith('ال') ? [needle, needle.slice(2)] : [needle, `ال${needle}`];
    const hit = variants.find((v) => v.length >= 2 && haystack.includes(` ${v} `));
    if (hit && (!best || hit.length > best.length)) best = { option, length: hit.length, needle: hit };
  }
  return best;
}

/**
 * Full quick-fill pipeline: parse the text, pick city/area from the real lists and
 * keep only the leftover part as the detailed address.
 * `cities` / `currentAreas` are `{ value, label }` options; `loadAreas(cityId)` resolves to options.
 * Returns `{ updates, areas }` — `updates` holds only the recognised keys
 * (`name`, `phone`, `city_id`, `area_id`, `address`), `areas` the options of the resulting city.
 */
export async function resolveQuickFill(text, { cities = [], currentCityId = '', currentAreas = [], loadAreas }) {
  const cityNames = new Set(
    cities.flatMap(({ label }) => {
      const n = normalizeArabic(label);
      return [n, n.startsWith('ال') ? n.slice(2) : `ال${n}`];
    })
  );
  const parsed = parseQuickFill(text, { isPlace: (s) => cityNames.has(normalizeArabic(s)) });

  const updates = {};
  if (parsed.name) updates.name = parsed.name;
  if (parsed.phone) updates.phone = parsed.phone;

  let address = parsed.address;
  let areas = currentAreas;
  const cityHit = address ? matchOptionInText(cities, address) : null;
  if (cityHit) {
    const cityId = String(cityHit.option.value);
    address = stripMatchedName(address, cityHit.needle);
    if (cityId !== String(currentCityId)) {
      updates.city_id = cityId;
      updates.area_id = '';
      try {
        areas = (await loadAreas?.(cityId)) || [];
      } catch {
        areas = [];
      }
    }
  }
  const areaHit = address && areas.length ? matchOptionInText(areas, address) : null;
  if (areaHit) {
    updates.area_id = String(areaHit.option.value);
    address = stripMatchedName(address, areaHit.needle);
  }
  if (parsed.address) updates.address = address || parsed.address;

  return { updates, areas };
}

/** Removes a matched city/area name from the address so it isn't repeated there. */
export function stripMatchedName(address, needle) {
  if (!needle) return address;
  const words = address.split(/(\s+|[-–—,،/]+)/);
  const target = needle.split(' ');
  for (let i = 0; i < words.length; i += 1) {
    const window = [];
    let j = i;
    while (j < words.length && window.length < target.length) {
      const norm = normalizeArabic(words[j]);
      if (norm) window.push(norm);
      j += 1;
    }
    if (window.join(' ') === needle && normalizeArabic(words[i])) {
      return cleanSegment([...words.slice(0, i), ...words.slice(j)].join('').replace(/\s*[-–—,،/]\s*[-–—,،/]\s*/g, ' - '));
    }
  }
  return address;
}
