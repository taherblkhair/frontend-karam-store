import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifySuccess, notifyError } from '@shared/services/toast.service';
import { useFormErrors } from '@shared/hooks/useFormErrors';
import { settingsApi } from '@modules/settings/api/settings.api';
import { LoadingSpinner, FormAlert } from '@shared/ui';
import { ImageUpload } from '@shared/components/ImageUpload';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({});
  const [shippingCity, setShippingCity] = useState('');
  const [shippingPrice, setShippingPrice] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => settingsApi.get(),
  });

  const { data: citiesData } = useQuery({
    queryKey: ['cities-admin'],
    queryFn: () => settingsApi.cities(),
  });

  useEffect(() => {
    if (data?.data) setForm(data.data);
  }, [data]);

  const { formError, clearErrors, applyApiError } = useFormErrors();

  const updateMutation = useMutation({
    mutationFn: settingsApi.update,
    onSuccess: (res) => {
      queryClient.invalidateQueries(['admin-settings']);
      clearErrors();
      notifySuccess(res);
    },
    onError: (err) => {
      applyApiError(err);
      notifyError(err);
    },
  });

  const shippingMutation = useMutation({
    mutationFn: settingsApi.updateShippingRate,
    onSuccess: notifySuccess,
    onError: notifyError,
  });

  if (isLoading) return <LoadingSpinner />;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">إعدادات الموقع</h1>

      <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(form); }} className="max-w-3xl space-y-6">
        {formError ? <FormAlert message={formError} /> : null}
        <div className="card p-6">
          <h2 className="font-bold mb-4">الشعار والهوية</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <input className="input" placeholder="اسم المتجر" value={form.store_name || ''} onChange={(e) => setForm({ ...form, store_name: e.target.value })} />
            <input className="input" placeholder="اسم المتجر (EN)" value={form.store_name_en || ''} onChange={(e) => setForm({ ...form, store_name_en: e.target.value })} />
          </div>
          <div className="mt-4">
            <ImageUpload label="شعار المتجر" value={form.logo || ''} onChange={(url) => setForm({ ...form, logo: url })} />
          </div>
        </div>

        <div className="card p-6">
          <h2 className="font-bold mb-4">التواصل</h2>
          <div className="space-y-4">
            <input className="input" placeholder="رقم الهاتف" value={form.store_phone || ''} onChange={(e) => setForm({ ...form, store_phone: e.target.value })} />
            <div>
              <input className="input" placeholder="WhatsApp (218945270764)" value={form.store_whatsapp || ''} onChange={(e) => setForm({ ...form, store_whatsapp: e.target.value.replace(/[^0-9]/g, '') })} />
              <p className="text-xs text-gray-500 mt-1">أدخل الرقم بدون + مثال: 218945270764</p>
            </div>
            <input className="input" placeholder="البريد الإلكتروني" value={form.store_email || ''} onChange={(e) => setForm({ ...form, store_email: e.target.value })} />
            <input className="input" placeholder="العنوان" value={form.store_address || ''} onChange={(e) => setForm({ ...form, store_address: e.target.value })} />
          </div>
        </div>

        <div className="card p-6">
          <h2 className="font-bold mb-4">العملة والشحن</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <input className="input" placeholder="رمز العملة" value={form.currency_symbol || ''} onChange={(e) => setForm({ ...form, currency_symbol: e.target.value })} />
            <input className="input" placeholder="العملة" value={form.currency || ''} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <input className="input" type="number" min="0" step="0.01" placeholder="أقل سعر شحن (د.ل)" value={form.min_shipping || ''} onChange={(e) => setForm({ ...form, min_shipping: e.target.value })} />
            <input className="input" type="number" min="0" step="0.01" placeholder="أعلى سعر شحن (د.ل)" value={form.max_shipping || ''} onChange={(e) => setForm({ ...form, max_shipping: e.target.value })} />
          </div>
        </div>

        <button type="submit" className="btn-primary">حفظ الإعدادات</button>
      </form>

      <div className="card p-6 mt-6 max-w-3xl">
        <h2 className="font-bold mb-4">أسعار الشحن حسب المدينة</h2>
        <div className="flex gap-3">
          <select className="input flex-1" value={shippingCity} onChange={(e) => setShippingCity(e.target.value)}>
            <option value="">اختر المدينة</option>
            {citiesData?.data?.map((c) => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
          </select>
          <input className="input w-32" type="number" min="0" step="0.01" placeholder="السعر" value={shippingPrice} onChange={(e) => setShippingPrice(e.target.value)} />
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              const price = parseFloat(shippingPrice);
              if (Number.isNaN(price) || price < 0) return;
              shippingMutation.mutate({ city_id: parseInt(shippingCity, 10), price });
            }}
            disabled={!shippingCity || shippingPrice === '' || Number(shippingPrice) < 0}
          >
            تحديث
          </button>
        </div>
      </div>
    </div>
  );
}
