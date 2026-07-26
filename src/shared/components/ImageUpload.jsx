import { useRef, useState } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { uploadFile } from '@shared/services/upload.service';
import { notifySuccess, notifyError } from '@shared/services/toast.service';

export function ImageUpload({ value, onChange, label = 'رفع صورة', multiple = false, className = '' }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList);
    if (!files.length) return;

    setUploading(true);
    try {
      if (multiple) {
        const urls = [...(value || [])];
        for (const file of files) {
          const result = await uploadFile(file);
          urls.push(result.data.url);
          notifySuccess(result);
        }
        onChange(urls);
      } else {
        const result = await uploadFile(files[0]);
        onChange(result.data.url);
        notifySuccess(result);
      }
    } catch (err) {
      notifyError(err);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const removeImage = (index) => {
    if (multiple) {
      onChange(value.filter((_, i) => i !== index));
    } else {
      onChange('');
    }
  };

  if (multiple) {
    const images = value || [];
    return (
      <div className={className}>
        <label className="block text-sm font-medium mb-2">{label}</label>
        <div className="flex flex-wrap gap-3">
          {images.map((url, i) => (
            <div key={`${url}-${i}`} className="relative w-24 h-24 rounded-lg overflow-hidden border">
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button type="button" onClick={() => removeImage(i)} className="absolute top-1 left-1 bg-red-500 text-white rounded-full p-1">
                <X size={12} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="w-24 h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-primary-500 hover:text-primary-500"
          >
            {uploading ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />}
            <span className="text-xs mt-1">رفع</span>
          </button>
        </div>
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      </div>
    );
  }

  return (
    <div className={className}>
      <label className="block text-sm font-medium mb-2">{label}</label>
      {value ? (
        <div className="relative w-32 h-32 rounded-lg overflow-hidden border">
          <img src={value} alt="" className="w-full h-full object-cover" />
          <button type="button" onClick={() => onChange('')} className="absolute top-1 left-1 bg-red-500 text-white rounded-full p-1">
            <X size={12} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-32 h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-primary-500 hover:text-primary-500"
        >
          {uploading ? <Loader2 className="animate-spin" size={24} /> : <Upload size={24} />}
          <span className="text-xs mt-2">اختر صورة</span>
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
    </div>
  );
}

export function ImagePreview({ url, size = 'sm' }) {
  const sizes = { sm: 'w-12 h-12', md: 'w-20 h-20', lg: 'w-32 h-32' };
  if (!url) {
    return <div className={`${sizes[size]} bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center text-gray-400 text-xs`}>—</div>;
  }
  return <img src={url} alt="" className={`${sizes[size]} object-cover rounded-lg`} />;
}
