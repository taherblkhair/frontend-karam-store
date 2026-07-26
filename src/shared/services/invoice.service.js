import { ORDER_STATUS, formatPrice } from '@core/constants';

export function printOrderInvoice(order, storeName = 'متجر كرم') {
  const statusLabel = ORDER_STATUS[order.status]?.label || order.status;
  const itemsRows = (order.items || [])
    .map(
      (item) => `
      <tr>
        <td>${item.product_name}${item.variant_info ? ` (${item.variant_info})` : ''}</td>
        <td>${item.quantity}</td>
        <td>${formatPrice(item.unit_price)}</td>
        <td>${formatPrice(item.total)}</td>
      </tr>`
    )
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
    th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
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
      <tr><th>المنتج</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr>
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
