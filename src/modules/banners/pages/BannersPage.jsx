import { resolveMediaUrl } from '@core/api/config.js';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, ImageIcon, ExternalLink } from 'lucide-react';
import { notifySuccess, notifyError } from '@shared/services/toast.service';
import { useFormErrors } from '@shared/hooks/useFormErrors';
import { useListParams } from '@shared/hooks/useListParams';
import { useConfirm } from '@shared/hooks/useConfirm';
import { bannersApi } from '@modules/banners/api/banners.api';
import { LoadingSpinner, Modal, FieldError, EmptyState } from '@shared/ui';
import { SearchInput, Pagination } from '@shared/components/ListControls';
import { ImageUpload } from '@shared/components/ImageUpload';

const emptyBanner = {
  title_ar: '',
  title_en: '',
  subtitle_ar: '',
  subtitle_en: '',
  image: '',
  link: '',
  sort_order: 0,
  is_active: true,
};

/** Recommended hero image size shown in admin UI */
const SIZE_HINT = {
  desktop: '1920 × 720',
  mobile: '1080 × 860',
  ratio: 'عرض عريض (حوالي 21:9 على الكمبيوتر، 5:4 على الجوال)',
};

function BannerPreview({ image, title, subtitle, compact = false }) {
  const media = resolveMediaUrl(image);
  return (
    <div
      className={`relative w-full overflow-hidden rounded-xl bg-gray-200 dark:bg-gray-700 ${
        compact ? 'aspect-[16/7]' : 'aspect-[5/4] sm:aspect-[16/7]'
      }`}
    >
      {media ? (
        <img src={media} alt={title || 'معاينة البنر'} className="absolute inset-0 h-full w-full object-cover object-center" />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-400">
          <ImageIcon size={compact ? 28 : 40} />
          <span className="text-xs sm:text-sm">لا توجد صورة</span>
        </div>
      )}
      {(title || subtitle) && media ? (
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/25 to-transparent flex items-end p-3 sm:p-4">
          <div className="text-white min-w-0">
            {title ? <p className="font-bold text-sm sm:text-base line-clamp-1 drop-shadow">{title}</p> : null}
            {subtitle ? <p className="text-xs sm:text-sm text-white/85 line-clamp-2">{subtitle}</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function BannersPage() {
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyBanner);
  const { search, setSearch, page, setPage, withExtra } = useListParams();
  // Include inactive banners for management
  const listParams = withExtra({ all: 'true' });

  const { data, isLoading } = useQuery({
    queryKey: ['banners', listParams],
    queryFn: () => bannersApi.list(listParams),
  });

  const { formError, clearErrors, applyApiError, getFieldError } = useFormErrors();

  const saveMutation = useMutation({
    mutationFn: bannersApi.save,
    onSuccess: (res) => {
      queryClient.invalidateQueries(['banners']);
      setModalOpen(false);
      setEditing(null);
      clearErrors();
      notifySuccess(res);
    },
    onError: (err) => {
      applyApiError(err);
      notifyError(err);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: bannersApi.remove,
    onSuccess: (res) => {
      queryClient.invalidateQueries(['banners']);
      notifySuccess(res);
    },
    onError: notifyError,
  });

  const banners = data?.data || [];

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...emptyBanner,
      sort_order: banners.length ? Math.max(...banners.map((b) => b.sort_order || 0)) + 1 : 0,
    });
    clearErrors();
    setModalOpen(true);
  };

  const openEdit = (b) => {
    setEditing(b);
    setForm({
      title_ar: b.title_ar || '',
      title_en: b.title_en || '',
      subtitle_ar: b.subtitle_ar || '',
      subtitle_en: b.subtitle_en || '',
      image: b.image || '',
      link: b.link || '',
      sort_order: b.sort_order ?? 0,
      is_active: b.is_active !== false,
    });
    clearErrors();
    setModalOpen(true);
  };

  const submit = (e) => {
    e.preventDefault();
    if (!form.image) {
      notifyError({ message: 'صورة البنر مطلوبة' });
      return;
    }
    saveMutation.mutate({
      id: editing?.id,
      data: {
        ...form,
        sort_order: parseInt(form.sort_order, 10) || 0,
        is_active: !!form.is_active,
        title_ar: form.title_ar?.trim() || null,
        subtitle_ar: form.subtitle_ar?.trim() || null,
        link: form.link?.trim() || null,
      },
    });
  };

  return (
    <div className="min-w-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">البنرات</h1>
          <p className="text-sm text-gray-500 mt-1">
            تظهر في الصفحة الرئيسية — المقاس الموصى به: {SIZE_HINT.desktop} (سطح مكتب)
          </p>
        </div>
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full sm:w-auto">
          <SearchInput value={search} onChange={setSearch} placeholder="بحث بعنوان البنر..." />
          <button type="button" onClick={openCreate} className="btn-primary w-full sm:w-auto">
            <Plus size={18} /> إضافة بنر
          </button>
        </div>
      </div>

      {/* Sizing guide */}
      <div className="card p-3 sm:p-4 mb-4 sm:mb-6 text-sm text-gray-600 dark:text-gray-300">
        <p className="font-medium text-gray-800 dark:text-gray-100 mb-1">إرشادات الصورة</p>
        <ul className="list-disc list-inside space-y-0.5 text-xs sm:text-sm">
          <li>نسبة العرض: {SIZE_HINT.ratio}</li>
          <li>سطح المكتب: {SIZE_HINT.desktop} بكسل — الجوال: {SIZE_HINT.mobile} بكسل تقريباً</li>
          <li>الصورة تُقصّ تلقائياً (object-cover) في الوسط — ضع النص المهم في منتصف الصورة</li>
          <li>صيغة مستحسنة: JPG أو WebP، أقل من 1.5MB لسرعة التحميل</li>
        </ul>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : banners.length === 0 ? (
        <EmptyState message="لا توجد بنرات — أضف أول بنر للمتجر" />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {banners.map((b) => (
              <article key={b.id} className="card overflow-hidden flex flex-col">
                <BannerPreview
                  compact
                  image={b.image}
                  title={b.title_ar}
                  subtitle={b.subtitle_ar}
                />
                <div className="p-3 sm:p-4 flex-1 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-bold truncate">{b.title_ar || 'بدون عنوان'}</h3>
                      {b.subtitle_ar ? (
                        <p className="text-sm text-gray-500 line-clamp-2 mt-0.5">{b.subtitle_ar}</p>
                      ) : null}
                    </div>
                    <span
                      className={`badge shrink-0 ${
                        b.is_active
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {b.is_active ? 'نشط' : 'متوقف'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                    <span>الترتيب: {b.sort_order ?? 0}</span>
                    {b.link ? (
                      <span className="inline-flex items-center gap-1 truncate max-w-full">
                        <ExternalLink size={12} />
                        <span className="truncate dir-ltr">{b.link}</span>
                      </span>
                    ) : (
                      <span>بدون رابط</span>
                    )}
                  </div>

                  <div className="flex gap-2 mt-auto pt-2 border-t dark:border-gray-700">
                    <button
                      type="button"
                      onClick={() => openEdit(b)}
                      className="btn-outline text-sm flex-1 py-1.5"
                    >
                      <Edit size={14} /> تعديل
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const ok = await confirm({
                          title: 'حذف البنر',
                          message: `هل أنت متأكد من حذف البنر «${b.title_ar || 'بدون عنوان'}»؟`,
                          confirmText: 'حذف',
                          variant: 'danger',
                        });
                        if (ok) deleteMutation.mutate(b.id);
                      }}
                      className="btn-outline text-sm text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20 py-1.5 px-3"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <Pagination pagination={data?.pagination} page={page} onPageChange={setPage} />
        </>
      )}

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
          clearErrors();
        }}
        title={editing ? 'تعديل بنر' : 'إضافة بنر'}
        size="lg"
        alert={formError}
      >
        <form onSubmit={submit} className="space-y-4">
          {/* Live preview */}
          <div>
            <p className="text-sm font-medium mb-2">معاينة العرض</p>
            <BannerPreview
              image={form.image}
              title={form.title_ar}
              subtitle={form.subtitle_ar}
            />
            <p className="text-xs text-gray-500 mt-2">
              تظهر المعاينة بنفس أسلوب الصفحة الرئيسية (اقتصاص متجاوب).
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">صورة البنر *</label>
            <ImageUpload
              label="رفع صورة البنر"
              value={form.image}
              onChange={(url) => setForm({ ...form, image: url })}
            />
            <FieldError message={getFieldError('image')} />
            <p className="text-xs text-gray-500 mt-1.5">
              موصى به: {SIZE_HINT.desktop} — {SIZE_HINT.ratio}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">العنوان (اختياري)</label>
            <input
              className="input"
              placeholder="يظهر فوق الصورة"
              value={form.title_ar}
              onChange={(e) => setForm({ ...form, title_ar: e.target.value })}
            />
            <FieldError message={getFieldError('title_ar')} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">العنوان الفرعي</label>
            <input
              className="input"
              placeholder="وصف قصير"
              value={form.subtitle_ar}
              onChange={(e) => setForm({ ...form, subtitle_ar: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">رابط عند النقر</label>
            <input
              className="input"
              placeholder="/products أو https://..."
              value={form.link}
              onChange={(e) => setForm({ ...form, link: e.target.value })}
              dir="ltr"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">الترتيب</label>
              <input
                className="input"
                type="number"
                min={0}
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">الأصغر يظهر أولاً</p>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer select-none py-2">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-gray-300"
                  checked={!!form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                />
                <span className="text-sm font-medium">نشط في المتجر</span>
              </label>
            </div>
          </div>

          <button type="submit" disabled={saveMutation.isPending} className="btn-primary w-full">
            {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ البنر'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
