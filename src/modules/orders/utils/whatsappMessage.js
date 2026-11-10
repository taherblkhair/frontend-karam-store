/**
 * Ready-made WhatsApp messages from staff to the CUSTOMER (wa.me deep link — no paid API).
 * The template follows the order status; staff can still edit the text in WhatsApp before sending.
 */
import { formatPrice } from '@core/constants';
import { isValidLibyaMobile, normalizeLibyaPhone } from '@shared/utils/phone';
import { trackOrderAbsoluteUrl } from '@modules/store/utils/trackOrder';

export const WHATSAPP_TEMPLATES = [
  { key: 'confirm', label: 'طلب تأكيد', statuses: ['new', 'pending_confirmation'] },
  { key: 'confirmed', label: 'تم التأكيد', statuses: ['confirmed', 'processing'] },
  { key: 'shipped', label: 'خرج للتوصيل', statuses: ['shipped'] },
];

/** Template that fits the current status (falls back to the confirmation request). */
export function defaultTemplateKey(status) {
  return WHATSAPP_TEMPLATES.find((t) => t.statuses.includes(status))?.key || 'confirm';
}

/** 09XXXXXXXX → 2189XXXXXXXX for wa.me; null when not a valid Libyan mobile. */
export function whatsappNumber(phone) {
  const local = normalizeLibyaPhone(phone);
  return isValidLibyaMobile(local) ? `218${local.slice(1)}` : null;
}

function itemLines(order) {
  return (order.items || [])
    .filter((i) => Number(i.quantity) > 0)
    .map((i) => {
      const variant = [i.color_name, i.size_name].filter(Boolean).join(' / ') || i.variant_info;
      return `• ${i.product_name}${variant ? ` (${variant})` : ''} × ${i.quantity}`;
    })
    .join('\n');
}

function totalsLines(order) {
  const lines = [`المجموع: ${formatPrice(order.subtotal)}`];
  if (Number(order.discount) > 0) lines.push(`الخصم: ${formatPrice(order.discount)}`);
  lines.push(`التوصيل: ${formatPrice(order.shipping_cost)}`);
  lines.push(`*الإجمالي عند الاستلام: ${formatPrice(order.total)}*`);
  return lines.join('\n');
}

/** Drop empty parts, keep single blank lines between blocks. */
function compose(parts) {
  return parts
    .filter((p) => p !== null && p !== undefined && p !== false)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function buildCustomerMessage(order, templateKey, storeName = 'متجر كرم') {
  const name = order.customer_name ? ` ${order.customer_name}` : '';
  const where = [order.city_name, order.area_name].filter(Boolean).join(' - ');
  const address = [where, order.address].filter(Boolean).join('، ');
  const trackUrl = order.tracking_token ? trackOrderAbsoluteUrl(order) : null;
  const track = trackUrl ? `تتبع طلبك: ${trackUrl}` : null;

  if (templateKey === 'confirmed') {
    return compose([
      `مرحباً${name} 🌸`,
      `تم تأكيد طلبك رقم *${order.order_number}* من ${storeName} وهو الآن قيد التجهيز.`,
      '',
      `*الإجمالي عند الاستلام: ${formatPrice(order.total)}*`,
      track,
      '',
      'شكراً لثقتك بنا.',
    ]);
  }

  if (templateKey === 'shipped') {
    return compose([
      `مرحباً${name} 🚚`,
      `طلبك رقم *${order.order_number}* خرج للتوصيل.`,
      order.sabil_reference ? `رقم الشحنة: ${order.sabil_reference}` : null,
      `*المبلغ المطلوب عند الاستلام: ${formatPrice(order.total)}*`,
      'الرجاء إبقاء الهاتف متاحاً لاتصال المندوب. يمكنك فحص الطلب قبل الاستلام.',
      track,
    ]);
  }

  // confirm (default): ask the customer to confirm before we ship
  return compose([
    `مرحباً${name} 👋`,
    `شكراً لطلبك من ${storeName}.`,
    `رقم الطلب: *${order.order_number}*`,
    '',
    itemLines(order),
    '',
    totalsLines(order),
    address ? `العنوان: ${address}` : null,
    '',
    'الرجاء الرد بـ *نعم* لتأكيد الطلب، أو أخبرنا إن كان هناك أي تعديل.',
    track,
  ]);
}

/** wa.me link to the customer's chat with the message pre-filled; null if the phone is invalid. */
export function customerWhatsAppLink(order, templateKey, storeName) {
  const number = whatsappNumber(order.customer_phone);
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(buildCustomerMessage(order, templateKey, storeName))}`;
}
