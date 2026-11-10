import { useEffect, useState } from 'react';
import { FieldError } from '@shared/ui';
import { ImageUpload } from '@shared/components/ImageUpload';
import { fromDateTimeLocal, toDateTimeLocal } from '@modules/campaigns/utils/campaign';

const emptyCampaign = {
  name_ar: '',
  name_en: '',
  slug: '',
  description: '',
  banner_image: '',
  starts_at: '',
  ends_at: '',
  status: 'draft',
  show_in_announcement_bar: true,
  announcement_text: '',
  priority: 0,
};

const MANUAL_STATES = [
  { value: 'draft', label: 'مسودة — لا تظهر للزوار' },
  { value: 'published', label: 'مفعّلة — تظهر عند بدء موعدها' },
  { value: 'paused', label: 'موقوفة يدوياً' },
];

function toForm(campaign) {
  if (!campaign) return emptyCampaign;
  return {
    name_ar: campaign.name_ar || '',
    name_en: campaign.name_en || '',
    slug: campaign.slug || '',
    description: campaign.description || '',
    banner_image: campaign.banner_image || '',
    starts_at: toDateTimeLocal(campaign.starts_at),
    ends_at: toDateTimeLocal(campaign.ends_at),
    status: campaign.status || 'draft',
    show_in_announcement_bar: campaign.show_in_announcement_bar !== false,
    announcement_text: campaign.announcement_text || '',
    priority: campaign.priority ?? 0,
  };
}

/**
 * Create / edit campaign fields. Dates are entered in local time and sent as ISO.
 */
export function CampaignForm({ initial, loading, onSubmit, getFieldError }) {
  const [form, setForm] = useState(() => toForm(initial));

  useEffect(() => {
    setForm(toForm(initial));
  }, [initial]);

  const set = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e?.target ? e.target.value : e }));

  const submit = (e) => {
    e.preventDefault();
    onSubmit({
      name_ar: form.name_ar.trim(),
      name_en: form.name_en.trim() || null,
      slug: form.slug.trim() || undefined,
      description: form.description.trim() || null,
      banner_image: form.banner_image || null,
      starts_at: fromDateTimeLocal(form.starts_at),
      ends_at: fromDateTimeLocal(form.ends_at),
      status: form.status,
      show_in_announcement_bar: Boolean(form.show_in_announcement_bar),
      announcement_text: form.announcement_text.trim() || null,
      priority: parseInt(form.priority, 10) || 0,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1.5">اسم الحملة بالعربية *</label>
          <input
            className="input"
            required
            placeholder="مثال: الجمعة السوداء"
            value={form.name_ar}
            onChange={set('name_ar')}
          />
          <FieldError message={getFieldError('name_ar')} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">اسم الحملة بالإنجليزية</label>
          <input
            className="input"
            dir="ltr"
            placeholder="Black Friday"
            value={form.name_en}
            onChange={set('name_en')}
          />
          <FieldError message={getFieldError('name_en')} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">رابط الحملة (Slug)</label>
        <div className="flex items-stretch" dir="ltr">
          <span className="inline-flex items-center rounded-s-xl border border-e-0 border-ink-200 bg-tertiary-100 px-3 text-sm text-ink-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300">
            /campaigns/
          </span>
          <input
            className="input rounded-s-none"
            placeholder="black-friday"
            value={form.slug}
            onChange={set('slug')}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">يُنشأ تلقائياً من الاسم إذا تُرك فارغاً</p>
        <FieldError message={getFieldError('slug')} />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">وصف الحملة</label>
        <textarea
          className="input"
          rows={3}
          placeholder="وصف مختصر يظهر في صفحة الحملة"
          value={form.description}
          onChange={set('description')}
        />
        <FieldError message={getFieldError('description')} />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">صورة الغلاف (Banner)</label>
        <ImageUpload
          label="رفع صورة الغلاف"
          value={form.banner_image}
          onChange={(url) => setForm((f) => ({ ...f, banner_image: url }))}
        />
        <p className="text-xs text-gray-500 mt-1.5">موصى به: 1920 × 720 بكسل</p>
        <FieldError message={getFieldError('banner_image')} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1.5">بداية الحملة *</label>
          <input
            className="input"
            type="datetime-local"
            required
            value={form.starts_at}
            onChange={set('starts_at')}
          />
          <FieldError message={getFieldError('starts_at')} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">نهاية الحملة *</label>
          <input
            className="input"
            type="datetime-local"
            required
            min={form.starts_at || undefined}
            value={form.ends_at}
            onChange={set('ends_at')}
          />
          <FieldError message={getFieldError('ends_at')} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">حالة الحملة</label>
        <select className="input" value={form.status} onChange={set('status')}>
          {MANUAL_STATES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1">
          الحملة المفعّلة تكون «مجدولة» قبل موعد البداية، و«نشطة» خلال الفترة، و«منتهية» بعدها تلقائياً.
        </p>
        <FieldError message={getFieldError('status')} />
      </div>

      <fieldset className="card p-3 sm:p-4 space-y-3">
        <legend className="px-1 text-sm font-medium">الشريط الإعلاني أعلى المتجر</legend>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            className="w-4 h-4 rounded border-gray-300"
            checked={Boolean(form.show_in_announcement_bar)}
            onChange={(e) => setForm((f) => ({ ...f, show_in_announcement_bar: e.target.checked }))}
          />
          <span className="text-sm font-medium">إظهار الحملة في الشريط مع العداد التنازلي</span>
        </label>
        <div>
          <label className="block text-sm font-medium mb-1.5">نص الشريط (اختياري)</label>
          <input
            className="input"
            placeholder="مثال: تخفيضات تصل إلى 30%"
            value={form.announcement_text}
            onChange={set('announcement_text')}
          />
          <FieldError message={getFieldError('announcement_text')} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">الأولوية</label>
          <input
            className="input"
            type="number"
            min={0}
            max={1000}
            value={form.priority}
            onChange={set('priority')}
          />
          <p className="text-xs text-gray-500 mt-1">
            عند وجود أكثر من حملة نشطة يظهر في الشريط صاحب الأولوية الأعلى، وهو الذي يُطبَّق على المنتج المشترك بينها.
          </p>
          <FieldError message={getFieldError('priority')} />
        </div>
      </fieldset>

      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? 'جاري الحفظ...' : 'حفظ الحملة'}
      </button>
    </form>
  );
}
