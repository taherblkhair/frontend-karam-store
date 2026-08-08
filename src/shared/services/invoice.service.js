import { ORDER_STATUS, formatPrice } from '@core/constants';
import { resolveMediaUrl } from '@core/api/config.js';

function itemVariantLabel(item) {
  if (item.color_name || item.size_name) {
    const parts = [];
    if (item.color_name) parts.push(`اللون: ${item.color_name}`);
    if (item.size_name) parts.push(`المقاس: ${item.size_name}`);
    return parts.join(' · ');
  }
  return item.variant_info || '';
}

export function printOrderInvoice(order, storeName = 'متجر كرم') {
  const statusLabel = ORDER_STATUS[order.status]?.label || order.status;
  const itemsRows = (order.items || [])
    .map((item) => {
      const variant = itemVariantLabel(item);
      const img = item.image ? resolveMediaUrl(item.image) : '';
      return `
      <tr>
        <td>
          <div style="display:flex;gap:10px;align-items:flex-start">
            ${
              img
                ? `<img src="${img}" alt="" width="48" height="48" style="object-fit:cover;border-radius:8px;border:1px solid #eee" />`
                : ''
            }
            <div>
              <div style="font-weight:700">${item.product_name || ''}</div>
              ${variant ? `<div style="color:#004D40;font-size:13px;margin-top:2px">${variant}</div>` : ''}
              ${item.sku ? `<div style="color:#666;font-size:12px;margin-top:2px">SKU: ${item.sku}</div>` : ''}
              ${item.variant_id ? `<div style="color:#999;font-size:11px">نسخة #${item.variant_id}</div>` : ''}
            </div>
          </div>
        </td>
        <td>${item.quantity}</td>
        <td>${formatPrice(item.unit_price)}</td>
        <td>${formatPrice(item.total)}</td>
      </tr>`;
    })
    .join('');

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <title>فاتورة ${order.order_number}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
    h1 { margin-bottom: 4px; }
    .meta { color: #555; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: right; vertical-align: top; }
    th { background: #f5f5f5; }
    .totals { margin-top: 16px; width: 300px; margin-right: auto; }
    .totals div { display: flex; justify-content: space-between; padding: 4px 0; }
    .total { font-size: 18px; font-weight: bold; border-top: 2px solid #111; padding-top: 8px; }
  </style>
</head>
<body>
  <h1>${storeName}</h1>
  <div class="meta">
    <div>فاتورة طلب: <strong>${order.order_number}</strong></div>
    <div>التاريخ: ${new Date(order.created_at).toLocaleString('ar')}</div>
    <div>الحالة: ${statusLabel}</div>
    ${order.shipping_label ? `<div>بوليصة الشحن: ${order.shipping_label}</div>` : ''}
  </div>
  <div>
    <div><strong>العميل:</strong> ${order.customer_name}</div>
    <div><strong>الهاتف:</strong> ${order.customer_phone}</div>
    ${order.city_name ? `<div><strong>المدينة:</strong> ${order.city_name} - ${order.area_name || ''}</div>` : ''}
    ${order.address ? `<div><strong>العنوان:</strong> ${order.address}</div>` : ''}
    ${order.notes ? `<div><strong>ملاحظات:</strong> ${order.notes}</div>` : ''}
  </div>
  <table>
    <thead>
      <tr><th>المنتج / النسخة</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr>
    </thead>
    <tbody>${itemsRows}</tbody>
  </table>
  <div class="totals">
    <div><span>المجموع</span><span>${formatPrice(order.subtotal)}</span></div>
    <div><span>الخصم</span><span>${formatPrice(order.discount)}</span></div>
    <div><span>الشحن</span><span>${formatPrice(order.shipping_cost)}</span></div>
    <div class="total"><span>الإجمالي</span><span>${formatPrice(order.total)}</span></div>
  </div>
  <p style="margin-top:24px;">طريقة الدفع: الدفع عند الاستلام (COD)</p>
  <script>window.onload = () => { window.print(); }</script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=800,height=900');
  if (!win) return;
  win.document.write(html);
  win.document.close();
}
