import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Store,
  Phone,
  Coins,
  Truck,
  Save,
  Search,
  Check,
  MapPin,
} from 'lucide-react';
import { notifySuccess, notifyError } from '@shared/services/toast.service';
import { useFormErrors } from '@shared/hooks/useFormErrors';
import { settingsApi } from '@modules/settings/api/settings.api';
import { LoadingSpinner, FormAlert } from '@shared/ui';
import { ImageUpload } from '@shared/components/ImageUpload';

const TABS = [
  { id: 'identity', label: 'الهوية', icon: Store },
  { id: 'contact', label: 'التواصل', icon: Phone },
  { id: 'currency', label: 'العملة', icon: Coins },
  { id: 'shipping', label: 'أسعار التوصيل', icon: Truck },
];

function Field({ label, hint, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-gray-500">{hint}</span> : null}
    </label>
  );
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('identity');
  const [form, setForm] = useState({});
  const [savedSnapshot, setSavedSnapshot] = useState('');
  const [rateDrafts, setRateDrafts] = useState({});
  const [citySearch, setCitySearch] = useState('');
  const [savingCityId, setSavingCityId] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => settingsApi.get(),
  });

  const { data: citiesData, isLoading: citiesLoading } = useQuery({
    queryKey: ['cities-admin'],
    queryFn: () => settingsApi.cities(),
  });

  const cities = citiesData?.data || [];

  useEffect(() => {
    if (!data?.data) return;
    setForm(data.data);
    setSavedSnapshot(JSON.stringify(data.data));
  }, [data]);

  useEffect(() => {
    const list = citiesData?.data;
    if (!list?.length) return;
    setRateDrafts((prev) => {
      const next = { ...prev };
      list.forEach((c) => {
        if (next[c.id] === undefined) {
          next[c.id] = c.shipping_price != null ? String(c.shipping_price) : '';
        }
      });
      return next;
    });
  }, [citiesData]);

  const { formError, clearErrors, applyApiError } = useFormErrors();

  const isDirty = useMemo(
    () => savedSnapshot !== '' && JSON.stringify(form) !== savedSnapshot,
    [form, savedSnapshot]
  );

  const dirtyRates = useMemo(() => {
    const ids = [];
    cities.forEach((c) => {
      const draft = rateDrafts[c.id];
      if (draft === undefined) return;
      const current = c.shipping_price != null ? String(c.shipping_price) : '';
      if (String(draft) !== current) ids.push(c.id);
    });
    return ids;
  }, [cities, rateDrafts]);

  const filteredCities = useMemo(() => {
    const q = citySearch.trim().toLowerCase();
    if (!q) return cities;
    return cities.filter(
      (c) =>
        c.name_ar?.toLowerCase().includes(q)
        || c.name_en?.toLowerCase().includes(q)
    );
  }, [cities, citySearch]);

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
    onSuccess: (res) => {
      queryClient.invalidateQueries(['cities-admin']);
      notifySuccess(res);
    },
    onError: notifyError,
    onSettled: () => setSavingCityId(null),
  });

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const saveSettings = (e) => {
    e?.preventDefault();
    updateMutation.mutate(form);
  };

  const saveCityRate = (cityId) => {
    const price = parseFloat(rateDrafts[cityId]);
    if (Number.isNaN(price) || price < 0) {
      return notifyError({ message: 'أدخل سعر شحن صالحاً' });
    }
    setSavingCityId(cityId);
    shippingMutation.mutate({ city_id: cityId, price });
  };

  const saveAllDirtyRates = async () => {
    if (!dirtyRates.length) return;
    try {
      for (const cityId of dirtyRates) {
        const price = parseFloat(rateDrafts[cityId]);
        if (Number.isNaN(price) || price < 0) {
          notifyError({ message: 'تحقق من أسعار الشحن المدخلة' });
          return;
        }
        setSavingCityId(cityId);
        await settingsApi.updateShippingRate({ city_id: cityId, price });
      }
      queryClient.invalidateQueries(['cities-admin']);
      notifySuccess({ message: `تم حفظ ${dirtyRates.length} سعر توصيل` });
    } catch (err) {
      notifyError(err);
    } finally {
      setSavingCityId(null);
    }
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">إعدادات الموقع</h1>
        <p className="text-sm text-gray-500 mt-1">
          إدارة هوية المتجر، بيانات التواصل، والعملة وأسعار التوصيل للمدن الليبية.
        </p>
      </div>

      {formError ? <div className="mb-4"><FormAlert message={formError} /></div> : null}

      {/* Store preview strip */}
      <div className="card p-4 mb-6 flex items-center gap-4">
        <div className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-gray-700 overflow-hidden flex items-center justify-center shrink-0 border border-gray-200 dark:border-gray-600">
          {form.logo ? (
            <img src={form.logo} alt="" className="w-full h-full object-cover" />
          ) : (
            <Store size={22} className="text-gray-400" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold truncate">{form.store_name || 'اسم المتجر'}</p>
          <p className="text-sm text-gray-500 truncate">
            {form.store_name_en || 'Store name'}
            {form.store_phone ? ` · ${form.store_phone}` : ''}
          </p>
        </div>
        {isDirty ? (
          <span className="badge bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 shrink-0">
            تعديلات غير محفوظة
          </span>
        ) : (
          <span className="badge bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200 shrink-0">
            محفوظ
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 dark:border-gray-700 pb-3">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition ${
                active
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-primary-300'
              }`}
            >
              <Icon size={16} />
              {t.label}
              {t.id === 'shipping' && dirtyRates.length > 0 ? (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${active ? 'bg-white/20' : 'bg-amber-100 text-amber-800'}`}>
                  {dirtyRates.length}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Identity */}
      {tab === 'identity' && (
        <form onSubmit={saveSettings} className="card p-6 space-y-5">
          <div>
            <h2 className="font-bold text-lg">الهوية والشعار</h2>
            <p className="text-sm text-gray-500 mt-0.5">يظهر اسم المتجر والشعار في الواجهة العامة.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="اسم المتجر (عربي)">
              <input
                className="input"
                value={form.store_name || ''}
                onChange={(e) => setField('store_name', e.target.value)}
                placeholder="كرام ستور"
              />
            </Field>
            <Field label="اسم المتجر (إنجليزي)">
              <input
                className="input"
                value={form.store_name_en || ''}
                onChange={(e) => setField('store_name_en', e.target.value)}
                placeholder="Karam Store"
              />
            </Field>
          </div>
          <ImageUpload
            label="شعار المتجر"
            value={form.logo || ''}
            onChange={(url) => setField('logo', url)}
          />
        </form>
      )}

      {/* Contact */}
      {tab === 'contact' && (
        <form onSubmit={saveSettings} className="card p-6 space-y-5">
          <div>
            <h2 className="font-bold text-lg">بيانات التواصل</h2>
            <p className="text-sm text-gray-500 mt-0.5">تُستخدم في صفحة المتجر ورسائل تأكيد الطلبات.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="رقم الهاتف">
              <input
                className="input"
                value={form.store_phone || ''}
                onChange={(e) => setField('store_phone', e.target.value)}
                placeholder="0910000000"
                dir="ltr"
              />
            </Field>
            <Field label="واتساب" hint="بدون + — مثال: 218945270764">
              <input
                className="input"
                value={form.store_whatsapp || ''}
                onChange={(e) => setField('store_whatsapp', e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="218945270764"
                dir="ltr"
              />
            </Field>
            <Field label="البريد الإلكتروني">
              <input
                className="input"
                type="email"
                value={form.store_email || ''}
                onChange={(e) => setField('store_email', e.target.value)}
                placeholder="info@karamstore.ly"
                dir="ltr"
              />
            </Field>
            <Field label="عنوان المتجر">
              <input
                className="input"
                value={form.store_address || ''}
                onChange={(e) => setField('store_address', e.target.value)}
                placeholder="طرابلس، ليبيا"
              />
            </Field>
          </div>
        </form>
      )}

      {/* Currency */}
      {tab === 'currency' && (
        <form onSubmit={saveSettings} className="card p-6 space-y-5">
          <div>
            <h2 className="font-bold text-lg">العملة وحدود الشحن</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              أقل سعر شحن يُستخدم كقيمة افتراضية إن لم يُحدد سعر للمدينة.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="رمز العملة">
              <input
                className="input"
                value={form.currency_symbol || ''}
                onChange={(e) => setField('currency_symbol', e.target.value)}
                placeholder="د.ل"
              />
            </Field>
            <Field label="العملة">
              <input
                className="input"
                value={form.currency || ''}
                onChange={(e) => setField('currency', e.target.value)}
                placeholder="LYD"
              />
            </Field>
            <Field label="أقل سعر شحن (د.ل)">
              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                value={form.min_shipping || ''}
                onChange={(e) => setField('min_shipping', e.target.value)}
              />
            </Field>
            <Field label="أعلى سعر شحن (د.ل)">
              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                value={form.max_shipping || ''}
                onChange={(e) => setField('max_shipping', e.target.value)}
              />
            </Field>
          </div>
        </form>
      )}

      {/* Shipping cities */}
      {tab === 'shipping' && (
        <div className="card overflow-hidden">
          <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <div>
              <h2 className="font-bold text-lg">أسعار التوصيل حسب المدينة</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {cities.length} مدينة · غيّر السعر ثم احفظ
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[200px] flex-1 sm:flex-none">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  className="input pr-9"
                  placeholder="بحث عن مدينة..."
                  value={citySearch}
                  onChange={(e) => setCitySearch(e.target.value)}
                />
              </div>
              {dirtyRates.length > 0 && (
                <button
                  type="button"
                  className="btn-primary text-sm"
                  onClick={saveAllDirtyRates}
                  disabled={savingCityId != null}
                >
                  <Save size={16} />
                  حفظ الكل ({dirtyRates.length})
                </button>
              )}
            </div>
          </div>

          {citiesLoading ? (
            <div className="p-8"><LoadingSpinner /></div>
          ) : !filteredCities.length ? (
            <div className="p-10 text-center text-gray-500">
              <MapPin className="mx-auto mb-2 text-gray-400" size={28} />
              {cities.length ? 'لا توجد نتائج للبحث' : 'لا توجد مدن بعد. أعد تشغيل الخادم لتحميل المدن الافتراضية.'}
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[28rem] overflow-y-auto">
              {filteredCities.map((city) => {
                const dirty = dirtyRates.includes(city.id);
                const saving = savingCityId === city.id;
                return (
                  <div
                    key={city.id}
                    className={`flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-3.5 ${
                      dirty ? 'bg-amber-50/60 dark:bg-amber-900/10' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 flex items-center justify-center shrink-0">
                        <MapPin size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{city.name_ar}</p>
                        {city.name_en ? (
                          <p className="text-xs text-gray-400 truncate">{city.name_en}</p>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:justify-end">
                      <div className="relative">
                        <input
                          className={`input w-28 text-center pl-10 ${dirty ? 'border-amber-400 ring-1 ring-amber-200' : ''}`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={rateDrafts[city.id] ?? ''}
                          onChange={(e) =>
                            setRateDrafts((prev) => ({ ...prev, [city.id]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              saveCityRate(city.id);
                            }
                          }}
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
                          د.ل
                        </span>
                      </div>
                      <button
                        type="button"
                        className={`text-sm px-3 py-2 rounded-lg inline-flex items-center gap-1.5 transition ${
                          dirty
                            ? 'btn-primary'
                            : 'btn-secondary opacity-60'
                        }`}
                        disabled={!dirty || saving}
                        onClick={() => saveCityRate(city.id)}
                      >
                        {saving ? '...' : dirty ? <><Save size={14} /> حفظ</> : <><Check size={14} /> تم</>}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Sticky save for general settings tabs */}
      {tab !== 'shipping' && (
        <div className="sticky bottom-0 z-10 mt-6 pt-2 pb-1 bg-gradient-to-t from-gray-100 via-gray-100 to-transparent dark:from-gray-900 dark:via-gray-900">
          <div className="card px-4 py-3 flex items-center justify-between gap-3 shadow-md">
            <p className="text-sm text-gray-500">
              {isDirty ? 'هناك تغييرات لم تُحفظ بعد' : 'جميع الإعدادات محفوظة'}
            </p>
            <button
              type="button"
              className="btn-primary"
              disabled={!isDirty || updateMutation.isPending}
              onClick={saveSettings}
            >
              <Save size={16} />
              {updateMutation.isPending ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
