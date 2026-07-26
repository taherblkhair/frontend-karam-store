export const ORDER_STATUS = {
  new: { label: 'جديد', color: 'bg-blue-100 text-blue-800' },
  pending_confirmation: { label: 'قيد التأكيد', color: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: 'تم التأكيد', color: 'bg-green-100 text-green-800' },
  processing: { label: 'قيد التجهيز', color: 'bg-purple-100 text-purple-800' },
  shipped: { label: 'تم الشحن', color: 'bg-indigo-100 text-indigo-800' },
  delivered: { label: 'تم التسليم', color: 'bg-emerald-100 text-emerald-800' },
  cancelled: { label: 'ملغي', color: 'bg-red-100 text-red-800' },
  returned: { label: 'مرتجع', color: 'bg-orange-100 text-orange-800' },
};

export const formatPrice = (price) => {
  return `${parseFloat(price || 0).toFixed(2)} د.ل`;
};

export const getWhatsAppLink = (phone, orderNumber) => {
  const message = encodeURIComponent(`مرحباً، أريد الاستفسار عن الطلب رقم: ${orderNumber}`);
  return `https://wa.me/${phone}?text=${message}`;
};
