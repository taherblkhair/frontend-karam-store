import { resolveMediaUrl } from '@core/api/config.js';
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
  Share2,
  Construction,
} from 'lucide-react';
import { notifySuccess, notifyError } from '@shared/services/toast.service';
import { useFormErrors } from '@shared/hooks/useFormErrors';
import { settingsApi } from '@modules/settings/api/settings.api';
import { LoadingSpinner, FormAlert } from '@shared/ui';
import { ImageUpload } from '@shared/components/ImageUpload';
import {
  SITE_STATUS,
  normalizeSiteStatus,
  siteStatusLabelAr,
} from '@modules/store/utils/siteStatus';

const TABS = [
  { id: 'status', label: 'حالة الموقع', icon: Construction },
  { id: 'identity', label: 'الهوية', icon: Store },
  { id: 'contact', label: 'التواصل', icon: Phone },
  { id: 'social', label: 'وسائل التواصل', icon: Share2 },
  { id: 'currency', label: 'العملة', icon: Coins },
  { id: 'shipping', label: 'أسعار التوصيل', icon: Truck },
];

const SITE_STATUS_OPTIONS = [
  {
    value: SITE_STATUS.ONLINE,
    title: 'مفتوح',
    desc: 'المتجر يعمل بشكل طبيعي ويمكن للعملاء التصفح والطلب.',
    tone: 'border-green-300 bg-green-50 dark:bg-green-900/20',
  },
  {
    value: SITE_STATUS.MAINTENANCE,
    title: 'قيد الصيانة',
    desc: 'إيقاف كامل: لا تصفح ولا طلبات ولا تسجيل عملاء. الإدارة ونقطة البيع تبقى متاحة.',
    tone: 'border-amber-300 bg-amber-50 dark:bg-amber-900/20',
  },
  {
    value: SITE_STATUS.DEVELOPMENT,
    title: 'قيد التطوير',
    desc: 'نفس الإيقاف للعملاء، مع رسالة تناسب موقع تحت الإنشاء أو التحديث.',
    tone: 'border-blue-300 bg-blue-50 dark:bg-blue-900/20',
  },
];

const SOCIAL_FIELDS = [
  {
    key: 'social_instagram',
    label: 'Instagram',
    placeholder: 'https://instagram.com/karamstore',
  },
  {
    key: 'social_facebook',
    label: 'Facebook',
    placeholder: 'https://facebook.com/karamstore',
  },
  {
    key: 'social_telegram',
    label: 'Telegram',
    placeholder: 'https://t.me/karamstore',
  },
  {
    key: 'social_snapchat',
    label: 'Snapchat',
    placeholder: 'https://snapchat.com/add/karamstore',
  },
  {
    key: 'social_tiktok',
    label: 'TikTok',
    placeholder: 'https://tiktok.com/@karamstore',
  },
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
    const next = {
      ...data.data,
      site_status: normalizeSiteStatus(data.data.site_status),
      site_status_message: data.data.site_status_message || '',
    };
    setForm(next);
    setSavedSnapshot(JSON.stringify(next));
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
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      queryClient.invalidateQueries({ queryKey: ['store-settings'] });
      clearErrors();
      notifySuccess(res);
      if (res?.data) {
        setForm(res.data);
        setSavedSnapshot(JSON.stringify(res.data));
      }
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

  // Reset scroll when switching tabs so sticky footer doesn't trap mid-page focus
  useEffect(() => {
    const main = document.querySelector('main');
    if (main) main.scrollTo({ top: 0 });
    window.scrollTo(0, 0);
  }, [tab]);

  const saveSettings = (e) => {
    e?.preventDefault();
    // Normalize social URLs on save only
    const payload = { ...form };
    for (const { key } of SOCIAL_FIELDS) {
      if (payload[key] != null) payload[key] = String(payload[key]).trim();
    }
    updateMutation.mutate(payload);
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
    <div className="max-w-5xl pb-28 sm:pb-24">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">إعدادات الموقع</h1>
        <p className="text-sm text-gray-500 mt-1">
          إدارة حالة الموقع، الهوية، التواصل، والعملة وأسعار التوصيل.
        </p>
      </div>

      {formError ? <div className="mb-4"><FormAlert message={formError} /></div> : null}

      {/* Store preview strip */}
      <div className="card p-4 mb-6 flex items-center gap-4">
        <div className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-gray-700 overflow-hidden flex items-center justify-center shrink-0 border border-gray-200 dark:border-gray-600">
          {form.logo ? (
            <img src={resolveMediaUrl(form.logo)} alt="" className="w-full h-full object-cover" />
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
        <span
          className={`badge shrink-0 ${
            normalizeSiteStatus(form.site_status) === SITE_STATUS.ONLINE
              ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
              : normalizeSiteStatus(form.site_status) === SITE_STATUS.DEVELOPMENT
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
          }`}
        >
          {siteStatusLabelAr(form.site_status)}
        </span>
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

      {/* Site status */}
      {tab === 'status' && (
        <form onSubmit={saveSettings} className="card p-6 space-y-5">
          <div>
            <h2 className="font-bold text-lg">حالة الموقع للمتجر الإلكتروني</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              عند التعطيل تُغلق واجهة العملاء بالكامل ولا تُقبل طلبات الموقع أو التسجيل. لوحة الإدارة ونقطة البيع تظلان تعملان.
            </p>
          </div>

          <div className="grid gap-3">
            {SITE_STATUS_OPTIONS.map((opt) => {
              const active = normalizeSiteStatus(form.site_status) === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setField('site_status', opt.value)}
                  className={`text-right rounded-xl border-2 p-4 transition ${
                    active
                      ? `${opt.tone} border-current shadow-sm`
                      : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 bg-white dark:bg-gray-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-bold text-base">{opt.title}</span>
                    <span
                      className={`h-4 w-4 rounded-full border-2 shrink-0 ${
                        active
                          ? 'border-primary-600 bg-primary-600'
                          : 'border-gray-300'
                      }`}
                    />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1.5 leading-relaxed">
                    {opt.desc}
                  </p>
                </button>
              );
            })}
          </div>

          <Field
            label="رسالة مخصصة (اختياري)"
            hint="تظهر للزوار بدل الرسالة الافتراضية"
          >
            <textarea
              className="input min-h-[100px] resize-y"
              value={form.site_status_message || ''}
              onChange={(e) => setField('site_status_message', e.target.value)}
              placeholder="مثال: نعود يوم السبت بعد صيانة سريعة…"
              disabled={normalizeSiteStatus(form.site_status) === SITE_STATUS.ONLINE}
            />
          </Field>
        </form>
      )}

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

      {/* Social media */}
      {tab === 'social' && (
        <form onSubmit={saveSettings} className="card p-5 sm:p-6 space-y-5">
          <div>
            <h2 className="font-bold text-lg">وسائل التواصل الاجتماعي</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              أضف روابط الحسابات — تظهر تلقائياً في تذييل المتجر. اترك الحقل فارغاً لإخفاء المنصة.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-5">
            {SOCIAL_FIELDS.map((field) => (
              <Field key={field.key} label={field.label} hint="رابط كامل يبدأ بـ https://">
                <input
                  className="input"
                  type="url"
                  inputMode="url"
                  autoComplete="url"
                  dir="ltr"
                  value={form[field.key] || ''}
                  onChange={(e) => setField(field.key, e.target.value)}
                  onBlur={(e) => setField(field.key, e.target.value.trim())}
                  placeholder={field.placeholder}
                />
              </Field>
            ))}
          </div>
          {/* In-form save so last fields stay reachable without sticky overlay issues */}
          <div className="pt-2 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-gray-100 dark:border-gray-700">
            <p className="text-sm text-gray-500">
              {isDirty ? 'هناك تغييرات لم تُحفظ بعد' : 'جميع الإعدادات محفوظة'}
            </p>
            <button
              type="submit"
              className="btn-primary w-full sm:w-auto"
              disabled={!isDirty || updateMutation.isPending}
            >
              <Save size={16} />
              {updateMutation.isPending ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
            </button>
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

      {/* Sticky save for tabs without their own submit row (social has in-form save) */}
      {tab !== 'shipping' && tab !== 'social' && (
        <div className="sticky bottom-0 z-20 mt-8 border-t border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-800/95 backdrop-blur supports-[backdrop-filter]:bg-white/90 shadow-[0_-6px_24px_rgba(0,0,0,0.06)]">
          <div className="px-4 py-3 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-sm text-gray-500">
              {isDirty ? 'هناك تغييرات لم تُحفظ بعد' : 'جميع الإعدادات محفوظة'}
            </p>
            <button
              type="button"
              className="btn-primary w-full sm:w-auto"
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
