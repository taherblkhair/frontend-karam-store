import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LogOut, MapPin } from 'lucide-react';
import { useAuth } from '@core/auth/AuthContext';
import { storeApi } from '@modules/store/api/store.api';
import { useFormErrors } from '@shared/hooks/useFormErrors';
import { FieldError, FormAlert, LoadingSpinner } from '@shared/ui';
import { notifySuccess, notifyError } from '@shared/services/toast.service';
import StoreLayout from '@shared/layouts/StoreLayout';
import {
  isValidLibyaMobile,
  normalizeLibyaPhone,
  LIBYA_PHONE_MESSAGE,
} from '@shared/utils/phone';

export default function AccountPage() {
  const { user, logout, refreshProfile, updateShippingAddress, loading } = useAuth();
  const navigate = useNavigate();
  const { formError, clearErrors, applyApiError, getFieldError } = useFormErrors();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    city_id: '',
    area_id: '',
    address: '',
  });

  const { data: citiesData } = useQuery({
    queryKey: ['cities'],
    queryFn: () => storeApi.cities(),
  });

  const { data: areasData } = useQuery({
    queryKey: ['areas', form.city_id],
    queryFn: () => storeApi.areas(form.city_id),
    enabled: !!form.city_id,
  });

  useEffect(() => {
    refreshProfile?.().catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    const ship = user.shipping_address || {};
    setForm({
      name: ship.name || user.name || '',
      phone: ship.phone || user.phone || '',
      city_id: ship.city_id ? String(ship.city_id) : '',
      area_id: ship.area_id ? String(ship.area_id) : '',
      address: ship.address || '',
    });
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    clearErrors();

    const phone = normalizeLibyaPhone(form.phone);
    if (!isValidLibyaMobile(phone)) {
      return notifyError({ message: LIBYA_PHONE_MESSAGE });
    }

    setSaving(true);
    try {
      const res = await updateShippingAddress({
        name: form.name.trim() || undefined,
        phone,
        city_id: parseInt(form.city_id, 10),
        area_id: form.area_id ? parseInt(form.area_id, 10) : null,
        address: form.address.trim(),
      });
      notifySuccess(res);
    } catch (err) {
      applyApiError(err);
      notifyError(err);
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <StoreLayout>
        <LoadingSpinner />
      </StoreLayout>
    );
  }

  return (
    <StoreLayout>
      <div className="container mx-auto px-4 py-8 max-w-lg">
        <div className="flex items-start justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold">حسابي</h1>
            <p className="text-sm text-gray-500 mt-1">{user.phone}</p>
          </div>
          <button type="button" onClick={handleLogout} className="btn-outline text-sm text-red-600">
            <LogOut size={16} /> خروج
          </button>
        </div>

        <form onSubmit={handleSave} className="card p-5 space-y-4">
          <div className="flex items-center gap-2 font-bold mb-1">
            <MapPin size={18} className="text-primary-600" />
            عنوان الشحن
          </div>
          <p className="text-sm text-gray-500">
            عند حفظ العنوان سيُملأ تلقائياً في صفحة إتمام الطلب.
          </p>

          {formError ? <FormAlert message={formError} /> : null}

          <div>
            <input
              className="input"
              placeholder="الاسم (اختياري)"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <FieldError message={getFieldError('name')} />
          </div>

          <div>
            <input
              className="input"
              inputMode="tel"
              placeholder="مثال: 0912345678 *"
              pattern="09[1-5][0-9]{7}"
              title={LIBYA_PHONE_MESSAGE}
              required
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <p className="text-xs text-gray-500 mt-1">091 · 092 · 093 · 094 · 095</p>
            <FieldError message={getFieldError('phone')} />
          </div>

          <div>
            <select
              className="input"
              required
              value={form.city_id}
              onChange={(e) => setForm({ ...form, city_id: e.target.value, area_id: '' })}
            >
              <option value="">اختر المدينة *</option>
              {citiesData?.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name_ar}
                </option>
              ))}
            </select>
            <FieldError message={getFieldError('city_id')} />
          </div>

          {(areasData?.data?.length > 0 || !form.city_id) && (
            <select
              className="input"
              required={!!areasData?.data?.length}
              value={form.area_id}
              onChange={(e) => setForm({ ...form, area_id: e.target.value })}
              disabled={!form.city_id}
            >
              <option value="">اختر المنطقة</option>
              {areasData?.data?.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name_ar}
                </option>
              ))}
            </select>
          )}

          <div>
            <textarea
              className="input"
              rows={3}
              required
              placeholder="العنوان التفصيلي *"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
            <FieldError message={getFieldError('address')} />
          </div>

          <button type="submit" className="btn-primary w-full" disabled={saving || loading}>
            {saving ? 'جاري الحفظ...' : 'حفظ عنوان الشحن'}
          </button>
        </form>

        <Link to="/products" className="btn-outline w-full mt-4 inline-flex justify-center">
          متابعة التسوق
        </Link>
      </div>
    </StoreLayout>
  );
}
