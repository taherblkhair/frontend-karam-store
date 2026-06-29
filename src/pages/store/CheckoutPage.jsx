import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { notifySuccess, notifyError } from '../../utils/notify';
import { useFormErrors } from '../../hooks/useFormErrors';
import api from '../../api/axios';
import StoreLayout from '../../layouts/StoreLayout';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { FieldError, FormAlert } from '../../components/ui';
import { formatPrice, getWhatsAppLink } from '../../utils/constants';

export default function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart();
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [createAccount, setCreateAccount] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);
  const { fieldErrors, formError, clearErrors, applyApiError, getFieldError } = useFormErrors();
  const [form, setForm] = useState({
    customer_name: user?.name || '',
    customer_phone: user?.phone || '',
    city_id: '',
    area_id: '',
    address: '',
    notes: '',
    password: '',
  });
  const [shippingCost, setShippingCost] = useState(0);

  const { data: citiesData } = useQuery({
    queryKey: ['cities'],
    queryFn: () => api.get('/store/cities'),
  });

  const { data: areasData } = useQuery({
    queryKey: ['areas', form.city_id],
    queryFn: () => api.get(`/store/cities/${form.city_id}/areas`),
    enabled: !!form.city_id,
  });

  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/store/settings'),
  });

  useEffect(() => {
    if (form.city_id) {
      api.get('/store/shipping-cost', { params: { city_id: form.city_id, area_id: form.area_id || undefined } })
        .then((res) => setShippingCost(res.data.shipping_cost))
        .catch(() => setShippingCost(15));
    }
  }, [form.city_id, form.area_id]);

  const orderMutation = useMutation({
    mutationFn: (data) => api.post('/store/orders', data),
    onSuccess: (res) => {
      clearCart();
      setOrderSuccess({ ...res.data, message: res.message });
      notifySuccess(res);
    },
    onError: (err) => {
      applyApiError(err);
      notifyError(err);
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearErrors();
    if (items.length === 0) return notifyError({ message: 'السلة فارغة' });

    if (createAccount && !user) {
      try {
        const res = await register({
          name: form.customer_name,
          phone: form.customer_phone,
          password: form.password,
        });
        notifySuccess(res);
      } catch (err) {
        applyApiError(err);
        return notifyError(err);
      }
    }

    orderMutation.mutate({
      customer_name: form.customer_name,
      customer_phone: form.customer_phone,
      city_id: parseInt(form.city_id),
      area_id: parseInt(form.area_id),
      address: form.address,
      notes: form.notes,
      items: items.map((i) => ({
        product_id: i.product_id,
        variant_id: i.variant_id,
        quantity: i.quantity,
      })),
    });
  };

  if (items.length === 0 && !orderSuccess) {
    navigate('/cart');
    return null;
  }

  if (orderSuccess) {
    const whatsapp = settingsData?.data?.store_whatsapp || '218910000000';
    return (
      <StoreLayout>
        <div className="container mx-auto px-4 py-16 text-center max-w-lg">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">✓</span>
          </div>
          <h1 className="text-2xl font-bold mb-2">{orderSuccess.message}</h1>
          <p className="text-gray-500 mb-4">رقم الطلب:</p>
          <p className="text-3xl font-bold text-primary-600 mb-6">{orderSuccess.order_number}</p>
          <p className="text-gray-600 mb-8">سيتم التواصل معك لتأكيد الطلب. الدفع عند الاستلام.</p>
          <div className="flex flex-col gap-3">
            <a
              href={getWhatsAppLink(whatsapp, orderSuccess.order_number)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
            >
              التواصل مع المتجر عبر WhatsApp
            </a>
            <button onClick={() => navigate('/')} className="btn-outline">العودة للرئيسية</button>
          </div>
        </div>
      </StoreLayout>
    );
  }

  const total = subtotal + shippingCost;

  return (
    <StoreLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-2xl font-bold mb-6">إتمام الطلب</h1>

        <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-8">
          {formError ? <div className="md:col-span-2"><FormAlert message={formError} /></div> : null}
          <div className="space-y-4">
            <div className="card p-6">
              <h2 className="font-bold mb-4">معلومات التوصيل</h2>
              <div className="space-y-4">
                <div>
                  <input className="input" placeholder="الاسم الكامل" required value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
                  <FieldError message={getFieldError('customer_name')} />
                </div>
                <div>
                  <input className="input" placeholder="رقم الهاتف" required value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} />
                  <FieldError message={getFieldError('customer_phone')} />
                </div>
                <select className="input" required value={form.city_id} onChange={(e) => setForm({ ...form, city_id: e.target.value, area_id: '' })}>
                  <option value="">اختر المدينة</option>
                  {citiesData?.data?.map((c) => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
                </select>
                <select className="input" required value={form.area_id} onChange={(e) => setForm({ ...form, area_id: e.target.value })} disabled={!form.city_id}>
                  <option value="">اختر المنطقة</option>
                  {areasData?.data?.map((a) => <option key={a.id} value={a.id}>{a.name_ar}</option>)}
                </select>
                <textarea className="input" placeholder="العنوان التفصيلي" required rows={3} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                <textarea className="input" placeholder="ملاحظات (اختياري)" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>

            {!user && (
              <div className="card p-6">
                <label className="flex items-center gap-2 mb-4">
                  <input type="checkbox" checked={createAccount} onChange={(e) => setCreateAccount(e.target.checked)} />
                  <span>إنشاء حساب</span>
                </label>
                {createAccount && (
                  <div>
                    <input type="password" className="input" placeholder="كلمة المرور" required={createAccount} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                    <FieldError message={getFieldError('password')} />
                  </div>
                )}
                <p className="text-sm text-gray-500 mt-2">أو أكمل الطلب كضيف بدون تسجيل</p>
              </div>
            )}
          </div>

          <div>
            <div className="card p-6 sticky top-24">
              <h2 className="font-bold mb-4">ملخص الطلب</h2>
              <div className="space-y-2 mb-4 max-h-48 overflow-auto">
                {items.map((item) => (
                  <div key={item.key} className="flex justify-between text-sm">
                    <span>{item.name} × {item.quantity}</span>
                    <span>{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between"><span>المجموع</span><span>{formatPrice(subtotal)}</span></div>
                <div className="flex justify-between"><span>الشحن</span><span>{formatPrice(shippingCost)}</span></div>
                <div className="flex justify-between font-bold text-lg"><span>الإجمالي</span><span className="text-primary-600">{formatPrice(total)}</span></div>
              </div>
              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-sm">
                💵 الدفع عند الاستلام (COD)
              </div>
              <button type="submit" disabled={orderMutation.isPending} className="btn-primary w-full mt-6">
                {orderMutation.isPending ? 'جاري الإرسال...' : 'تأكيد الطلب'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </StoreLayout>
  );
}
