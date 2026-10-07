import { useEffect, useRef, useState } from 'react';
import { ImagePlus, RefreshCw, Trash2, Undo2 } from 'lucide-react';
import { resolveMediaUrl } from '@core/api/config.js';

/** Mirrors the backend upload limits (upload.middleware + MAX_FILE_SIZE default). */
export const BRAND_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const BRAND_IMAGE_MAX_MB = 5;

export function validateBrandImage(file) {
  if (!file) return null;
  if (!BRAND_IMAGE_TYPES.includes(String(file.type).toLowerCase())) {
    return 'صيغة الصورة غير مدعومة — استخدم JPG أو PNG أو WEBP';
  }
  if (file.size > BRAND_IMAGE_MAX_MB * 1024 * 1024) {
    return `حجم الصورة كبير (${(file.size / 1024 / 1024).toFixed(1)} م.ب) — الحد الأقصى ${BRAND_IMAGE_MAX_MB} م.ب`;
  }
  return null;
}

/**
 * Pick → local preview → the parent uploads on save.
 * `value` is the saved image URL; `file` is the newly picked (not yet uploaded) file.
 */
export function BrandImageField({ value, file, onFileChange, onRemove, error, onError, disabled }) {
  const inputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreviewUrl('');
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const shown = previewUrl || resolveMediaUrl(value);
  useEffect(() => setBroken(false), [shown]);

  const pick = (e) => {
    const picked = e.target.files?.[0];
    e.target.value = '';
    if (!picked) return; // dialog cancelled: keep the current image
    const problem = validateBrandImage(picked);
    if (problem) {
      onError(problem);
      return;
    }
    onError('');
    onFileChange(picked);
  };

  return (
    <div>
      <span className="block text-sm font-medium mb-2">صورة البراند (اختياري)</span>
      <div className="flex items-start gap-4">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className={`relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 transition ${
            shown ? 'border-solid border-gray-200 bg-white dark:border-gray-600' : 'border-dashed border-gray-300 text-gray-400 hover:border-primary-500 hover:text-primary-500 dark:border-gray-600'
          } ${error ? 'border-red-400' : ''}`}
          aria-label={shown ? 'تغيير الصورة' : 'اختر صورة'}
        >
          {shown && !broken ? (
            <img src={shown} alt="" className="h-full w-full object-contain p-1.5" onError={() => setBroken(true)} />
          ) : shown && broken ? (
            <span className="px-2 text-center text-xs text-red-500">تعذر عرض الصورة</span>
          ) : (
            <span className="flex flex-col items-center gap-1.5 text-xs">
              <ImagePlus size={26} />
              اختر صورة
            </span>
          )}
          {file && (
            <span className="absolute inset-x-0 bottom-0 bg-secondary-400 py-0.5 text-center text-[10px] font-bold text-primary-800">
              جديدة — تُرفع عند الحفظ
            </span>
          )}
        </button>

        <div className="flex min-w-0 flex-col gap-1.5 pt-1 text-sm">
          {shown && (
            <button type="button" disabled={disabled} onClick={() => inputRef.current?.click()} className="inline-flex items-center gap-1.5 text-primary-600 hover:underline">
              <RefreshCw size={14} /> تغيير الصورة
            </button>
          )}
          {file && (
            <button type="button" disabled={disabled} onClick={() => { onFileChange(null); onError(''); }} className="inline-flex items-center gap-1.5 text-gray-600 hover:underline dark:text-gray-300">
              <Undo2 size={14} /> {value ? 'إلغاء والرجوع للصورة الحالية' : 'إلغاء اختيار الصورة'}
            </button>
          )}
          {!file && value && (
            <button type="button" disabled={disabled} onClick={onRemove} className="inline-flex items-center gap-1.5 text-red-500 hover:underline">
              <Trash2 size={14} /> إزالة الصورة
            </button>
          )}
          <p className="text-xs text-gray-400 leading-relaxed">
            JPG أو PNG أو WEBP، حتى {BRAND_IMAGE_MAX_MB} م.ب. يفضل شعار بخلفية بيضاء أو شفافة.
          </p>
        </div>
      </div>
      {error && <p className="text-sm text-red-500 mt-1.5" role="alert">{error}</p>}
      <input ref={inputRef} type="file" accept={BRAND_IMAGE_TYPES.join(',')} className="hidden" onChange={pick} />
    </div>
  );
}
